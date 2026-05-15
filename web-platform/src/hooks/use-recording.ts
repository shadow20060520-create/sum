/**
 * 录音 Hook
 * 管理录音状态和操作
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { BaseErrorCodes } from '../../../shared/errors/error-codes'

export interface UseRecordingOptions {
  maxDuration?: number // 最大录音时长（秒），默认 60
  mimeType?: string // 音频 MIME 类型
}

export interface UseRecordingReturn {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  audioBlob: Blob | null
  audioUrl: string | null
  error: Error | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
}

export function useRecording(options: UseRecordingOptions = {}): UseRecordingReturn {
  const { maxDuration = 60, mimeType = 'audio/webm' } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 清理函数
  const cleanup = useCallback(() => {
    // 停止计时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // 停止 MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        // 忽略停止错误
      }
    }

    // 停止所有音轨
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // 释放音频 URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setAudioBlob(null)
      setAudioUrl(null)
      chunksRef.current = []

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder

      // 收集音频数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // 录音停止处理
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setIsRecording(false)
        setIsPaused(false)
      }

      // 开始录音
      mediaRecorder.start(100) // 每 100ms 收集一次数据
      setIsRecording(true)
      setRecordingTime(0)

      // 启动计时器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          // 检查是否达到最大时长
          if (newTime >= maxDuration) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('录音启动失败')
      setError(error)
      setIsRecording(false)
      cleanup()
    }
  }, [maxDuration, mimeType, cleanup])

  // 停止录音
  const stopRecording = useCallback(async () => {
    cleanup()
  }, [cleanup])

  // 暂停录音
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      // 暂停计时器
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  // 恢复录音
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      // 恢复计时器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          if (newTime >= maxDuration) {
            stopRecording()
          }
          return newTime
        })
      }, 1000)
    }
  }, [maxDuration, stopRecording])

  // 重置录音
  const resetRecording = useCallback(() => {
    cleanup()
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    setAudioBlob(null)
    setAudioUrl(null)
    setError(null)
    chunksRef.current = []
  }, [cleanup])

  return {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  }
}
