"use client"

/**
 * usePartyZone
 *
 * 파티 존 감지 및 관리 훅
 *
 * 기능:
 * - 공간의 파티 존 목록 페칭
 * - 로컬 플레이어 위치 기반 존 입장/퇴장 감지
 * - 같은 존에 있는 다른 플레이어 Set 계산
 * - Socket.io joinParty/leaveParty 자동 호출
 * - 🏠 Phaser 이벤트 브릿지로 존 정보 전달 (음영 오버레이)
 *
 * @see /docs/roadmap/SPATIAL-COMMUNICATION.md
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { eventBridge, GameEvents } from "../game/events"
import type { PartyZoneData, PartyZonesLoadedPayload, PartyZoneChangedPayload } from "../game/events"

const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// Types
// ============================================

export interface PartyZoneBounds {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PartyZone {
  id: string
  name: string
  bounds: PartyZoneBounds
  createdBy: string
  createdByType: "USER" | "GUEST"
  createdAt: string
}

export interface Position {
  x: number
  y: number
}

export interface UsePartyZoneOptions {
  /** 공간 ID */
  spaceId: string
  /** 로컬 플레이어 위치 (픽셀 단위) */
  localPosition: Position | null
  /** 원격 플레이어 위치 맵 (participantId -> Position, 픽셀 단위) */
  remotePositions: Map<string, Position>
  /** 타일 크기 (픽셀, 기본: 32) */
  tileSize?: number
  /** 파티 입장 콜백 (Socket.io joinParty) */
  onJoinParty?: (partyId: string, partyName: string) => void
  /** 파티 퇴장 콜백 (Socket.io leaveParty) */
  onLeaveParty?: () => void
  /** 존 변경 디바운스 (ms, 기본: 300) */
  debounceMs?: number
}

interface UsePartyZoneReturn {
  /** 현재 존 정보 (null이면 존 밖) */
  currentZone: PartyZone | null
  /** 같은 존에 있는 다른 플레이어 participantId Set */
  partyZoneUsers: Set<string>
  /** 존 목록 */
  zones: PartyZone[]
  /** 로딩 중 */
  isLoading: boolean
  /** 에러 */
  error: string | null
  /** 존 목록 새로고침 */
  refetchZones: () => Promise<void>
}

// ============================================
// Helper Functions
// ============================================

/**
 * 픽셀 위치를 그리드 좌표로 변환
 */
function pixelToGrid(pos: Position, tileSize: number): Position {
  return {
    x: Math.floor(pos.x / tileSize),
    y: Math.floor(pos.y / tileSize),
  }
}

/**
 * 그리드 좌표가 존 영역 내에 있는지 확인
 */
function isInZone(gridPos: Position, bounds: PartyZoneBounds): boolean {
  return (
    gridPos.x >= bounds.x1 &&
    gridPos.x <= bounds.x2 &&
    gridPos.y >= bounds.y1 &&
    gridPos.y <= bounds.y2
  )
}

/**
 * 주어진 위치가 속한 존 찾기
 */
function findZoneAtPosition(
  gridPos: Position,
  zones: PartyZone[]
): PartyZone | null {
  for (const zone of zones) {
    if (isInZone(gridPos, zone.bounds)) {
      return zone
    }
  }
  return null
}

// ============================================
// Hook
// ============================================

