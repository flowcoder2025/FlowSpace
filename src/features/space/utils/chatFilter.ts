/**
 * Chat Message Filter
 * 채팅 탭에 따른 메시지 필터링 로직
 *
 * 탭 구조 (4개):
 * - all: 전체 메시지 (일반 + 파티 + 귓속말 + 시스템)
 * - party: 파티/구역 채팅만
 * - whisper: 귓속말만
 * - system: 시스템 메시지만
 */
import type { ChatMessage, ChatTab } from "../types/space.types"

/**
 * 탭에 따라 메시지를 필터링
 *
 * @param messages 전체 메시지 배열
 * @param tab 현재 활성 탭
 * @param currentUserId 현재 사용자 ID (귓속말 필터링용)
 * @returns 필터링된 메시지 배열
 *
 * @example
 * filterMessagesByTab(messages, "whisper", "user123")
 * // 현재 사용자가 보내거나 받은 귓속말만 반환
 */
export function filterMessagesByTab(
  messages: ChatMessage[],
  tab: ChatTab,
  currentUserId: string
): ChatMessage[] {
  switch (tab) {
    case "all":
      // 전체 메시지 표시 (일반 채팅 + 파티 + 귓속말 + 시스템 모두)
      return messages

    case "party":
      // 파티/구역 채팅만 표시
      return messages.filter((msg) => msg.type === "party")

    case "whisper":
      // 귓속말만 표시 (내가 보낸 것 + 내가 받은 것)
      return messages.filter((msg) => {
        if (msg.type !== "whisper") return false
        // 내가 보낸 귓속말 또는 나에게 온 귓속말
        return msg.senderId === currentUserId || msg.targetId === currentUserId
      })

    case "system":
      // 시스템 메시지만 표시 (system + announcement)
      return messages.filter(
        (msg) => msg.type === "system" || msg.type === "announcement"
      )

    default:
      return messages
  }
}

/**
 * 탭별 읽지 않은 메시지 수 계산
 *
 * @param messages 전체 메시지 배열
 * @param lastReadTimestamps 탭별 마지막으로 읽은 타임스탬프
 * @param currentUserId 현재 사용자 ID
 * @returns 탭별 읽지 않은 메시지 수
 */
export function calculateUnreadCounts(
  messages: ChatMessage[],
  lastReadTimestamps: Record<ChatTab, Date>,
  currentUserId: string
): Record<ChatTab, number> {
  const counts: Record<ChatTab, number> = {
    all: 0,
    party: 0,
    whisper: 0,
    system: 0,
  }

  for (const msg of messages) {
    // 전체 탭: 마지막 읽은 시간 이후의 메시지
    if (msg.timestamp > lastReadTimestamps.all) {
      counts.all++
    }

    // 파티 탭: 파티 메시지 중 읽지 않은 것
    if (
      msg.type === "party" &&
      msg.timestamp > lastReadTimestamps.party
    ) {
      counts.party++
    }

    // 귓속말 탭: 내가 관련된 귓속말 중 읽지 않은 것
    if (
      msg.type === "whisper" &&
      msg.timestamp > lastReadTimestamps.whisper &&
      (msg.senderId === currentUserId || msg.targetId === currentUserId)
    ) {
      counts.whisper++
    }

    // 시스템 탭: 시스템 메시지 중 읽지 않은 것
    if (
      (msg.type === "system" || msg.type === "announcement") &&
      msg.timestamp > lastReadTimestamps.system
    ) {
      counts.system++
    }
  }

  return counts
}

/**
 * 메시지가 귓속말인지 확인하는 헬퍼
 */
export function isWhisperMessage(message: ChatMessage): boolean {
  return message.type === "whisper"
}

/**
 * 메시지가 파티 메시지인지 확인하는 헬퍼
 */
export function isPartyMessage(message: ChatMessage): boolean {
  return message.type === "party"
}

/**
 * 귓속말 메시지의 표시 방향 결정
 *
 * @param message 메시지
 * @param currentUserId 현재 사용자 ID
 * @returns "sent" (내가 보냄) | "received" (내가 받음)
 */
export function getWhisperDirection(
  message: ChatMessage,
  currentUserId: string
): "sent" | "received" {
  return message.senderId === currentUserId ? "sent" : "received"
}
