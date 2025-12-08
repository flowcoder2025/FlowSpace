"use client"

/**
 * LiveKitMediaContext
 *
 * LiveKit 미디어 상태를 컨텍스트로 제공
 * @livekit/components-react의 useTracks 훅을 사용하여 트랙 상태 자동 동기화
 */

import { createContext, useContext, ReactNode, useMemo, useCallback, useState, useEffect, useRef } from "react"
import {
  useLocalParticipant,
  useParticipants,
  useMaybeRoomContext,
  useConnectionState,
  useTracks,
} from "@livekit/components-react"
import {
  Track,
  ConnectionState,
  RemoteTrackPublication,
  RoomEvent,
  RemoteParticipant,
  Participant,
  TrackPublication,
} from "livekit-client"
import type { ParticipantTrack, MediaState } from "./types"

const IS_DEV = process.env.NODE_ENV === "development"

// 미디어 에러 타입
export type MediaError = {
  type: "permission_denied" | "not_found" | "not_connected" | "unknown"
  message: string
}

// Context value type
export interface LiveKitMediaContextValue {
  participantTracks: Map<string, ParticipantTrack>
  mediaState: MediaState
  mediaError: MediaError | null
  isAvailable: boolean
  localParticipantId: string | null
  toggleCamera: () => Promise<boolean>
  toggleMicrophone: () => Promise<boolean>
  toggleScreenShare: () => Promise<boolean>
}

// Default value (when not in LiveKit context)
const defaultContextValue: LiveKitMediaContextValue = {
  participantTracks: new Map(),
  mediaState: {
    isCameraEnabled: false,
    isMicrophoneEnabled: false,
    isScreenShareEnabled: false,
  },
  mediaError: null,
  isAvailable: false,
  localParticipantId: null,
  toggleCamera: async () => false,
  toggleMicrophone: async () => false,
  toggleScreenShare: async () => false,
}

// Create context
const LiveKitMediaContext = createContext<LiveKitMediaContextValue>(defaultContextValue)

/**
 * useLiveKitMedia - Context consumer hook
 * Always safe to call (returns defaults when not in LiveKit context)
 */
export function useLiveKitMedia(): LiveKitMediaContextValue {
  return useContext(LiveKitMediaContext)
}

/**
 * LiveKitMediaProvider - Provides default values when outside LiveKitRoom
 */
export function LiveKitMediaFallbackProvider({ children }: { children: ReactNode }) {
  return (
    <LiveKitMediaContext.Provider value={defaultContextValue}>
      {children}
    </LiveKitMediaContext.Provider>
  )
}

/**
 * LiveKitMediaInternalProvider - Uses LiveKit hooks (MUST be inside LiveKitRoom)
 *
 * 핵심: useTracks 훅을 사용하여 트랙 상태를 자동으로 동기화
 * - 트랙 구독/해제 자동 추적
 * - mute/unmute 상태 자동 감지
 * - React 상태와 LiveKit 이벤트 간의 동기화를 라이브러리가 처리
 */
