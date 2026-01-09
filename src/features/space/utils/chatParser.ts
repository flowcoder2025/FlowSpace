/**
 * Chat Input Parser
 * 채팅 입력을 분석하여 일반 메시지, 귓속말, 관리/에디터 명령어를 구분
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
 *   - @proximity / @근접 on|off|켜기|끄기  (근접 통신 ON/OFF)
 *   - @help / @도움말
 * - 에디터 명령어 (설정 파일 기반):
 *   - @편집기 / @editor
 *   - @생성 / @create / @spawn <이름> [x,y]
 *   - @삭제 / @delete / @remove
 *   - @목록 / @list [카테고리]
 *   - ... (editor-commands.ts 참조)
 */

import {
  EDITOR_COMMANDS,
  getCommandByAlias,
  type EditorCommandConfig,
} from "@/config/editor-commands"
import type { ParsedEditorCommand } from "../types/editor.types"

export type ParsedInputType = "message" | "whisper" | "command" | "editor_command"
export type AdminCommandType = "mute" | "unmute" | "kick" | "ban" | "announce" | "help" | "proximity"

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
    enabled?: boolean  // proximity on/off
  }
  // 에디터 명령어 전용 필드
  editorCommand?: ParsedEditorCommand
}

/**
 * 에디터 명령어 파싱
 * 설정 기반 (editor-commands.ts)으로 동적 파싱
 *
 * @param input 사용자 입력 문자열
 * @returns ParsedInput 또는 null (에디터 명령어가 아닌 경우)
 */
function parseEditorCommand(input: string): ParsedInput | null {
  const trimmed = input.trim()

  // @로 시작하지 않으면 에디터 명령어가 아님
  if (!trimmed.startsWith("@")) return null

  // @뒤의 명령어와 인자 분리
  // 예: "@생성 의자 10,20" → ["생성", "의자 10,20"]
  const withoutAt = trimmed.slice(1)
  const spaceIndex = withoutAt.indexOf(" ")

  const commandAlias = spaceIndex === -1 ? withoutAt : withoutAt.slice(0, spaceIndex)
  const argsString = spaceIndex === -1 ? "" : withoutAt.slice(spaceIndex + 1).trim()

  // 설정에서 명령어 조회
  const commandConfig = getCommandByAlias(commandAlias)
  if (!commandConfig) {
    // 에디터 명령어가 아님 → 관리 명령어일 수 있음
    return null
  }

  // 인자 파싱
  const parsedArgs = parseEditorCommandArgs(commandConfig, argsString)

  return {
    type: "editor_command",
    content: trimmed,
    editorCommand: {
      commandId: commandConfig.id,
      rawInput: trimmed,
      args: parsedArgs,
    },
  }
}

/**
 * 에디터 명령어 인자 파싱
 * 명령어 설정의 argPattern에 따라 파싱
 */
function parseEditorCommandArgs(
  config: EditorCommandConfig,
  argsString: string
): ParsedEditorCommand["args"] {
  const args: ParsedEditorCommand["args"] = {}

  // 인자가 없는 명령어
  if (!argsString) return args

  // argPattern이 없으면 첫 번째 토큰을 assetName으로 처리
  if (!config.argPattern) {
    args.assetName = argsString
    return args
  }

  // 명령어별 특화 파싱
  switch (config.id) {
    case "create": {
      // @생성 name [x,y] 형식
      // 예: "의자", "의자 10,20", "포털 5,10"
      const createMatch = argsString.match(/^(.+?)(?:\s+(\d+),(\d+))?$/)
      if (createMatch) {
        args.assetName = createMatch[1].trim()
        if (createMatch[2] && createMatch[3]) {
          args.coordinates = {
            x: parseInt(createMatch[2], 10),
            y: parseInt(createMatch[3], 10),
          }
        }
      }
      break
    }

    case "list": {
      // @목록 [카테고리] 형식
      // 예: "", "가구", "furniture"
      if (argsString) {
        args.category = argsString
      }
      break
    }

    case "search": {
      // @검색 keyword 형식
      args.keyword = argsString
      break
    }

    case "select": {
      // @선택 반경 n / @select radius n 형식
      const selectMatch = argsString.match(/^(?:반경|radius)\s+(\d+)$/i)
      if (selectMatch) {
        args.radius = parseInt(selectMatch[1], 10)
      }
      break
    }

    case "edit": {
      // @수정 objectId 형식
      args.objectId = argsString
      break
    }

    default:
      // 기본: 인자 전체를 assetName으로 처리
      if (argsString) {
        args.assetName = argsString
      }
      break
  }

  return args
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

  // @proximity / @근접 on/off - 근접 통신 ON/OFF
  const proximityMatch = trimmed.match(/^@(proximity|근접)\s+(on|off|켜기|끄기)\s*$/i)
  if (proximityMatch) {
    const value = proximityMatch[2].toLowerCase()
    const enabled = value === "on" || value === "켜기"
    return {
      type: "command",
      content: trimmed,
      command: "proximity",
      commandArgs: {
        enabled,
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
 * parseChatInput("@편집기") // { type: "editor_command", editorCommand: { commandId: "editor", ... } }
 * parseChatInput("@생성 의자") // { type: "editor_command", editorCommand: { commandId: "create", args: { assetName: "의자" } } }
 */
export function parseChatInput(input: string): ParsedInput {
  const trimmedInput = input.trim()

  // 빈 입력 처리
  if (!trimmedInput) {
    return { type: "message", content: "" }
  }

  // 1. 에디터 명령어 (@로 시작, 설정 기반) 체크 - 최우선
  const editorResult = parseEditorCommand(trimmedInput)
  if (editorResult) {
    return editorResult
  }

  // 2. 관리 명령어 (@로 시작) 체크
  const commandResult = parseAdminCommand(trimmedInput)
  if (commandResult) {
    return commandResult
  }

  // 3. 귓속말 패턴: /닉네임 메시지
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

/**
 * 에디터 명령어 형식인지 확인
 *
 * @param input 사용자 입력 문자열
 * @returns 에디터 명령어 여부
 */
export function isEditorCommandFormat(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed.startsWith("@")) return false

  const withoutAt = trimmed.slice(1)
  const spaceIndex = withoutAt.indexOf(" ")
  const commandAlias = spaceIndex === -1 ? withoutAt : withoutAt.slice(0, spaceIndex)

  return getCommandByAlias(commandAlias) !== undefined
}

/**
 * 에디터 명령어 자동완성 후보 반환
 *
 * @param input 사용자 입력 문자열 (@로 시작하는 부분 입력)
 * @returns 매칭되는 명령어 별칭 목록
 */
export function getEditorCommandSuggestions(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed.startsWith("@")) return []

  const partial = trimmed.slice(1).toLowerCase()
  if (!partial) {
    // @만 입력된 경우 모든 에디터 명령어의 첫 번째 별칭 반환
    return EDITOR_COMMANDS.map((cmd) => cmd.aliases[0])
  }

  // 부분 매칭되는 별칭 반환
  const suggestions: string[] = []
  for (const cmd of EDITOR_COMMANDS) {
    for (const alias of cmd.aliases) {
      if (alias.toLowerCase().startsWith(partial)) {
        suggestions.push(alias)
      }
    }
  }

  return suggestions
}
