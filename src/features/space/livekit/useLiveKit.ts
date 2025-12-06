"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  LocalTrackPublication,
  RemoteTrackPublication,
  ConnectionState,
  createLocalTracks,
} from "livekit-client"
import type { LiveKitConfig, MediaState, ParticipantTrack } from "./types"

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"
const IS_DEV = process.env.NODE_ENV === "development"
const MAX_CONNECTION_ATTEMPTS = 1 // 개발 환경에서 재시도 최소화

// 개발 환경에서 LiveKit 서버가 기본 localhost인 경우 연결 시도 전 서버 확인
const SKIP_LIVEKIT_IN_DEV = IS_DEV && LIVEKIT_URL === "ws://localhost:7880"

interface UseLiveKitOptions {
  spaceId: string
  participantId: string
  participantName: string
  enabled?: boolean
}

interface UseLiveKitReturn {
  room: Room | null
  connectionState: ConnectionState
  connectionError: string | null
  isAvailable: boolean
  localParticipant: LocalParticipant | null
  remoteParticipants: RemoteParticipant[]
  participantTracks: Map<string, ParticipantTrack>
  mediaState: MediaState
  toggleCamera: () => Promise<void>
  toggleMicrophone: () => Promise<void>
  toggleScreenShare: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => void
}

