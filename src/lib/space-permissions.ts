/**
 * Phase 6: 공간 권한 관리 유틸리티
 *
 * 역할 계층: SUPER_ADMIN > SPACE_OWNER > STAFF > PARTICIPANT
 */

import { SpaceRole } from "@prisma/client"

// ============================================
// 권한 타입 정의
// ============================================

export type SpacePermission =
  | "space:delete" // 공간 삭제
  | "space:settings" // 공간 설정 변경
  | "staff:assign" // STAFF 지정
  | "staff:remove" // STAFF 해제
  | "member:mute" // 음소거
  | "member:unmute" // 음소거 해제
  | "member:kick" // 강퇴
  | "chat:delete" // 채팅 삭제
  | "chat:announce" // 공지 발송
  | "stats:view" // 통계 조회
  | "stats:export" // 통계 내보내기

// ============================================
// 역할별 권한 매핑
// ============================================

const ROLE_PERMISSIONS: Record<SpaceRole, SpacePermission[]> = {
  OWNER: [
    "space:delete",
    "space:settings",
    "staff:assign",
    "staff:remove",
    "member:mute",
    "member:unmute",
    "member:kick",
    "chat:delete",
    "chat:announce",
    "stats:view",
    "stats:export",
  ],
  STAFF: [
    "member:mute",
    "member:unmute",
    "member:kick",
    "chat:delete",
    "stats:view",
  ],
  PARTICIPANT: [],
}

// 역할 계층 (숫자가 높을수록 상위)
const ROLE_HIERARCHY: Record<SpaceRole, number> = {
  OWNER: 3,
  STAFF: 2,
  PARTICIPANT: 1,
}

// ============================================
// 권한 체크 함수
// ============================================

/**
 * 특정 역할이 특정 권한을 가지는지 확인
 */
export function hasPermission(
  role: SpaceRole,
  permission: SpacePermission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * 행위자가 대상을 관리할 수 있는지 확인
 * (상위 역할만 하위 역할을 관리 가능)
 */
export function canManage(
  actorRole: SpaceRole,
  targetRole: SpaceRole
): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

/**
 * 역할이 최소 요구 역할 이상인지 확인
 */
export function hasMinRole(role: SpaceRole, minRole: SpaceRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

/**
 * 역할 계층 비교 (-1: 낮음, 0: 같음, 1: 높음)
 */
export function compareRoles(roleA: SpaceRole, roleB: SpaceRole): number {
  const diff = ROLE_HIERARCHY[roleA] - ROLE_HIERARCHY[roleB]
  return diff === 0 ? 0 : diff > 0 ? 1 : -1
}

// ============================================
// 역할 관련 헬퍼
// ============================================

/**
 * 특정 역할의 모든 권한 목록 반환
 */
export function getPermissionsForRole(role: SpaceRole): SpacePermission[] {
  return [...ROLE_PERMISSIONS[role]]
}

/**
 * 역할 표시명 반환
 */
export function getRoleDisplayName(role: SpaceRole): string {
  const names: Record<SpaceRole, string> = {
    OWNER: "소유자",
    STAFF: "스태프",
    PARTICIPANT: "참가자",
  }
  return names[role]
}

/**
 * 역할 배지 색상 반환 (Tailwind CSS 클래스)
 */
export function getRoleBadgeColor(role: SpaceRole): string {
  const colors: Record<SpaceRole, string> = {
    OWNER: "bg-amber-500 text-white",
    STAFF: "bg-blue-500 text-white",
    PARTICIPANT: "bg-gray-500 text-white",
  }
  return colors[role]
}

// ============================================
// 권한 검증 에러
// ============================================

export class ForbiddenError extends Error {
  constructor(message: string = "권한이 없습니다") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "리소스를 찾을 수 없습니다") {
    super(message)
    this.name = "NotFoundError"
  }
}
