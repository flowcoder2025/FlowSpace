/**
 * Editor Commands Registry
 *
 * 에디터 명령어 레지스트리 - 설정 기반 명령어 관리
 * 하드코딩 금지 원칙에 따라 모든 명령어는 이 설정에서 정의
 *
 * @example
 * // 명령어 조회
 * const cmd = getCommandByAlias("편집기") // returns EditorCommandConfig
 *
 * // 권한 체크
 * const canUse = canExecuteCommand("editor", "STAFF") // returns true
 */

import type { SpaceRole } from "@prisma/client"

// ============================================
// Types
// ============================================

export type EditorCommandCategory = "basic" | "extended" | "advanced"

/**
 * 에디터 권한 역할
 * SpaceRole과 매핑되며, 추후 SUPER_ADMIN 등 확장 가능
 *
 * 현재 SpaceRole: OWNER, STAFF, PARTICIPANT
 * 에디터 사용 가능: OWNER, STAFF
 */
export type EditorRole = SpaceRole

/**
 * 에디터 사용 가능한 역할 목록
 * 이 목록에 포함된 역할만 에디터를 사용할 수 있음
 */
export const EDITOR_ALLOWED_ROLES: SpaceRole[] = ["OWNER", "STAFF"]

export interface EditorCommandConfig {
  /** 고유 식별자 */
  id: string
  /** 명령어 별칭 목록 (한글/영어) */
  aliases: string[]
  /** 필요 권한 (하나라도 충족하면 실행 가능) */
  requiredRoles: EditorRole[]
  /** 명령어 카테고리 */
  category: EditorCommandCategory
  /** 인자 패턴 (정규식) */
  argPattern?: string
  /** 설명 (도움말용) */
  description: string
  /** 사용 예시 */
  examples: string[]
}

// ============================================
// Command Registry
// ============================================

/**
 * 에디터 명령어 레지스트리
 *
 * 새 명령어 추가 시 이 배열에 추가하면 자동으로 파서에서 인식
 */
export const EDITOR_COMMANDS: EditorCommandConfig[] = [
  // ========== Basic Commands (Phase 1) ==========
  {
    id: "editor",
    aliases: ["편집기", "에디터", "editor", "edit"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "basic",
    description: "에디터 패널을 열거나 닫습니다",
    examples: ["@편집기", "@에디터", "@editor"],
  },
  {
    id: "create",
    aliases: ["생성", "create", "spawn"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "basic",
    argPattern: "^(.+?)(?:\\s+(\\d+),(\\d+))?$", // name or name x,y
    description: "오브젝트를 배치합니다",
    examples: ["@생성 의자", "@create chair", "@생성 포털 10,20"],
  },
  {
    id: "delete",
    aliases: ["삭제", "delete", "remove"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "basic",
    description: "캐릭터 앞의 오브젝트를 삭제합니다",
    examples: ["@삭제", "@delete"],
  },
  {
    id: "list",
    aliases: ["목록", "list"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "basic",
    argPattern: "^(.+)?$", // optional category
    description: "배치 가능한 에셋 목록을 표시합니다",
    examples: ["@목록", "@목록 가구", "@list furniture"],
  },

  // ========== Extended Commands (Phase 2) ==========
  {
    id: "rotate",
    aliases: ["회전", "rotate"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "extended",
    description: "마지막 배치한 오브젝트를 90도 회전합니다",
    examples: ["@회전", "@rotate"],
  },
  {
    id: "undo",
    aliases: ["취소", "undo"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "extended",
    description: "마지막 작업을 취소합니다",
    examples: ["@취소", "@undo"],
  },
  {
    id: "redo",
    aliases: ["다시", "redo"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "extended",
    description: "취소한 작업을 다시 실행합니다",
    examples: ["@다시", "@redo"],
  },
  {
    id: "search",
    aliases: ["검색", "search"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "extended",
    argPattern: "^(.+)$", // keyword required
    description: "에셋을 이름으로 검색합니다",
    examples: ["@검색 나무", "@search tree"],
  },

  // ========== Advanced Commands (Phase 3) ==========
  {
    id: "copy",
    aliases: ["복사", "copy"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "advanced",
    description: "캐릭터 앞의 오브젝트를 클립보드에 복사합니다",
    examples: ["@복사", "@copy"],
  },
  {
    id: "paste",
    aliases: ["붙여넣기", "paste"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "advanced",
    description: "클립보드의 오브젝트를 배치합니다",
    examples: ["@붙여넣기", "@paste"],
  },
  {
    id: "select",
    aliases: ["선택", "select"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "advanced",
    argPattern: "^반경\\s+(\\d+)$|^radius\\s+(\\d+)$", // 반경 n or radius n
    description: "반경 내 모든 오브젝트를 선택합니다",
    examples: ["@선택 반경 3", "@select radius 3"],
  },
  {
    id: "edit",
    aliases: ["수정", "edit"],
    requiredRoles: ["OWNER", "STAFF"],
    category: "advanced",
    argPattern: "^(.+)$", // object id
    description: "기존 오브젝트의 속성을 수정합니다",
    examples: ["@수정 portal-1", "@edit portal-1"],
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * 별칭으로 명령어 설정 조회
 */
export function getCommandByAlias(alias: string): EditorCommandConfig | undefined {
  const lowerAlias = alias.toLowerCase()
  return EDITOR_COMMANDS.find((cmd) =>
    cmd.aliases.some((a) => a.toLowerCase() === lowerAlias)
  )
}

/**
 * 명령어 ID로 설정 조회
 */
export function getCommandById(id: string): EditorCommandConfig | undefined {
  return EDITOR_COMMANDS.find((cmd) => cmd.id === id)
}

/**
 * 권한 체크
 */
export function canExecuteCommand(commandId: string, userRole: SpaceRole): boolean {
  const cmd = getCommandById(commandId)
  if (!cmd) return false
  return cmd.requiredRoles.includes(userRole)
}

/**
 * 카테고리별 명령어 목록 조회
 */
export function getCommandsByCategory(category: EditorCommandCategory): EditorCommandConfig[] {
  return EDITOR_COMMANDS.filter((cmd) => cmd.category === category)
}

/**
 * 도움말 텍스트 생성
 */
export function generateHelpText(userRole: SpaceRole): string {
  const availableCommands = EDITOR_COMMANDS.filter((cmd) =>
    cmd.requiredRoles.includes(userRole)
  )

  const lines = ["[에디터 명령어]"]

  const categories: EditorCommandCategory[] = ["basic", "extended", "advanced"]
  const categoryNames: Record<EditorCommandCategory, string> = {
    basic: "기본",
    extended: "확장",
    advanced: "고급",
  }

  for (const cat of categories) {
    const cmds = availableCommands.filter((c) => c.category === cat)
    if (cmds.length > 0) {
      lines.push(`\n[${categoryNames[cat]}]`)
      for (const cmd of cmds) {
        lines.push(`@${cmd.aliases[0]} - ${cmd.description}`)
      }
    }
  }

  return lines.join("\n")
}
