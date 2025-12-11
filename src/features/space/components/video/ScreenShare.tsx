"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Text, Button } from "@/components/ui"
import type { ParticipantTrack } from "../../livekit/types"

const IS_DEV = process.env.NODE_ENV === "development"

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
  // Check PIP availability (lazy initialization for client-side only)
  const [canPip] = useState(() => {
    if (typeof document === "undefined") return false
    return !!document.pictureInPictureEnabled
  })

  // Attach screen track to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (track.screenTrack) {
      const stream = new MediaStream([track.screenTrack])
      video.srcObject = stream
    } else {
      // 🔧 srcObject만 null하면 브라우저가 마지막 프레임을 유지할 수 있음
      video.srcObject = null
      video.load()
    }

    return () => {
      if (video) {
        video.srcObject = null
        video.load()
      }
    }
  }, [track.screenTrack])

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
        // 전체화면이 아닐 때만 overflow-hidden (Portal이 잘리지 않도록)
        !isFullscreen && "overflow-hidden",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
    >
      {/* Screen share video */}
      {/* 🔧 absolute z-0: 전체화면 시 Portal로 렌더링되는 채팅 오버레이(z-max)가 위에 표시되도록 */}
      {/* z-index는 positioned 요소(relative/absolute/fixed)에만 적용됨 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 size-full object-contain z-0"
      />

      {/* Header overlay */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <ScreenShare
        track={track}
        onClose={onClose}
        className="h-[80vh] w-full max-w-6xl"
      />
    </div>
  )
}
