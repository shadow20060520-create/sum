/**
 * 音频工具函数
 * 处理录音、音频验证、评测结果计算等
 */

import { BaseErrorCodes, AppError } from '../../../shared/errors/error-codes'

/**
 * 音频验证结果
 */
export interface AudioValidationResult {
  valid: boolean
  error?: {
    code: number
    message: string
  }
}

/**
 * 音频验证选项
 */
export interface AudioValidationOptions {
  maxSize?: number // 最大文件大小 (字节)，默认 10MB
  allowedTypes?: string[] // 允许的 MIME 类型
  minDuration?: number // 最小时长 (秒)
  maxDuration?: number // 最大时长 (秒)
}

/**
 * 评测结果
 */
export interface EvaluationResult {
  overall_score?: number
  accuracy_score?: number
  fluency_score?: number
  completeness_score?: number
}

/**
 * 音素错误
 */
export interface PhonemeError {
  word: string
  phoneme: string
  score: number
  expected?: string
}

/**
 * 格式化时长为 MM:SS 格式
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '00:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 验证音频文件
 */
export function validateAudioFile(
  file: File,
  options: AudioValidationOptions = {}
): AudioValidationResult {
  const {
    maxSize = 10 * 1024 * 1024, // 默认 10MB
    allowedTypes = ['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mpeg'],
    minDuration,
    maxDuration,
  } = options

  // 检查文件是否存在
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: {
        code: BaseErrorCodes.RECORD_AUDIO_INVALID.code,
        message: BaseErrorCodes.RECORD_AUDIO_INVALID.message,
      },
    }
  }

  // 检查文件大小
  if (file.size > maxSize) {
    return {
      valid: false,
      error: {
        code: BaseErrorCodes.RECORD_TOO_LARGE.code,
        message: `音频文件过大，最大支持 ${Math.round(maxSize / 1024 / 1024)}MB`,
      },
    }
  }

  // 检查文件类型
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: {
        code: BaseErrorCodes.RECORD_FORMAT_INVALID.code,
        message: `不支持的音频格式: ${file.type}，请使用 ${allowedTypes.join(', ')}`,
      },
    }
  }

  return { valid: true }
}

/**
 * 计算音频综合得分
 */
export function calculateAudioScore(result: EvaluationResult): number {
  const scores: number[] = []

  if (result.accuracy_score !== undefined) {
    scores.push(clampScore(result.accuracy_score))
  }
  if (result.fluency_score !== undefined) {
    scores.push(clampScore(result.fluency_score))
  }
  if (result.completeness_score !== undefined) {
    scores.push(clampScore(result.completeness_score))
  }

  if (scores.length === 0) {
    return 0
  }

  const sum = scores.reduce((acc, score) => acc + score, 0)
  return Math.round(sum / scores.length)
}

/**
 * 限制分数在 0-100 范围内
 */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score))
}

/**
 * 提取音素错误
 */
export function extractPhonemeErrors(
  evaluationDetails: any,
  threshold: number = 80
): PhonemeError[] {
  if (!evaluationDetails || !evaluationDetails.word_scores) {
    return []
  }

  const errors: PhonemeError[] = []

  for (const wordScore of evaluationDetails.word_scores) {
    if (!wordScore.phonemes) continue

    for (const phoneme of wordScore.phonemes) {
      if (phoneme.score < threshold) {
        errors.push({
          word: wordScore.word,
          phoneme: phoneme.phoneme,
          score: phoneme.score,
          expected: phoneme.expected,
        })
      }
    }
  }

  return errors
}

/**
 * 获取评分等级
 */
export function getScoreLevel(score: number): {
  level: 'excellent' | 'good' | 'average' | 'poor'
  label: string
  color: string
} {
  if (score >= 90) {
    return { level: 'excellent', label: '优秀', color: '#10b981' }
  } else if (score >= 80) {
    return { level: 'good', label: '良好', color: '#3b82f6' }
  } else if (score >= 60) {
    return { level: 'average', label: '及格', color: '#f59e0b' }
  } else {
    return { level: 'poor', label: '需改进', color: '#f43f5e' }
  }
}

/**
 * 格式化评测详情为可读文本
 */
export function formatEvaluationDetails(details: any): string {
  if (!details) return ''

  const parts: string[] = []

  if (details.accuracy_score !== undefined) {
    parts.push(`准确度: ${details.accuracy_score}分`)
  }
  if (details.fluency_score !== undefined) {
    parts.push(`流利度: ${details.fluency_score}分`)
  }
  if (details.completeness_score !== undefined) {
    parts.push(`完整度: ${details.completeness_score}分`)
  }

  return parts.join('，')
}

/**
 * 生成录音文件名
 */
export function generateAudioFileName(
  studentId: string,
  taskId: string,
  sentenceIndex: number
): string {
  const timestamp = Date.now()
  return `${studentId}_${taskId}_${sentenceIndex}_${timestamp}.wav`
}

/**
 * 计算录音时长
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    })

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取音频时长'))
    })

    audio.src = url
  })
}

/**
 * 压缩音频文件 (使用 Web Audio API)
 */
export async function compressAudio(
  file: File,
  targetSize: number = 5 * 1024 * 1024
): Promise<Blob> {
  // 这是一个简化实现，实际项目中可能需要使用更复杂的音频处理库
  // 如 lamejs 或 ffmpeg.wasm
  
  if (file.size <= targetSize) {
    return file
  }

  // 如果文件仍然太大，返回原文件（实际应该进行压缩）
  console.warn('Audio compression not implemented, returning original file')
  return file
}
