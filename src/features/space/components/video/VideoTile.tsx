"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Text } from "@/components/ui"
import type { ParticipantTrack } from "../../livekit/types"

const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// Icons
// ============================================
const MicOffIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
)

const CameraOffIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
  </svg>
)

const ScreenShareIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm14 0H4v8h12V6z" />
  </svg>
)

const SpeakingIcon = () => (
  <svg className="size-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
  </svg>
)

const AudioBlockedIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12 7a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
)

const FullscreenIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)

const ExitFullscreenIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
  </svg>
)

const PipIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8M3 17V7a2 2 0 012-2h6" />
    <rect x="3" y="13" width="8" height="6" rx="1" strokeWidth={2} />
  </svg>
)

// ============================================
// VideoTile Props
// ============================================
interface VideoTileProps {
  track: ParticipantTrack
  isLocal?: boolean
  isScreenShare?: boolean  // 화면공유 전용 타일
  className?: string
}

// ============================================
// VideoTile Component
// ============================================
export function VideoTile({ track, isLocal = false, isScreenShare = false, className }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPipActive, setIsPipActive] = useState(false)
  const [showControls, setShowControls] = useState(false)

  // 화면공유 모드일 때는 screenTrack, 아니면 videoTrack 사용
  const activeVideoTrack = isScreenShare ? track.screenTrack : track.videoTrack

  // 오디오 재생 시도 함수
  const tryPlayAudio = useCallback(async () => {
    if (!audioRef.current || !track.audioTrack || isLocal) return

    try {
      await audioRef.current.play()
      setAudioBlocked(false)
      if (IS_DEV) {
        console.log("[VideoTile] Audio playback started for:", track.participantName)
      }
    } catch (error) {
      // NotAllowedError = 브라우저 autoplay 정책에 의해 차단됨
      if ((error as Error).name === "NotAllowedError") {
        console.warn("[VideoTile] Audio playback blocked by browser policy. Click anywhere to enable.")
        setAudioBlocked(true)
      } else {
        console.error("[VideoTile] Audio playback error:", error)
      }
    }
  }, [track.audioTrack, track.participantName, isLocal])

  // Track video ended state (when remote user turns off camera)
  const [videoEnded, setVideoEnded] = useState(false)

  // Reset videoEnded when track changes
  useEffect(() => {
    setVideoEnded(false)
  }, [activeVideoTrack])

  // Attach video track to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (activeVideoTrack && !videoEnded) {
      const stream = new MediaStream([activeVideoTrack])
      video.srcObject = stream

      // Handle track ended event (when remote user turns off camera)
      const handleTrackEnded = () => {
        if (IS_DEV) {
          console.log("[VideoTile] Video track ended for:", track.participantName)
        }
        setVideoEnded(true)
        video.srcObject = null
      }

      // Check if track is already ended
      if (activeVideoTrack.readyState === "ended") {
        handleTrackEnded()
        return
      }

      activeVideoTrack.addEventListener("ended", handleTrackEnded)

      if (IS_DEV) {
        console.log("[VideoTile] Video track attached for:", track.participantName, {
          trackId: activeVideoTrack.id,
          enabled: activeVideoTrack.enabled,
          readyState: activeVideoTrack.readyState,
          isScreenShare,
        })
      }

      return () => {
        activeVideoTrack.removeEventListener("ended", handleTrackEnded)
        video.srcObject = null
      }
    } else {
      video.srcObject = null
    }
  }, [activeVideoTrack, track.participantName, isScreenShare, videoEnded])

  // Attach audio track to audio element (for remote participants only)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return

    if (track.audioTrack) {
      const stream = new MediaStream([track.audioTrack])
      audio.srcObject = stream

      if (IS_DEV) {
        console.log("[VideoTile] Audio track attached for:", track.participantName, {
          trackId: track.audioTrack.id,
          enabled: track.audioTrack.enabled,
          readyState: track.audioTrack.readyState,
        })
      }

      // 오디오 재생 시도
      tryPlayAudio()
    } else {
      audio.srcObject = null
      setAudioBlocked(false)
    }

    return () => {
      audio.srcObject = null
    }
  }, [track.audioTrack, track.participantName, isLocal, tryPlayAudio])

  // 전역 클릭 이벤트로 차단된 오디오 재생 시도
  useEffect(() => {
    if (!audioBlocked) return

    const handleUserInteraction = () => {
      tryPlayAudio()
    }

    // 사용자 인터랙션 시 오디오 재생 시도
    document.addEventListener("click", handleUserInteraction, { once: true })
    document.addEventListener("keydown", handleUserInteraction, { once: true })

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }
  }, [audioBlocked, tryPlayAudio])

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
        console.log("[VideoTile] Entered PIP mode for:", track.participantName)
      }
    }
    const handleLeavePip = () => {
      setIsPipActive(false)
      if (IS_DEV) {
        console.log("[VideoTile] Left PIP mode for:", track.participantName)
      }
    }

    video.addEventListener("enterpictureinpicture", handleEnterPip)
    video.addEventListener("leavepictureinpicture", handleLeavePip)

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPip)
      video.removeEventListener("leavepictureinpicture", handleLeavePip)
    }
  }, [track.participantName])

  // Toggle fullscreen handler
  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("[VideoTile] Fullscreen toggle error:", error)
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
      console.error("[VideoTile] PIP toggle error:", error)
    }
  }, [])

  const hasVideo = !!activeVideoTrack && !videoEnded
  const hasAudio = !!track.audioTrack
  const canPip = hasVideo && document.pictureInPictureEnabled && !isLocal

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative aspect-video overflow-hidden rounded-lg bg-muted",
        track.isSpeaking && "ring-2 ring-primary ring-offset-2",
        isFullscreen && "fixed inset-0 z-50 aspect-auto rounded-none",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video element */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent feedback
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-muted">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted-foreground/20">
            <Text size="lg" weight="semibold" className="text-muted-foreground">
              {track.participantName.charAt(0).toUpperCase()}
            </Text>
          </div>
        </div>
      )}

      {/* Audio element (hidden, for remote participants) */}
      {!isLocal && (
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      )}

      {/* Video controls overlay (top-right) - visible on hover */}
      {hasVideo && (
        <div
          className={cn(
            "absolute right-2 top-2 flex items-center gap-1 transition-opacity duration-200",
            showControls || isFullscreen ? "opacity-100" : "opacity-0"
          )}
        >
          {/* PIP Button (for remote videos only) */}
          {canPip && (
            <button
              onClick={handleTogglePip}
              className={cn(
                "rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80",
                isPipActive && "bg-primary/80 hover:bg-primary/90"
              )}
              title={isPipActive ? "PIP 종료" : "PIP 모드"}
              aria-label={isPipActive ? "PIP 모드 종료" : "PIP 모드 시작"}
            >
              <PipIcon />
            </button>
          )}
          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
            aria-label={isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      )}

      {/* Overlay info (bottom) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {track.isSpeaking && (
              <div className="rounded bg-primary/80 p-0.5 text-white">
                <SpeakingIcon />
              </div>
            )}
            <Text size="xs" className="truncate text-white">
              {track.participantName}
              {isLocal && " (나)"}
              {isScreenShare && " - 화면공유"}
            </Text>
          </div>
          <div className="flex items-center gap-1">
            {audioBlocked && (
              <div className="rounded bg-warning/80 p-0.5 text-white" title="클릭하여 오디오 활성화">
                <AudioBlockedIcon />
              </div>
            )}
            {!hasAudio && (
              <div className="rounded bg-destructive/80 p-0.5 text-white">
                <MicOffIcon />
              </div>
            )}
            {!hasVideo && (
              <div className="rounded bg-muted-foreground/80 p-0.5 text-white">
                <CameraOffIcon />
              </div>
            )}
            {track.screenTrack && (
              <div className="rounded bg-primary/80 p-0.5 text-white">
                <ScreenShareIcon />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
