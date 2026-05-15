// 引入科大讯飞 WebSocket 管理器
import { getIFlytekWS, destroyIFlytekWS } from '../../utils/iflytek-ws.js';
const { get, post, patch } = require('../../utils/request.js');

// Mock 调试开关
const IS_MOCK = true; // TODO: 联调后端时改为 false

// 模拟任务数据 (从 React UI 原型移植)
const MOCK_TASKS = [
  {
    id: 1,
    words: [
      { text: "我", status: "correct" },
      { text: "们", status: "correct" },
      { text: "一", status: "correct" },
      { text: "起", status: "correct" },
      { text: "去", status: "error", pinyin: "qù", ipa: "[tɕʰy⁵¹]", ipaHint: "舌面前部靠近硬腭，气流明显送出。", tone: "四声", diagnosis: "四声降不下去，听起来像一声" },
      { text: "长", status: "correct" },
      { text: "城", status: "correct" }
    ],
    score: 85,
    feedback: "发音不错，注意四声"
  },
  {
    id: 2,
    words: [
      { text: "今", status: "correct" },
      { text: "天", status: "error", pinyin: "tiān", ipa: "[tʰjɛn⁵⁵]", ipaHint: "舌尖轻触上齿龈后送气，韵母口腔要打开。", tone: "一声", diagnosis: "发音位置靠后，口腔不够打开" },
      { text: "天", status: "correct" },
      { text: "气", status: "correct" },
      { text: "真", status: "correct" },
      { text: "不", status: "correct" },
      { text: "错", status: "correct" }
    ],
    score: 72,
    feedback: "还需努力，注意平舌音"
  },
  {
    id: 3,
    words: [
      { text: "中", status: "correct" },
      { text: "文", status: "correct" },
      { text: "很", status: "error", pinyin: "hěn", ipa: "[xən²¹⁴]", ipaHint: "舌根接近软腭形成摩擦，三声要先降后升。", tone: "三声", diagnosis: "三声没有拐弯，发成了半三声" },
      { text: "有", status: "correct" },
      { text: "意", status: "correct" },
      { text: "思", status: "correct" }
    ],
    score: 90,
    feedback: "非常棒，继续保持"
  }
];

