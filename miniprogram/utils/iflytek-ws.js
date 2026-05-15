/**
 * 科大讯飞 WebSocket 通信管理器
 * 管理录音、音频上传、评测结果接收
 * 
 * 使用说明：
 * 1. 调用 connect(wssUrl) 建立连接
 * 2. 调用 startRecording() 开始录音
 * 3. 调用 stopRecording() 停止录音并发送结束帧
 * 4. 在 onResult 回调中处理评测结果
 */

// 音频参数配置（必须符合讯飞要求）
const AUDIO_CONFIG = {
  sampleRate: 16000,      // 16kHz
  numberOfChannels: 1,    // 单声道
  encodeBitRate: 96000,   // 编码码率
  format: 'pcm',          // PCM 格式
  frameSize: 640,         // 每帧大小（40ms @ 16kHz）
};

// 帧类型常量
const FRAME_TYPE = {
  FIRST: 0,   // 第一帧：业务参数
  CONTINUE: 1, // 中间帧：音频数据
  LAST: 2,    // 最后一帧：结束标识
};

class IFlytekWebSocket {
  constructor() {
    this.socket = null;
    this.recorderManager = null;
    this.isRecording = false;
    this.isConnected = false;
    this.audioBuffer = [];
    this.frameIndex = 0;
    
    // 回调函数
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
    this.onResult = null;
    this.onRecordingStart = null;
    this.onRecordingStop = null;
  }

  /**
   * 建立 WebSocket 连接
   * @param {string} wssUrl - 带鉴权的 WSS URL
   * @param {Object} businessParams - 业务参数（APPID、评测文本等）
   */
  connect(wssUrl, businessParams = {}) {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.disconnect();
      }

      console.log('[IFlytekWS] 正在连接:', wssUrl.substring(0, 50) + '...');

      this.socket = wx.connectSocket({
        url: wssUrl,
        protocols: ['protocol1'],
        success: () => {
          console.log('[IFlytekWS] WebSocket 连接请求已发送');
        },
        fail: (err) => {
          console.error('[IFlytekWS] WebSocket 连接失败:', err);
          reject(err);
        }
      });

      // 连接成功
      this.socket.onOpen(() => {
        console.log('[IFlytekWS] WebSocket 连接已建立');
        this.isConnected = true;
        
        // 发送第一帧（业务参数）
        this._sendFirstFrame(businessParams);
        
        if (this.onConnected) {
          this.onConnected();
        }
        resolve();
      });

      // 接收消息
      this.socket.onMessage((res) => {
        this._handleMessage(res.data);
      });

      // 连接关闭
      this.socket.onClose((res) => {
        console.log('[IFlytekWS] WebSocket 连接已关闭:', res);
        this.isConnected = false;
        if (this.onDisconnected) {
          this.onDisconnected(res);
        }
      });

