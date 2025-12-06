"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Text } from "@/components/ui"
import type { ParticipantTrack } from "../../livekit/types"

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

  // Attach video track to video element
  useEffect(() => {
    if (videoRef.current && track.videoTrack) {
      const stream = new MediaStream([track.videoTrack])
      videoRef.current.srcObject = stream
    } else if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [track.videoTrack])

  // Attach audio track to audio element (for remote participants only)
  useEffect(() => {
    if (!isLocal && audioRef.current && track.audioTrack) {
      const stream = new MediaStream([track.audioTrack])
      audioRef.current.srcObject = stream
      audioRef.current.play().catch(console.error)
    } else if (audioRef.current) {
      audioRef.current.srcObject = null
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null
      }
    }
  }, [track.audioTrack, isLocal])

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
