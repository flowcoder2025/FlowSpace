/**
 * XSS 방지 유틸리티
 *
 * 사용자 입력 및 채팅 메시지의 XSS 공격 방지
 */

import DOMPurify from "dompurify"

// 서버 사이드에서는 DOMPurify가 작동하지 않으므로 체크
const isClient = typeof window !== "undefined"

/**
 * HTML을 안전하게 정화 (허용된 태그만 유지)
 *
 * 채팅 메시지에서 기본 포맷팅만 허용할 때 사용
 *
 * @param content - 정화할 HTML 문자열
 * @returns 안전한 HTML 문자열
 */
export function sanitizeHtml(content: string): string {
  if (!isClient) {
    // 서버 사이드에서는 HTML 태그 제거
    return stripHtml(content)
  }

  return DOMPurify.sanitize(content, {
    // 허용 태그 (최소한)
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br"],
    // 모든 속성 제거
    ALLOWED_ATTR: [],
    // 위험한 URI 스킴 차단
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}

/**
 * 채팅 메시지 정화 (텍스트만 유지)
 *
 * 모든 HTML 태그를 제거하고 이스케이프된 텍스트만 반환
 *
 * @param content - 정화할 메시지 문자열
 * @returns 안전한 텍스트 문자열
 */
export function sanitizeMessage(content: string): string {
  if (!isClient) {
    return stripHtml(content)
  }

  // 모든 HTML 태그 제거, 텍스트만 반환
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * HTML 태그를 완전히 제거 (서버 사이드 호환)
 *
 * @param content - HTML 문자열
 * @returns 태그가 제거된 텍스트
 */
export function stripHtml(content: string): string {
  // 1. HTML 태그 제거
  let text = content.replace(/<[^>]*>/g, "")

  // 2. HTML 엔티티 디코딩
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")

  // 3. 다시 이스케이프 (XSS 방지)
  return escapeHtml(text)
}

/**
 * 텍스트를 HTML에 안전하게 삽입하기 위해 이스케이프
 *
 * @param text - 원본 텍스트
 * @returns 이스케이프된 텍스트
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  }

  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char)
}

/**
 * URL이 안전한지 검증
 *
 * @param url - 검증할 URL
 * @returns 안전 여부
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // http, https, mailto만 허용
    return ["http:", "https:", "mailto:"].includes(parsed.protocol)
  } catch {
    return false
  }
}
