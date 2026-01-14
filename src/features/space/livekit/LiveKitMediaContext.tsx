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
  RemoteTrack,
} from "livekit-client"
import type { ParticipantTrack, MediaState } from "./types"

const IS_DEV = process.env.NODE_ENV === "development"

// 미디어 에러 타입
export type MediaError = {
  type: "permission_denied" | "not_found" | "not_connected" | "unknown"
  message: string
}

// Screen share options
export interface ScreenShareOptions {
  /** 시스템/탭 오디오 포함 여부 (브라우저 탭 공유 시만 지원) */
  audio?: boolean
}

// Audio capture options type
export interface AudioCaptureOptionsInput {
  noiseSuppression?: boolean
  echoCancellation?: boolean
  autoGainControl?: boolean
  voiceIsolation?: boolean
  deviceId?: string
}

// Context value type
export interface LiveKitMediaContextValue {
  participantTracks: Map<string, ParticipantTrack>
  mediaState: MediaState
  mediaError: MediaError | null
  isAvailable: boolean
  localParticipantId: string | null
  localAudioTrack: MediaStreamTrack | null // VAD용 로컬 마이크 트랙
  toggleCamera: () => Promise<boolean>
  toggleMicrophone: () => Promise<boolean>
  toggleScreenShare: (options?: ScreenShareOptions) => Promise<boolean>
  /** VAD 게이트용: 로컬 마이크 뮤트/언뮤트 (트랙 유지) - 레거시, setLocalAudioGated 사용 권장 */
  setLocalMicrophoneMuted: (muted: boolean) => Promise<boolean>
  /** 📌 소스 레벨 오디오 게이트: MediaStreamTrack.enabled 직접 제어 */
  setLocalAudioGated: (gated: boolean) => boolean
  /** 📌 AudioWorklet 처리된 트랙으로 교체 */
  replaceAudioTrackWithProcessed: (processedTrack: MediaStreamTrack) => Promise<boolean>
  /** 📌 오디오 옵션 변경 시 마이크 재시작 (동적 적용) */
  restartMicrophoneWithOptions: (options: AudioCaptureOptionsInput) => Promise<boolean>
  /** 📌 카메라 장치 전환 (설정 변경 시 사용) */
  switchCameraDevice: (deviceId: string) => Promise<boolean>
  /** 📌 마이크 장치 전환 (설정 변경 시 사용) */
  switchMicrophoneDevice: (deviceId: string) => Promise<boolean>
  /** 📌 카메라 설정 재적용 (해상도/프레임레이트 변경 시 카메라 재시작) */
  restartCamera: () => Promise<boolean>
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
  localAudioTrack: null,
  toggleCamera: async () => false,
  toggleMicrophone: async () => false,
  toggleScreenShare: async () => false,
  setLocalMicrophoneMuted: async () => false,
  setLocalAudioGated: () => false,
  replaceAudioTrackWithProcessed: async () => false,
  restartMicrophoneWithOptions: async () => false,
  switchCameraDevice: async () => false,
  switchMicrophoneDevice: async () => false,
  restartCamera: async () => false,
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

  // 🔧 Late Joiner 대응: 트랙 구독 강제 업데이트 트리거
  const [trackUpdateTrigger, setTrackUpdateTrigger] = useState(0)

  // 🔑 핵심 개선: TrackSubscribed 이벤트에서 직접 트랙을 저장하는 ref
  // useTracks 훅의 React 상태 업데이트 지연 문제를 우회
  interface StoredTrackInfo {
    track: RemoteTrack
    publication: RemoteTrackPublication
    source: Track.Source
  }
  const subscribedTracksRef = useRef<Map<string, StoredTrackInfo>>(new Map())

  // 🔑 트랙 준비 대기 재시도 횟수 추적 (무한 루프 방지)
  const trackReadyRetryCountRef = useRef<number>(0)
  const MAX_TRACK_READY_RETRIES = 30 // 최대 30번 (3초)

