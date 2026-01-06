"use client"

/**
 * useLiveKitMedia
 *
 * @livekit/components-react 공식 훅 기반의 미디어 상태 관리 훅
 * LiveKitRoom 컨텍스트 내에서 사용해야 함
 *
 * 공식 훅 사용으로 타이밍 이슈 해결:
 * - useTracks: 트랙 구독/퍼블리시 상태 자동 관리
 * - useLocalParticipant: 로컬 참가자 상태 및 미디어 토글
 * - useParticipants: 모든 참가자 정보
 */

import { useMemo, useCallback, useState } from "react"
import {
  useTracks,
  useLocalParticipant,
  useParticipants,
  useMaybeRoomContext,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import type { ParticipantTrack, MediaState } from "./types"

const IS_DEV = process.env.NODE_ENV === "development"

// 미디어 에러 타입
export type MediaError = {
  type: "permission_denied" | "not_found" | "not_connected" | "unknown"
  message: string
}

interface UseLiveKitMediaReturn {
  participantTracks: Map<string, ParticipantTrack>
  mediaState: MediaState
  mediaError: MediaError | null
  isAvailable: boolean
  localParticipantId: string | null // 토큰에서 파생된 로컬 참가자 ID (서버 결정)
  localAudioTrack: MediaStreamTrack | null // 로컬 마이크 트랙 (VAD용)
  toggleCamera: () => Promise<boolean>
  toggleMicrophone: () => Promise<boolean>
  toggleScreenShare: () => Promise<boolean>
  /** VAD 게이트용: 로컬 마이크 뮤트/언뮤트 (트랙 유지) */
  setLocalMicrophoneMuted: (muted: boolean) => Promise<boolean>
  /** 📌 카메라 장치 전환 (설정 변경 시 사용) */
  switchCameraDevice: (deviceId: string) => Promise<boolean>
  /** 📌 마이크 장치 전환 (설정 변경 시 사용) */
  switchMicrophoneDevice: (deviceId: string) => Promise<boolean>
  /** 📌 카메라 설정 재적용 (해상도/프레임레이트 변경 시 카메라 재시작) */
  restartCamera: () => Promise<boolean>
}

export function useLiveKitMedia(): UseLiveKitMediaReturn {
  const [mediaError, setMediaError] = useState<MediaError | null>(null)

  // Room context - returns undefined if not inside LiveKitRoom (no error thrown)
  const room = useMaybeRoomContext()
  const isInContext = !!room

  // Local participant
  const { localParticipant } = useLocalParticipant()

  // All participants
  const participants = useParticipants()

  // Get all video tracks (camera + screen share) with placeholders
  const videoTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  // Get all audio tracks
  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: false }
  )

  // Build participant tracks map (기존 인터페이스 호환)
  const participantTracks = useMemo(() => {
    const tracks = new Map<string, ParticipantTrack>()

    if (!isInContext) {
      return tracks
    }

    // Process all participants
    participants.forEach((participant) => {
      const identity = participant.identity
      const isLocal = participant === localParticipant

      // Find video track for this participant
      const videoTrackRef = videoTracks.find(
        (t) =>
          t.participant.identity === identity &&
          t.source === Track.Source.Camera
      )

      // Find screen share track for this participant
      const screenTrackRef = videoTracks.find(
        (t) =>
          t.participant.identity === identity &&
          t.source === Track.Source.ScreenShare
      )

      // Find audio track for this participant
      const audioTrackRef = audioTracks.find(
        (t) => t.participant.identity === identity
      )

      const trackInfo: ParticipantTrack = {
        participantId: identity,
        participantName: participant.name || identity,
        isSpeaking: participant.isSpeaking,
        isVideoMuted: true,
        isAudioMuted: true,
        isScreenMuted: true,
      }

      // Video track
      if (videoTrackRef?.publication?.track) {
        const mediaTrack = videoTrackRef.publication.track.mediaStreamTrack
        if (mediaTrack.readyState !== "ended") {
          trackInfo.videoTrack = mediaTrack
          trackInfo.isVideoMuted = videoTrackRef.publication.isMuted
        }
      } else if (videoTrackRef?.publication) {
        // Track exists but not subscribed yet
        trackInfo.isVideoMuted = videoTrackRef.publication.isMuted
      }

      // Screen share track
      if (screenTrackRef?.publication?.track) {
        const mediaTrack = screenTrackRef.publication.track.mediaStreamTrack
        if (mediaTrack.readyState !== "ended") {
          trackInfo.screenTrack = mediaTrack
          trackInfo.isScreenMuted = screenTrackRef.publication.isMuted
        }
      }

      // Audio track
      if (audioTrackRef?.publication?.track) {
        const mediaTrack = audioTrackRef.publication.track.mediaStreamTrack
        if (mediaTrack.readyState !== "ended") {
          trackInfo.audioTrack = mediaTrack
          trackInfo.isAudioMuted = audioTrackRef.publication.isMuted
        }
      } else if (audioTrackRef?.publication) {
        trackInfo.isAudioMuted = audioTrackRef.publication.isMuted
      }

      tracks.set(identity, trackInfo)

      if (IS_DEV) {
        console.log("[useLiveKitMedia] Participant track:", {
          identity,
          isLocal,
          hasVideo: !!trackInfo.videoTrack,
          hasAudio: !!trackInfo.audioTrack,
          hasScreen: !!trackInfo.screenTrack,
          isVideoMuted: trackInfo.isVideoMuted,
        })
      }
    })

    return tracks
  }, [participants, localParticipant, videoTracks, audioTracks, isInContext])

  // Media state
  const mediaState: MediaState = useMemo(() => {
    if (!localParticipant) {
      return {
        isCameraEnabled: false,
        isMicrophoneEnabled: false,
        isScreenShareEnabled: false,
      }
    }
    return {
      isCameraEnabled: localParticipant.isCameraEnabled,
      isMicrophoneEnabled: localParticipant.isMicrophoneEnabled,
      isScreenShareEnabled: localParticipant.isScreenShareEnabled,
    }
  }, [localParticipant])

  // Error parser
  const parseMediaError = useCallback((error: unknown): MediaError => {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (
      errorMessage.includes("Permission denied") ||
      errorMessage.includes("NotAllowedError")
    ) {
      return {
        type: "permission_denied",
        message: "카메라/마이크 권한이 거부되었습니다.",
      }
    }
    if (
      errorMessage.includes("NotFoundError") ||
      errorMessage.includes("not found")
    ) {
      return { type: "not_found", message: "카메라/마이크를 찾을 수 없습니다." }
    }
    return { type: "unknown", message: errorMessage }
  }, [])

  // Toggle camera
  const toggleCamera = useCallback(async (): Promise<boolean> => {
    if (!localParticipant) {
      setMediaError({
        type: "not_connected",
        message: "LiveKit에 연결되지 않았습니다.",
      })
      return false
    }

    try {
      setMediaError(null)

      // Resume audio context (browser autoplay policy)
      if (room) {
        await room.startAudio().catch(() => {})
      }

      const newState = !localParticipant.isCameraEnabled
      if (IS_DEV) {
        console.log("[useLiveKitMedia] Toggle camera:", newState ? "ON" : "OFF")
      }

      await localParticipant.setCameraEnabled(newState)
      return true
    } catch (error) {
      console.error("[useLiveKitMedia] Camera toggle error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, room, parseMediaError])

  // Toggle microphone
  const toggleMicrophone = useCallback(async (): Promise<boolean> => {
    if (!localParticipant) {
      setMediaError({
        type: "not_connected",
        message: "LiveKit에 연결되지 않았습니다.",
      })
      return false
    }

    try {
      setMediaError(null)

      if (room) {
        await room.startAudio().catch(() => {})
      }

      const newState = !localParticipant.isMicrophoneEnabled
      if (IS_DEV) {
        console.log(
          "[useLiveKitMedia] Toggle microphone:",
          newState ? "ON" : "OFF"
        )
      }

      await localParticipant.setMicrophoneEnabled(newState)
      return true
    } catch (error) {
      console.error("[useLiveKitMedia] Microphone toggle error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, room, parseMediaError])

  // Toggle screen share
  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    if (!localParticipant) {
      setMediaError({
        type: "not_connected",
        message: "LiveKit에 연결되지 않았습니다.",
      })
      return false
    }

    try {
      setMediaError(null)

      const newState = !localParticipant.isScreenShareEnabled
      if (IS_DEV) {
        console.log(
          "[useLiveKitMedia] Toggle screen share:",
          newState ? "ON" : "OFF"
        )
      }

      await localParticipant.setScreenShareEnabled(newState)
      return true
    } catch (error) {
      const errorName = error instanceof Error ? error.name : ""
      const errorMessage = error instanceof Error ? error.message : String(error)

      // User cancelled - not an error
      const isUserCancellation =
        errorName === "NotAllowedError" ||
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled")

      if (isUserCancellation) {
        if (IS_DEV) {
          console.log("[useLiveKitMedia] Screen share cancelled by user")
        }
        return false
      }

      console.error("[useLiveKitMedia] Screen share toggle error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, parseMediaError])

  // 로컬 참가자 ID (토큰에서 파생, 서버 결정)
  const localParticipantId = localParticipant?.identity ?? null

  // 로컬 오디오 트랙 (VAD용)
  const localAudioTrack = useMemo(() => {
    if (!localParticipant || !isInContext) return null
    const audioTrackRef = audioTracks.find(
      (t) => t.participant === localParticipant
    )
    return audioTrackRef?.publication?.track?.mediaStreamTrack ?? null
  }, [localParticipant, audioTracks, isInContext])

  // VAD 게이트용: 로컬 마이크 뮤트/언뮤트 (트랙 유지하면서 데이터만 뮤트)
  const setLocalMicrophoneMuted = useCallback(async (muted: boolean): Promise<boolean> => {
    if (!localParticipant) {
      return false
    }

    try {
      const publication = localParticipant.getTrackPublication(Track.Source.Microphone)
      if (!publication) {
        if (IS_DEV) {
          console.log("[useLiveKitMedia] No microphone publication found")
        }
        return false
      }

      if (muted) {
        await publication.mute()
      } else {
        await publication.unmute()
      }

      if (IS_DEV) {
        console.log("[useLiveKitMedia] Microphone muted:", muted)
      }
      return true
    } catch (error) {
      console.error("[useLiveKitMedia] setLocalMicrophoneMuted error:", error)
      return false
    }
  }, [localParticipant])

  // 📌 카메라 장치 전환
  const switchCameraDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (!room) {
      setMediaError({
        type: "not_connected",
        message: "LiveKit에 연결되지 않았습니다.",
      })
      return false
    }

    try {
      setMediaError(null)
      await room.switchActiveDevice("videoinput", deviceId)
      if (IS_DEV) {
        console.log("[useLiveKitMedia] Camera switched to:", deviceId)
      }
      return true
    } catch (error) {
      console.error("[useLiveKitMedia] Camera switch error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [room, parseMediaError])

  // 📌 마이크 장치 전환
  const switchMicrophoneDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (!room) {
      setMediaError({
        type: "not_connected",
        message: "LiveKit에 연결되지 않았습니다.",
      })
      return false
    }

    try {
      setMediaError(null)
      await room.switchActiveDevice("audioinput", deviceId)
      if (IS_DEV) {
        console.log("[useLiveKitMedia] Microphone switched to:", deviceId)
      }
      return true
    } catch (error) {
      console.error("[useLiveKitMedia] Microphone switch error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [room, parseMediaError])

  // 📌 카메라 설정 재적용 (해상도/프레임레이트 변경 시 카메라 재시작)
  // LiveKit의 videoCaptureDefaults는 방 연결 시점에만 적용되므로,
  // 설정 변경 시 카메라를 껐다 켜서 새 설정 적용
  const restartCamera = useCallback(async (): Promise<boolean> => {
    if (!localParticipant) {
      setMediaError({
        type: "not_connected",
        message: "LiveKit에 연결되지 않았습니다.",
      })
      return false
    }

    const wasEnabled = localParticipant.isCameraEnabled
    if (!wasEnabled) {
      if (IS_DEV) {
        console.log("[useLiveKitMedia] Camera not enabled, skip restart")
      }
      return true
    }

    try {
      setMediaError(null)
      if (IS_DEV) {
        console.log("[useLiveKitMedia] Restarting camera with new settings...")
      }

      // 1. 카메라 끄기
      await localParticipant.setCameraEnabled(false)

      // 2. 짧은 딜레이 (장치 해제 대기)
      await new Promise(resolve => setTimeout(resolve, 100))

      // 3. 카메라 다시 켜기 (새 설정이 roomOptions에서 적용됨)
      await localParticipant.setCameraEnabled(true)

      if (IS_DEV) {
        console.log("[useLiveKitMedia] Camera restarted successfully")
      }
      return true
    } catch (error) {
      console.error("[useLiveKitMedia] Camera restart error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, parseMediaError])

  return {
    participantTracks,
    mediaState,
    mediaError,
    isAvailable: isInContext && !!room,
    localParticipantId,
    localAudioTrack,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    setLocalMicrophoneMuted,
    switchCameraDevice,
    switchMicrophoneDevice,
    restartCamera,
  }
}