export function LiveKitMediaInternalProvider({ children }: { children: ReactNode }) {
  const [mediaError, setMediaError] = useState<MediaError | null>(null)

  // Room context
  const room = useMaybeRoomContext()

  // 연결 상태 확인
  const connectionState = useConnectionState(room)
  const isConnected = connectionState === ConnectionState.Connected

  // Local participant - reactive 값들을 직접 구조 분해
  const {
    localParticipant,
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant()

  // All participants (local + remote)
  const participants = useParticipants()

  // 🔑 핵심: useTracks 훅으로 구독된 트랙만 자동 추적
  // 라이브러리가 트랙 구독 상태, mute 상태 등을 자동으로 React 상태와 동기화
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  )

  // 🔧 Adaptive Stream 대응: room.remoteParticipants를 직접 순회하여 카메라/화면공유 퍼블리케이션 구독
  const subscriptionAttemptedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!room || !isConnected) return

    const shouldSubscribeSource = (source: Track.Source) =>
      source === Track.Source.Camera || source === Track.Source.ScreenShare

    const subscribeParticipantTracks = (participant: RemoteParticipant) => {
      participant.trackPublications.forEach((publication) => {
        if (
          publication instanceof RemoteTrackPublication &&
          shouldSubscribeSource(publication.source)
        ) {
          const key = `${participant.identity}-${publication.trackSid}`
          if (!subscriptionAttemptedRef.current.has(key) && !publication.isSubscribed) {
            publication.setSubscribed(true)
            subscriptionAttemptedRef.current.add(key)
            if (IS_DEV) {
              console.log("[LiveKitMediaContext] 📡 Subscribing remote track", {
                participant: participant.identity,
                source: publication.source,
              })
            }
          }
        }
      })
    }

    room.remoteParticipants.forEach((participant) => subscribeParticipantTracks(participant))

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      subscribeParticipantTracks(participant)
    }

    const handleTrackPublished = (
      publication: TrackPublication,
      participant: Participant
    ) => {
      if (
        participant instanceof RemoteParticipant &&
        publication instanceof RemoteTrackPublication &&
        shouldSubscribeSource(publication.source)
      ) {
        subscribeParticipantTracks(participant)
      }
    }

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.TrackPublished, handleTrackPublished)

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.TrackPublished, handleTrackPublished)
    }
  }, [room, isConnected])

  // 연결 시 자동으로 오디오 시작 (브라우저 autoplay 정책 대응)
  useEffect(() => {
    if (!room || !isConnected) return

    room.startAudio().then(() => {
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Audio context started")
      }
    }).catch(() => {
      // 사용자 인터랙션 없이는 실패할 수 있음 - 정상적인 동작
    })

    const handleUserInteraction = () => {
      room.startAudio().catch(() => {})
    }
    document.addEventListener("click", handleUserInteraction, { once: true })
    document.addEventListener("keydown", handleUserInteraction, { once: true })

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }
  }, [room, isConnected])

  // 🔑 participantTracks 빌드: useTracks 결과를 participants와 결합
  const participantTracks = useMemo(() => {
    const map = new Map<string, ParticipantTrack>()

    if (!isConnected || participants.length === 0) {
      return map
    }

    // 기본 엔트리 생성
    participants.forEach((participant) => {
      map.set(participant.identity, {
        participantId: participant.identity,
        participantName: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isVideoMuted: true,
        isAudioMuted: true,
        isScreenMuted: true,
      })
    })

    tracks.forEach((trackRef) => {
      const identity = trackRef.participant.identity
      const entry = map.get(identity)
      if (!entry) return

      const publication = trackRef.publication
      const mediaTrack = publication?.track?.mediaStreamTrack
      const isMuted = publication?.isMuted ?? true

      switch (trackRef.source) {
        case Track.Source.Camera:
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            entry.videoTrack = mediaTrack
          }
          entry.isVideoMuted = isMuted
          break
        case Track.Source.Microphone:
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            entry.audioTrack = mediaTrack
          }
          entry.isAudioMuted = isMuted
          break
        case Track.Source.ScreenShare:
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            entry.screenTrack = mediaTrack
          }
          entry.isScreenMuted = isMuted
          break
      }
    })

    if (IS_DEV) {
      map.forEach((track, identity) => {
        console.log("[LiveKitMediaContext] Participant track:", {
          identity,
          hasVideo: !!track.videoTrack,
          hasAudio: !!track.audioTrack,
          hasScreen: !!track.screenTrack,
          isVideoMuted: track.isVideoMuted,
        })
      })
    }

    return map
  }, [participants, tracks, isConnected])

  // Media state - useLocalParticipant의 reactive 값 직접 사용
  const mediaState: MediaState = useMemo(() => ({
    isCameraEnabled: isCameraEnabled ?? false,
    isMicrophoneEnabled: isMicrophoneEnabled ?? false,
    isScreenShareEnabled: isScreenShareEnabled ?? false,
  }), [isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled])

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

      if (room) {
        await room.startAudio().catch(() => {})
      }

      const newState = !localParticipant.isCameraEnabled
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Toggle camera:", newState ? "ON" : "OFF")
      }

      await localParticipant.setCameraEnabled(newState)
      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] Camera toggle error:", error)
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
        console.log("[LiveKitMediaContext] Toggle microphone:", newState ? "ON" : "OFF")
      }

      await localParticipant.setMicrophoneEnabled(newState)
      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] Microphone toggle error:", error)
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
        console.log("[LiveKitMediaContext] Toggle screen share:", newState ? "ON" : "OFF")
      }

      await localParticipant.setScreenShareEnabled(newState)
      return true
    } catch (error) {
      const errorName = error instanceof Error ? error.name : ""
      const errorMessage = error instanceof Error ? error.message : String(error)

      const isUserCancellation =
        errorName === "NotAllowedError" ||
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled")

      if (isUserCancellation) {
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] Screen share cancelled by user")
        }
        return false
      }

      console.error("[LiveKitMediaContext] Screen share toggle error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, parseMediaError])

  // Context value
  const value = useMemo<LiveKitMediaContextValue>(
    () => ({
      participantTracks,
      mediaState,
      mediaError,
      isAvailable: isConnected,
      localParticipantId: localParticipant?.identity ?? null,
      toggleCamera,
      toggleMicrophone,
      toggleScreenShare,
    }),
    [
      participantTracks,
      mediaState,
      mediaError,
      isConnected,
      localParticipant?.identity,
      toggleCamera,
      toggleMicrophone,
      toggleScreenShare,
    ]
  )

  return (
    <LiveKitMediaContext.Provider value={value}>
      {children}
    </LiveKitMediaContext.Provider>
  )
}
