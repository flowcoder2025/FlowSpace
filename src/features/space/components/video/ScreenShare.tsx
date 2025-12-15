"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Text, Button } from "@/components/ui"
import type { ParticipantTrack } from "../../livekit/types"

const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// 🔧 PIP 원리 기반 크기 계산 유틸리티
// ============================================
interface DisplayDimensions {
  width: number
  height: number
}

/**
 * 비디오 비율을 유지하면서 컨테이너에 맞는 크기 계산
 * PIP가 작동하는 핵심 원리와 동일
 */
function calculateFitSize(
  videoWidth: number,
  videoHeight: number,
  maxWidth: number,
  maxHeight: number
): DisplayDimensions {
  if (videoWidth <= 0 || videoHeight <= 0) {
    return { width: maxWidth, height: maxHeight }
  }

  const videoRatio = videoWidth / videoHeight
  const containerRatio = maxWidth / maxHeight

  if (videoRatio > containerRatio) {
    // 비디오가 컨테이너보다 넓음 → width 기준으로 맞춤
    return {
      width: maxWidth,
      height: Math.round(maxWidth / videoRatio),
    }
  } else {
    // 비디오가 컨테이너보다 높음 → height 기준으로 맞춤
    return {
      width: Math.round(maxHeight * videoRatio),
      height: maxHeight,
    }
  }
}

// ============================================
// Icons
// ============================================
const CloseIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const FullscreenIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)

const PipIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8M3 17V7a2 2 0 012-2h6" />
    <rect x="3" y="13" width="8" height="6" rx="1" strokeWidth={2} />
  </svg>
)

// ============================================
// ScreenShare Props
// ============================================
interface ScreenShareProps {
  track: ParticipantTrack
  onClose?: () => void
  className?: string
}

