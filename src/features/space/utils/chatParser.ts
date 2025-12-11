/**
 * Chat Input Parser
 * 채팅 입력을 분석하여 일반 메시지와 귓속말을 구분
 *
 * 형식:
 * - 일반 메시지: "안녕하세요"
 * - 귓속말: "/닉네임 메시지내용"
 */

export type ParsedInputType = "message" | "whisper"

export interface ParsedInput {
  type: ParsedInputType
  content: string
  target?: string // whisper 대상 닉네임
}

/**
 * 채팅 입력을 파싱하여 메시지 타입을 결정
 *
 * @param input 사용자 입력 문자열
 * @returns ParsedInput 객체
 *
 * @example
 * parseChatInput("안녕하세요") // { type: "message", content: "안녕하세요" }
 * parseChatInput("/홍길동 안녕하세요") // { type: "whisper", target: "홍길동", content: "안녕하세요" }
 * parseChatInput("/홍길동") // { type: "message", content: "/홍길동" } // 메시지 없으면 일반 메시지로
 */
export function parseChatInput(input: string): ParsedInput {
  const trimmedInput = input.trim()

  // 빈 입력 처리
  if (!trimmedInput) {
    return { type: "message", content: "" }
  }

  // 귓속말 패턴: /닉네임 메시지
  // - 슬래시로 시작
  // - 공백이 아닌 문자들(닉네임)
  // - 하나 이상의 공백
  // - 나머지 문자들(메시지)
  const whisperMatch = trimmedInput.match(/^\/(\S+)\s+(.+)$/)

  if (whisperMatch) {
    const targetNickname = whisperMatch[1]
    const messageContent = whisperMatch[2].trim()

    // 메시지가 있을 때만 귓속말로 처리
    if (messageContent) {
      return {
        type: "whisper",
        target: targetNickname,
        content: messageContent,
      }
    }
  }

  // 그 외 모든 경우는 일반 메시지
  return { type: "message", content: trimmedInput }
}

/**
 * 귓속말 형식인지 확인 (입력 중 힌트 표시용)
 *
 * @param input 사용자 입력 문자열
 * @returns 슬래시로 시작하는지 여부
 */
export function isWhisperFormat(input: string): boolean {
  return input.trim().startsWith("/")
}

/**
 * 입력에서 대상 닉네임 추출 (자동완성용)
 *
 * @param input 사용자 입력 문자열
 * @returns 추출된 닉네임 또는 null
 */
export function extractTargetNickname(input: string): string | null {
  const trimmedInput = input.trim()

  // /닉네임 또는 /닉네임 메시지 형태에서 닉네임 추출
  const match = trimmedInput.match(/^\/(\S*)/)

  if (match) {
    return match[1] || null
  }

  return null
}
