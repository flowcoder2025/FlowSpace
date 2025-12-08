"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  RemoteTrackPublication,
  ConnectionState,
} from "livekit-client"
import type { LiveKitConfig, MediaState, ParticipantTrack } from "./types"

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"
const IS_DEV = process.env.NODE_ENV === "development"

// 개발 환경에서 LiveKit 서버가 기본 localhost인 경우 연결 시도 전 서버 확인
const SKIP_LIVEKIT_IN_DEV = IS_DEV && LIVEKIT_URL === "ws://localhost:7880"

// 미디어 에러 타입
export type MediaError = {
  type: "permission_denied" | "not_found" | "not_connected" | "unknown"
  message: string
}

interface UseLiveKitOptions {
  spaceId: string
  participantId: string
  participantName: string
  sessionToken?: string // 게스트 세션 토큰 (인증 검증용)
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
  mediaError: MediaError | null
  /** 🔒 서버에서 파생된 실제 participantId (props와 다를 수 있음) */
  effectiveParticipantId: string | null
  toggleCamera: () => Promise<boolean>
  toggleMicrophone: () => Promise<boolean>
  toggleScreenShare: () => Promise<boolean>
  connect: () => Promise<void>
  disconnect: (allowReconnect?: boolean) => void
}

/**
 * @deprecated useLiveKitMedia를 사용하세요. 이 훅은 다음 버전에서 제거됩니다.
 *
 * 마이그레이션 가이드:
 * - useLiveKit() → useLiveKitMedia()
 * - LiveKitRoomProvider 내부에서만 사용 가능
 * - 동일 화면에서 useLiveKit과 useLiveKitMedia 혼용 금지
 *
 * @see useLiveKitMedia
 */
