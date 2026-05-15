/**
 * 录音 Hook 单元测试
 */

import { renderHook, act } from '@testing-library/react'
import { useRecording } from '../use-recording'

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) {
      this.onstop()
    }
  }

  pause() {
    this.state = 'paused'
  }

  resume() {
    this.state = 'recording'
  }
}

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    }),
  },
  writable: true,
})

// Mock MediaRecorder globally
global.MediaRecorder = MockMediaRecorder as any

describe('useRecording', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该初始化状态', () => {
    const { result } = renderHook(() => useRecording())

    expect(result.current.isRecording).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.recordingTime).toBe(0)
    expect(result.current.audioBlob).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('应该开始录音', async () => {
    const { result } = renderHook(() => useRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(true)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('应该暂停录音', async () => {
    const { result } = renderHook(() => useRecording())

    await act(async () => {
      await result.current.startRecording()
      result.current.pauseRecording()
    })

    expect(result.current.isRecording).toBe(true)
    expect(result.current.isPaused).toBe(true)
  })

  it('应该恢复录音', async () => {
    const { result } = renderHook(() => useRecording())

    await act(async () => {
      await result.current.startRecording()
      result.current.pauseRecording()
      result.current.resumeRecording()
    })

    expect(result.current.isRecording).toBe(true)
    expect(result.current.isPaused).toBe(false)
  })

  it('应该停止录音', async () => {
    const { result } = renderHook(() => useRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    // 模拟录制数据
    const mockBlob = new Blob(['audio data'], { type: 'audio/wav' })
    const mediaRecorder = (global.MediaRecorder as any).mock?.instances?.[0]
    
    if (mediaRecorder && mediaRecorder.ondataavailable) {
      mediaRecorder.ondataavailable({ data: mockBlob })
    }

    await act(async () => {
      await result.current.stopRecording()
    })

    expect(result.current.isRecording).toBe(false)
  })

  it('应该重置状态', async () => {
    const { result } = renderHook(() => useRecording())

    await act(async () => {
      await result.current.startRecording()
      result.current.resetRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.recordingTime).toBe(0)
    expect(result.current.audioBlob).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('应该处理录音错误', async () => {
    // Mock getUserMedia to fail
    jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValueOnce(
      new Error('Permission denied')
    )

    const { result } = renderHook(() => useRecording())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.isRecording).toBe(false)
  })

  it('应该限制最大录音时长', async () => {
    jest.useFakeTimers()
    
    const { result } = renderHook(() => useRecording({ maxDuration: 5 }))

    await act(async () => {
      await result.current.startRecording()
    })

    // 快进 6 秒
    act(() => {
      jest.advanceTimersByTime(6000)
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.recordingTime).toBeLessThanOrEqual(5)

    jest.useRealTimers()
  })
})
