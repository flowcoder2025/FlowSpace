"use client"

/**
 * useProximitySubscription
 *
 * 근접 기반 LiveKit 트랙 구독 관리 훅
 *
 * 기능:
 * - 7×7 타일 범위 내 플레이어만 오디오/비디오 구독
 * - 거리에 따른 볼륨 감쇠 (선택적)
 * - 파티 존 / 스포트라이트 우선순위 처리 (향후)
 *
 * @see /docs/roadmap/SPATIAL-COMMUNICATION.md
 */

import { useEffect, useCallback, useRef, useMemo } from "react"
import { useMaybeRoomContext, useRemoteParticipants } from "@livekit/components-react"
import { Track, RemoteParticipant, RemoteTrackPublication } from "livekit-client"

const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// Types
// ============================================

export interface Position {
  x: number
  y: number
}

export interface ProximityConfig {
  /** 근접 범위 (타일 수, 기본: 3.5 = 7×7 그리드) */
  proximityRadius: number
  /** 볼륨 감쇠 활성화 여부 */
  enableVolumeAttenuation: boolean
  /** 최소 볼륨 (0-1, 감쇠 시) */
  minVolume: number
  /** 업데이트 쓰로틀 간격 (ms) */
  updateThrottleMs: number
  /** 근접 기능 활성화 여부 (false면 전역 모드) */
  enabled: boolean
}

export interface UseProximitySubscriptionOptions {
  /** 로컬 플레이어 위치 */
  localPosition: Position | null
  /** 원격 플레이어 위치 맵 (participantId -> Position) */
  remotePositions: Map<string, Position>
  /** 스포트라이트 활성화된 사용자 Set */
  spotlightUsers?: Set<string>
  /** 같은 파티 존에 있는 사용자 Set */
  partyZoneUsers?: Set<string>
  /** 설정 오버라이드 */
  config?: Partial<ProximityConfig>
}

// ============================================
// Default Config
// ============================================

const DEFAULT_CONFIG: ProximityConfig = {
  proximityRadius: 3.5, // 7×7 타일
  enableVolumeAttenuation: false,
  minVolume: 0.3,
  updateThrottleMs: 100,
  enabled: false, // 기본값: 비활성화 (전역 모드)
}

// ============================================
// Helper Functions
// ============================================

/**
 * 두 위치 간 거리 계산 (타일 단위)
 */
function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 거리 기반 볼륨 계산 (1.0 ~ minVolume)
 */
function calculateVolume(
  distance: number,
  maxDistance: number,
  minVolume: number
): number {
  if (distance <= 0) return 1.0
  if (distance >= maxDistance) return minVolume
  const ratio = 1 - distance / maxDistance
  return minVolume + ratio * (1 - minVolume)
}

// ============================================
// Hook
// ============================================

export function useProximitySubscription({
  localPosition,
  remotePositions,
  spotlightUsers = new Set(),
  partyZoneUsers = new Set(),
  config: configOverride,
}: UseProximitySubscriptionOptions) {
  const room = useMaybeRoomContext()
  const remoteParticipants = useRemoteParticipants()

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  )

  const lastUpdateRef = useRef<number>(0)

  // 구독 상태 계산
  const subscriptionStates = useMemo(() => {
    const states = new Map<string, { shouldSubscribe: boolean; volume: number }>()

    if (!config.enabled || !localPosition) {
      // 비활성화 시 모든 참가자 구독
      remoteParticipants.forEach((p) => {
        states.set(p.identity, { shouldSubscribe: true, volume: 1.0 })
      })
      return states
    }

    remoteParticipants.forEach((participant) => {
      const identity = participant.identity
      const remotePos = remotePositions.get(identity)

      let shouldSubscribe = false
      let volume = 1.0

      // 우선순위 1: 스포트라이트 (항상 구독)
      if (spotlightUsers.has(identity)) {
        shouldSubscribe = true
        volume = 1.0
      }
      // 우선순위 2: 같은 파티 존 (항상 구독)
      else if (partyZoneUsers.has(identity)) {
        shouldSubscribe = true
        volume = 1.0
      }
      // 우선순위 3: 근접 범위
      else if (remotePos) {
        const distance = calculateDistance(localPosition, remotePos)
        shouldSubscribe = distance <= config.proximityRadius

        if (shouldSubscribe && config.enableVolumeAttenuation) {
          volume = calculateVolume(
            distance,
            config.proximityRadius,
            config.minVolume
          )
        }
      }

      states.set(identity, { shouldSubscribe, volume })
    })

    return states
  }, [
    localPosition,
    remotePositions,
    remoteParticipants,
    spotlightUsers,
    partyZoneUsers,
    config,
  ])

  // 구독 업데이트 함수
  const updateSubscriptions = useCallback(() => {
    if (!room || !config.enabled) return

    const now = Date.now()
    if (now - lastUpdateRef.current < config.updateThrottleMs) return
    lastUpdateRef.current = now

    remoteParticipants.forEach((participant: RemoteParticipant) => {
      const state = subscriptionStates.get(participant.identity)
      if (!state) return

      // 오디오/비디오 트랙 구독 제어
      participant.trackPublications.forEach((pub) => {
        if (pub instanceof RemoteTrackPublication) {
          const isMediaTrack =
            pub.source === Track.Source.Camera ||
            pub.source === Track.Source.Microphone ||
            pub.source === Track.Source.ScreenShare

          if (isMediaTrack) {
            // 구독 상태 변경
            if (pub.isSubscribed !== state.shouldSubscribe) {
              pub.setSubscribed(state.shouldSubscribe)

              if (IS_DEV) {
                console.log(
                  `[Proximity] ${participant.identity} ${pub.source}: ${state.shouldSubscribe ? "subscribe" : "unsubscribe"}`
                )
              }
            }

            // 볼륨 조절 (오디오 트랙만)
            if (
              pub.source === Track.Source.Microphone &&
              pub.audioTrack &&
              config.enableVolumeAttenuation
            ) {
              // RemoteAudioTrack의 볼륨은 HTMLAudioElement를 통해 조절
              const audioElement = pub.audioTrack.attachedElements?.[0]
              if (audioElement && audioElement instanceof HTMLAudioElement) {
                audioElement.volume = state.volume
              }
            }
          }
        }
      })
    })
  }, [room, remoteParticipants, subscriptionStates, config])

  // 위치 변경 시 구독 업데이트
  useEffect(() => {
    if (config.enabled) {
      updateSubscriptions()
    }
  }, [updateSubscriptions, config.enabled])

  // 디버그 정보
  const proximityInfo = useMemo(() => {
    const inRange: string[] = []
    const outOfRange: string[] = []

    subscriptionStates.forEach((state, identity) => {
      if (state.shouldSubscribe) {
        inRange.push(identity)
      } else {
        outOfRange.push(identity)
      }
    })

    return {
      enabled: config.enabled,
      localPosition,
      inRange,
      outOfRange,
      totalParticipants: remoteParticipants.length,
    }
  }, [subscriptionStates, config.enabled, localPosition, remoteParticipants])

  return {
    /** 근접 기능 활성화 여부 */
    enabled: config.enabled,
    /** 근접 범위 내 참가자 수 */
    inRangeCount: proximityInfo.inRange.length,
    /** 근접 범위 외 참가자 수 */
    outOfRangeCount: proximityInfo.outOfRange.length,
    /** 디버그 정보 */
    proximityInfo,
    /** 수동 업데이트 트리거 */
    updateSubscriptions,
  }
}
