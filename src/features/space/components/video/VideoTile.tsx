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

// ============================================
// VideoTile Props
// ============================================
interface VideoTileProps {
  track: ParticipantTrack
  isLocal?: boolean
  className?: string
}

// ============================================
// VideoTile Component
// ============================================
export function VideoTile({ track, isLocal = false, className }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)

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

  // Attach video track to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (track.videoTrack) {
      const stream = new MediaStream([track.videoTrack])
      video.srcObject = stream

      if (IS_DEV) {
        console.log("[VideoTile] Video track attached for:", track.participantName, {
          trackId: track.videoTrack.id,
          enabled: track.videoTrack.enabled,
          readyState: track.videoTrack.readyState,
        })
      }
    } else {
      video.srcObject = null
    }

    return () => {
      video.srcObject = null
    }
  }, [track.videoTrack, track.participantName])

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

  const hasVideo = !!track.videoTrack
  const hasAudio = !!track.audioTrack

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-lg bg-muted",
        track.isSpeaking && "ring-2 ring-primary ring-offset-2",
        className
      )}
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

      {/* Overlay info */}
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
