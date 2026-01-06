"use client"

/**
 * MicrophoneTest
 *
 * 마이크 테스트 컴포넌트 (디스코드 스타일)
 * - 5초 녹음 → 재생으로 마이크 확인
 * - 상태 머신: idle → recording → recorded → playing
 * - 진행 표시 및 카운트다운
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Mic, Square, Play, RotateCcw, Loader2 } from "lucide-react"
import { MICROPHONE_TEST_DURATION_MS, MicrophoneTestState } from "../../types/media-settings.types"

interface MicrophoneTestProps {
  /** 마이크 장치 ID (선택적) */
  deviceId?: string | null
  /** 추가 클래스 */
  className?: string
}

export function MicrophoneTest({ deviceId, className }: MicrophoneTestProps) {
  const [state, setState] = useState<MicrophoneTestState>("idle")
  const [progress, setProgress] = useState(0) // 0-100
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 정리 함수
  const cleanup = useCallback(() => {
    // 녹음 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    // 오디오 재생 중지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // 진행 인터벌 정리
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    audioChunksRef.current = []
    setProgress(0)
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // 녹음 시작
  const startRecording = useCallback(async () => {
    cleanup()
    setError(null)

    try {
      // 마이크 접근
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        // 녹음 완료 상태로 전환
        setState("recorded")
        setProgress(100)
      }

      // 녹음 시작
      mediaRecorder.start()
      setState("recording")

      // 진행률 업데이트
      const startTime = Date.now()
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newProgress = Math.min(100, (elapsed / MICROPHONE_TEST_DURATION_MS) * 100)
        setProgress(newProgress)
      }, 100)

      // 5초 후 자동 중지
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop()
        }
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }, MICROPHONE_TEST_DURATION_MS)
    } catch (err) {
      console.error("[MicrophoneTest] 녹음 시작 실패:", err)
      setError("마이크 접근 권한이 필요합니다.")
      setState("idle")
    }
  }, [deviceId, cleanup])

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  // 재생
  const playRecording = useCallback(() => {
    if (audioChunksRef.current.length === 0) return

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
    const audioUrl = URL.createObjectURL(audioBlob)

    const audio = new Audio(audioUrl)
    audioRef.current = audio

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      setState("recorded")
      setProgress(100)
    }

    audio.onplay = () => {
      setState("playing")
    }

    audio.onerror = () => {
      setError("재생 중 오류가 발생했습니다.")
      setState("recorded")
    }

    // 진행률 업데이트
    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    audio.play()
  }, [])

  // 재녹음
  const resetTest = useCallback(() => {
    cleanup()
    setState("idle")
    setError(null)
  }, [cleanup])

  // 남은 시간 계산
  const remainingSeconds = Math.ceil(((100 - progress) / 100) * (MICROPHONE_TEST_DURATION_MS / 1000))

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium text-foreground">마이크 테스트</div>

      {/* 진행 바 */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-100",
            state === "recording" && "bg-red-500",
            state === "playing" && "bg-primary",
            state === "recorded" && "bg-green-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 상태 텍스트 */}
      <div className="text-center text-sm text-muted-foreground">
        {state === "idle" && "마이크 테스트를 시작하세요"}
        {state === "recording" && `녹음 중... ${remainingSeconds}초`}
        {state === "recorded" && "녹음 완료! 재생하여 확인하세요"}
        {state === "playing" && "재생 중..."}
        {error && <span className="text-destructive">{error}</span>}
      </div>

      {/* 버튼 */}
      <div className="flex justify-center gap-2">
        {state === "idle" && (
          <Button onClick={startRecording} variant="default" size="sm">
            <Mic className="mr-2 size-4" />
            테스트 시작
          </Button>
        )}

        {state === "recording" && (
          <Button onClick={stopRecording} variant="destructive" size="sm">
            <Square className="mr-2 size-4" />
            중지
          </Button>
        )}

        {state === "recorded" && (
          <>
            <Button onClick={playRecording} variant="default" size="sm">
              <Play className="mr-2 size-4" />
              재생
            </Button>
            <Button onClick={resetTest} variant="outline" size="sm">
              <RotateCcw className="mr-2 size-4" />
              다시 녹음
            </Button>
          </>
        )}

        {state === "playing" && (
          <Button onClick={resetTest} variant="outline" size="sm">
            <Loader2 className="mr-2 size-4 animate-spin" />
            재생 중...
          </Button>
        )}
      </div>
    </div>
  )
}
