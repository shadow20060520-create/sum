/**
 * 音频工具函数单元测试
 * 测试录音、音频处理和评测相关的工具函数
 */

import {
  formatDuration,
  validateAudioFile,
  calculateAudioScore,
  extractPhonemeErrors,
  type AudioValidationResult,
  type EvaluationResult,
} from '../audio-utils'

describe('Audio Utils', () => {
  describe('formatDuration', () => {
    it('应该正确格式化秒数为 MM:SS 格式', () => {
      expect(formatDuration(0)).toBe('00:00')
      expect(formatDuration(30)).toBe('00:30')
      expect(formatDuration(60)).toBe('01:00')
      expect(formatDuration(90)).toBe('01:30')
      expect(formatDuration(3661)).toBe('61:01')
    })

    it('应该处理负数输入', () => {
      expect(formatDuration(-10)).toBe('00:00')
    })

    it('应该处理小数输入', () => {
      expect(formatDuration(65.5)).toBe('01:05')
    })
  })

  describe('validateAudioFile', () => {
    it('应该验证有效的音频文件', () => {
      const validFile = new File(['audio data'], 'test.wav', {
        type: 'audio/wav',
      })
      const result: AudioValidationResult = validateAudioFile(validFile)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该拒绝过大的文件', () => {
      const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'large.wav', {
        type: 'audio/wav',
      })
      const result: AudioValidationResult = validateAudioFile(largeFile, {
        maxSize: 10 * 1024 * 1024, // 10MB
      })

      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe(500004) // RECORD_TOO_LARGE
    })

    it('应该拒绝不支持的格式', () => {
      const invalidFile = new File(['data'], 'test.mp3', {
        type: 'audio/mp3',
      })
      const result: AudioValidationResult = validateAudioFile(invalidFile, {
        allowedTypes: ['audio/wav', 'audio/webm'],
      })

      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe(500005) // RECORD_FORMAT_INVALID
    })

    it('应该拒绝空文件', () => {
      const emptyFile = new File([], 'empty.wav', { type: 'audio/wav' })
      const result: AudioValidationResult = validateAudioFile(emptyFile)

      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe(500002) // RECORD_AUDIO_INVALID
    })
  })

  describe('calculateAudioScore', () => {
    it('应该正确计算综合得分', () => {
      const result: EvaluationResult = {
        accuracy_score: 85,
        fluency_score: 90,
        completeness_score: 80,
      }

      const score = calculateAudioScore(result)
      expect(score).toBe(85) // (85 + 90 + 80) / 3 = 85
    })

    it('应该处理缺失的分数', () => {
      const result: EvaluationResult = {
        accuracy_score: 85,
      }

      const score = calculateAudioScore(result)
      expect(score).toBe(85)
    })

    it('应该处理所有分数缺失的情况', () => {
      const result: EvaluationResult = {}
      const score = calculateAudioScore(result)
      expect(score).toBe(0)
    })

    it('应该限制分数在 0-100 范围内', () => {
      const result: EvaluationResult = {
        accuracy_score: 150,
        fluency_score: -10,
      }

      const score = calculateAudioScore(result)
      expect(score).toBe(70) // (100 + 0) / 2 = 50，但应该被限制
    })
  })

  describe('extractPhonemeErrors', () => {
    it('应该提取音素错误', () => {
      const evaluationDetails = {
        sentence: '你好世界',
        word_scores: [
          { word: '你', score: 85, phonemes: [{ phoneme: 'n', score: 90 }, { phoneme: 'i', score: 80 }] },
          { word: '好', score: 70, phonemes: [{ phoneme: 'h', score: 60 }, { phoneme: 'ao', score: 80 }] },
          { word: '世', score: 90, phonemes: [{ phoneme: 'sh', score: 95 }, { phoneme: 'i', score: 85 }] },
          { word: '界', score: 75, phonemes: [{ phoneme: 'j', score: 70 }, { phoneme: 'ie', score: 80 }] },
        ],
      }

      const errors = extractPhonemeErrors(evaluationDetails, 80)

      expect(errors).toHaveLength(3)
      expect(errors[0]).toMatchObject({
        word: '你',
        phoneme: 'i',
        score: 80,
      })
      expect(errors[1]).toMatchObject({
        word: '好',
        phoneme: 'h',
        score: 60,
      })
    })

    it('应该处理空数据', () => {
      const errors = extractPhonemeErrors(null, 80)
      expect(errors).toEqual([])
    })

    it('应该根据阈值过滤错误', () => {
      const evaluationDetails = {
        word_scores: [
          { word: '测', score: 85, phonemes: [{ phoneme: 'c', score: 85 }] },
          { word: '试', score: 95, phonemes: [{ phoneme: 'sh', score: 95 }] },
        ],
      }

      const errors = extractPhonemeErrors(evaluationDetails, 90)
      expect(errors).toHaveLength(0)
    })
  })
})
