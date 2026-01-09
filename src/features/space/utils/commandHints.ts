/**
 * Command Hints System
 *
 * 채팅창에 표시되는 명령어 안내 시스템
 * - @도움말/@help 입력 시 전체 명령어 목록 표시
 * - 주기적으로 회전하는 힌트 시스템
 */

// ============================================
// Types
// ============================================

export interface CommandInfo {
  /** 명령어 (예: "@mute", "/닉네임") */
  command: string
  /** 명령어 설명 */
  description: string
  /** 사용 예시 */
  example: string
  /** 명령어 카테고리 */
  category: CommandCategory
  /** 권한 필요 여부 (staff/owner만 사용 가능) */
  requiresPermission?: boolean
}

export type CommandCategory =
  | "basic"      // 기본 조작
  | "chat"       // 채팅 관련
  | "admin"      // 관리 명령어
  | "editor"     // 에디터 명령어

// ============================================
// Command Registry
// ============================================

/**
 * 전체 명령어 목록 (모든 사용자에게 표시)
 */
export const ALL_COMMANDS: CommandInfo[] = [
  // ========== 기본 조작 ==========
  {
    command: "WASD / 방향키",
    description: "캐릭터 이동",
    example: "WASD 또는 방향키로 이동",
    category: "basic",
  },
  {
    command: "Space",
    description: "점프",
    example: "Space 키로 점프",
    category: "basic",
  },
  {
    command: "E",
    description: "상호작용",
    example: "오브젝트 근처에서 E 키",
    category: "basic",
  },
  {
    command: "Enter",
    description: "채팅 모드 진입/종료",
    example: "Enter로 채팅창 활성화",
    category: "basic",
  },
  {
    command: "Esc",
    description: "채팅 모드 종료",
    example: "Esc로 채팅창 닫기",
    category: "basic",
  },

  // ========== 채팅 관련 ==========
  {
    command: "/닉네임 메시지",
    description: "귓속말 보내기",
    example: "/홍길동 안녕하세요",
    category: "chat",
  },
  {
    command: "@도움말",
    description: "명령어 도움말 보기",
    example: "@도움말 또는 @help",
    category: "chat",
  },

  // ========== 관리 명령어 (스탭/오너만) ==========
  {
    command: "@mute / @음소거",
    description: "사용자 음소거",
    example: "@mute 홍길동 10 스팸금지",
    category: "admin",
    requiresPermission: true,
  },
  {
    command: "@unmute / @음소거해제",
    description: "음소거 해제",
    example: "@unmute 홍길동",
    category: "admin",
    requiresPermission: true,
  },
  {
    command: "@kick / @강퇴",
    description: "사용자 강퇴",
    example: "@kick 홍길동 규칙위반",
    category: "admin",
    requiresPermission: true,
  },
  {
    command: "@ban / @차단",
    description: "사용자 영구차단",
    example: "@ban 홍길동",
    category: "admin",
    requiresPermission: true,
  },
  {
    command: "@announce / @공지",
    description: "공지사항 전송",
    example: "@공지 점검 안내입니다",
    category: "admin",
    requiresPermission: true,
  },
  {
    command: "@proximity / @근접",
    description: "근접 통신 ON/OFF (7×7 범위)",
    example: "@근접 켜기 또는 @proximity off",
    category: "admin",
    requiresPermission: true,
  },

  // ========== 에디터 명령어 (스탭/오너만) ==========
  {
    command: "@편집기 / @editor",
    description: "에디터 패널 열기/닫기",
    example: "@편집기",
    category: "editor",
    requiresPermission: true,
  },
  {
    command: "@생성 / @create",
    description: "오브젝트 배치",
    example: "@생성 의자 10,20",
    category: "editor",
    requiresPermission: true,
  },
  {
    command: "@삭제 / @delete",
    description: "오브젝트 삭제",
    example: "@삭제",
    category: "editor",
    requiresPermission: true,
  },
  {
    command: "@목록 / @list",
    description: "에셋 목록 보기",
    example: "@목록 가구",
    category: "editor",
    requiresPermission: true,
  },
  {
    command: "@검색 / @search",
    description: "에셋 검색",
    example: "@검색 나무",
    category: "editor",
    requiresPermission: true,
  },
]

// ============================================
// Category Labels
// ============================================

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  basic: "기본 조작",
  chat: "채팅",
  admin: "관리",
  editor: "에디터",
}

// ============================================
// Helper Functions
// ============================================

/**
 * @도움말 명령어 입력 시 표시할 전체 명령어 목록 생성
 *
 * @param hasPermission - 관리 권한 보유 여부 (OWNER/STAFF)
 * @returns 포맷된 도움말 문자열 배열 (각 줄별로)
 */
