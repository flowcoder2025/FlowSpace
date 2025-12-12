/**
 * Phase 6: 공간 권한 API 미들웨어
 *
 * Space 관련 API 라우트에서 역할 기반 권한 검증에 사용
 */

import { auth } from "./auth"
import { prisma } from "./prisma"
import { SpaceRole } from "@prisma/client"
import {
  hasMinRole,
  canManage,
  ForbiddenError,
  NotFoundError,
} from "./space-permissions"

// ============================================
// 타입 정의
// ============================================

export interface SpaceMemberInfo {
  memberId: string
  spaceId: string
  userId: string | null
  guestSessionId: string | null
  role: SpaceRole
  isSuperAdmin: boolean
}

export interface SpaceAuthResult {
  member: SpaceMemberInfo
  space: {
    id: string
    name: string
    ownerId: string
  }
}

// ============================================
// Super Admin 체크
// ============================================

/**
 * 사용자가 플랫폼 Super Admin인지 확인
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  })
  return user?.isSuperAdmin ?? false
}

// ============================================
// 공간 멤버십 조회
// ============================================

/**
 * 사용자의 공간 멤버십 정보 조회
 */
export async function getSpaceMember(
  spaceId: string,
  userId: string | null,
  guestSessionId: string | null
): Promise<SpaceMemberInfo | null> {
  if (!userId && !guestSessionId) return null

  const member = await prisma.spaceMember.findFirst({
    where: {
      spaceId,
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(guestSessionId ? [{ guestSessionId }] : []),
      ],
    },
  })

  if (!member) return null

  // Super Admin 체크
  const superAdmin = userId ? await isSuperAdmin(userId) : false

  return {
    memberId: member.id,
    spaceId: member.spaceId,
    userId: member.userId,
    guestSessionId: member.guestSessionId,
    role: member.role,
    isSuperAdmin: superAdmin,
  }
}

/**
 * 공간 소유자 멤버십 정보 조회 (OWNER 역할)
 */
export async function getSpaceOwner(
  spaceId: string
): Promise<SpaceMemberInfo | null> {
  const member = await prisma.spaceMember.findFirst({
    where: {
      spaceId,
      role: "OWNER",
    },
  })

  if (!member) return null

  const superAdmin = member.userId ? await isSuperAdmin(member.userId) : false

  return {
    memberId: member.id,
    spaceId: member.spaceId,
    userId: member.userId,
    guestSessionId: member.guestSessionId,
    role: member.role,
    isSuperAdmin: superAdmin,
  }
}

// ============================================
// 권한 검증 미들웨어
// ============================================

/**
 * 최소 역할 요구사항 검증
 *
 * @throws {ForbiddenError} 권한 부족 시
 * @throws {NotFoundError} 공간/멤버십 없음 시
 */
export async function requireSpaceRole(
  spaceId: string,
  minRole: SpaceRole
): Promise<SpaceAuthResult> {
  // 1. 세션 확인
  const session = await auth()
  const userId = session?.user?.id

  // 2. 공간 존재 확인
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { id: true, name: true, ownerId: true },
  })

  if (!space) {
    throw new NotFoundError("공간을 찾을 수 없습니다")
  }

  // 3. Super Admin은 항상 OWNER 권한
  if (userId && (await isSuperAdmin(userId))) {
    return {
      member: {
        memberId: "super-admin",
        spaceId,
        userId,
        guestSessionId: null,
        role: "OWNER",
        isSuperAdmin: true,
      },
      space,
    }
  }

  // 4. 멤버십 확인
  if (!userId) {
    throw new ForbiddenError("로그인이 필요합니다")
  }

  const member = await getSpaceMember(spaceId, userId, null)

  if (!member) {
    throw new ForbiddenError("이 공간의 멤버가 아닙니다")
  }

  // 5. 역할 검증
  if (!hasMinRole(member.role, minRole)) {
    throw new ForbiddenError("권한이 부족합니다")
  }

  return { member, space }
}

/**
 * 대상 멤버에 대한 관리 권한 검증
 *
 * @throws {ForbiddenError} 권한 부족 시
 */
export async function requireManagePermission(
  spaceId: string,
  targetMemberId: string
): Promise<{
  actor: SpaceMemberInfo
  target: SpaceMemberInfo
  space: { id: string; name: string; ownerId: string }
}> {
  // 1. 행위자 권한 확인 (최소 STAFF)
  const { member: actor, space } = await requireSpaceRole(spaceId, "STAFF")

  // 2. 대상 멤버 조회
  const targetMember = await prisma.spaceMember.findUnique({
    where: { id: targetMemberId },
  })

  if (!targetMember || targetMember.spaceId !== spaceId) {
    throw new NotFoundError("대상 멤버를 찾을 수 없습니다")
  }

  // 3. 자기 자신 체크
  if (actor.memberId === targetMemberId) {
    throw new ForbiddenError("자기 자신에게는 적용할 수 없습니다")
  }

  // 4. 역할 계층 검증 (Super Admin은 모든 사용자 관리 가능)
  if (!actor.isSuperAdmin && !canManage(actor.role, targetMember.role)) {
    throw new ForbiddenError("상위 역할의 멤버는 관리할 수 없습니다")
  }

  const targetSuperAdmin = targetMember.userId
    ? await isSuperAdmin(targetMember.userId)
    : false

  return {
    actor,
    target: {
      memberId: targetMember.id,
      spaceId: targetMember.spaceId,
      userId: targetMember.userId,
      guestSessionId: targetMember.guestSessionId,
      role: targetMember.role,
      isSuperAdmin: targetSuperAdmin,
    },
    space,
  }
}

// ============================================
// 멤버십 관리 함수
// ============================================

/**
 * 공간에 멤버 추가 (또는 기존 멤버 역할 업데이트)
 */
export async function addOrUpdateSpaceMember(
  spaceId: string,
  userId: string | null,
  guestSessionId: string | null,
  role: SpaceRole
): Promise<SpaceMemberInfo> {
  if (!userId && !guestSessionId) {
    throw new Error("userId 또는 guestSessionId가 필요합니다")
  }

  const member = await prisma.spaceMember.upsert({
    where: userId
      ? { spaceId_userId: { spaceId, userId } }
      : { spaceId_guestSessionId: { spaceId, guestSessionId: guestSessionId! } },
    update: { role },
    create: {
      spaceId,
      userId,
      guestSessionId,
      role,
    },
  })

  const superAdmin = userId ? await isSuperAdmin(userId) : false

  return {
    memberId: member.id,
    spaceId: member.spaceId,
    userId: member.userId,
    guestSessionId: member.guestSessionId,
    role: member.role,
    isSuperAdmin: superAdmin,
  }
}

/**
 * 공간 생성 시 소유자 자동 지정
 */
export async function createSpaceOwner(
  spaceId: string,
  userId: string
): Promise<SpaceMemberInfo> {
  return addOrUpdateSpaceMember(spaceId, userId, null, "OWNER")
}

/**
 * 공간 입장 시 참가자 자동 지정
 */
export async function ensureSpaceParticipant(
  spaceId: string,
  userId: string | null,
  guestSessionId: string | null
): Promise<SpaceMemberInfo> {
  if (!userId && !guestSessionId) {
    throw new Error("userId 또는 guestSessionId가 필요합니다")
  }

  // 이미 멤버인 경우 기존 정보 반환
  const existing = await getSpaceMember(spaceId, userId, guestSessionId)
  if (existing) return existing

  // 새 참가자로 추가
  return addOrUpdateSpaceMember(spaceId, userId, guestSessionId, "PARTICIPANT")
}
