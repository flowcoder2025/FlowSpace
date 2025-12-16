/**
 * useChatStorage - 채팅 내역 localStorage 영속성 훅
 *
 * 기능:
 * - 공간별 채팅 내역 저장/복원
 * - 용량 초과 시 자동으로 과거 데이터 삭제 (FIFO)
 * - 새로고침 후에도 채팅 내역 유지
 *
 * 저장 구조:
 * - 키: `flowspace-chat-{spaceId}`
 * - 값: { messages: ChatMessageStorageData[], lastUpdated: number }
 */
import { useCallback, useEffect, useRef } from "react"
import type { ChatMessage } from "../types/space.types"

// localStorage에 저장할 때 Date를 string으로 직렬화
interface ChatMessageStorageData {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: string  // Date.toISOString()
  type: string
  reactions?: Array<{ type: string; userId: string; userNickname: string }>
  targetId?: string
  targetNickname?: string
  partyId?: string
  partyName?: string
  replyTo?: {
    id: string
    senderNickname: string
    content: string
  }
}

interface StorageData {
  messages: ChatMessageStorageData[]
  lastUpdated: number
}

// 설정
const STORAGE_KEY_PREFIX = "flowspace-chat-"
const MAX_MESSAGES = 200  // 최대 저장 메시지 수
const CLEANUP_BATCH_SIZE = 50  // 용량 초과 시 삭제할 메시지 수

/**
 * tempId 패턴 확인 (msg-{timestamp}-{playerId})
 * DB에 저장되기 전의 임시 ID는 저장하지 않음 (삭제 불가 문제 방지)
 */
function isTempId(id: string): boolean {
  return id.startsWith("msg-") || id.startsWith("whisper-") || id.startsWith("party-") || id.startsWith("sys-")
}

/**
 * ChatMessage → 저장 가능한 형태로 변환
 */
function serializeMessage(msg: ChatMessage): ChatMessageStorageData {
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderNickname: msg.senderNickname,
    content: msg.content,
    timestamp: msg.timestamp instanceof Date
      ? msg.timestamp.toISOString()
      : new Date(msg.timestamp).toISOString(),
    type: msg.type,
    reactions: msg.reactions,
    targetId: msg.targetId,
    targetNickname: msg.targetNickname,
    partyId: msg.partyId,
    partyName: msg.partyName,
    replyTo: msg.replyTo,
  }
}

/**
 * 저장된 데이터 → ChatMessage로 복원
 */
function deserializeMessage(data: ChatMessageStorageData): ChatMessage {
  return {
    ...data,
    timestamp: new Date(data.timestamp),
    type: data.type as ChatMessage["type"],
    reactions: data.reactions?.map(r => ({
      ...r,
      type: r.type as ChatMessage["reactions"] extends (infer R)[] ? R extends { type: infer T } ? T : never : never,
    })) as ChatMessage["reactions"],
  }
}

/**
 * localStorage에서 채팅 데이터 로드
 * ⚠️ tempId 패턴인 메시지는 필터링 (삭제 불가 문제 방지)
 */
function loadFromStorage(spaceId: string): ChatMessage[] {
  if (typeof window === "undefined") return []

  try {
    const key = `${STORAGE_KEY_PREFIX}${spaceId}`
    const raw = localStorage.getItem(key)
    if (!raw) return []

    const data: StorageData = JSON.parse(raw)
    // 🔒 tempId 패턴인 메시지는 제외 (DB에 저장되지 않은 메시지)
    return data.messages
      .filter(msg => !isTempId(msg.id))
      .map(deserializeMessage)
  } catch (error) {
    console.warn("[ChatStorage] Failed to load from localStorage:", error)
    return []
  }
}

/**
 * localStorage에 채팅 데이터 저장
 * 용량 초과 시 과거 데이터 자동 삭제
 * ⚠️ tempId 패턴인 메시지는 저장하지 않음 (삭제 불가 문제 방지)
 */
