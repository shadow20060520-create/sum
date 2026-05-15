"""
讯飞语音评测（流式版）PoC v5 - 严格按官方文档
文档来源：https://www.xfyun.cn/doc/Ise/IseAPI.html

流程：
  1. 参数帧：cmd=ssb, data.status=0，不含音频
  2. 音频帧：cmd=auw, aus=1(首帧)/2(中间)/4(末帧)
     - 首帧 data.status=1，末帧 data.status=2

依赖：pip install websocket-client
运行：python xunfei_ise_websocket.py
"""

import base64, hashlib, hmac, json, ssl, threading, time
from datetime import datetime, timezone
from urllib.parse import urlencode
import xml.etree.ElementTree as ET
import websocket

APPID      = "9dd01922"
API_KEY    = "283c27f795bcd0d30793288ad8b83e9b"
API_SECRET = "MDVhNjQxMjFlYmY3MjYxODZlNGJkY2Ew"
AUDIO_FILE = "test.wav"
REF_TEXT   = "你在笑什么"

result_xml  = []
result_error = None
done_event  = threading.Event()


def build_ws_url():
    host = "ise-api.xfyun.cn"
    path = "/v2/open-ise"
    date = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    sig_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
    sig = base64.b64encode(
        hmac.new(API_SECRET.encode(), sig_origin.encode(), digestmod=hashlib.sha256).digest()
    ).decode()
    auth = base64.b64encode(
        f'api_key="{API_KEY}", algorithm="hmac-sha256", '
        f'headers="host date request-line", signature="{sig}"'.encode()
    ).decode()
    return f"wss://{host}{path}?" + urlencode({"authorization": auth, "date": date, "host": host})


def on_open(ws):
    print("✓ 连接成功，开始发送...\n")
    threading.Thread(target=send_all, args=(ws,), daemon=True).start()


def send_all(ws):
    raw = open(AUDIO_FILE, "rb").read()
    CHUNK = 1280
    chunks = [raw[i:i+CHUNK] for i in range(0, len(raw), CHUNK)]

    # ── 第1步：参数帧（cmd=ssb，不含音频）──────────────────────
    frame_ssb = {
        "common": {"app_id": APPID},
        "business": {
            "cmd":           "ssb",
            "sub":           "ise",
            "ent":           "cn_vip",
            "aue":           "raw",
            "auf":           "audio/L16;rate=16000",
            "category":      "read_sentence",
            "rstcd":         "utf8",
            "grade":         "middle",
            "extra_ability": "syll_phone_err_msg,pitch",
            "text":          "\uFEFF" + REF_TEXT,
        },
        "data": {
            "status":   0,
            "encoding": "raw",
            "data_type": 1,
            "data":     "",
        }
    }
    ws.send(json.dumps(frame_ssb))
    print("  → 参数帧(ssb)已发送")
    time.sleep(0.1)

    # ── 第2步：音频帧（cmd=auw）────────────────────────────────
    total = len(chunks)
    for idx, chunk in enumerate(chunks):
        is_first = (idx == 0)
        is_last  = (idx == total - 1)

        # aus: 1=首帧, 2=中间帧, 4=末帧
        if is_first:
            aus = 1
        elif is_last:
            aus = 4
        else:
            aus = 2

        # data.status: 1=传输中, 2=最后一帧
        data_status = 2 if is_last else 1

        frame = {
            "business": {
                "cmd": "auw",
                "aus": aus,
            },
            "data": {
                "status":    data_status,
                "encoding":  "raw",
                "data_type": 1,
                "data":      base64.b64encode(chunk).decode(),
            }
        }
        ws.send(json.dumps(frame))
        time.sleep(0.04)

    print(f"  → 音频帧已发送（共 {total} 帧）\n")


def on_message(ws, message):
    global result_error
    msg  = json.loads(message)
    code = msg.get("code", -1)
    if code != 0:
        result_error = f"code={code}, message={msg.get('message')}, sid={msg.get('sid')}"
        ws.close()
        return
    raw = msg.get("data", {}).get("data", "")
    if raw:
        result_xml.append(base64.b64decode(raw).decode("utf-8"))
    if msg.get("data", {}).get("status") == 2:
        ws.close()


def on_error(ws, error):
    global result_error
    result_error = str(error)
    done_event.set()


def on_close(ws, *args):
    done_event.set()


def parse(xml_str):
    print("=" * 60)
    print("原始 XML（前2000字符）：")
    print(xml_str[:2000])
    print("=" * 60 + "\n")

    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError as e:
        print(f"XML解析失败: {e}")
        return

    # 正确路径：xml_result > read_sentence(外层) > rec_paper > read_sentence(内层,有分数)
    score_node = root.find('.//rec_paper/read_sentence')

    print("【整句评分】")
    if score_node is not None:
        print(f"  总分:   {score_node.get('total_score')}")
        print(f"  流利度: {score_node.get('fluency_score')}")
        print(f"  完整度: {score_node.get('integrity_score')}")
        print(f"  声调分: {score_node.get('tone_score')}")
        print(f"  音素分: {score_node.get('phone_score')}")
    else:
        print("  未找到评分节点")

    print("\n【逐字评分（声调+准确度）】")
    print(f"  {'汉字':<6} {'拼音':<10} {'声调分':<10} {'dp错误码':<10} {'状态'}")
    print("  " + "-" * 52)
    for word in root.findall('.//word'):
        char   = word.get('content', '?')
        symbol = word.get('symbol', '?')
        for syll in word.findall('.//syll'):
            if syll.get('rec_node_type') != 'paper':
                continue
            tone = syll.get('tone_score', '-')
            dp   = syll.get('dp_message', '0')
            try:
                flag = "⚠️ 声调有误" if float(tone) < 70 else "✓"
            except:
                flag = "-"
            print(f"  {char:<6} {symbol:<10} {tone:<10} {dp:<10} {flag}")

    print("\n【音高曲线 F0】")
    p = root.find('.//pitch')
    if p is not None:
        val    = p.get('value') or p.text or ''
        frames = [v for v in val.split(',') if v.strip()]
        print(f"  总帧数: {len(frames)}")
        print(f"  前30帧: {frames[:30]}")
        print("  → 声调可视化原始数据 ✓")
    else:
        print("  ⚠️  未找到 pitch 节点（需在讯飞控制台确认 extra_ability=pitch 权限）")

    print("\n【dp_message 含义】")
    print("  0=正常  32=填充音(正常)  其他=发音有误")


def main():
    print("🚀 讯飞口语评测 PoC v5（严格按官方文档）")
    print(f"   文本：{REF_TEXT}  音频：{AUDIO_FILE}\n")

    ws = websocket.WebSocketApp(
        build_ws_url(),
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )
    threading.Thread(
        target=ws.run_forever,
        kwargs={"sslopt": {"cert_reqs": ssl.CERT_NONE}},
        daemon=True
    ).start()
    done_event.wait(timeout=30)

    if result_error:
        print(f"\n❌ 错误：{result_error}")
        return
    if result_xml:
        parse("".join(result_xml))
    else:
        print("❌ 未收到任何数据")


if __name__ == "__main__":
    main()
