"use client"

/**
 * CameraPreview
 *
 * 실시간 카메라 미리보기 컴포넌트
 * - 미러 모드 반영
 * - 해상도/프레임레이트 오버레이 표시
 * - 로딩/에러 상태 처리
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Camera, CameraOff, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VideoResolutionPreset, FrameRateOption } from "../../types/media-settings.types"

interface CameraPreviewProps {
  /** 카메라 장치 ID */
  deviceId?: string | null
  /** 미러 모드 */
  mirrorMode?: boolean
  /** 해상도 (오버레이 표시용) */
  resolution?: VideoResolutionPreset
  /** 프레임레이트 (오버레이 표시용) */
  frameRate?: FrameRateOption
  /** 미리보기 활성화 여부 */
  enabled?: boolean
  /** 미리보기 시작 시 콜백 */
  onStreamStart?: (stream: MediaStream) => void
  /** 추가 클래스 */
  className?: string
}

export function CameraPreview({
  deviceId,
  mirrorMode = true,
  resolution,
  frameRate,
  enabled = true,
  onStreamStart,
  className,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)

  // 스트림 정리
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  // 카메라 시작
  const startCamera = useCallback(async () => {
    cleanup()
    setError(null)
    setIsLoading(true)

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsActive(true)
      onStreamStart?.(stream)
    } catch (err) {
      console.error("[CameraPreview] 카메라 시작 실패:", err)
      setError("카메라 접근 권한이 필요합니다.")
    } finally {
      setIsLoading(false)
    }
  }, [deviceId, cleanup, onStreamStart])

  // enabled 상태에 따른 자동 시작/정지
  useEffect(() => {
    if (enabled) {
      startCamera()
    } else {
      cleanup()
    }

    return () => cleanup()
  }, [enabled, deviceId, startCamera, cleanup])

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
      {/* 비디오 프리뷰 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "h-full w-full object-cover",
          mirrorMode && "scale-x-[-1]",
          !isActive && "hidden"
        )}
      />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 비활성화 상태 */}
      {!enabled && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
          <CameraOff className="size-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">카메라 미리보기 꺼짐</span>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-4">
          <CameraOff className="size-8 text-destructive" />
          <span className="text-center text-sm text-destructive">{error}</span>
          <Button onClick={startCamera} variant="outline" size="sm">
            <RefreshCw className="mr-2 size-4" />
            다시 시도
          </Button>
        </div>
      )}

      {/* 해상도/프레임레이트 오버레이 */}
      {isActive && (resolution || frameRate) && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
          <Camera className="size-3" />
          {resolution && <span>{resolution}</span>}
          {resolution && frameRate && <span>/</span>}
          {frameRate && <span>{frameRate}fps</span>}
        </div>
      )}

      {/* 미러 모드 표시 */}
      {isActive && mirrorMode && (
        <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          미러
        </div>
      )}
    </div>
  )
}