function saveToStorage(spaceId: string, messages: ChatMessage[]): boolean {
  if (typeof window === "undefined") return false

  const key = `${STORAGE_KEY_PREFIX}${spaceId}`

  // 시스템 메시지는 저장하지 않음 (가이드 메시지 등)
  // 🔒 tempId 패턴인 메시지도 저장하지 않음 (DB에 저장되지 않은 메시지)
  const filteredMessages = messages.filter(
    msg => msg.type !== "system" && msg.senderId !== "system" && !isTempId(msg.id)
  )

  // 최대 개수 제한
  const limitedMessages = filteredMessages.length > MAX_MESSAGES
    ? filteredMessages.slice(-MAX_MESSAGES)
    : filteredMessages

  const data: StorageData = {
    messages: limitedMessages.map(serializeMessage),
    lastUpdated: Date.now(),
  }

  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    // QuotaExceededError 처리
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("[ChatStorage] Storage quota exceeded, cleaning up old messages...")

      // 과거 메시지 삭제 후 재시도
      const reducedMessages = limitedMessages.slice(CLEANUP_BATCH_SIZE)
      const reducedData: StorageData = {
        messages: reducedMessages.map(serializeMessage),
        lastUpdated: Date.now(),
      }

      try {
        // 다른 공간의 오래된 데이터도 정리
        cleanupOldStorage()
        localStorage.setItem(key, JSON.stringify(reducedData))
        return true
      } catch {
        console.error("[ChatStorage] Failed to save even after cleanup")
        return false
      }
    }

    console.error("[ChatStorage] Failed to save to localStorage:", error)
    return false
  }
}

/**
 * 오래된 공간의 채팅 데이터 정리 (7일 이상)
 */
function cleanupOldStorage() {
  if (typeof window === "undefined") return

  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const data: StorageData = JSON.parse(raw)
          if (now - data.lastUpdated > SEVEN_DAYS) {
            localStorage.removeItem(key)
            console.log("[ChatStorage] Cleaned up old storage:", key)
          }
        }
      } catch {
        // 파싱 실패한 데이터는 삭제
        localStorage.removeItem(key!)
      }
    }
  }
}

interface UseChatStorageOptions {
  spaceId: string
  enabled?: boolean  // 저장 기능 활성화 여부
}

interface UseChatStorageReturn {
  /** 저장된 메시지 로드 */
  loadMessages: () => ChatMessage[]
  /** 메시지 저장 (debounced) */
  saveMessages: (messages: ChatMessage[]) => void
  /** 저장소 초기화 (해당 공간만) */
  clearStorage: () => void
}

export function useChatStorage({
  spaceId,
  enabled = true,
}: UseChatStorageOptions): UseChatStorageReturn {
  // 저장 디바운스용 타이머
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  // 마지막 저장된 메시지 수 (변경 감지용)
  const lastSavedCountRef = useRef<number>(0)

  // 저장된 메시지 로드
  const loadMessages = useCallback((): ChatMessage[] => {
    if (!enabled) return []
    return loadFromStorage(spaceId)
  }, [spaceId, enabled])

  // 메시지 저장 (500ms 디바운스)
  const saveMessages = useCallback((messages: ChatMessage[]) => {
    if (!enabled) return

    // 이전 타이머 취소
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // 변경이 없으면 저장하지 않음
    if (messages.length === lastSavedCountRef.current) return

    // 디바운스된 저장
    saveTimerRef.current = setTimeout(() => {
      const success = saveToStorage(spaceId, messages)
      if (success) {
        lastSavedCountRef.current = messages.length
      }
    }, 500)
  }, [spaceId, enabled])

  // 저장소 초기화
  const clearStorage = useCallback(() => {
    if (typeof window === "undefined") return
    const key = `${STORAGE_KEY_PREFIX}${spaceId}`
    localStorage.removeItem(key)
    lastSavedCountRef.current = 0
  }, [spaceId])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  return {
    loadMessages,
    saveMessages,
    clearStorage,
  }
}