  // 🔧 구독 로직: 이벤트 드리븐 방식으로 전면 개편
  useEffect(() => {
    if (!room || !isConnected) return

    const shouldSubscribeSource = (source: Track.Source) =>
      source === Track.Source.Camera ||
      source === Track.Source.ScreenShare ||
      source === Track.Source.Microphone

    // 🔑 이미 구독된 트랙을 subscribedTracksRef에 추가하는 함수
    // 이벤트가 발생하기 전에 이미 구독된 트랙을 수집
    const collectExistingSubscribedTracks = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (
            publication instanceof RemoteTrackPublication &&
            publication.track &&
            shouldSubscribeSource(publication.source)
          ) {
            // 🔧 `::` 구분자 사용 (identity에 하이픈이 포함될 수 있으므로)
            const key = `${participant.identity}::${publication.source}`
            if (!subscribedTracksRef.current.has(key)) {
              subscribedTracksRef.current.set(key, {
                track: publication.track,
                publication,
                source: publication.source,
              })
              if (IS_DEV) {
                console.log("[LiveKitMediaContext] 🔍 Found existing subscribed track", {
                  participant: participant.identity,
                  source: publication.source,
                  hasMediaStreamTrack: !!publication.track.mediaStreamTrack,
                })
              }
            }
          }
        })
      })
    }

    // 🔑 구독 시도 함수 - isSubscribed=true이지만 track=null인 경우도 처리
    const subscribeParticipantTracks = (participant: RemoteParticipant) => {
      participant.trackPublications.forEach((publication) => {
        if (
          publication instanceof RemoteTrackPublication &&
          shouldSubscribeSource(publication.source)
        ) {
          // 🔧 케이스 1: 아직 구독되지 않은 경우
          if (!publication.isSubscribed) {
            publication.setSubscribed(true)
            if (IS_DEV) {
              console.log("[LiveKitMediaContext] 📡 Subscribing remote track", {
                participant: participant.identity,
                source: publication.source,
                trackSid: publication.trackSid,
              })
            }
          }
          // 🔧 케이스 2: 구독됐지만 track이 아직 없는 경우 (레이스 컨디션)
          // → 강제 재구독 시도
          else if (publication.isSubscribed && !publication.track) {
            if (IS_DEV) {
              console.log("[LiveKitMediaContext] ⚠️ Subscribed but no track - forcing re-subscribe", {
                participant: participant.identity,
                source: publication.source,
                trackSid: publication.trackSid,
              })
            }
            // 구독 해제 후 재구독
            publication.setSubscribed(false)
            setTimeout(() => {
              publication.setSubscribed(true)
            }, 50)
          }
          // 🔧 케이스 3: 이미 구독되고 트랙도 있는 경우 → subscribedTracksRef에 추가
          else if (publication.isSubscribed && publication.track) {
            const key = `${participant.identity}::${publication.source}`
            if (!subscribedTracksRef.current.has(key)) {
              subscribedTracksRef.current.set(key, {
                track: publication.track,
                publication,
                source: publication.source,
              })
              if (IS_DEV) {
                console.log("[LiveKitMediaContext] 🔍 Found subscribed track during subscribe check", {
                  participant: participant.identity,
                  source: publication.source,
                  hasMediaStreamTrack: !!publication.track.mediaStreamTrack,
                })
              }
            }
          }
        }
      })
    }

    // 🔑 중요: 이벤트 핸들러 등록 전에 이미 구독된 트랙 수집
    collectExistingSubscribedTracks()

    // 🔧 현재 원격 참가자들의 트랙 구독 시도 (아직 구독되지 않은 트랙)
    room.remoteParticipants.forEach((participant) => subscribeParticipantTracks(participant))

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] 👤 Participant connected:", participant.identity)
      }
      // 참가자 연결 시 약간의 지연 후 구독 시도 (트랙 publish 대기)
      setTimeout(() => subscribeParticipantTracks(participant), 100)
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
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] 📢 Track published:", {
            participant: participant.identity,
            source: publication.source,
            isSubscribed: publication.isSubscribed,
            hasTrack: !!publication.track,
          })
        }
        // 🔑 즉시 구독 시도
        if (!publication.isSubscribed) {
          publication.setSubscribed(true)
        }

        // 🔑 핵심 개선: 트랙이 준비될 때까지 폴링하고 준비되면 저장
        const waitForTrack = (attempts: number = 0) => {
          const track = publication.track
          if (track && track.mediaStreamTrack && track.mediaStreamTrack.readyState !== "ended") {
            // 트랙이 준비됨 - subscribedTracksRef에 저장
            const key = `${participant.identity}::${publication.source}`
            subscribedTracksRef.current.set(key, {
              track: track as RemoteTrack,
              publication,
              source: publication.source,
            })
            if (IS_DEV) {
              console.log("[LiveKitMediaContext] 🎯 Track ready after polling:", {
                participant: participant.identity,
                source: publication.source,
                attempts,
                hasMediaStreamTrack: !!track.mediaStreamTrack,
              })
            }
            setTrackUpdateTrigger((prev) => prev + 1)
          } else if (attempts < 30) {
            // 최대 30번 시도 (3초) - 100ms 간격
            setTimeout(() => waitForTrack(attempts + 1), 100)
          } else {
            if (IS_DEV) {
              console.warn("[LiveKitMediaContext] ⚠️ Track not ready after polling:", {
                participant: participant.identity,
                source: publication.source,
                isSubscribed: publication.isSubscribed,
                hasTrack: !!publication.track,
              })
            }
          }
        }

        // 폴링 시작
        waitForTrack()

        // 상태 업데이트 트리거
        setTrackUpdateTrigger((prev) => prev + 1)
      }
    }

    // 🔑 핵심 개선: TrackSubscribed에서 트랙을 직접 저장
    const handleTrackSubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      // 🔧 `::` 구분자 사용 (identity에 하이픈이 포함될 수 있으므로)
      const key = `${participant.identity}::${publication.source}`
      subscribedTracksRef.current.set(key, {
        track,
        publication,
        source: publication.source,
      })

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] ✅ Track subscribed - stored in ref", {
          participant: participant.identity,
          source: publication.source,
          hasMediaStreamTrack: !!track.mediaStreamTrack,
          refSize: subscribedTracksRef.current.size,
        })
      }

      // React 상태 업데이트 트리거
      setTrackUpdateTrigger((prev) => prev + 1)
    }

    // 🔧 TrackUnsubscribed: ref에서 제거
    const handleTrackUnsubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      // 🔧 `::` 구분자 사용 (identity에 하이픈이 포함될 수 있으므로)
      const key = `${participant.identity}::${publication.source}`
      subscribedTracksRef.current.delete(key)

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] ❌ Track unsubscribed - removed from ref", {
          participant: participant.identity,
          source: publication.source,
        })
      }

      setTrackUpdateTrigger((prev) => prev + 1)
    }

    // 🔧 TrackMuted/Unmuted 이벤트도 처리
    const handleTrackMuted = (publication: TrackPublication, participant: Participant) => {
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] 🔇 Track muted:", {
          participant: participant.identity,
          source: publication.source,
        })
      }
      setTrackUpdateTrigger((prev) => prev + 1)
    }

    const handleTrackUnmuted = (publication: TrackPublication, participant: Participant) => {
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] 🔊 Track unmuted:", {
          participant: participant.identity,
          source: publication.source,
        })
      }
      setTrackUpdateTrigger((prev) => prev + 1)
    }

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.TrackPublished, handleTrackPublished)
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    room.on(RoomEvent.TrackMuted, handleTrackMuted)
    room.on(RoomEvent.TrackUnmuted, handleTrackUnmuted)

    // 🔧 Late Joiner 대응: 다단계 재시도 + 트랙 수집 (더 긴 간격 추가)
    const retryTimeouts = [100, 300, 600, 1000, 2000, 3000, 5000].map((delay) =>
      setTimeout(() => {
        if (IS_DEV) {
          console.log(`[LiveKitMediaContext] 🔄 Retry after ${delay}ms - collecting tracks and subscribing`, {
            remoteParticipantsCount: room.remoteParticipants.size,
            subscribedTracksRefSize: subscribedTracksRef.current.size,
          })
        }
        // 🔑 이미 구독된 트랙 수집 (이벤트를 놓쳤을 수 있음)
        collectExistingSubscribedTracks()
        // 아직 구독되지 않은 트랙 또는 track이 null인 경우 구독 시도
        room.remoteParticipants.forEach((participant) => subscribeParticipantTracks(participant))
        setTrackUpdateTrigger((prev) => prev + 1)
      }, delay)
    )

    return () => {
      retryTimeouts.forEach(clearTimeout)
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.TrackPublished, handleTrackPublished)
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      room.off(RoomEvent.TrackMuted, handleTrackMuted)
      room.off(RoomEvent.TrackUnmuted, handleTrackUnmuted)
    }
  }, [room, isConnected])  // 🔧 participants 제거 - 이벤트 드리븐으로 처리

  // 🔧 iOS Safari 오디오 unlock 상태 추적
  const audioUnlockedRef = useRef(false)
  // 📌 iOS Safari 미디어 세션 활성화 상태 (getUserMedia 호출 필요)
  const mediaSessionActivatedRef = useRef(false)

  // 📌 iOS/iPadOS Safari 감지 (getUserMedia 필요한 환경)
  const isIOSSafari = useMemo(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    // iOS의 모든 브라우저는 WebKit 기반이므로 Safari와 동일한 제한
    return isIOS
  }, [])

  // 연결 시 자동으로 오디오 시작 (브라우저 autoplay 정책 대응)
  // 📌 iOS Safari: 사용자 제스처 없이 오디오 재생 불가 → 첫 터치까지 반복 시도
  // 📌 핵심 개선: room.startAudio()만으로는 개별 <audio> 엘리먼트 재생이 안 됨
  //    → 모든 <audio> 엘리먼트의 play()를 직접 호출해야 함
  // 📌 iOS Safari 특수 처리: getUserMedia 호출하여 미디어 세션 활성화 필요
  useEffect(() => {
    if (!room || !isConnected) return

    // 🔧 모든 <audio> 엘리먼트 재생 시도 (iOS Safari용)
    const playAllAudioElements = () => {
      const audioElements = document.querySelectorAll("audio")
      audioElements.forEach((audio) => {
        if (audio.paused && audio.srcObject) {
          audio.play().catch(() => {
            // 개별 실패는 무시 (다음 시도에서 성공할 수 있음)
          })
        }
      })
      if (IS_DEV && audioElements.length > 0) {
        console.log(`[LiveKitMediaContext] 🔊 Attempted to play ${audioElements.length} audio elements`)
      }
    }

    // 📌 iOS Safari 전용: 미디어 세션 활성화 (getUserMedia 호출)
    // iOS Safari에서는 getUserMedia를 호출해야 WebRTC 오디오 출력이 활성화됨
    // 마이크를 짧게 켰다가 바로 끔 (silent activation)
    const activateIOSMediaSession = async (): Promise<boolean> => {
      if (mediaSessionActivatedRef.current) return true
      if (!isIOSSafari) {
        mediaSessionActivatedRef.current = true
        return true
      }

      try {
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] 🍎 iOS: Activating media session via getUserMedia...")
        }

        // 오디오만 요청 (카메라는 불필요)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // 즉시 트랙 중지 (마이크 사용 안 함)
        stream.getTracks().forEach((track) => {
          track.stop()
        })

        mediaSessionActivatedRef.current = true
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] 🍎 iOS: Media session activated successfully")
        }
        return true
      } catch (error) {
        // 권한 거부 시에도 계속 진행 (사용자가 마이크를 수동으로 켤 수 있음)
        if (IS_DEV) {
          console.warn("[LiveKitMediaContext] 🍎 iOS: Media session activation failed:", error)
        }
        return false
      }
    }

    // 🔧 오디오 unlock 시도 함수 (강화된 버전)
    const tryUnlockAudio = async () => {
      if (audioUnlockedRef.current && mediaSessionActivatedRef.current) return true

      try {
        // 1. LiveKit AudioContext resume
        await room.startAudio()

        // 2. 📌 핵심: 모든 <audio> 엘리먼트 직접 재생 시도
        playAllAudioElements()

        audioUnlockedRef.current = true
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] ✅ Audio context unlocked + audio elements played")
        }
        return true
      } catch {
        // 사용자 인터랙션 없이는 실패할 수 있음 - 정상적인 동작
        return false
      }
    }

    // 초기 시도
    tryUnlockAudio()

    // 🔧 사용자 인터랙션 시 오디오 unlock 시도 (성공할 때까지 반복)
    // 📌 iOS Safari: getUserMedia를 호출하여 미디어 세션 활성화
    const handleUserInteraction = async () => {
      // 📌 iOS Safari: 미디어 세션 활성화 (첫 인터랙션에서만)
      if (isIOSSafari && !mediaSessionActivatedRef.current) {
        await activateIOSMediaSession()
      }

      // 오디오 unlock 시도
      await tryUnlockAudio()

      // 📌 추가 안전장치: unlock 후에도 한 번 더 모든 audio 재생 시도
      playAllAudioElements()
    }

    // 📌 once: true 제거 - 성공할 때까지 계속 시도
    // 📌 passive: true 추가 - iOS에서 스크롤 성능 최적화
    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("touchstart", handleUserInteraction, { passive: true })
    document.addEventListener("touchend", handleUserInteraction, { passive: true })
    document.addEventListener("keydown", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("touchstart", handleUserInteraction)
      document.removeEventListener("touchend", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }
  }, [room, isConnected, isIOSSafari])

  // 🔑 핵심 개선: useTracks 결과에서 직접 subscribedTracksRef로 동기화
  // TrackSubscribed 이벤트를 놓치는 경우를 보완
  useEffect(() => {
    if (!isConnected) return

    let syncCount = 0
    tracks.forEach((trackRef) => {
      const participant = trackRef.participant
      // 로컬 참가자는 제외
      if (participant.isLocal) return

      const publication = trackRef.publication
      const track = publication?.track

      if (track && track.mediaStreamTrack && track.mediaStreamTrack.readyState !== "ended") {
        const key = `${participant.identity}::${trackRef.source}`

        // 아직 ref에 없는 경우에만 추가
        if (!subscribedTracksRef.current.has(key)) {
          subscribedTracksRef.current.set(key, {
            track: track as RemoteTrack,
            publication: publication as RemoteTrackPublication,
            source: trackRef.source,
          })
          syncCount++

          if (IS_DEV) {
            console.log("[LiveKitMediaContext] 🔄 Synced track from useTracks to ref:", {
              participant: participant.identity,
              source: trackRef.source,
              hasMediaStreamTrack: !!track.mediaStreamTrack,
            })
          }
        }
      }
    })

    // 새로 동기화된 트랙이 있으면 상태 업데이트 트리거
    if (syncCount > 0) {
      if (IS_DEV) {
        console.log(`[LiveKitMediaContext] 🔄 Synced ${syncCount} tracks from useTracks`)
      }
      setTrackUpdateTrigger((prev) => prev + 1)
    }
  }, [tracks, isConnected])

  // 🔑 participantTracks 빌드: 3단계 트랙 수집 전략 (우선순위 재정렬)
  // 1단계: useTracks 결과 (React 통합 - late joiner에게 가장 안정적)
  // 2단계: subscribedTracksRef (이벤트 기반 - 추가 트랙 백업)
  // 3단계: room.remoteParticipants에서 직접 수집 (Fallback)
  const participantTracks = useMemo(() => {
    const map = new Map<string, ParticipantTrack>()

    if (!isConnected || participants.length === 0) {
      return map
    }

    // 🔑 revision 계산: trackUpdateTrigger를 기반으로 각 참가자별 revision 설정
    // 이를 통해 React가 트랙 변경을 감지할 수 있음
    const currentRevision = trackUpdateTrigger

    // 기본 엔트리 생성
    participants.forEach((participant) => {
      map.set(participant.identity, {
        participantId: participant.identity,
        participantName: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isVideoMuted: true,
        isAudioMuted: true,
        isScreenMuted: true,
        revision: currentRevision, // 🔑 revision 추가
      })
    })

    // 1️⃣ 최우선: useTracks 결과에서 트랙 가져오기
    // React 통합된 훅이므로 late joiner에게 가장 안정적
    tracks.forEach((trackRef) => {
      const identity = trackRef.participant.identity
      const entry = map.get(identity)
      if (!entry) return

      const publication = trackRef.publication
      const mediaTrack = publication?.track?.mediaStreamTrack
      // 🔑 핵심: isMuted가 명시적으로 true인 경우에만 muted로 처리
      // undefined나 false는 모두 unmuted로 처리 (트랙이 있으면 기본적으로 활성)
      const isMuted = publication?.isMuted === true

      switch (trackRef.source) {
        case Track.Source.Camera:
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            entry.videoTrack = mediaTrack
            entry.isVideoMuted = isMuted
          }
          break
        case Track.Source.Microphone:
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            entry.audioTrack = mediaTrack
            entry.isAudioMuted = isMuted
          }
          break
        case Track.Source.ScreenShare:
          if (mediaTrack && mediaTrack.readyState !== "ended") {
            entry.screenTrack = mediaTrack
            entry.isScreenMuted = isMuted
          }
          break
      }
    })

    // 2️⃣ 백업: subscribedTracksRef에서 추가 트랙 가져오기
    // useTracks에서 못 잡은 트랙이 있을 수 있음
    subscribedTracksRef.current.forEach((storedInfo, key) => {
      // 🔧 `::` 구분자로 파싱 (identity에 하이픈이 포함될 수 있으므로)
      const [identity] = key.split("::")
      const entry = map.get(identity)
      if (!entry) return

      const mediaTrack = storedInfo.track.mediaStreamTrack
      if (!mediaTrack || mediaTrack.readyState === "ended") return

      // 🔑 핵심: useTracks에서 이미 트랙을 설정했으면 건너뛰기
      // subscribedTracksRef는 백업 역할만
      const isMuted = storedInfo.publication.isMuted === true

      switch (storedInfo.source) {
        case Track.Source.Camera:
          if (!entry.videoTrack) {
            entry.videoTrack = mediaTrack
            entry.isVideoMuted = isMuted
          }
          break
        case Track.Source.Microphone:
          if (!entry.audioTrack) {
            entry.audioTrack = mediaTrack
            entry.isAudioMuted = isMuted
          }
          break
        case Track.Source.ScreenShare:
          if (!entry.screenTrack) {
            entry.screenTrack = mediaTrack
            entry.isScreenMuted = isMuted
          }
          break
      }
    })

    // 3️⃣ Fallback: room.remoteParticipants에서 직접 트랙 확인
    if (room) {
      room.remoteParticipants.forEach((remoteParticipant) => {
        const entry = map.get(remoteParticipant.identity)
        if (!entry) return

        remoteParticipant.trackPublications.forEach((publication) => {
          const track = publication.track
          // 🔑 핵심 수정: isMuted가 명시적으로 true인 경우에만 muted로 처리
          const isMuted = publication.isMuted === true

          switch (publication.source) {
            case Track.Source.Camera:
              if (track?.mediaStreamTrack && track.mediaStreamTrack.readyState !== "ended") {
                if (!entry.videoTrack) {
                  entry.videoTrack = track.mediaStreamTrack
                  if (IS_DEV) {
                    console.log("[LiveKitMediaContext] 🔧 Fallback: Got video track from room", {
                      participant: remoteParticipant.identity,
                      isMuted: publication.isMuted,
                    })
                  }
                }
                // 🔑 트랙이 있을 때만 isMuted 상태 업데이트
                entry.isVideoMuted = isMuted
              }
              break
            case Track.Source.Microphone:
              if (track?.mediaStreamTrack && track.mediaStreamTrack.readyState !== "ended") {
                if (!entry.audioTrack) {
                  entry.audioTrack = track.mediaStreamTrack
                }
                // 🔊 LiveKit RemoteAudioTrack 저장 (개별 볼륨 조절용)
                entry.liveKitAudioTrack = track
                entry.isAudioMuted = isMuted
              }
              break
            case Track.Source.ScreenShare:
              if (track?.mediaStreamTrack && track.mediaStreamTrack.readyState !== "ended") {
                if (!entry.screenTrack) {
                  entry.screenTrack = track.mediaStreamTrack
                }
                entry.isScreenMuted = isMuted
              }
              break
          }
        })
      })
    }

    if (IS_DEV) {
      console.log("[LiveKitMediaContext] 📊 participantTracks built:", {
        participantCount: map.size,
        subscribedTracksRefSize: subscribedTracksRef.current.size,
        useTracksCount: tracks.length,
        trackUpdateTrigger,
      })
      // useTracks 결과 상세 로그
      console.log("[LiveKitMediaContext] 🔍 useTracks details:")
      tracks.forEach((trackRef, idx) => {
        console.log(`  [${idx}] ${trackRef.participant.identity} (${trackRef.source}):`, {
          isLocal: trackRef.participant.isLocal,
          hasPublication: !!trackRef.publication,
          isSubscribed: trackRef.publication?.isSubscribed,
          hasTrack: !!trackRef.publication?.track,
          hasMediaStreamTrack: !!trackRef.publication?.track?.mediaStreamTrack,
          isMuted: trackRef.publication?.isMuted,
        })
      })
      map.forEach((track, identity) => {
        console.log(`  - ${identity}:`, {
          hasVideo: !!track.videoTrack,
          hasAudio: !!track.audioTrack,
          hasScreen: !!track.screenTrack,
          isVideoMuted: track.isVideoMuted,
          isAudioMuted: track.isAudioMuted,
        })
      })
    }

    return map
  }, [participants, tracks, isConnected, trackUpdateTrigger, room])

  // 🔑 트랙 준비 대기 모니터링 - 레이스 컨디션 해결
  // useTracks에서 트랙을 감지했지만 mediaStreamTrack이 아직 준비 안 된 경우
  // 주기적으로 리렌더링을 트리거하여 트랙 준비 완료 시점을 포착
  useEffect(() => {
    // 아직 mediaStreamTrack이 준비 안 된 원격 트랙 찾기
    const pendingTracks = tracks.filter((trackRef) => {
      // 로컬 참가자는 무시
      if (trackRef.participant.isLocal) return false
      const pub = trackRef.publication
      // publication이 있고, 구독됐거나 트랙이 있는데 mediaStreamTrack이 없는 경우
      return (
        pub &&
        (pub.isSubscribed || pub.track) &&
        !pub.track?.mediaStreamTrack
      )
    })

    if (
      pendingTracks.length > 0 &&
      trackReadyRetryCountRef.current < MAX_TRACK_READY_RETRIES
    ) {
      trackReadyRetryCountRef.current++
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] ⏳ Waiting for tracks to be ready:", {
          pending: pendingTracks.length,
          retry: trackReadyRetryCountRef.current,
          tracks: pendingTracks.map((t) => ({
            participant: t.participant.identity,
            source: t.source,
            hasTrack: !!t.publication?.track,
            hasMediaStreamTrack: !!t.publication?.track?.mediaStreamTrack,
          })),
        })
      }
      // 100ms 후 리렌더링 트리거
      const timer = setTimeout(() => {
        setTrackUpdateTrigger((prev) => prev + 1)
      }, 100)
      return () => clearTimeout(timer)
    } else if (pendingTracks.length === 0) {
      // 모든 트랙 준비 완료 - 카운터 리셋
      trackReadyRetryCountRef.current = 0
    }
  }, [tracks, trackUpdateTrigger])

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

  // 🔧 모든 <audio> 엘리먼트 재생 시도 (iOS Safari용) - 토글 함수에서 재사용
  const playAllAudioElements = useCallback(() => {
    const audioElements = document.querySelectorAll("audio")
    audioElements.forEach((audio) => {
      if (audio.paused && audio.srcObject) {
        audio.play().catch(() => {
          // 개별 실패는 무시
        })
      }
    })
    if (IS_DEV && audioElements.length > 0) {
      console.log(`[LiveKitMediaContext] 🔊 Toggle triggered: played ${audioElements.length} audio elements`)
    }
  }, [])

  // Toggle camera
  // 📌 iOS Safari: setCameraEnabled 후 터치 이벤트가 먹통되는 문제 대응
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

      // 🔧 오디오 unlock 시도 (카메라 토글도 사용자 제스처이므로 이 시점에 unlock 가능)
      if (room) {
        await room.startAudio().catch(() => {})
        audioUnlockedRef.current = true
        // 📌 핵심: 모든 <audio> 엘리먼트 직접 재생 시도
        playAllAudioElements()
      }

      const newState = !localParticipant.isCameraEnabled
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Toggle camera:", newState ? "ON" : "OFF")
      }

      await localParticipant.setCameraEnabled(newState)

      // 📌 iOS Safari 터치 이벤트 복구
      if (typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        requestAnimationFrame(() => {
          const activeEl = document.activeElement as HTMLElement | null
          if (activeEl && typeof activeEl.blur === "function") {
            activeEl.blur()
          }
          if (IS_DEV) {
            console.log("[LiveKitMediaContext] iOS touch event recovery executed")
          }
        })
      }

      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] Camera toggle error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, room, parseMediaError, playAllAudioElements])

  // Toggle microphone
  // 📌 iOS Safari: setMicrophoneEnabled 후 터치 이벤트가 먹통되는 문제 대응
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

      // 🔧 오디오 unlock 시도 (마이크 토글이 사용자 제스처이므로 이 시점에 unlock 가능)
      if (room) {
        await room.startAudio().catch(() => {})
        audioUnlockedRef.current = true
        // 📌 핵심: 모든 <audio> 엘리먼트 직접 재생 시도
        playAllAudioElements()
      }

      const newState = !localParticipant.isMicrophoneEnabled
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Toggle microphone:", newState ? "ON" : "OFF")
      }

      await localParticipant.setMicrophoneEnabled(newState)

      // 📌 iOS Safari 터치 이벤트 복구
      // getUserMedia 권한 다이얼로그 후 터치 이벤트가 먹통되는 문제 대응
      // requestAnimationFrame으로 다음 프레임까지 대기 후 blur 처리
      if (typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        requestAnimationFrame(() => {
          // 현재 포커스된 요소가 있으면 blur
          const activeEl = document.activeElement as HTMLElement | null
          if (activeEl && typeof activeEl.blur === "function") {
            activeEl.blur()
          }
          if (IS_DEV) {
            console.log("[LiveKitMediaContext] iOS touch event recovery executed")
          }
        })
      }

      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] Microphone toggle error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, room, parseMediaError, playAllAudioElements])

  // 로컬 오디오 트랙 (VAD용)
  const localAudioTrack = useMemo(() => {
    if (!localParticipant || !isConnected) return null
    const audioTrackRef = tracks.find(
      (t) => t.participant === localParticipant && t.source === Track.Source.Microphone
    )
    return audioTrackRef?.publication?.track?.mediaStreamTrack ?? null
  }, [localParticipant, tracks, isConnected])

  // VAD 게이트용: 로컬 마이크 뮤트/언뮤트 (트랙 유지하면서 데이터만 뮤트)
  const setLocalMicrophoneMuted = useCallback(async (muted: boolean): Promise<boolean> => {
    if (!localParticipant) {
      return false
    }

    try {
      const publication = localParticipant.getTrackPublication(Track.Source.Microphone)
      if (!publication) {
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] No microphone publication found for VAD")
        }
        return false
      }

      if (muted) {
        await publication.mute()
      } else {
        await publication.unmute()
      }

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] VAD: Microphone muted:", muted)
      }
      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] setLocalMicrophoneMuted error:", error)
      return false
    }
  }, [localParticipant])

  // 📌 소스 레벨 오디오 게이트: MediaStreamTrack.enabled 직접 제어
  // publication.mute()와 달리 WebRTC 소스 레벨에서 오디오를 차단
  // - gated=true: 오디오 출력 차단 (track.enabled=false)
  // - gated=false: 오디오 출력 허용 (track.enabled=true)
  const setLocalAudioGated = useCallback((gated: boolean): boolean => {
    if (!localParticipant) {
      return false
    }

    try {
      const publication = localParticipant.getTrackPublication(Track.Source.Microphone)
      if (!publication?.track) {
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] setLocalAudioGated: No track found")
        }
        return false
      }

      // MediaStreamTrack 직접 접근
      const mediaStreamTrack = publication.track.mediaStreamTrack
      if (!mediaStreamTrack) {
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] setLocalAudioGated: No mediaStreamTrack")
        }
        return false
      }

      // 소스 레벨에서 오디오 enabled/disabled 제어
      // enabled=false: 트랙은 유지되지만 무음 프레임 전송
      mediaStreamTrack.enabled = !gated

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] setLocalAudioGated:", {
          gated,
          trackEnabled: mediaStreamTrack.enabled,
        })
      }

      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] setLocalAudioGated error:", error)
      return false
    }
  }, [localParticipant])

  // 📌 AudioWorklet 처리된 트랙으로 교체
  // LiveKit의 기존 마이크 트랙을 AudioWorklet에서 처리된 트랙으로 교체
  const replaceAudioTrackWithProcessed = useCallback(async (processedTrack: MediaStreamTrack): Promise<boolean> => {
    if (!localParticipant) {
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] replaceAudioTrackWithProcessed: No local participant")
      }
      return false
    }

    try {
      const publication = localParticipant.getTrackPublication(Track.Source.Microphone)
      if (!publication?.track) {
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] replaceAudioTrackWithProcessed: No publication track")
        }
        return false
      }

      // LiveKit LocalTrack의 replaceTrack 메서드 사용
      // 이 메서드는 WebRTC RTCRtpSender.replaceTrack()을 내부적으로 호출
      // 재협상 없이 트랙만 교체되므로 끊김 없이 전환됨
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const localTrack = publication.track as any

      if (typeof localTrack.replaceTrack === "function") {
        await localTrack.replaceTrack(processedTrack)

        if (IS_DEV) {
          console.log("[LiveKitMediaContext] replaceAudioTrackWithProcessed: Track replaced successfully")
        }
        return true
      } else {
        // replaceTrack이 없는 경우 RTCRtpSender를 통한 교체 시도
        if (IS_DEV) {
          console.log("[LiveKitMediaContext] replaceAudioTrackWithProcessed: replaceTrack not available, using fallback")
        }

        // Room context에서 RTCPeerConnection 접근
        if (room) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const engine = (room as any).engine
          const sender = engine?.publisher?.pc?.getSenders()?.find(
            (s: RTCRtpSender) => s.track?.kind === "audio"
          )
          if (sender) {
            await sender.replaceTrack(processedTrack)
            if (IS_DEV) {
              console.log("[LiveKitMediaContext] replaceAudioTrackWithProcessed: Track replaced via RTCRtpSender")
            }
            return true
          }
        }

        console.warn("[LiveKitMediaContext] replaceAudioTrackWithProcessed: Could not replace track")
        return false
      }
    } catch (error) {
      console.error("[LiveKitMediaContext] replaceAudioTrackWithProcessed error:", error)
      return false
    }
  }, [localParticipant, room])

  // 📌 오디오 옵션 변경 시 마이크 재시작 (동적 적용)
  // LiveKit은 트랙 캡처 시에만 옵션을 적용하므로, 설정 변경 시 마이크를 재시작해야 함
  const restartMicrophoneWithOptions = useCallback(async (options: AudioCaptureOptionsInput): Promise<boolean> => {
    if (!localParticipant) {
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] restartMicrophoneWithOptions: No local participant")
      }
      return false
    }

    // 마이크가 비활성화 상태면 재시작 불필요
    if (!localParticipant.isMicrophoneEnabled) {
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] restartMicrophoneWithOptions: Microphone not enabled, skipping")
      }
      return true
    }

    try {
      setMediaError(null)

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] restartMicrophoneWithOptions: Restarting with options:", options)
      }

      // 마이크 끄기
      await localParticipant.setMicrophoneEnabled(false)

      // 짧은 지연 후 새 옵션으로 다시 켜기
      await new Promise(resolve => setTimeout(resolve, 100))

      // 새 옵션으로 마이크 활성화
      await localParticipant.setMicrophoneEnabled(true, {
        noiseSuppression: options.noiseSuppression,
        echoCancellation: options.echoCancellation,
        autoGainControl: options.autoGainControl,
        // voiceIsolation은 일부 브라우저만 지원
        ...(options.voiceIsolation !== undefined && { voiceIsolation: options.voiceIsolation }),
        ...(options.deviceId && { deviceId: options.deviceId }),
      })

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] restartMicrophoneWithOptions: Successfully restarted")
      }

      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] restartMicrophoneWithOptions error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, parseMediaError])

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
        console.log("[LiveKitMediaContext] Camera switched to:", deviceId)
      }
      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] Camera switch error:", error)
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
        console.log("[LiveKitMediaContext] Microphone switched to:", deviceId)
      }
      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] Microphone switch error:", error)
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
        console.log("[LiveKitMediaContext] Camera not enabled, skip restart")
      }
      return true
    }

    try {
      setMediaError(null)
      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Restarting camera with new settings...")
      }

      // 1. 카메라 끄기
      await localParticipant.setCameraEnabled(false)

      // 2. 짧은 딜레이 (장치 해제 대기)
      await new Promise(resolve => setTimeout(resolve, 100))

      // 3. 카메라 다시 켜기 (새 설정이 roomOptions에서 적용됨)
      await localParticipant.setCameraEnabled(true)

      if (IS_DEV) {
        console.log("[LiveKitMediaContext] Camera restarted successfully")
      }
      return true
    } catch (error) {
      console.error("[LiveKitMediaContext] Camera restart error:", error)
      setMediaError(parseMediaError(error))
      return false
    }
  }, [localParticipant, parseMediaError])

  // Toggle screen share (with optional audio)
  const toggleScreenShare = useCallback(async (options?: ScreenShareOptions): Promise<boolean> => {
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
        console.log("[LiveKitMediaContext] Toggle screen share:", newState ? "ON" : "OFF", options?.audio ? "(with audio)" : "")
      }

      // 화면공유 시작 시 오디오 옵션 적용
      // 참고: 브라우저 탭 공유 시만 오디오 지원됨
      if (newState && options?.audio) {
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          // 공유 중인 탭의 로컬 오디오 재생 억제 (에코 방지)
          suppressLocalAudioPlayback: true,
        })
      } else {
        await localParticipant.setScreenShareEnabled(newState)
      }
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
      localAudioTrack,
      toggleCamera,
      toggleMicrophone,
      toggleScreenShare,
      setLocalMicrophoneMuted,
      setLocalAudioGated,
      replaceAudioTrackWithProcessed,
      restartMicrophoneWithOptions,
      switchCameraDevice,
      switchMicrophoneDevice,
      restartCamera,
    }),
    [
      participantTracks,
      mediaState,
      mediaError,
      isConnected,
      localParticipant?.identity,
      localAudioTrack,
      toggleCamera,
      toggleMicrophone,
      toggleScreenShare,
      setLocalMicrophoneMuted,
      setLocalAudioGated,
      replaceAudioTrackWithProcessed,
      restartMicrophoneWithOptions,
      switchCameraDevice,
      switchMicrophoneDevice,
      restartCamera,
    ]
  )

  return (
    <LiveKitMediaContext.Provider value={value}>
      {children}
    </LiveKitMediaContext.Provider>
  )
}