export function usePartyZone({
  spaceId,
  localPosition,
  remotePositions,
  tileSize = 32,
  onJoinParty,
  onLeaveParty,
  debounceMs = 300,
}: UsePartyZoneOptions): UsePartyZoneReturn {
  const [zones, setZones] = useState<PartyZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentZone, setCurrentZone] = useState<PartyZone | null>(null)

  // 디바운스용 타이머
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  // 마지막 존 ID (변경 감지용)
  const lastZoneIdRef = useRef<string | null>(null)

  // ============================================
  // 존 목록 페칭
  // ============================================
  const fetchZones = useCallback(async () => {
    if (!spaceId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/spaces/${spaceId}/zones`)
      if (!response.ok) {
        throw new Error("파티 존 목록을 불러오는데 실패했습니다.")
      }

      const data = await response.json()
      const loadedZones: PartyZone[] = data.zones || []
      setZones(loadedZones)

      // 🏠 Phaser에 존 목록 전달 (음영 오버레이용)
      const phaserZones: PartyZoneData[] = loadedZones.map((z) => ({
        id: z.id,
        name: z.name,
        bounds: z.bounds,
      }))
      const payload: PartyZonesLoadedPayload = { zones: phaserZones }
      eventBridge.emit(GameEvents.PARTY_ZONES_LOADED, payload)

      if (IS_DEV) {
        console.log("[usePartyZone] Zones loaded:", loadedZones.length, "→ Phaser notified")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 에러"
      setError(message)
      console.error("[usePartyZone] Fetch error:", message)
    } finally {
      setIsLoading(false)
    }
  }, [spaceId])

  // 초기 로드
  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  // ============================================
  // 위치 기반 존 감지
  // ============================================
  useEffect(() => {
    if (!localPosition || zones.length === 0) {
      // 위치가 없거나 존이 없으면 존 밖으로 처리
      if (currentZone) {
        setCurrentZone(null)
        lastZoneIdRef.current = null
        onLeaveParty?.()
        if (IS_DEV) {
          console.log("[usePartyZone] Left zone (no position/zones)")
        }
      }
      return
    }

    // 그리드 좌표 계산
    const gridPos = pixelToGrid(localPosition, tileSize)
    const detectedZone = findZoneAtPosition(gridPos, zones)
    const detectedZoneId = detectedZone?.id ?? null

    // 존 변경 감지
    if (detectedZoneId !== lastZoneIdRef.current) {
      // 디바운스 적용 (빠른 경계 왔다갔다 방지)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        // 이전 존에서 나감
        if (lastZoneIdRef.current && !detectedZoneId) {
          onLeaveParty?.()
          if (IS_DEV) {
            console.log("[usePartyZone] Left zone:", lastZoneIdRef.current)
          }
        }
        // 새 존에 입장
        else if (detectedZone && detectedZoneId !== lastZoneIdRef.current) {
          // 이전 존에서 먼저 나감
          if (lastZoneIdRef.current) {
            onLeaveParty?.()
          }
          // 새 존 입장
          onJoinParty?.(detectedZone.id, detectedZone.name)
          if (IS_DEV) {
            console.log("[usePartyZone] Joined zone:", detectedZone.name)
          }
        }

        setCurrentZone(detectedZone)
        lastZoneIdRef.current = detectedZoneId

        // 🏠 Phaser에 현재 존 변경 알림 (음영 오버레이 업데이트)
        const changedPayload: PartyZoneChangedPayload = {
          currentZone: detectedZone
            ? { id: detectedZone.id, name: detectedZone.name, bounds: detectedZone.bounds }
            : null,
        }
        eventBridge.emit(GameEvents.PARTY_ZONE_CHANGED, changedPayload)
      }, debounceMs)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [localPosition, zones, tileSize, onJoinParty, onLeaveParty, debounceMs, currentZone])

  // ============================================
  // 같은 존에 있는 플레이어 계산
  // ============================================
  const partyZoneUsers = useMemo(() => {
    const users = new Set<string>()

    if (!currentZone) {
      return users
    }

    remotePositions.forEach((pos, participantId) => {
      const gridPos = pixelToGrid(pos, tileSize)
      if (isInZone(gridPos, currentZone.bounds)) {
        users.add(participantId)
      }
    })

    return users
  }, [currentZone, remotePositions, tileSize])

  // ============================================
  // Cleanup
  // ============================================
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 존에서 나감
      if (lastZoneIdRef.current) {
        onLeaveParty?.()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [onLeaveParty])

  return {
    currentZone,
    partyZoneUsers,
    zones,
    isLoading,
    error,
    refetchZones: fetchZones,
  }
}
