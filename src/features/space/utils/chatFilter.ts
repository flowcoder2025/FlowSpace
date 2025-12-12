/**
 * Chat Message Filter
 * 채팅 탭에 따른 메시지 필터링 로직
 *
 * 탭 구조 (5개):
 * - all: 전체 메시지 (일반 + 파티 + 귓속말 + 시스템)
 * - party: 파티/구역 채팅만
 * - whisper: 귓속말만
 * - system: 시스템 메시지만
 * - links: URL이 포함된 메시지만
 */
import type { ChatMessage, ChatTab } from "../types/space.types"

// ============================================
// URL 추출 관련
// ============================================

/**
 * URL을 매칭하는 정규식
 * - http://, https:// 프로토콜 지원
 * - www. 로 시작하는 URL도 지원
 * - 도메인명만 있는 경우도 일부 지원 (예: example.com)
 */
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`\[\]]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|dev|co|kr|me|app|xyz|info|biz|tv|cc|ly|to|link|page|site|online|tech|ai|cloud|gg|live|stream|blog|store|shop|news|edu|gov|mil|int)[^\s<>"{}|\\^`\[\]]*/gi

/**
 * 메시지 내용에서 URL 목록 추출
 *
 * @param content 메시지 내용
 * @returns 추출된 URL 배열
 *
 * @example
 * extractUrls("Check out https://example.com and www.test.org")
 * // ["https://example.com", "www.test.org"]
 */
export function extractUrls(content: string): string[] {
  const matches = content.match(URL_REGEX)
  return matches ? [...new Set(matches)] : []  // 중복 제거
}

/**
 * 메시지에 URL이 포함되어 있는지 확인
 *
 * @param message 메시지
 * @returns URL 포함 여부
 *
 * 🔧 2025-12-12: 전역 플래그(g) 문제 해결
 * - 전역 regex의 .test()는 lastIndex를 업데이트하여 재사용 시 문제 발생
 * - 새 정규식 인스턴스를 생성하여 매번 lastIndex=0부터 시작
 */
export function hasUrl(message: ChatMessage): boolean {
  // 새 정규식 인스턴스 생성 (lastIndex 초기화 보장)
  const regex = new RegExp(URL_REGEX.source, "gi")
  return regex.test(message.content)
}

/**
 * URL이 포함된 메시지인지 확인하는 헬퍼
 */
export function isLinkMessage(message: ChatMessage): boolean {
  // 시스템 메시지는 제외 (조작 안내 메시지 등)
  if (message.type === "system" || message.type === "announcement") {
    return false
  }
  return hasUrl(message)
}

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

    case "links":
      // URL이 포함된 메시지만 표시 (시스템 메시지 제외)
      return messages.filter((msg) => isLinkMessage(msg))

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
 *
 * 🔧 개선 (2025-12-11):
 * "전체" 탭의 unread 계산 시, 개별 탭(귓속말/시스템/파티)에서 이미 읽은 메시지는 제외
 * → 귓속말 탭에서 읽으면 전체 탭에서도 읽음 처리됨
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
    links: 0,
  }

  for (const msg of messages) {
    // 파티 탭: 파티 메시지 중 읽지 않은 것
    const isPartyUnread = msg.type === "party" && msg.timestamp > lastReadTimestamps.party
    if (isPartyUnread) {
      counts.party++
    }

    // 귓속말 탭: 내가 관련된 귓속말 중 읽지 않은 것
    const isWhisperUnread =
      msg.type === "whisper" &&
      msg.timestamp > lastReadTimestamps.whisper &&
      (msg.senderId === currentUserId || msg.targetId === currentUserId)
    if (isWhisperUnread) {
      counts.whisper++
    }

    // 시스템 탭: 시스템 메시지 중 읽지 않은 것
    const isSystemUnread =
      (msg.type === "system" || msg.type === "announcement") &&
      msg.timestamp > lastReadTimestamps.system
    if (isSystemUnread) {
      counts.system++
    }

    // 링크 탭: URL이 포함된 메시지 중 읽지 않은 것 (시스템 메시지 제외)
    const isLinksUnread =
      isLinkMessage(msg) &&
      msg.timestamp > lastReadTimestamps.links
    if (isLinksUnread) {
      counts.links++
    }

    // 🔧 전체 탭: 개별 탭에서 읽지 않은 메시지만 카운트
    // - 일반 채팅: 전체 탭 타임스탬프 기준
    // - 파티/귓속말/시스템: 해당 개별 탭에서도 읽지 않은 경우에만 카운트
    const isUnreadInAll = msg.timestamp > lastReadTimestamps.all
    if (isUnreadInAll) {
      // 메시지 타입별로 개별 탭에서도 읽지 않은 경우에만 전체 탭에 카운트
      if (msg.type === "party") {
        // 파티 메시지: 파티 탭에서도 읽지 않은 경우만
        if (isPartyUnread) counts.all++
      } else if (msg.type === "whisper") {
        // 귓속말: 귓속말 탭에서도 읽지 않은 경우만 (+ 나와 관련된 것만)
        if (isWhisperUnread) counts.all++
      } else if (msg.type === "system" || msg.type === "announcement") {
        // 시스템: 시스템 탭에서도 읽지 않은 경우만
        if (isSystemUnread) counts.all++
      } else {
        // 일반 채팅 (chat 타입): 전체 탭 타임스탬프만 기준
        counts.all++
      }
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

// ============================================
// 링크 렌더링 관련
// ============================================

/**
 * URL에 프로토콜이 없으면 추가
 */
function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}

/**
 * URL 매칭 정보 타입
 */
interface UrlMatch {
  url: string
  index: number
  length: number
}

/**
 * 텍스트에서 URL 매칭 정보 추출 (위치 포함)
 */
function findUrlMatches(content: string): UrlMatch[] {
  const matches: UrlMatch[] = []
  // 새 정규식 인스턴스 생성 (lastIndex 초기화)
  const regex = new RegExp(URL_REGEX.source, "gi")
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      url: match[0],
      index: match.index,
      length: match[0].length,
    })
  }

  return matches
}

/**
 * 콘텐츠를 파싱하여 텍스트와 URL을 분리
 * React 컴포넌트에서 링크 렌더링에 사용
 *
 * @param content 원본 메시지 내용
 * @returns 텍스트와 URL이 분리된 세그먼트 배열
 *
 * @example
 * parseContentWithUrls("Check out https://example.com for more")
 * // [
 * //   { type: "text", value: "Check out " },
 * //   { type: "url", value: "https://example.com", href: "https://example.com" },
 * //   { type: "text", value: " for more" }
 * // ]
 */
export type ContentSegment =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string }

export function parseContentWithUrls(content: string): ContentSegment[] {
  const matches = findUrlMatches(content)

  if (matches.length === 0) {
    return [{ type: "text", value: content }]
  }

  const segments: ContentSegment[] = []
  let lastIndex = 0

  for (const match of matches) {
    // URL 앞의 텍스트
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      })
    }

    // URL 자체
    segments.push({
      type: "url",
      value: match.url,
      href: ensureProtocol(match.url),
    })

    lastIndex = match.index + match.length
  }

  // URL 뒤의 남은 텍스트
  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      value: content.slice(lastIndex),
    })
  }

  return segments
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