// ============================================
// ScreenShare Component
// Large view for screen share presentations
// ============================================
export function ScreenShare({ track, onClose, className }: ScreenShareProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPipActive, setIsPipActive] = useState(false)

  // 🔧 PIP 원리 기반: 비디오 원본 크기
  const [videoNativeSize, setVideoNativeSize] = useState<{ width: number; height: number } | null>(null)
  // 윈도우 리사이즈 트리거용 상태 (lazy init으로 초기값 설정)
  const [windowSize, setWindowSize] = useState(() => {
    if (typeof window === "undefined") return { width: 0, height: 0 }
    return { width: window.innerWidth, height: window.innerHeight }
  })

  // Check PIP availability (lazy initialization for client-side only)
  const [canPip] = useState(() => {
    if (typeof document === "undefined") return false
    return !!document.pictureInPictureEnabled
  })

  // 🔧 클라이언트에서 윈도우 크기 초기화 (lazy useState init으로 이동됨)

  // 🔧 displaySize를 useMemo로 계산 (setState 없이 파생 상태)
  const displaySize = useMemo<DisplayDimensions | null>(() => {
    if (!videoNativeSize || windowSize.width === 0) return null

    const padding = 64 // 좌우상하 패딩 (32px * 2)
    const maxWidth = windowSize.width - padding
    const maxHeight = windowSize.height - padding

    const newSize = calculateFitSize(
      videoNativeSize.width,
      videoNativeSize.height,
      maxWidth,
      maxHeight
    )

    if (IS_DEV) {
      console.log("[ScreenShare] Size calculated:", {
        videoNative: videoNativeSize,
        viewport: windowSize,
        display: newSize,
      })
    }

    return newSize
  }, [videoNativeSize, windowSize])

  // Attach screen track to video element + 원본 크기 추출
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (track.screenTrack) {
      // 비디오 스트림 연결
      const stream = new MediaStream([track.screenTrack])
      video.srcObject = stream

      // 🔧 loadedmetadata 이벤트 콜백에서만 크기 설정 (React 19 규칙 준수)
      // - Effect body에서 직접 setState 호출 금지
      // - 이벤트 콜백에서 setState 호출은 허용
      const handleLoadedMetadata = () => {
        // 우선: video element의 크기 사용
        const { videoWidth, videoHeight } = video
        if (videoWidth > 0 && videoHeight > 0) {
          setVideoNativeSize({ width: videoWidth, height: videoHeight })
          if (IS_DEV) {
            console.log("[ScreenShare] Video metadata size:", {
              width: videoWidth,
              height: videoHeight,
            })
          }
          return
        }
        // 백업: track settings에서 크기 가져오기
        const settings = track.screenTrack?.getSettings()
        if (settings?.width && settings?.height) {
          setVideoNativeSize({ width: settings.width, height: settings.height })
          if (IS_DEV) {
            console.log("[ScreenShare] 🎯 Track settings size:", {
              width: settings.width,
              height: settings.height,
            })
          }
        }
      }

      video.addEventListener("loadedmetadata", handleLoadedMetadata)
      // 이미 로드된 경우: 이벤트를 수동 디스패치하여 콜백 실행 (Effect body에서 직접 setState 방지)
      if (video.readyState >= 1 && video.videoWidth > 0) {
        video.dispatchEvent(new Event("loadedmetadata"))
      }

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata)
        video.srcObject = null
        video.load()
      }
    } else {
      video.srcObject = null
      video.load()
    }
  }, [track.screenTrack])

  // 🔧 윈도우 리사이즈 시 windowSize 상태 업데이트 → useMemo가 displaySize 자동 재계산
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // PIP change detection
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleEnterPip = () => {
      setIsPipActive(true)
      if (IS_DEV) {
        console.log("[ScreenShare] Entered PIP mode for:", track.participantName)
      }
    }
    const handleLeavePip = () => {
      setIsPipActive(false)
      if (IS_DEV) {
        console.log("[ScreenShare] Left PIP mode for:", track.participantName)
      }
    }

    video.addEventListener("enterpictureinpicture", handleEnterPip)
    video.addEventListener("leavepictureinpicture", handleLeavePip)

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPip)
      video.removeEventListener("leavepictureinpicture", handleLeavePip)
    }
  }, [track.participantName])

  // 컨테이너를 전체화면으로 (Portal이 렌더링될 수 있도록)
  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }, [])

  // Toggle PIP handler
  const handleTogglePip = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture()
      }
    } catch (error) {
      console.error("[ScreenShare] PIP toggle error:", error)
    }
  }, [])

  if (!track.screenTrack) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-lg bg-black",
        isFullscreen && "fixed inset-0 z-50 flex items-center justify-center",
        className
      )}
    >
      {/* Screen share video */}
      {/* 🔧 PIP 원리: JavaScript로 픽셀 단위 크기 직접 계산 */}
      {/* - displaySize: 비디오 비율과 뷰포트를 기반으로 계산된 픽셀 크기 */}
      {/* - CSS 자동 계산에 의존하지 않음 → 일관된 동작 보장 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          display: "block",
          // 🔧 픽셀 단위로 명시적 크기 지정 (PIP와 동일 원리)
          // displaySize가 없을 때는 80vw x 80vh 기본값 사용
          width: displaySize ? `${displaySize.width}px` : "80vw",
          height: displaySize ? `${displaySize.height}px` : "auto",
          // 전체화면일 때는 뷰포트 전체 사용
          maxWidth: isFullscreen ? "100vw" : "calc(100vw - 64px)",
          maxHeight: isFullscreen ? "100vh" : "calc(100vh - 64px)",
          objectFit: "contain",
        }}
        className="rounded-lg"
      />

      {/* Header overlay - 비디오 위에 절대 위치 */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between rounded-t-lg bg-linear-to-b from-black/70 to-transparent p-3">
        <div className="flex items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-red-500" />
          <Text size="sm" className="text-white">
            {track.participantName}님의 화면 공유
          </Text>
        </div>
        <div className="flex items-center gap-1">
          {/* PIP Button */}
          {canPip && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePip}
              className={cn(
                "size-8 p-0 text-white hover:bg-white/20",
                isPipActive && "bg-primary/60 hover:bg-primary/80"
              )}
              title={isPipActive ? "PIP 종료" : "PIP 모드"}
              aria-label={isPipActive ? "PIP 모드 종료" : "PIP 모드 시작"}
            >
              <PipIcon />
            </Button>
          )}
          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="size-8 p-0 text-white hover:bg-white/20"
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
            aria-label={isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
          >
            <FullscreenIcon />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 text-white hover:bg-white/20"
              title="닫기"
              aria-label="화면 공유 닫기"
            >
              <CloseIcon />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// ScreenShareOverlay Component
// Modal overlay for prominent screen share display
// ============================================
interface ScreenShareOverlayProps {
  track: ParticipantTrack
  onClose: () => void
}

export function ScreenShareOverlay({ track, onClose }: ScreenShareOverlayProps) {
  if (!track.screenTrack) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      {/* 🔧 ScreenShare가 자체적으로 픽셀 크기 계산 → 외부 컨테이너 불필요 */}
      <ScreenShare track={track} onClose={onClose} />
    </div>
  )
}