export function useLiveKit({
  spaceId,
  participantId,
  participantName,
  sessionToken,
  enabled = true,
}: UseLiveKitOptions): UseLiveKitReturn {
  const roomRef = useRef<Room | null>(null)
  const connectionAttemptedRef = useRef(false)
  const isConnectingRef = useRef(false)
  const mountedRef = useRef(false)

  // 🔧 Stale closure 방지를 위한 ref들
  // 이벤트 핸들러에서 항상 최신 함수를 참조하기 위해 사용
  const updateParticipantTracksRef = useRef<(room: Room) => void>(() => {})
  const updateMediaStateRef = useRef<(participant: LocalParticipant | null) => void>(() => {})

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
  const [mediaError, setMediaError] = useState<MediaError | null>(null)
  // 🔒 서버에서 파생된 실제 participantId (클라이언트 props와 다를 수 있음)
  const [effectiveParticipantId, setEffectiveParticipantId] = useState<string | null>(null)

  // 미디어 에러 파싱 헬퍼
  const parseMediaError = useCallback((error: unknown): MediaError => {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
      return { type: "permission_denied", message: "카메라/마이크 권한이 거부되었습니다." }
    }
    if (errorMessage.includes("NotFoundError") || errorMessage.includes("not found")) {
      return { type: "not_found", message: "카메라/마이크를 찾을 수 없습니다." }
    }
    return { type: "unknown", message: errorMessage }
  }, [])

  // Token 응답 타입 (서버에서 파생된 participantId 포함)
  interface TokenResponse {
    token: string
    participantId: string
    participantName: string
  }

  // Get access token from API
  // 🔒 서버에서 파생된 participantId를 반환하여 클라이언트 동기화에 사용
  const getToken = useCallback(async (): Promise<TokenResponse> => {
    const response = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: `space-${spaceId}`,
        participantName,
        participantId,
        sessionToken, // 게스트 세션 검증용
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || "Failed to get LiveKit token")
    }

    const data = await response.json()
    // 🔒 서버 응답 전체 반환 (token + 서버에서 파생된 participantId)
    return {
      token: data.token,
      participantId: data.participantId,
      participantName: data.participantName,
    }
  }, [spaceId, participantId, participantName, sessionToken])

  // Update participant tracks
  // 🔧 개선: muted 트랙을 제외하지 않고, mute 상태를 플래그로 전달
  // VideoTile에서 mute 상태에 따라 placeholder/video 전환 처리
  const updateParticipantTracks = useCallback((room: Room) => {
    const tracks = new Map<string, ParticipantTrack>()

    // Add local participant tracks
    if (room.localParticipant) {
      const local = room.localParticipant
      const trackInfo: ParticipantTrack = {
        participantId: local.identity,
        participantName: local.name || local.identity,
        isSpeaking: local.isSpeaking,
        isVideoMuted: false,
        isAudioMuted: false,
        isScreenMuted: false,
      }

      local.trackPublications.forEach((pub) => {
        if (pub.track) {
          const mediaTrack = pub.track.mediaStreamTrack
          // 🔧 ended 상태의 트랙은 제외 (카메라 off→on 반복 시 stale 트랙 방지)
          if (mediaTrack.readyState === "ended") {
            if (IS_DEV) {
              console.log("[LiveKit] Skipping ended local track:", pub.trackSid)
            }
            return
          }

          if (pub.track.kind === Track.Kind.Video) {
            if (pub.source === Track.Source.ScreenShare) {
              // 🔧 화면공유: muted면 트랙 제외, 플래그 설정
              if (!pub.isMuted) {
                trackInfo.screenTrack = mediaTrack
              }
              trackInfo.isScreenMuted = pub.isMuted
            } else {
              // 🔧 로컬 비디오: 항상 트랙 설정 (자신의 카메라는 마지막 프레임 문제 없음)
              // muted 체크 없이 트랙 설정 - 카메라 끄면 unpublish됨
              trackInfo.videoTrack = mediaTrack
              trackInfo.isVideoMuted = pub.isMuted
            }
          } else if (pub.track.kind === Track.Kind.Audio) {
            // 🔧 오디오: muted여도 트랙 유지 (음소거 상태 표시용)
            trackInfo.audioTrack = mediaTrack
            trackInfo.isAudioMuted = pub.isMuted
          }
        }
      })

      tracks.set(local.identity, trackInfo)
      if (IS_DEV) {
        console.log("[LiveKit] Local tracks:", {
          identity: local.identity,
          hasVideo: !!trackInfo.videoTrack,
          hasAudio: !!trackInfo.audioTrack,
          isVideoMuted: trackInfo.isVideoMuted,
          isAudioMuted: trackInfo.isAudioMuted,
        })
      }
    }

    // Add remote participant tracks
    room.remoteParticipants.forEach((remote) => {
      const trackInfo: ParticipantTrack = {
        participantId: remote.identity,
        participantName: remote.name || remote.identity,
        isSpeaking: remote.isSpeaking,
        isVideoMuted: false,
        isAudioMuted: false,
        isScreenMuted: false,
      }

      remote.trackPublications.forEach((pub) => {
        // 원격 트랙의 경우 isSubscribed 확인
        const remotePub = pub as RemoteTrackPublication
        const isSubscribed = remotePub.isSubscribed

        if (IS_DEV) {
          console.log("[LiveKit] Remote track pub:", {
            identity: remote.identity,
            trackSid: pub.trackSid,
            kind: pub.kind,
            source: pub.source,
            isSubscribed,
            hasTrack: !!pub.track,
            isMuted: remotePub.isMuted,
          })
        }

        // 구독된 트랙만 처리
        if (pub.track && isSubscribed) {
          const mediaTrack = pub.track.mediaStreamTrack
          // 🔧 ended 상태의 트랙은 제외
          if (mediaTrack.readyState === "ended") {
            if (IS_DEV) {
              console.log("[LiveKit] Skipping ended remote track:", pub.trackSid)
            }
            return
          }

          if (pub.track.kind === Track.Kind.Video) {
            if (pub.source === Track.Source.ScreenShare) {
              // 🔧 화면공유: 항상 트랙 설정, 플래그로 표시 제어
              trackInfo.screenTrack = mediaTrack
              trackInfo.isScreenMuted = remotePub.isMuted
            } else {
              // 🔧 원격 비디오: 항상 트랙 설정, 플래그로 표시 제어
              // (코덱스 피드백: 트랙 참조 유지해야 mute/unmute 시 즉시 반영)
              trackInfo.videoTrack = mediaTrack
              trackInfo.isVideoMuted = remotePub.isMuted
            }
          } else if (pub.track.kind === Track.Kind.Audio) {
            // 🔧 오디오: 항상 트랙 유지 (원격 재생은 LiveKit이 처리)
            trackInfo.audioTrack = mediaTrack
            trackInfo.isAudioMuted = remotePub.isMuted
          }
        }
      })

      tracks.set(remote.identity, trackInfo)
      if (IS_DEV) {
        console.log("[LiveKit] Remote participant tracks:", {
          identity: remote.identity,
          hasVideo: !!trackInfo.videoTrack,
          hasAudio: !!trackInfo.audioTrack,
          hasScreen: !!trackInfo.screenTrack,
          isVideoMuted: trackInfo.isVideoMuted,
          isAudioMuted: trackInfo.isAudioMuted,
        })
      }
    })

    setParticipantTracks(tracks)
  }, [])

  // 🔧 ref 동기화: 함수가 변경될 때마다 ref 업데이트
  updateParticipantTracksRef.current = updateParticipantTracks

  // Connect to room
  const connect = useCallback(async () => {
    // 이미 연결되었거나 연결 중이거나 연결 시도한 경우 스킵
    if (roomRef.current || connectionAttemptedRef.current || isConnectingRef.current) {
      if (IS_DEV) {
        console.log("[LiveKit] Connection skipped:", {
          hasRoom: !!roomRef.current,
          attempted: connectionAttemptedRef.current,
          connecting: isConnectingRef.current,
        })
      }
      return
    }

    // 연결 시작
    isConnectingRef.current = true
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
        // 서버 없음 - 조용히 비활성화 (재연결 허용을 위해 플래그 원복)
        console.info("[LiveKit] 개발 모드: 서버 미실행 상태, 비디오/오디오 기능 비활성화")
        setIsAvailable(false)
        setConnectionError("LiveKit server not running")
        isConnectingRef.current = false
        // 중요: 나중에 서버를 띄웠을 때 재연결이 가능하도록 플래그 원복
        connectionAttemptedRef.current = false
        return
      }
    }

    // 연결 시도 전 마운트 상태 확인
    if (!mountedRef.current) {
      if (IS_DEV) {
        console.log("[LiveKit] Component unmounted before connection, aborting")
      }
      isConnectingRef.current = false
      connectionAttemptedRef.current = false
      return
    }

    try {
      // 🔒 서버에서 토큰과 함께 파생된 participantId를 받음
      const tokenResponse = await getToken()

      // 🔒 서버에서 파생된 participantId를 상태에 저장
      setEffectiveParticipantId(tokenResponse.participantId)
      if (IS_DEV) {
        console.log("[LiveKit] Server-derived participantId:", tokenResponse.participantId)
      }

      // 토큰 획득 후 마운트 상태 재확인
      if (!mountedRef.current) {
        if (IS_DEV) {
          console.log("[LiveKit] Component unmounted after token fetch, aborting")
        }
        isConnectingRef.current = false
        connectionAttemptedRef.current = false
        return
      }

      const room = new Room()
      roomRef.current = room

      // Setup event listeners
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state)
      })

      // 🔧 이벤트 핸들러에서 ref.current를 통해 최신 함수 호출 (stale closure 방지)
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Participant connected:", participant.identity)
        }
        setRemoteParticipants(Array.from(room.remoteParticipants.values()))
        updateParticipantTracksRef.current(room)
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Participant disconnected:", participant.identity)
        }
        setRemoteParticipants(Array.from(room.remoteParticipants.values()))
        updateParticipantTracksRef.current(room)
      })

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Track subscribed:", {
            participant: participant.identity,
            trackSid: track.sid,
            kind: track.kind,
            source: publication.source,
          })
        }
        // 🔧 ref를 통해 최신 함수 호출
        updateParticipantTracksRef.current(room)
      })

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Track unsubscribed:", {
            participant: participant.identity,
            trackSid: track.sid,
          })
        }
        updateParticipantTracksRef.current(room)
      })

      // 원격 참가자의 트랙이 퍼블리시되었을 때
      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Remote track published:", {
            participant: participant.identity,
            trackSid: publication.trackSid,
            kind: publication.kind,
            source: publication.source,
          })
        }
        updateParticipantTracksRef.current(room)
      })

      room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Remote track unpublished:", {
            participant: participant.identity,
            trackSid: publication.trackSid,
          })
        }
        updateParticipantTracksRef.current(room)
      })

      room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Local track published:", {
            trackSid: publication.trackSid,
            kind: publication.kind,
            source: publication.source,
          })
        }
        updateParticipantTracksRef.current(room)
        updateMediaStateRef.current(room.localParticipant)
      })

      room.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Local track unpublished:", {
            trackSid: publication.trackSid,
          })
        }
        updateParticipantTracksRef.current(room)
        updateMediaStateRef.current(room.localParticipant)
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        updateParticipantTracksRef.current(room)
      })

      // 🔧 TrackMuted/TrackUnmuted 이벤트 핸들러 추가
      // LiveKit은 카메라/마이크 토글 시 퍼블리시 유지 + mute 방식을 사용
      // 이 이벤트를 잡지 않으면 원격 참가자의 비디오가 업데이트되지 않음
      room.on(RoomEvent.TrackMuted, (publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Track muted:", {
            participant: participant.identity,
            trackSid: publication.trackSid,
            kind: publication.kind,
            source: publication.source,
          })
        }
        updateParticipantTracksRef.current(room)
        // 로컬 참가자의 경우 mediaState도 업데이트
        if (participant === room.localParticipant) {
          updateMediaStateRef.current(room.localParticipant)
        }
      })

      room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        if (IS_DEV) {
          console.log("[LiveKit] Track unmuted:", {
            participant: participant.identity,
            trackSid: publication.trackSid,
            kind: publication.kind,
            source: publication.source,
          })
        }
        updateParticipantTracksRef.current(room)
        // 로컬 참가자의 경우 mediaState도 업데이트
        if (participant === room.localParticipant) {
          updateMediaStateRef.current(room.localParticipant)
        }
      })

      // 미디어 디바이스 에러 핸들링
      room.on(RoomEvent.MediaDevicesError, (error) => {
        // Filter out user cancellation errors (screen share picker cancelled)
        const errorName = error instanceof Error ? error.name : ""
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isUserCancellation =
          errorName === "NotAllowedError" ||
          errorMessage.includes("Permission denied") ||
          errorMessage.includes("cancelled") ||
          errorMessage.includes("canceled")

        if (isUserCancellation) {
          if (IS_DEV) {
            console.log("[LiveKit] Media device access cancelled by user")
          }
          return
        }

        console.error("[LiveKit] Media device error:", error)
        setMediaError(parseMediaError(error))
      })

      // Connect to room (🔒 서버에서 받은 토큰 사용)
      await room.connect(LIVEKIT_URL, tokenResponse.token)

      // 연결 완료 후 마운트 상태 확인
      if (!mountedRef.current) {
        if (IS_DEV) {
          console.log("[LiveKit] Component unmounted after connection, disconnecting")
        }
        room.disconnect()
        roomRef.current = null
        isConnectingRef.current = false
        connectionAttemptedRef.current = false
        return
      }

      setLocalParticipant(room.localParticipant)
      setRemoteParticipants(Array.from(room.remoteParticipants.values()))
      // 🔧 ref를 통해 최신 함수 호출
      updateParticipantTracksRef.current(room)
      setConnectionError(null)
      setIsAvailable(true)
      isConnectingRef.current = false

      console.log("[LiveKit] Connected to room:", room.name)
    } catch (error) {
      // 에러 상태 설정 및 graceful 처리
      const errorMessage = error instanceof Error ? error.message : "Connection failed"
      setConnectionError(errorMessage)
      setIsAvailable(false)
      roomRef.current = null
      isConnectingRef.current = false

      // 개발 환경에서는 경고만 출력 (에러 스팸 방지)
      if (IS_DEV) {
        console.warn("[LiveKit] 서버 연결 실패 - LiveKit 서버가 실행중인지 확인하세요 (port 7880)")
      } else {
        console.error("[LiveKit] Connection error:", error)
      }
    }
    // 🔧 ref를 사용하므로 updateParticipantTracks 의존성 제거
  }, [getToken])

  // Disconnect from room
  const disconnect = useCallback((allowReconnect = false) => {
    if (IS_DEV) {
      console.log("[LiveKit] Disconnect called, allowReconnect:", allowReconnect)
    }

    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }

    // 명시적인 재연결 허용 시에만 상태 리셋
    // (React Strict Mode 클린업에서는 호출되지 않음)
    if (allowReconnect) {
      connectionAttemptedRef.current = false
      isConnectingRef.current = false
    }

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

  // 🔧 ref 동기화: 함수가 변경될 때마다 ref 업데이트
  updateMediaStateRef.current = updateMediaState

  // Toggle camera
  // 🔧 React 상태(mediaState) 대신 LiveKit participant의 실시간 상태 직접 참조
  // 빠른 연속 토글 시 stale closure 문제 방지
  const toggleCamera = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current
    if (!room?.localParticipant) {
      console.warn("[LiveKit] Cannot toggle camera: not connected to room")
      setMediaError({ type: "not_connected", message: "LiveKit에 연결되지 않았습니다." })
      return false
    }

    try {
      setMediaError(null)

      // 사용자 인터랙션 시 AudioContext resume (브라우저 자동재생 정책 대응)
      await room.startAudio().catch(() => {
        // AudioContext가 이미 실행 중이거나 실패 - 무시해도 됨
      })

      // 🔧 LiveKit participant의 실시간 상태 직접 참조 (React 상태 대신)
      const currentState = room.localParticipant.isCameraEnabled
      const newState = !currentState
      if (IS_DEV) {
        console.log("[LiveKit] Toggling camera:", newState ? "ON" : "OFF", {
          currentLiveKitState: currentState,
        })
      }
      await room.localParticipant.setCameraEnabled(newState)
      // 🔧 ref를 통해 최신 함수 호출
      updateMediaStateRef.current(room.localParticipant)
      return true
    } catch (error) {
      console.error("[LiveKit] Camera toggle error:", error)
      const parsedError = parseMediaError(error)
      setMediaError(parsedError)
      return false
    }
    // 🔧 의존성에서 mediaState 제거 (LiveKit 실시간 상태 사용)
  }, [parseMediaError])

  // Toggle microphone
  // 🔧 React 상태(mediaState) 대신 LiveKit participant의 실시간 상태 직접 참조
  const toggleMicrophone = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current
    if (!room?.localParticipant) {
      console.warn("[LiveKit] Cannot toggle microphone: not connected to room")
      setMediaError({ type: "not_connected", message: "LiveKit에 연결되지 않았습니다." })
      return false
    }

    try {
      setMediaError(null)

      // 사용자 인터랙션 시 AudioContext resume (브라우저 자동재생 정책 대응)
      await room.startAudio().catch(() => {
        // AudioContext가 이미 실행 중이거나 실패 - 무시해도 됨
      })

      // 🔧 LiveKit participant의 실시간 상태 직접 참조 (React 상태 대신)
      const currentState = room.localParticipant.isMicrophoneEnabled
      const newState = !currentState
      if (IS_DEV) {
        console.log("[LiveKit] Toggling microphone:", newState ? "ON" : "OFF", {
          currentLiveKitState: currentState,
        })
      }
      await room.localParticipant.setMicrophoneEnabled(newState)
      // 🔧 ref를 통해 최신 함수 호출
      updateMediaStateRef.current(room.localParticipant)
      return true
    } catch (error) {
      console.error("[LiveKit] Microphone toggle error:", error)
      const parsedError = parseMediaError(error)
      setMediaError(parsedError)
      return false
    }
    // 🔧 의존성에서 mediaState 제거 (LiveKit 실시간 상태 사용)
  }, [parseMediaError])

  // Toggle screen share
  // 🔧 React 상태(mediaState) 대신 LiveKit participant의 실시간 상태 직접 참조
  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current
    if (!room?.localParticipant) {
      console.warn("[LiveKit] Cannot toggle screen share: not connected to room")
      setMediaError({ type: "not_connected", message: "LiveKit에 연결되지 않았습니다." })
      return false
    }

    try {
      setMediaError(null)
      // 🔧 LiveKit participant의 실시간 상태 직접 참조 (React 상태 대신)
      const currentState = room.localParticipant.isScreenShareEnabled
      const newState = !currentState
      if (IS_DEV) {
        console.log("[LiveKit] Toggling screen share:", newState ? "ON" : "OFF", {
          currentLiveKitState: currentState,
        })
      }
      await room.localParticipant.setScreenShareEnabled(newState)
      // 🔧 ref를 통해 최신 함수 호출
      updateMediaStateRef.current(room.localParticipant)
      return true
    } catch (error) {
      // User cancelled screen share picker - not an error, just silently return
      const errorName = error instanceof Error ? error.name : ""
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check for user cancellation patterns (various browser messages)
      const isUserCancellation =
        errorName === "NotAllowedError" ||
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("user denied") ||
        errorMessage.includes("AbortError")

      if (isUserCancellation) {
        // User cancelled or denied - don't show error for screen share cancellation
        if (IS_DEV) {
          console.log("[LiveKit] Screen share cancelled by user:", errorMessage)
        }
        return false
      }

      console.error("[LiveKit] Screen share toggle error:", error)
      const parsedError = parseMediaError(error)
      setMediaError(parsedError)
      return false
    }
    // 🔧 의존성에서 mediaState 제거 (LiveKit 실시간 상태 사용)
  }, [parseMediaError])

  // 브라우저/탭 종료 시 즉시 disconnect 호출 (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (IS_DEV) {
        console.log("[LiveKit] Browser closing, disconnecting...")
      }
      // 브라우저 종료 시 즉시 disconnect
      if (roomRef.current) {
        roomRef.current.disconnect()
      }
    }

    // visibilitychange도 추가하여 탭 전환/숨김 감지
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && roomRef.current) {
        // 페이지가 숨겨질 때 (탭 전환, 브라우저 최소화 등)
        // 모바일에서 beforeunload가 작동하지 않는 경우를 대비
        if (IS_DEV) {
          console.log("[LiveKit] Page hidden, preparing for potential close")
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // Auto-connect when enabled
  useEffect(() => {
    // 마운트 상태 추적
    mountedRef.current = true

    if (IS_DEV) {
      console.log("[LiveKit] useEffect mount, enabled:", enabled)
    }

    if (enabled) {
      connect()
    }

    return () => {
      if (IS_DEV) {
        console.log("[LiveKit] useEffect cleanup")
      }
      mountedRef.current = false
      // 클린업 시에는 allowReconnect = false로 호출
      // React Strict Mode 재마운트 시 connectionAttemptedRef가 유지됨
      disconnect(false)
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
    mediaError,
    effectiveParticipantId, // 🔒 서버에서 파생된 실제 participantId
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    connect,
    disconnect,
  }
}
