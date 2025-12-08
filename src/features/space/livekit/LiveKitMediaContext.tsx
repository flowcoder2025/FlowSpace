"use client"

/**
 * LiveKitMediaContext
 *
 * LiveKit 미디어 상태를 컨텍스트로 제공
 * LiveKitRoom 컨텍스트 외부에서도 안전하게 사용 가능
 */

import { createContext, useContext, ReactNode, useMemo, useCallback, useState, useEffect, useRef } from "react"
import {
  useLocalParticipant,
  useParticipants,
  useMaybeRoomContext,
  useConnectionState,
} from "@livekit/components-react"
import { Track, RemoteTrackPublication, ConnectionState, RemoteParticipant, RemoteTrack, TrackPublication, Participant } from "livekit-client"
import type { ParticipantTrack, MediaState } from "./types"

// 🔑 구독된 트랙을 직접 저장하는 타입
interface SubscribedTrackInfo {
  video?: MediaStreamTrack
  audio?: MediaStreamTrack
  screen?: MediaStreamTrack
  isVideoMuted: boolean
  isAudioMuted: boolean
  isScreenMuted: boolean
  // 🔧 트랙 상태 변경 시 React가 감지할 수 있도록 revision 카운터
  revision: number
}

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
 * This component safely uses all LiveKit hooks because it's only rendered inside LiveKitRoom
 */