export function generateFullHelpMessages(hasPermission: boolean = false): string[] {
  const messages: string[] = []

  // 헤더
  messages.push("━━━━━ 명령어 도움말 ━━━━━")

  // 카테고리별 그룹화
  const categories: CommandCategory[] = ["basic", "chat", "admin", "editor"]

  let commandNumber = 1

  for (const category of categories) {
    // 권한이 없으면 admin/editor 카테고리는 스킵
    if ((category === "admin" || category === "editor") && !hasPermission) {
      continue
    }

    const commands = ALL_COMMANDS.filter((cmd) => cmd.category === category)
    if (commands.length === 0) continue

    // 카테고리 헤더
    messages.push(`\n【${CATEGORY_LABELS[category]}】`)

    // 각 명령어
    for (const cmd of commands) {
      // 권한 필요 명령어는 권한 없으면 스킵
      if (cmd.requiresPermission && !hasPermission) continue

      messages.push(`${commandNumber}. ${cmd.command}`)
      messages.push(`   └ ${cmd.description}`)
      messages.push(`   └ 예: ${cmd.example}`)
      commandNumber++
    }
  }

  messages.push("\n━━━━━━━━━━━━━━━━━━━━━")

  return messages
}

/**
 * @도움말 결과를 하나의 문자열로 반환
 */
export function generateHelpText(hasPermission: boolean = false): string {
  return generateFullHelpMessages(hasPermission).join("\n")
}

// ============================================
// Rotating Hints System
// ============================================

/**
 * 회전 힌트용 간단한 팁 목록
 * 일반 사용자에게 주기적으로 표시되는 짧은 팁
 */
const ROTATING_HINTS: string[] = [
  "💡 WASD 또는 방향키로 캐릭터를 이동할 수 있어요",
  "💡 Space 키로 점프할 수 있어요",
  "💡 E 키로 오브젝트와 상호작용할 수 있어요",
  "💡 Enter 키로 채팅을 시작하고, Esc로 종료해요",
  "💡 /닉네임 메시지 형식으로 귓속말을 보낼 수 있어요",
  "💡 @도움말 을 입력하면 전체 명령어를 볼 수 있어요",
  "💡 채팅창은 드래그해서 위치를 옮길 수 있어요",
  "💡 채팅창 우측 하단을 드래그해서 크기를 조절할 수 있어요",
]

/**
 * 관리자용 추가 힌트
 */
const ADMIN_HINTS: string[] = [
  "💡 @mute 닉네임 으로 사용자를 음소거할 수 있어요",
  "💡 @kick 닉네임 으로 사용자를 강퇴할 수 있어요",
  "💡 @공지 메시지 로 전체 공지를 보낼 수 있어요",
  "💡 @편집기 로 맵 에디터를 열 수 있어요",
  "💡 @근접 켜기/끄기 로 근접 통신을 ON/OFF 할 수 있어요",
]

let currentHintIndex = 0

/**
 * 다음 회전 힌트 가져오기
 *
 * @param hasPermission - 관리 권한 보유 여부
 * @returns 다음 힌트 문자열
 */
export function getNextRotatingHint(hasPermission: boolean = false): string {
  const allHints = hasPermission
    ? [...ROTATING_HINTS, ...ADMIN_HINTS]
    : ROTATING_HINTS

  const hint = allHints[currentHintIndex % allHints.length]
  currentHintIndex++

  return hint
}

/**
 * 힌트 인덱스 리셋 (테스트용)
 */
export function resetHintIndex(): void {
  currentHintIndex = 0
}

/**
 * 랜덤 힌트 가져오기
 *
 * @param hasPermission - 관리 권한 보유 여부
 * @returns 랜덤 힌트 문자열
 */
export function getRandomHint(hasPermission: boolean = false): string {
  const allHints = hasPermission
    ? [...ROTATING_HINTS, ...ADMIN_HINTS]
    : ROTATING_HINTS

  const randomIndex = Math.floor(Math.random() * allHints.length)
  return allHints[randomIndex]
}

// ============================================
// Constants
// ============================================

/** 힌트 표시 간격 (밀리초) - 5분 */
export const HINT_INTERVAL_MS = 5 * 60 * 1000  // 300,000ms = 5분

/** 도움말 명령어 패턴 */
export const HELP_COMMAND_PATTERN = /^@(help|도움말|\?)\s*$/i

// ============================================
// Welcome Message (최초 입장 시)
// ============================================

/**
 * 최초 입장 시 표시할 환영 메시지
 * 기본 조작법을 한 번에 안내
 */
export const WELCOME_MESSAGE = `🎮 FlowSpace에 오신 것을 환영합니다!

【기본 조작】
• WASD / 방향키: 캐릭터 이동
• Space: 점프
• E: 오브젝트 상호작용
• Enter: 채팅 시작 / ESC: 채팅 종료

【채팅 명령어】
• /닉네임 메시지: 귓속말 보내기
• @도움말: 전체 명령어 보기

💡 5분마다 유용한 팁이 표시됩니다!`

/**
 * 관리자용 추가 환영 메시지
 */
export const ADMIN_WELCOME_ADDITION = `
【관리 명령어 (스탭/오너)】
• @mute / @음소거: 사용자 음소거
• @kick / @강퇴: 사용자 강퇴
• @공지: 전체 공지 전송
• @근접 켜기/끄기: 근접 통신 ON/OFF
• @편집기: 맵 에디터 열기`

/**
 * 환영 메시지 생성
 * @param hasPermission - 관리 권한 보유 여부
 */
export function getWelcomeMessage(hasPermission: boolean = false): string {
  return hasPermission
    ? WELCOME_MESSAGE + ADMIN_WELCOME_ADDITION
    : WELCOME_MESSAGE
}