export function useLiveKit({
  spaceId,
  participantId,
  participantName,
  enabled = true,
}: UseLiveKitOptions): UseLiveKitReturn {
  const roomRef = useRef<Room | null>(null)
  const connectionAttemptedRef = useRef(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null)
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([])
  const [participantTracks, setParticipantTracks] = useState<Map<string, ParticipantTrack>>(new Map())
  const [mediaState, setMediaState] = useState<MediaState>({
    isCameraEnabled: false,
    isMicrophoneEnabled: false,
    isScreenShareEnabled: false,
  })

  // Get access token from API
  const getToken = useCallback(async (): Promise<string> => {
    const response = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: `space-${spaceId}`,
        participantName,
        participantId,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to get LiveKit token")
    }

    const data = await response.json()
    return data.token
  }, [spaceId, participantId, participantName])

  // Update participant tracks
  const updateParticipantTracks = useCallback((room: Room) => {
    const tracks = new Map<string, ParticipantTrack>()

    // Add local participant tracks
    if (room.localParticipant) {
      const local = room.localParticipant
      const trackInfo: ParticipantTrack = {
        participantId: local.identity,
        participantName: local.name || local.identity,
        isSpeaking: local.isSpeaking,
      }

      local.trackPublications.forEach((pub) => {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video) {
            if (pub.source === Track.Source.ScreenShare) {
              trackInfo.screenTrack = pub.track.mediaStreamTrack
            } else {
              trackInfo.videoTrack = pub.track.mediaStreamTrack
            }
          } else if (pub.track.kind === Track.Kind.Audio) {
            trackInfo.audioTrack = pub.track.mediaStreamTrack
          }
        }
      })

      tracks.set(local.identity, trackInfo)
    }

    // Add remote participant tracks
    room.remoteParticipants.forEach((remote) => {
      const trackInfo: ParticipantTrack = {
        participantId: remote.identity,
        participantName: remote.name || remote.identity,
        isSpeaking: remote.isSpeaking,
      }

      remote.trackPublications.forEach((pub) => {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video) {
            if (pub.source === Track.Source.ScreenShare) {
              trackInfo.screenTrack = pub.track.mediaStreamTrack
            } else {
              trackInfo.videoTrack = pub.track.mediaStreamTrack
            }
          } else if (pub.track.kind === Track.Kind.Audio) {
            trackInfo.audioTrack = pub.track.mediaStreamTrack
          }
        }
      })

      tracks.set(remote.identity, trackInfo)
    })

    setParticipantTracks(tracks)
  }, [])

  // Connect to room
  const connect = useCallback(async () => {
    // 이미 연결되었거나 연결 시도한 경우 스킵
    if (roomRef.current || connectionAttemptedRef.current) return
    connectionAttemptedRef.current = true

    // 개발 환경에서 기본 localhost 사용 시 서버 확인 후 연결 시도
    if (SKIP_LIVEKIT_IN_DEV) {
      try {
        // 서버 상태 확인 (빠른 타임아웃)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1000)
        await fetch("http://localhost:7880", {
          signal: controller.signal,
          mode: "no-cors"
        })
        clearTimeout(timeoutId)
      } catch {
        // 서버 없음 - 조용히 비활성화
        console.info("[LiveKit] 개발 모드: 서버 미실행 상태, 비디오/오디오 기능 비활성화")
        setIsAvailable(false)
        setConnectionError("LiveKit server not running")
        return
      }
    }

    try {
      const token = await getToken()
      const room = new Room()
      roomRef.current = room

      // Setup event listeners
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state)
      })

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        setRemoteParticipants(Array.from(room.remoteParticipants.values()))
        updateParticipantTracks(room)
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setRemoteParticipants(Array.from(room.remoteParticipants.values()))
        updateParticipantTracks(room)
      })

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        updateParticipantTracks(room)
      })

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        updateParticipantTracks(room)
      })

      room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
        updateParticipantTracks(room)
        updateMediaState(room.localParticipant)
      })

      room.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
        updateParticipantTracks(room)
        updateMediaState(room.localParticipant)
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        updateParticipantTracks(room)
      })

      // Connect to room
      await room.connect(LIVEKIT_URL, token)

      setLocalParticipant(room.localParticipant)
      setRemoteParticipants(Array.from(room.remoteParticipants.values()))
      updateParticipantTracks(room)
      setConnectionError(null)
      setIsAvailable(true)

      console.log("[LiveKit] Connected to room:", room.name)
    } catch (error) {
      // 에러 상태 설정 및 graceful 처리
      const errorMessage = error instanceof Error ? error.message : "Connection failed"
      setConnectionError(errorMessage)
      setIsAvailable(false)
      roomRef.current = null

      // 개발 환경에서는 경고만 출력 (에러 스팸 방지)
      if (IS_DEV) {
        console.warn("[LiveKit] 서버 연결 실패 - LiveKit 서버가 실행중인지 확인하세요 (port 7880)")
      } else {
        console.error("[LiveKit] Connection error:", error)
      }
    }
  }, [getToken, updateParticipantTracks])

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }
    // 재연결 허용을 위해 상태 리셋
    connectionAttemptedRef.current = false
    setLocalParticipant(null)
    setRemoteParticipants([])
    setParticipantTracks(new Map())
    setConnectionState(ConnectionState.Disconnected)
    setConnectionError(null)
  }, [])

  // Update media state from local participant
  const updateMediaState = useCallback((participant: LocalParticipant | null) => {
    if (!participant) return

    setMediaState({
      isCameraEnabled: participant.isCameraEnabled,
      isMicrophoneEnabled: participant.isMicrophoneEnabled,
      isScreenShareEnabled: participant.isScreenShareEnabled,
    })
  }, [])

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return

    try {
      await room.localParticipant.setCameraEnabled(!mediaState.isCameraEnabled)
      updateMediaState(room.localParticipant)
    } catch (error) {
      console.error("[LiveKit] Camera toggle error:", error)
    }
  }, [mediaState.isCameraEnabled, updateMediaState])

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return

    try {
      await room.localParticipant.setMicrophoneEnabled(!mediaState.isMicrophoneEnabled)
      updateMediaState(room.localParticipant)
    } catch (error) {
      console.error("[LiveKit] Microphone toggle error:", error)
    }
  }, [mediaState.isMicrophoneEnabled, updateMediaState])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return

    try {
      await room.localParticipant.setScreenShareEnabled(!mediaState.isScreenShareEnabled)
      updateMediaState(room.localParticipant)
    } catch (error) {
      console.error("[LiveKit] Screen share toggle error:", error)
    }
  }, [mediaState.isScreenShareEnabled, updateMediaState])

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    room: roomRef.current,
    connectionState,
    connectionError,
    isAvailable,
    localParticipant,
    remoteParticipants,
    participantTracks,
    mediaState,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    connect,
    disconnect,
  }
}
