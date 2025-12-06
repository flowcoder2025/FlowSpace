"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Text, Button } from "@/components/ui"
import type { ParticipantTrack } from "../../livekit/types"

// ============================================
// CloseIcon
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
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach screen track to video element
  useEffect(() => {
    if (videoRef.current && track.screenTrack) {
      const stream = new MediaStream([track.screenTrack])
      videoRef.current.srcObject = stream
    } else if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [track.screenTrack])

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  if (!track.screenTrack) {
    return null
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-black",
        className
      )}
    >
      {/* Screen share video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="size-full object-contain"
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="size-8 p-0 text-white hover:bg-white/20"
          >
            <FullscreenIcon />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 text-white hover:bg-white/20"
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