      // 连接错误
      this.socket.onError((err) => {
        console.error('[IFlytekWS] WebSocket 错误:', err);
        this.isConnected = false;
        if (this.onError) {
          this.onError(err);
        }
        reject(err);
      });
    });
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.isRecording = false;
  }

  /**
   * 开始录音
   */
  startRecording() {
    if (this.isRecording) {
      console.warn('[IFlytekWS] 录音已在进行中');
      return;
    }

    if (!this.isConnected) {
      console.error('[IFlytekWS] WebSocket 未连接，无法开始录音');
      return;
    }

    // 初始化录音管理器
    this.recorderManager = wx.getRecorderManager();
    this.audioBuffer = [];
    this.frameIndex = 0;

    // 监听录音帧
    this.recorderManager.onFrameRecorded((res) => {
      if (res.isLastFrame) {
        console.log('[IFlytekWS] 收到最后一帧音频');
      }
      
      // 将音频数据转为 Base64 并发送
      const base64Audio = wx.arrayBufferToBase64(res.frameBuffer);
      this._sendAudioFrame(base64Audio, res.isLastFrame);
    });

    // 监听录音停止
    this.recorderManager.onStop((res) => {
      console.log('[IFlytekWS] 录音已停止:', res);
      this.isRecording = false;
      
      // 发送结束帧
      this._sendLastFrame();
      
      if (this.onRecordingStop) {
        this.onRecordingStop(res);
      }
    });

    // 监听录音错误
    this.recorderManager.onError((err) => {
      console.error('[IFlytekWS] 录音错误:', err);
      this.isRecording = false;
      if (this.onError) {
        this.onError(err);
      }
    });

    // 开始录音
    this.recorderManager.start({
      duration: 60000,        // 最大录音时长 60 秒
      sampleRate: AUDIO_CONFIG.sampleRate,
      numberOfChannels: AUDIO_CONFIG.numberOfChannels,
      encodeBitRate: AUDIO_CONFIG.encodeBitRate,
      format: AUDIO_CONFIG.format,
      frameSize: AUDIO_CONFIG.frameSize / 1024, // 转换为 KB
    });

    this.isRecording = true;
    console.log('[IFlytekWS] 录音已开始');
    
    if (this.onRecordingStart) {
      this.onRecordingStart();
    }
  }

  /**
   * 停止录音
   */
  stopRecording() {
    if (!this.isRecording) {
      console.warn('[IFlytekWS] 录音未开始');
      return;
    }

    if (this.recorderManager) {
      this.recorderManager.stop();
    }
  }

  /**
   * 发送第一帧（业务参数）
   */
  _sendFirstFrame(businessParams) {
    const firstFrame = {
      common: {
        app_id: businessParams.appId || '',
      },
      business: {
        category: businessParams.category || 'read_sentence',  // 评测类型
        ent: businessParams.ent || 'cn',                       // 引擎类型
        language: businessParams.language || 'zh_cn',          // 语言
        accent: businessParams.accent || 'mandarin',           // 口音
        domain: businessParams.domain || 'pro',                // 领域
        vad_eos: businessParams.vadEos || 2000,                // 静音检测
        text: businessParams.text || '',                       // 评测文本
        // 更多参数...
      },
      data: {
        status: FRAME_TYPE.FIRST,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
      }
    };

    this._sendMessage(firstFrame);
    console.log('[IFlytekWS] 第一帧（业务参数）已发送');
  }

  /**
   * 发送音频帧
   */
  _sendAudioFrame(base64Audio, isLastFrame) {
    const frame = {
      data: {
        status: isLastFrame ? FRAME_TYPE.LAST : FRAME_TYPE.CONTINUE,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: base64Audio,
      }
    };

    this._sendMessage(frame);
    this.frameIndex++;

    if (this.frameIndex % 50 === 0) {
      console.log(`[IFlytekWS] 已发送 ${this.frameIndex} 帧音频`);
    }
  }

  /**
   * 发送结束帧
   */
  _sendLastFrame() {
    const lastFrame = {
      data: {
        status: FRAME_TYPE.LAST,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: '',
      }
    };

    this._sendMessage(lastFrame);
    console.log('[IFlytekWS] 结束帧已发送');
  }

  /**
   * 发送消息
   */
  _sendMessage(data) {
    if (!this.socket || !this.isConnected) {
      console.error('[IFlytekWS] WebSocket 未连接，无法发送消息');
      return;
    }

    const message = JSON.stringify(data);
    this.socket.send({
      data: message,
      success: () => {
        // 发送成功
      },
      fail: (err) => {
        console.error('[IFlytekWS] 发送消息失败:', err);
      }
    });
  }

  /**
   * 处理接收到的消息
   */
  _handleMessage(data) {
    try {
      // 讯飞返回的数据可能是 JSON 字符串或 Base64 编码的 XML
      let result;
      
      if (typeof data === 'string') {
        // 尝试解析 JSON
        try {
          result = JSON.parse(data);
        } catch (e) {
          // 可能是 Base64 编码的 XML
          console.log('[IFlytekWS] 收到非 JSON 数据，尝试 Base64 解码');
          try {
            const decoded = wx.base64ToArrayBuffer(data);
            const text = String.fromCharCode.apply(null, new Uint8Array(decoded));
            console.log('[IFlytekWS] Base64 解码结果:', text.substring(0, 200));
            result = { xmlResult: text };
          } catch (decodeErr) {
            console.error('[IFlytekWS] 解码失败:', decodeErr);
            result = { rawData: data };
          }
        }
      } else {
        result = data;
      }

      console.log('[IFlytekWS] 收到消息:', result);

      // 检查是否是最终结果
      if (result.data && result.data.result) {
        console.log('[IFlytekWS] 收到评测结果:', result.data.result);
        
        if (this.onResult) {
          this.onResult(result.data.result);
        }
      }

      // 检查是否有错误
      if (result.code !== 0 && result.code !== undefined) {
        console.error('[IFlytekWS] 服务端返回错误:', result);
        if (this.onError) {
          this.onError(result);
        }
      }

    } catch (err) {
      console.error('[IFlytekWS] 处理消息失败:', err);
    }
  }
}

// 导出单例
let instance = null;

/**
 * 获取 WebSocket 管理器实例
 */
export function getIFlytekWS() {
  if (!instance) {
    instance = new IFlytekWebSocket();
  }
  return instance;
}

/**
 * 销毁 WebSocket 管理器实例
 */
export function destroyIFlytekWS() {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}

export default IFlytekWebSocket;
