"use client"

import { useState, useRef, useCallback } from "react"

// ============================================
// Types
// ============================================
export type RecordingState = "idle" | "recording" | "paused" | "stopping"

interface UseScreenRecorderOptions {
  spaceName: string
  onError?: (error: string) => void
}

interface UseScreenRecorderReturn {
  /** 현재 녹화 상태 */
  recordingState: RecordingState
  /** 녹화 시간 (초) */
  recordingTime: number
  /** 녹화 시작 */
  startRecording: (screenTrack: MediaStreamTrack, audioTrack?: MediaStreamTrack) => Promise<void>
  /** 녹화 중지 및 저장 */
  stopRecording: () => Promise<void>
  /** 녹화 일시정지/재개 */
  togglePause: () => void
  /** 에러 메시지 */
  error: string | null
}

// ============================================
// Utilities
// ============================================

/**
 * 파일명 생성: YYYY_MM_DD_HH-MM-SS_공간이름.webm
 * (콜론은 파일명에 사용 불가하므로 하이픈으로 대체)
 */
function generateFileName(spaceName: string): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, "0")

  const dateStr = `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}`
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

  // 파일명에 사용 불가한 문자 제거
  const safeName = spaceName.replace(/[<>:"/\\|?*]/g, "_").trim() || "recording"

  return `${dateStr}_${timeStr}_${safeName}.webm`
}

/**
 * File System Access API 지원 여부 확인
 */
function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window
}

/**
 * 파일 저장 (File System Access API 또는 다운로드 폴백)
 */
async function saveFile(blob: Blob, fileName: string): Promise<void> {
  if (supportsFileSystemAccess() && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "WebM Video",
            accept: { "video/webm": [".webm"] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err) {
      // 사용자가 취소하거나 에러 발생 시 다운로드 폴백
      if ((err as Error).name === "AbortError") {
        throw new Error("저장이 취소되었습니다")
      }
      console.warn("[useScreenRecorder] File System API failed, falling back to download:", err)
    }
  }

  // 폴백: 자동 다운로드
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============================================
// Hook
// ============================================
export function useScreenRecorder({
  spaceName,
  onError,
}: UseScreenRecorderOptions): UseScreenRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // 에러 핸들링
  const handleError = useCallback((message: string) => {
    setError(message)
    onError?.(message)
  }, [onError])

  // 타이머 시작
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - recordingTime * 1000
    timerRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [recordingTime])

  // 타이머 중지
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 녹화 시작
  const startRecording = useCallback(async (
    screenTrack: MediaStreamTrack,
    audioTrack?: MediaStreamTrack
  ) => {
    try {
      setError(null)
      chunksRef.current = []

      // 스트림 생성 (화면 + 오디오)
      const tracks: MediaStreamTrack[] = [screenTrack]
      if (audioTrack) {
        tracks.push(audioTrack)
      }
      const stream = new MediaStream(tracks)

      // MediaRecorder 생성
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm"

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onerror = () => {
        handleError("녹화 중 오류가 발생했습니다")
        setRecordingState("idle")
        stopTimer()
      }

      recorder.onstop = () => {
        // onstop은 stopRecording에서 처리
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000) // 1초마다 데이터 수집

      setRecordingState("recording")
      setRecordingTime(0)
      startTimer()

    } catch (err) {
      console.error("[useScreenRecorder] Failed to start recording:", err)
      handleError("녹화를 시작할 수 없습니다")
    }
  }, [handleError, startTimer, stopTimer])

  // 녹화 중지 및 저장
  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recordingState === "idle") return

    setRecordingState("stopping")
    stopTimer()

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "video/webm" })
          const fileName = generateFileName(spaceName)

          await saveFile(blob, fileName)

          chunksRef.current = []
          setRecordingState("idle")
          setRecordingTime(0)
          resolve()
        } catch (err) {
          console.error("[useScreenRecorder] Failed to save recording:", err)
          handleError((err as Error).message || "녹화 저장에 실패했습니다")
          setRecordingState("idle")
          resolve()
        }
      }

      recorder.stop()
    })
  }, [recordingState, spaceName, stopTimer, handleError])

  // 일시정지/재개
  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    if (recordingState === "recording") {
      recorder.pause()
      stopTimer()
      setRecordingState("paused")
    } else if (recordingState === "paused") {
      recorder.resume()
      startTimer()
      setRecordingState("recording")
    }
  }, [recordingState, startTimer, stopTimer])

  return {
    recordingState,
    recordingTime,
    startRecording,
    stopRecording,
    togglePause,
    error,
  }
}

// ============================================
// Type augmentation for File System Access API
// ============================================
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle>
  }
}
