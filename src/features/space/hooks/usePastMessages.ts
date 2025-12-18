/**
 * usePastMessages - 과거 메시지 페이지네이션 훅
 *
 * 기능:
 * - cursor 기반 과거 메시지 로딩
 * - 로딩/에러 상태 관리
 * - 실시간 메시지와 병합 (중복 제거)
 *
 * Phase 6: 채팅 시스템 최적화
 */

import { useState, useCallback, useRef } from "react"
import type { ChatMessage } from "../types/space.types"

// ============================================
// Types
// ============================================
interface MessageFromAPI {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: string  // ISO string
  type: "message" | "whisper" | "party" | "system" | "announcement"
  targetId?: string
  targetNickname?: string
  partyId?: string
  partyName?: string
}

interface PaginatedResponse {
  messages: MessageFromAPI[]
  nextCursor: string | null
  hasMore: boolean
}

interface UsePastMessagesOptions {
  spaceId: string
  guestSessionId?: string | null
  limit?: number
  enabled?: boolean
}

interface UsePastMessagesReturn {
  /** 과거 메시지 로딩 중 여부 */
  isLoading: boolean
  /** 더 불러올 메시지가 있는지 */
  hasMore: boolean
  /** 에러 메시지 */
  error: string | null
  /** 과거 메시지 로드 함수 (기존 메시지 앞에 추가) */
  loadPastMessages: () => Promise<ChatMessage[]>
  /** 상태 초기화 */
  reset: () => void
}

// ============================================
// Helper Functions
// ============================================

/**
 * API 응답을 클라이언트 ChatMessage 타입으로 변환
 */
function mapApiMessageToClient(msg: MessageFromAPI): ChatMessage {
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderNickname: msg.senderNickname,
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    type: msg.type,
    targetId: msg.targetId,
    targetNickname: msg.targetNickname,
    partyId: msg.partyId,
    partyName: msg.partyName,
    // 과거 메시지에는 reactions가 없음 (DB에 저장 안됨)
    reactions: [],
  }
}

// ============================================
// Hook
// ============================================
export function usePastMessages({
  spaceId,
  guestSessionId,
  limit = 50,
  enabled = true,
}: UsePastMessagesOptions): UsePastMessagesReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // cursor 저장 (다음 페이지 로딩용)
  const cursorRef = useRef<string | null>(null)
  // 이미 로드된 메시지 ID Set (중복 방지)
  const loadedIdsRef = useRef<Set<string>>(new Set())

  /**
   * 과거 메시지 로드
   * @returns 새로 로드된 메시지 배열 (기존 메시지 앞에 추가해야 함)
   */
  const loadPastMessages = useCallback(async (): Promise<ChatMessage[]> => {
    if (!enabled || isLoading || !hasMore) {
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      // API URL 구성
      const params = new URLSearchParams()
      if (cursorRef.current) {
        params.set("cursor", cursorRef.current)
      }
      params.set("limit", String(limit))
      if (guestSessionId) {
        params.set("guestSessionId", guestSessionId)
      }

      const url = `/api/spaces/${spaceId}/messages?${params.toString()}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",  // 세션 쿠키 포함
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      const data: PaginatedResponse = await response.json()

      // 상태 업데이트
      setHasMore(data.hasMore)
      cursorRef.current = data.nextCursor

      // 중복 제거 및 변환
      const newMessages: ChatMessage[] = []
      for (const msg of data.messages) {
        if (!loadedIdsRef.current.has(msg.id)) {
          loadedIdsRef.current.add(msg.id)
          newMessages.push(mapApiMessageToClient(msg))
        }
      }

      return newMessages
    } catch (err) {
      const message = err instanceof Error ? err.message : "메시지를 불러오지 못했습니다"
      setError(message)
      setHasMore(false)  // 🔧 에러 시 더 이상 로드 시도하지 않음 (무한 루프 방지)
      console.error("[usePastMessages] Error:", err)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [spaceId, guestSessionId, limit, enabled, isLoading, hasMore])

  /**
   * 상태 초기화 (공간 변경 시 등)
   */
  const reset = useCallback(() => {
    setIsLoading(false)
    setHasMore(true)
    setError(null)
    cursorRef.current = null
    loadedIdsRef.current.clear()
  }, [])

  return {
    isLoading,
    hasMore,
    error,
    loadPastMessages,
    reset,
  }
}

// ============================================
// 메시지 병합 유틸리티
// ============================================

/**
 * 과거 메시지와 실시간 메시지 병합 (중복 제거)
 *
 * @param existingMessages 기존 메시지 배열
 * @param pastMessages 과거 메시지 배열 (앞에 추가될 메시지)
 * @returns 병합된 메시지 배열 (시간순 정렬)
 */
export function mergePastMessages(
  existingMessages: ChatMessage[],
  pastMessages: ChatMessage[]
): ChatMessage[] {
  // 기존 메시지 ID Set
  const existingIds = new Set(existingMessages.map((m) => m.id))

  // 중복 제거된 과거 메시지
  const uniquePastMessages = pastMessages.filter((m) => !existingIds.has(m.id))

  // 과거 메시지를 앞에 추가
  return [...uniquePastMessages, ...existingMessages]
}