Page({
  data: {
    // 加载与错误状态
    isLoading: true,
    errorMessage: '',

    // 任务与句子数据
    taskId: '',
    taskSentenceId: '',
    sentence: {
      content: '',
      pinyin: '',
      id: ''
    },

    // 录音状态
    isRecording: false,
    isEvaluating: false,
    isCompleted: false,

    // 评测结果
    recordId: '',
    totalScore: 0,
    evaluationResult: {
      fluency_score: 0,
      integrity_score: 0,
      phone_score: 0,
      tone_score: 0
    },
    wordResults: [], // 字词级评测结果，用于标色
    taskResults: {},

    // WebSocket 实例
    iFlytekWS: null,
    iflytekAppId: '',

    // ===== React UI 移植过来的状态 =====
    // 导航栏
    navItems: [
      { name: '练习' },
      { name: '复习' },
      { name: '我的' }
    ],
    activeTab: '练习',

    // 题目切换
    tasks: [],
    activeIndex: 0,
    slideDirection: '', // 'left' | 'right' | ''

    // 底部抽屉
    isSheetOpen: false,
    selectedError: null,

    // 动画
    slideAnimation: {},
    
    // 声调曲线图片
    toneScoreImageUrl: ''
  },

  onLoad(options) {
    // 前置路由守卫：Token 校验
    if (!this.checkAuth()) {
      return;
    }

    // 获取页面参数（兼容新的参数格式）
    const {
      task_id,
      taskId,
      sentence_id,
      sentenceId,
      content,
      pinyin
    } = options || {};

    // 使用 task_id 或 taskId，sentence_id 或 sentenceId
    const finalTaskId = task_id || taskId;
    const finalSentenceId = sentence_id || sentenceId;

    if (!finalTaskId || !finalSentenceId) {
      this.setData({
        isLoading: false,
        errorMessage: '缺少必要的任务参数'
      });
      return;
    }

    // 解码 URL 编码的参数，做好空值兜底
    const decodedContent = content ? decodeURIComponent(content) : '你好';
    const decodedPinyin = pinyin ? decodeURIComponent(pinyin) : 'nǐ hǎo';

    this.setData({
      taskId: finalTaskId,
      taskSentenceId: finalSentenceId,
      sentence: {
        content: decodedContent,
        pinyin: decodedPinyin,
        id: finalSentenceId
      },
      // 初始化 React UI 相关数据
      tasks: MOCK_TASKS,
      activeIndex: 0,
      isSheetOpen: false,
      selectedError: null
    });

    // 初始化录音评测流程
    this.initRecord();
  },

  onShow() {
    // 前置路由守卫：Token 校验
    if (!this.checkAuth()) {
      return;
    }
  },

  onUnload() {
    // 页面卸载时清理资源
    this.cleanup();
  },

  // 提取的登录校验方法
  checkAuth() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      wx.reLaunch({
        url: '/pages/login/login'
      });
      return false;
    }
    return true;
  },

  // 清理资源
  cleanup() {
    // 销毁 WebSocket 连接
    destroyIFlytekWS();

    // 重置状态
    this.setData({
      isRecording: false,
      isEvaluating: false
    });
  },

  getDefaultEvaluationResult() {
    return {
      fluency_score: 0,
      integrity_score: 0,
      phone_score: 0,
      tone_score: 0
    };
  },

  getTaskKey(index = this.data.activeIndex) {
    const task = this.data.tasks[index];
    return String((task && task.id) || index);
  },

  getTaskViewState(index = this.data.activeIndex) {
    const taskKey = this.getTaskKey(index);
    const result = this.data.taskResults[taskKey];

    if (!result) {
      return {
        isCompleted: false,
        totalScore: 0,
        evaluationResult: this.getDefaultEvaluationResult(),
        wordResults: []
      };
    }

    return {
      isCompleted: true,
      totalScore: result.totalScore || 0,
      evaluationResult: result.evaluationResult || this.getDefaultEvaluationResult(),
      wordResults: result.wordResults || []
    };
  },

  setCurrentTaskResult(result) {
    const taskKey = this.getTaskKey();
    const taskResults = Object.assign({}, this.data.taskResults, {
      [taskKey]: {
        totalScore: result.totalScore || 0,
        evaluationResult: result.evaluationResult || this.getDefaultEvaluationResult(),
        wordResults: result.wordResults || []
      }
    });

    this.setData(Object.assign({
      taskResults,
      isEvaluating: false
    }, this.getTaskViewStateFromResult(taskResults[taskKey])));
  },

  getTaskViewStateFromResult(result) {
    return {
      isCompleted: true,
      totalScore: result.totalScore || 0,
      evaluationResult: result.evaluationResult || this.getDefaultEvaluationResult(),
      wordResults: result.wordResults || []
    };
  },

  // 初始化录音评测流程
  async initRecord() {
    this.setData({
      isLoading: true,
      errorMessage: '',
      isCompleted: false,
      isEvaluating: false,
      totalScore: 0,
      evaluationResult: {
        fluency_score: 0,
        integrity_score: 0,
        phone_score: 0,
        tone_score: 0
      },
      wordResults: []
    });

    if (IS_MOCK) {
      // Mock 模式：模拟网络延迟，直接返回成功
      setTimeout(() => {
        this.setData({
          recordId: 'mock-record-uuid-123',
          isLoading: false,
          errorMessage: ''
        });
        console.log('[Practice] Mock 模式：初始化成功');
      }, 500);
    } else {
      // 真实模式：调用后端 API
      try {
        // 步骤 1: 调用后端 API 初始化记录，获取 record_id
        const initResult = await this.callInitRecordAPI();

        if (!initResult || !initResult.record_id) {
          throw new Error('初始化记录失败');
        }

        this.setData({
          recordId: initResult.record_id
        });

        // 步骤 2: 获取科大讯飞 WebSocket 鉴权 URL（从后端获取）
        const wssUrl = await this.getIFlytekAuthURL(initResult.record_id);

        // 步骤 3: 建立 WebSocket 连接
        await this.connectIFlytekWS(wssUrl);

        this.setData({
          isLoading: false
        });

      } catch (error) {
        console.error('[Practice] 初始化失败:', error);
        this.setData({
          isLoading: false,
          errorMessage: error.message || '初始化失败，请重试'
        });
      }
    }
  },

  // 调用后端 API 初始化记录
  callInitRecordAPI() {
    const userId = wx.getStorageSync('user_info')?.id;

    return post('/records/init', {
      task_sentence_id: this.data.taskSentenceId,
      student_id: userId
    }).then((res) => {
      if (!res || !res.data) {
        throw new Error('初始化记录失败');
      }

      return res.data;
    });
  },

  // 获取科大讯飞 WebSocket 鉴权 URL
  getIFlytekAuthURL(recordId) {
    return get('/iflytek/auth', { service: 'cpa' }).then((res) => {
      if (!res || !res.data || !res.data.url) {
        throw new Error('获取讯飞鉴权 URL 失败');
      }

      this.setData({
        iflytekAppId: res.data.app_id || ''
      });

      return res.data.url;
    });
  },

  // 连接科大讯飞 WebSocket
  connectIFlytekWS(wssUrl) {
    return new Promise((resolve, reject) => {
      const iFlytekWS = getIFlytekWS();

      // 设置回调函数
      iFlytekWS.onConnected = () => {
        console.log('[Practice] WebSocket 已连接');
        resolve();
      };

      iFlytekWS.onError = (err) => {
        console.error('[Practice] WebSocket 错误:', err);
        reject(err);
      };

      iFlytekWS.onResult = (result) => {
        this.handleEvaluationResult(result);
      };

      iFlytekWS.onRecordingStart = () => {
        this.setData({ isRecording: true });
      };

      iFlytekWS.onRecordingStop = () => {
        this.setData({
          isRecording: false,
          isEvaluating: true
        });
      };

      // 建立连接
      const businessParams = {
        appId: this.data.iflytekAppId,
        text: this.data.sentence.content,
        category: 'read_sentence',
        ent: 'cn',
        language: 'zh_cn',
        accent: 'mandarin'
      };

      iFlytekWS.connect(wssUrl, businessParams)
        .then(() => {
          this.setData({ iFlytekWS });
        })
        .catch(reject);
    });
  },

  // 处理评测结果
  handleEvaluationResult(result) {
    console.log('[Practice] 收到评测结果:', result);

    // 解析讯飞返回的评测结果
    let evaluationData = result;

    // 如果结果是 XML 格式，需要解析
    if (result.xmlResult) {
      evaluationData = this.parseXMLResult(result.xmlResult);
    }

    // 提取分数
    const totalScore = evaluationData.total_score || evaluationData.totalScore || 0;
    const fluencyScore = evaluationData.fluency_score || 0;
    const integrityScore = evaluationData.integrity_score || 0;
    const phoneScore = evaluationData.phone_score || 0;
    const toneScore = evaluationData.tone_score || 0;

    // 提取字词级结果（用于标色）
    let wordResults = [];
    if (evaluationData.words || evaluationData.word_results) {
      wordResults = evaluationData.words || evaluationData.word_results;
    }

    const taskKey = this.getTaskKey();

    this.setCurrentTaskResult({
      totalScore: Math.round(totalScore),
      evaluationResult: {
        fluency_score: Math.round(fluencyScore),
        integrity_score: Math.round(integrityScore),
        phone_score: Math.round(phoneScore),
        tone_score: Math.round(toneScore)
      },
      wordResults: wordResults
    });

    this.saveEvaluationResult({
      total_score: totalScore,
      fluency_score: fluencyScore,
      integrity_score: integrityScore,
      phone_score: phoneScore,
      tone_score: toneScore,
      words: wordResults
    }).then(() => {
      this.confirmEvaluationResult(taskKey);
    }).catch((err) => {
      console.error('[Practice] 保存评测结果失败:', err);
      wx.showToast({
        title: '成绩保存失败',
        icon: 'none'
      });
    });
  },

  saveEvaluationResult(evaluationDetails) {
    const userId = wx.getStorageSync('user_info')?.id;

    return patch(`/records/${this.data.recordId}`, {
      student_id: userId,
      total_score: Number(evaluationDetails.total_score) || 0,
      evaluation_details: {
        total_score: Number(evaluationDetails.total_score) || 0,
        fluency_score: Number(evaluationDetails.fluency_score) || 0,
        integrity_score: Number(evaluationDetails.integrity_score) || 0,
        phone_score: Number(evaluationDetails.phone_score) || 0,
        tone_score: Number(evaluationDetails.tone_score) || 0,
        words: evaluationDetails.words || []
      }
    });
  },

  // 解析 XML 格式的评测结果
  parseXMLResult(xmlString) {
    // 简单的 XML 解析，实际项目中可能需要更完善的解析逻辑
    const result = {
      total_score: 0,
      fluency_score: 0,
      integrity_score: 0,
      phone_score: 0,
      tone_score: 0,
      words: []
    };

    try {
      // 提取总分
      const totalMatch = xmlString.match(/total_score=["'](\d+)["']/);
      if (totalMatch) result.total_score = parseInt(totalMatch[1]);

      // 提取流利度
      const fluencyMatch = xmlString.match(/fluency_score=["'](\d+)["']/);
      if (fluencyMatch) result.fluency_score = parseInt(fluencyMatch[1]);

      // 提取完整度
      const integrityMatch = xmlString.match(/integrity_score=["'](\d+)["']/);
      if (integrityMatch) result.integrity_score = parseInt(integrityMatch[1]);

      // 提取准确度
      const phoneMatch = xmlString.match(/phone_score=["'](\d+)["']/);
      if (phoneMatch) result.phone_score = parseInt(phoneMatch[1]);

      // 提取声调
      const toneMatch = xmlString.match(/tone_score=["'](\d+)["']/);
      if (toneMatch) result.tone_score = parseInt(toneMatch[1]);

    } catch (e) {
      console.error('[Practice] XML 解析失败:', e);
    }

    return result;
  },

  // 确认评测结果已保存
  confirmEvaluationResult(taskKey = this.getTaskKey()) {
    const userId = wx.getStorageSync('user_info')?.id;

    get(`/records/${this.data.recordId}`, { student_id: userId })
      .then((res) => {
        const recordData = res && res.data;

        if (recordData && recordData.evaluation_details && recordData.evaluation_details.words) {
          const taskResults = Object.assign({}, this.data.taskResults);
          const currentResult = taskResults[taskKey] || {
            totalScore: this.data.totalScore,
            evaluationResult: this.data.evaluationResult,
            wordResults: []
          };

          taskResults[taskKey] = Object.assign({}, currentResult, {
            wordResults: recordData.evaluation_details.words
          });

          const updates = { taskResults };
          if (this.getTaskKey() === taskKey) {
            updates.wordResults = recordData.evaluation_details.words;
          }

          this.setData(updates);
        }
      })
      .catch((err) => {
        console.warn('[Practice] 确认评测结果失败:', err);
      });
  },

  // ========== React UI 移植过来的方法 ==========

  // 导航栏切换
  onNavTabTap(e) {
    const { name } = e.currentTarget.dataset;
    this.setData({ activeTab: name });

    // 可以在这里添加页面跳转逻辑
    if (name === '复习') {
      wx.navigateTo({ url: '/pages/review/review' });
    } else if (name === '我的') {
      wx.navigateTo({ url: '/pages/profile/profile' });
    }
  },

  // 题目切换 - 下一题
  handleNext() {
    const { activeIndex, tasks } = this.data;
    if (activeIndex < tasks.length - 1) {
      // 创建滑动动画
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease'
      });
      animation.translateX(-100).opacity(0).step();

      this.setData({
        slideDirection: 'left',
        slideAnimation: animation.export()
      });

      // 延迟切换数据
      setTimeout(() => {
        const nextIndex = activeIndex + 1;
        this.setData(Object.assign({
          activeIndex: nextIndex,
          isSheetOpen: false,
          selectedError: null
        }, this.getTaskViewState(nextIndex)));

        // 恢复动画
        const resetAnimation = wx.createAnimation({
          duration: 0
        });
        resetAnimation.translateX(100).opacity(0).step();

        const enterAnimation = wx.createAnimation({
          duration: 300,
          timingFunction: 'ease'
        });
        enterAnimation.translateX(0).opacity(1).step();

        this.setData({
          slideAnimation: resetAnimation.export()
        });

        setTimeout(() => {
          this.setData({
            slideAnimation: enterAnimation.export(),
            slideDirection: ''
          });
        }, 50);
      }, 300);
    }
  },

  // 题目切换 - 上一题
  handlePrev() {
    const { activeIndex } = this.data;
    if (activeIndex > 0) {
      // 创建滑动动画
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease'
      });
      animation.translateX(100).opacity(0).step();

      this.setData({
        slideDirection: 'right',
        slideAnimation: animation.export()
      });

      // 延迟切换数据
      setTimeout(() => {
        const prevIndex = activeIndex - 1;
        this.setData(Object.assign({
          activeIndex: prevIndex,
          isSheetOpen: false,
          selectedError: null
        }, this.getTaskViewState(prevIndex)));

        // 恢复动画
        const resetAnimation = wx.createAnimation({
          duration: 0
        });
        resetAnimation.translateX(-100).opacity(0).step();

        const enterAnimation = wx.createAnimation({
          duration: 300,
          timingFunction: 'ease'
        });
        enterAnimation.translateX(0).opacity(1).step();

        this.setData({
          slideAnimation: resetAnimation.export()
        });

        setTimeout(() => {
          this.setData({
            slideAnimation: enterAnimation.export(),
            slideDirection: ''
          });
        }, 50);
      }, 300);
    }
  },

  // 点击错字打开抽屉
  handleWordClick(e) {
    if (!this.data.isCompleted) {
      return;
    }

    const { word } = e.currentTarget.dataset;
    if (word && word.status === 'error') {
      const ipaInfo = this.getIpaInfo(word);

      this.setData({
        selectedError: Object.assign({}, word, ipaInfo),
        isSheetOpen: true
      });

      // 绘制声调曲线
      setTimeout(() => {
        this.drawToneCurve();
      }, 300);
    }
  },

  // 关闭抽屉
  closeSheet() {
    this.setData({
      isSheetOpen: false,
      selectedError: null
    });
  },

  getIpaInfo(word = {}) {
    const fallbackMap = {
      '去': {
        ipa: '[tɕʰy⁵¹]',
        ipaHint: '舌面前部靠近硬腭，气流明显送出。'
      },
      '天': {
        ipa: '[tʰjɛn⁵⁵]',
        ipaHint: '舌尖轻触上齿龈后送气，韵母口腔要打开。'
      },
      '很': {
        ipa: '[xən²¹⁴]',
        ipaHint: '舌根接近软腭形成摩擦，三声要先降后升。'
      }
    };

    const fallback = fallbackMap[word.text] || {
      ipa: '[tɕʰy⁵¹]',
      ipaHint: '对照拼音看声母、韵母和声调，重点留意舌位与气流。'
    };

    return {
      ipa: word.ipa || fallback.ipa,
      ipaHint: word.ipaHint || word.ipa_hint || fallback.ipaHint
    };
  },

  // 绘制声调曲线
  drawToneCurve() {
    const query = wx.createSelectorQuery();
    query.select('#toneCurve')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const width = res[0].width;
        const height = res[0].height;

        // 设置 canvas 尺寸
        canvas.width = width;
        canvas.height = height;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 绘制标准音高曲线（虚线）
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(10, height * 0.2);
        ctx.quadraticCurveTo(width * 0.5, height * 0.4, width - 10, height * 0.8);
        ctx.stroke();

        // 绘制用户发音曲线（实线）
        ctx.beginPath();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.moveTo(10, height * 0.3);
        ctx.quadraticCurveTo(width * 0.5, height * 0.36, width - 10, height * 0.5);
        ctx.stroke();

        // 将 Canvas 转换为临时图片
        wx.canvasToTempFilePath({
          canvas: canvas,
          fileType: 'png',
          success: (res) => {
            console.log('[Practice] Canvas 转换为图片成功:', res.tempFilePath);
            this.setData({
              toneScoreImageUrl: res.tempFilePath
            });
          },
          fail: (err) => {
            console.error('[Practice] Canvas 转换为图片失败:', err);
          }
        });
      });
  },

  // Canvas 准备就绪
  onCanvasReady() {
    // Canvas 准备就绪时绘制
    if (this.data.selectedError) {
      this.drawToneCurve();
    }
  },

  // 播放错字音频
  playErrorAudio() {
    const { selectedError } = this.data;
    if (selectedError) {
      wx.showToast({
        title: `播放 ${selectedError.text} 发音`,
        icon: 'none'
      });
      // 这里可以调用 TTS 接口播放音频
    }
  },

  // 播放视频
  playVideo() {
    const { selectedError } = this.data;
    if (selectedError) {
      wx.showToast({
        title: `播放 ${selectedError.pinyin} 口型视频`,
        icon: 'none'
      });
      // 这里可以调用视频播放逻辑
    }
  },

  // ========== 原有录音相关方法 ==========

  // 开始录音（按住录音按钮）
  handleRecordStart() {
    if (this.data.isCompleted) {
      return;
    }

    // 立即更新录音状态，提供视觉反馈
    this.setData({ isRecording: true });

    // Mock 模式：直接跳过 WebSocket 连接检查，触发模拟评测
    if (IS_MOCK) {
      console.log('[Practice] Mock 模式：模拟开始录音');
      return;
    }

    // 真实模式：检查 WebSocket 连接
    const { iFlytekWS } = this.data;

    if (!iFlytekWS || !iFlytekWS.isConnected) {
      wx.showToast({
        title: '连接未就绪',
        icon: 'none'
      });
      this.setData({ isRecording: false });
      return;
    }

    // 开始录音
    iFlytekWS.startRecording();
  },

  // 停止录音（松开录音按钮）
  handleRecordStop() {
    if (this.data.isCompleted) {
      return;
    }

    // 立即更新录音状态
    this.setData({ isRecording: false });

    // Mock 模式：模拟评测逻辑
    if (IS_MOCK) {
      console.log('[Practice] Mock 模式：模拟停止录音，开始评测');
      this.setData({ isEvaluating: true });
      
      // 模拟评测倒计时
      setTimeout(() => {
        // 模拟评测结果
        this.setCurrentTaskResult({
          totalScore: 85,
          evaluationResult: {
            fluency_score: 80,
            integrity_score: 90,
            phone_score: 85,
            tone_score: 80
          },
          wordResults: [
            { text: "我", status: "correct" },
            { text: "们", status: "correct" },
            { text: "一", status: "correct" },
            { text: "起", status: "correct" },
            { text: "去", status: "error", pinyin: "qù", ipa: "[tɕʰy⁵¹]", ipaHint: "舌面前部靠近硬腭，气流明显送出。", tone: "四声", diagnosis: "四声降不下去，听起来像一声" },
            { text: "长", status: "correct" },
            { text: "城", status: "correct" }
          ]
        });
      }, 2000);
      return;
    }

    // 真实模式：停止录音
    const { iFlytekWS } = this.data;

    if (iFlytekWS && iFlytekWS.isRecording) {
      iFlytekWS.stopRecording();
    }
  },

  // 兼容旧的事件名（开始录音）
  onRecordStart() {
    this.handleRecordStart();
  },

  // 兼容旧的事件名（停止录音）
  onRecordStop() {
    this.handleRecordStop();
  },

  // 播放标准音频
  onPlayStandardAudio() {
    wx.showToast({
      title: '标准音频接口待接入',
      icon: 'none'
    });
  },

  // 返回任务列表
  onBackToTasks() {
    wx.navigateBack();
  },

  // 重新练习
  onRetry() {
    // 清理当前状态
    this.cleanup();

    const taskKey = this.getTaskKey();
    const taskResults = Object.assign({}, this.data.taskResults);
    delete taskResults[taskKey];

    this.setData({
      taskResults,
      isSheetOpen: false,
      selectedError: null
    });

    // 重新初始化
    this.initRecord();
  },

  // 查看详情报告
  onViewReport() {
    wx.navigateTo({
      url: `/pages/report/report?record_id=${this.data.recordId}`
    });
  }
});
