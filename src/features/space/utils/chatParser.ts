/**
 * Chat Input Parser
 * 채팅 입력을 분석하여 일반 메시지, 귓속말, 관리 명령어를 구분
 *
 * 형식:
 * - 일반 메시지: "안녕하세요"
 * - 귓속말: "/닉네임 메시지내용"
 * - 관리 명령어 (영어/한글 모두 지원):
 *   - @mute / @음소거 <닉네임> [시간(분)] [사유]
 *   - @unmute / @음소거해제 <닉네임>
 *   - @kick / @강퇴 <닉네임> [사유]
 *   - @ban / @차단 <닉네임> [사유]
 *   - @announce / @공지 <메시지>
 *   - @help / @도움말
 */

export type ParsedInputType = "message" | "whisper" | "command"
export type AdminCommandType = "mute" | "unmute" | "kick" | "ban" | "announce" | "help"

export interface ParsedInput {
  type: ParsedInputType
  content: string
  target?: string // whisper 대상 닉네임
  // 관리 명령어 전용 필드
  command?: AdminCommandType
  commandArgs?: {
    targetNickname?: string
    duration?: number  // 음소거 시간 (분)
    reason?: string
    message?: string   // 공지사항 내용
  }
}

/**
 * 관리 명령어 파싱
 */
function parseAdminCommand(input: string): ParsedInput | null {
  const trimmed = input.trim()

  // @로 시작하지 않으면 관리 명령어가 아님
  if (!trimmed.startsWith("@")) return null

  // @help / @도움말 - 도움말
  if (/^@(help|도움말|\?)\s*$/i.test(trimmed)) {
    return {
      type: "command",
      content: trimmed,
      command: "help",
      commandArgs: {},
    }
  }

  // @announce / @공지 <메시지> - 공지사항
  const announceMatch = trimmed.match(/^@(announce|공지)\s+(.+)$/i)
  if (announceMatch) {
    return {
      type: "command",
      content: trimmed,
      command: "announce",
      commandArgs: {
        message: announceMatch[2].trim(),
      },
    }
  }

  // @mute / @음소거 <닉네임> [시간(분)] [사유] - 음소거
  // 예: @mute 홍길동 / @음소거 홍길동 10 / @mute 홍길동 10 스팸 금지
  const muteMatch = trimmed.match(/^@(mute|음소거)\s+(\S+)(?:\s+(\d+))?(?:\s+(.+))?$/i)
  if (muteMatch) {
    return {
      type: "command",
      content: trimmed,
      command: "mute",
      commandArgs: {
        targetNickname: muteMatch[2],
        duration: muteMatch[3] ? parseInt(muteMatch[3], 10) : undefined,
        reason: muteMatch[4]?.trim(),
      },
    }
  }

  // @unmute / @음소거해제 <닉네임> - 음소거 해제
  const unmuteMatch = trimmed.match(/^@(unmute|음소거해제)\s+(\S+)\s*$/i)
  if (unmuteMatch) {
    return {
      type: "command",
      content: trimmed,
      command: "unmute",
      commandArgs: {
        targetNickname: unmuteMatch[2],
      },
    }
  }

  // @kick / @강퇴 <닉네임> [사유] - 강퇴
  const kickMatch = trimmed.match(/^@(kick|강퇴)\s+(\S+)(?:\s+(.+))?$/i)
  if (kickMatch) {
    return {
      type: "command",
      content: trimmed,
      command: "kick",
      commandArgs: {
        targetNickname: kickMatch[2],
        reason: kickMatch[3]?.trim(),
      },
    }
  }

  // @ban / @차단 <닉네임> [사유] - 영구 차단
  const banMatch = trimmed.match(/^@(ban|차단)\s+(\S+)(?:\s+(.+))?$/i)
  if (banMatch) {
    return {
      type: "command",
      content: trimmed,
      command: "ban",
      commandArgs: {
        targetNickname: banMatch[2],
        reason: banMatch[3]?.trim(),
      },
    }
  }

  // @로 시작하지만 유효한 명령어가 아닌 경우 → 일반 메시지로 처리
  return null
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
 * parseChatInput("@mute 홍길동 10") // { type: "command", command: "mute", ... }
 * parseChatInput("@announce 공지사항입니다") // { type: "command", command: "announce", ... }
 */
export function parseChatInput(input: string): ParsedInput {
  const trimmedInput = input.trim()

  // 빈 입력 처리
  if (!trimmedInput) {
    return { type: "message", content: "" }
  }

  // 1. 관리 명령어 (@로 시작) 체크 - 우선순위 높음
  const commandResult = parseAdminCommand(trimmedInput)
  if (commandResult) {
    return commandResult
  }

  // 2. 귓속말 패턴: /닉네임 메시지
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