export function LiveKitMediaInternalProvider({ children }: { children: ReactNode }) {
  const [mediaError, setMediaError] = useState<MediaError | null>(null)

  // Room context
  const room = useMaybeRoomContext()

  // 🔑 연결 상태 확인 - connect={false}일 때 안전 처리
  const connectionState = useConnectionState(room)
  const isConnected = connectionState === ConnectionState.Connected

  // Local participant - 🔑 reactive 값들을 직접 구조 분해
  const {
    localParticipant,
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant()

  // All participants
  const participants = useParticipants()

  // 🔑 useTracks 제거 - 직접 participant.getTrackPublication()으로 트랙 가져옴
  // useTracks의 타이밍 이슈로 인해 트랙 구독 완료 전에 빈 결과를 반환하는 문제 해결

  // 🔑 구독된 트랙을 직접 저장 (participant identity → 트랙 정보)
  const [subscribedTracks, setSubscribedTracks] = useState<Map<string, SubscribedTrackInfo>>(new Map())

  // 🔑 참가자 목록 변경 감지용
  const [participantUpdateTrigger, setParticipantUpdateTrigger] = useState(0)

  // 🔑 원격 참가자 트랙 구독 및 직접 저장
  useEffect(() => {
    if (!room) return

    // 모든 원격 참가자의 트랙 publication 구독
    const subscribeToRemoteTracks = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication instanceof RemoteTrackPublication) {
            if (!publication.isSubscribed && publication.kind !== "unknown") {
              publication.setSubscribed(true)
              if (IS_DEV) {
                console.log("[LiveKitMediaContext] Subscribing to track:", {
                  participant: participant.identity,
                  source: publication.source,
                  kind: publication.kind,
                })
              }
            }
          }
        })
      })
    }

    // 초기 구독
    subscribeToRemoteTracks()

    // 새 트랙이 publish될 때마다 구독
    const handleTrackPublished = () => {
      subscribeToRemoteTracks()
    }

    // 참가자가 들어올 때마다 구독
    const handleParticipantConnected = () => {
      setTimeout(subscribeToRemoteTracks, 100)
      setParticipantUpdateTrigger(prev => prev + 1)
    }

    // 🔑 핵심: trackSubscribed 이벤트에서 실제 track을 직접 state에 저장
    const handleTrackSubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      const identity = participant.identity
      const source = publication.source
      const mediaTrack = track.mediaStreamTrack

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] 🎯 Track SUBSCRIBED - storing directly:", {
          identity,
          source,
          trackId: mediaTrack?.id,
          enabled: mediaTrack?.enabled,
          readyState: mediaTrack?.readyState,
        })
      }

      setSubscribedTracks(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(identity) || {
          isVideoMuted: true,
          isAudioMuted: true,
          isScreenMuted: true,
          revision: 0,
        }

        if (source === Track.Source.Camera) {
          existing.video = mediaTrack
          existing.isVideoMuted = publication.isMuted
        } else if (source === Track.Source.Microphone) {
          existing.audio = mediaTrack
          existing.isAudioMuted = publication.isMuted
        } else if (source === Track.Source.ScreenShare) {
          existing.screen = mediaTrack
          existing.isScreenMuted = publication.isMuted
        }
        existing.revision = (existing.revision || 0) + 1

        newMap.set(identity, existing)
        return newMap
      })
    }

    // 트랙 구독 해제 시 제거
    const handleTrackUnsubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      const identity = participant.identity
      const source = publication.source

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Track UNSUBSCRIBED:", { identity, source })
      }

      setSubscribedTracks(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(identity)
        if (existing) {
          if (source === Track.Source.Camera) {
            existing.video = undefined
            existing.isVideoMuted = true
          } else if (source === Track.Source.Microphone) {
            existing.audio = undefined
            existing.isAudioMuted = true
          } else if (source === Track.Source.ScreenShare) {
            existing.screen = undefined
            existing.isScreenMuted = true
          }
          newMap.set(identity, existing)
        }
        return newMap
      })
    }

    // 🔑 트랙 mute/unmute 상태 업데이트
    const handleTrackMuted = (
      publication: TrackPublication,
      participant: Participant
    ) => {
      // 로컬 참가자는 무시 (로컬은 publication에서 직접 가져옴)
      if (participant === room.localParticipant) return

      const identity = participant.identity
      const source = publication.source

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Track MUTED:", { identity, source, isMuted: publication.isMuted })
      }

      setSubscribedTracks(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(identity)
        if (existing) {
          if (source === Track.Source.Camera) {
            existing.isVideoMuted = true
          } else if (source === Track.Source.Microphone) {
            existing.isAudioMuted = true
          } else if (source === Track.Source.ScreenShare) {
            existing.isScreenMuted = true
          }
          // 🔧 revision 증가 - React가 상태 변경을 감지하도록
          existing.revision = (existing.revision || 0) + 1
          newMap.set(identity, existing)
        }
        return newMap
      })
    }

    const handleTrackUnmuted = (
      publication: TrackPublication,
      participant: Participant
    ) => {
      // 로컬 참가자는 무시
      if (participant === room.localParticipant) return

      const identity = participant.identity
      const source = publication.source

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Track UNMUTED:", { identity, source })
      }

      setSubscribedTracks(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(identity)
        if (existing) {
          if (source === Track.Source.Camera) {
            existing.isVideoMuted = false
          } else if (source === Track.Source.Microphone) {
            existing.isAudioMuted = false
          } else if (source === Track.Source.ScreenShare) {
            existing.isScreenMuted = false
          }
          // 🔧 revision 증가 - React가 상태 변경을 감지하도록 (같은 MediaStreamTrack 재사용 시 특히 중요)
          existing.revision = (existing.revision || 0) + 1
          newMap.set(identity, existing)
        }
        return newMap
      })
    }

    // 참가자 나갈 때 트랙 정보 제거
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      const identity = participant.identity
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Participant disconnected, removing tracks:", identity)
      }
      setSubscribedTracks(prev => {
        const newMap = new Map(prev)
        newMap.delete(identity)
        return newMap
      })
      setParticipantUpdateTrigger(prev => prev + 1)
    }

    room.on("trackPublished", handleTrackPublished)
    room.on("participantConnected", handleParticipantConnected)
    room.on("participantDisconnected", handleParticipantDisconnected)
    room.on("trackSubscribed", handleTrackSubscribed)
    room.on("trackUnsubscribed", handleTrackUnsubscribed)
    room.on("trackMuted", handleTrackMuted)
    room.on("trackUnmuted", handleTrackUnmuted)

    return () => {
      room.off("trackPublished", handleTrackPublished)
      room.off("participantConnected", handleParticipantConnected)
      room.off("participantDisconnected", handleParticipantDisconnected)
      room.off("trackSubscribed", handleTrackSubscribed)
      room.off("trackUnsubscribed", handleTrackUnsubscribed)
      room.off("trackMuted", handleTrackMuted)
      room.off("trackUnmuted", handleTrackUnmuted)
    }
  }, [room])

  // Build participant tracks map
  // 🔑 subscribedTracks에서 직접 트랙 가져오기 (trackSubscribed 이벤트에서 저장된 트랙)
  const participantTracks = useMemo(() => {
    const tracks = new Map<string, ParticipantTrack>()

    // 연결되지 않았거나 참가자가 없으면 빈 Map 반환
    if (!isConnected || participants.length === 0) {
      return tracks
    }

    participants.forEach((participant) => {
      const identity = participant.identity
      const isLocal = participant === localParticipant

      const trackInfo: ParticipantTrack = {
        participantId: identity,
        participantName: participant.name || identity,
        isSpeaking: participant.isSpeaking,
        isVideoMuted: true,
        isAudioMuted: true,
        isScreenMuted: true,
      }

      if (isLocal) {
        // 🔑 로컬 참가자는 직접 publication에서 가져오기
        const cameraPublication = participant.getTrackPublication(Track.Source.Camera)
        const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
        const micPublication = participant.getTrackPublication(Track.Source.Microphone)

        if (cameraPublication?.track) {
          const mediaTrack = cameraPublication.track.mediaStreamTrack
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            trackInfo.videoTrack = mediaTrack
            trackInfo.isVideoMuted = cameraPublication.isMuted
          }
        }

        if (screenPublication?.track) {
          const mediaTrack = screenPublication.track.mediaStreamTrack
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            trackInfo.screenTrack = mediaTrack
            trackInfo.isScreenMuted = screenPublication.isMuted
          }
        }

        if (micPublication?.track) {
          const mediaTrack = micPublication.track.mediaStreamTrack
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            trackInfo.audioTrack = mediaTrack
            trackInfo.isAudioMuted = micPublication.isMuted
          }
        }
      } else {
        // 🔑 원격 참가자는 subscribedTracks에서 가져오기 (trackSubscribed 이벤트에서 저장됨)
        const subscribed = subscribedTracks.get(identity)
        if (subscribed) {
          if (subscribed.video && subscribed.video.readyState !== "ended") {
            trackInfo.videoTrack = subscribed.video
            trackInfo.isVideoMuted = subscribed.isVideoMuted
          } else {
            trackInfo.isVideoMuted = subscribed.isVideoMuted
          }

          if (subscribed.screen && subscribed.screen.readyState !== "ended") {
            trackInfo.screenTrack = subscribed.screen
            trackInfo.isScreenMuted = subscribed.isScreenMuted
          }

          if (subscribed.audio && subscribed.audio.readyState !== "ended") {
            trackInfo.audioTrack = subscribed.audio
            trackInfo.isAudioMuted = subscribed.isAudioMuted
          } else {
            trackInfo.isAudioMuted = subscribed.isAudioMuted
          }

          // 🔧 revision 카운터 포함 - VideoTile에서 트랙 상태 변경 감지용
          trackInfo.revision = subscribed.revision
        }
      }

      tracks.set(identity, trackInfo)

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Participant track:", {
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
  }, [participants, localParticipant, isConnected, subscribedTracks, participantUpdateTrigger])

  // Media state - 🔑 useLocalParticipant의 reactive 값 직접 사용
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

      // Resume audio context (browser autoplay policy)
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
        console.log(
          "[LiveKitMediaContext] Toggle microphone:",
          newState ? "ON" : "OFF"
        )
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
        console.log(
          "[LiveKitMediaContext] Toggle screen share:",
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
  // 🔑 isAvailable은 실제 연결 상태 기준
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
