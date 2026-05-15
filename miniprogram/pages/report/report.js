/**
 * 评测详情报告页
 * 展示评测结果、音高曲线、舌位教学视频
 */

import { getVideoUrl } from '../../utils/video-mapping';
const { get } = require('../../utils/request.js');

Page({
  data: {
    // 页面状态
    isLoading: true,
    errorMessage: '',

    // 记录数据
    recordId: '',
    record: null,
    evaluationDetails: null,

    // 评测结果
    totalScore: 0,
    fluencyScore: 0,
    integrityScore: 0,
    phoneScore: 0,
    toneScore: 0,
    wordResults: [],

    // 视频相关
    recommendedVideos: [],
    currentVideoIndex: 0,
    currentVideoUrl: '',

    // 音高曲线数据（预留）
    pitchData: {
      standard: [],
      user: [],
    },
  },

  onLoad(options) {
    const record_id = options.record_id || options.recordId;

    if (!record_id) {
      this.setData({
        isLoading: false,
        errorMessage: '缺少记录 ID',
      });
      return;
    }

    this.setData({ recordId: record_id });
    this.loadRecordData(record_id);
  },

  /**
   * 加载记录数据
   */
  async loadRecordData(recordId) {
    try {
      this.setData({ isLoading: true, errorMessage: '' });

      const userId = wx.getStorageSync('user_info')?.id;
      const result = await get(`/records/${recordId}`, { student_id: userId });
      const record = result.data;
      const evaluationDetails = record.evaluation_details || {};

      this.setData({
        isLoading: false,
        record,
        evaluationDetails,
        totalScore: Math.round(evaluationDetails.total_score || record.total_score || 0),
        fluencyScore: Math.round(evaluationDetails.fluency_score || 0),
        integrityScore: Math.round(evaluationDetails.integrity_score || 0),
        phoneScore: Math.round(evaluationDetails.phone_score || 0),
        toneScore: Math.round(evaluationDetails.tone_score || 0),
        wordResults: evaluationDetails.words || [],
      });

      // 获取推荐视频
      this.loadRecommendedVideos(evaluationDetails);

    } catch (err) {
      console.error('[Report] 加载记录失败:', err);
      this.setData({
        isLoading: false,
        errorMessage: err.message || '加载失败',
      });
    }
  },

  onRetryLoad() {
    if (this.data.recordId) {
      this.loadRecordData(this.data.recordId);
    }
  },

  /**
   * 加载推荐视频
   */
  loadRecommendedVideos(evaluationDetails) {
    // 提取错误拼音并获取对应视频
    const videos = [];

    // 遍历每个字的评测结果
    const words = Array.isArray(evaluationDetails.words) ? evaluationDetails.words : [];

    words.forEach((word) => {
      const hasError = word.dp_message !== '0' || (word.tone_score !== undefined && word.tone_score < 70);

      if (hasError && word.content) {
        // 简化处理：根据错误类型推荐视频
        // 实际应该根据拼音解析出声母/韵母

        // 示例：如果 "气" 读错了，推荐声母 "q" 的视频
        if (word.content === '气') {
          const videoUrl = getVideoUrl('b'); // 测试用，实际应该是 'q'
          if (videoUrl) {
            videos.push({
              phoneme: 'b',
              type: 'initial',
              word: word.content,
              url: videoUrl,
              score: word.total_score,
              description: '双唇不送气清塞音',
            });
          }
        }
      }
    });

    // 如果没有错误，显示默认视频
    if (videos.length === 0) {
      const defaultUrl = getVideoUrl('b');
      if (defaultUrl) {
        videos.push({
          phoneme: 'b',
          type: 'initial',
          word: '示例',
          url: defaultUrl,
          score: 100,
          description: '双唇不送气清塞音（测试视频）',
        });
      }
    }

    this.setData({
      recommendedVideos: videos,
      currentVideoUrl: videos.length > 0 ? videos[0].url : '',
    });
  },

  /**
   * 切换视频
   */
  onSwitchVideo(e) {
    const { index } = e.currentTarget.dataset;
    const video = this.data.recommendedVideos[index];

    if (video && video.url) {
      this.setData({
        currentVideoIndex: index,
        currentVideoUrl: video.url,
      });
    }
  },

  /**
   * 视频播放错误
   */
  onVideoError(e) {
    console.error('[Report] 视频播放错误:', e);
    wx.showToast({
      title: '视频加载失败',
      icon: 'none',
    });
  },

  /**
   * 返回练习页
   */
  onBackToPractice() {
    wx.navigateBack();
  },

  /**
   * 重新练习
   */
  onRetry() {
    wx.navigateBack();
  },

  /**
   * 获取单字样式类
   */
  getWordClass(word) {
    const dpMessage = word.dp_message || '0';
    const toneScore = word.tone_score || 0;
    const isCorrect = dpMessage === '0' && toneScore >= 70;
    return isCorrect ? 'word-correct' : 'word-error';
  },

  /**
   * 获取分数样式类
   */
  getScoreClass(score) {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 70) return 'score-pass';
    return 'score-fail';
  },
});
