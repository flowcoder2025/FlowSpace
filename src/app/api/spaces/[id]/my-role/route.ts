/**
 * Space Role API
 *
 * GET /api/spaces/[id]/my-role - 현재 사용자의 공간 역할 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceRole } from "@prisma/client"
import { isSuperAdmin } from "@/lib/space-auth"
import {
  getUserIdFromSession,
  validateId,
  invalidIdResponse,
  notFoundResponse,
} from "@/lib/api-helpers"

// ============================================
// Types
// ============================================
interface RouteParams {
  params: Promise<{ id: string }>
}

interface RoleResponse {
  role: SpaceRole
  isOwner: boolean
  isStaff: boolean
  isSuperAdmin: boolean   // 플랫폼 관리자
  canManageChat: boolean  // chat:delete, chat:mute 등
  canManageSpace: boolean // space:settings 등
  canManageMembers: boolean // members 관리 (OWNER 임명 등)
}

// ============================================
// GET /api/spaces/[id]/my-role - 현재 사용자의 역할 조회
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    // ID 형식 검증
    if (!validateId(spaceId)) {
      return invalidIdResponse("space ID")
    }

    // 사용자 ID 확인 (로그인 필수, 개발환경 폴백 허용)
    const userId = await getUserIdFromSession(true)

    // 🎫 게스트는 항상 PARTICIPANT
    if (!userId) {
      const guestResponse: RoleResponse = {
        role: SpaceRole.PARTICIPANT,
        isOwner: false,
        isStaff: false,
        isSuperAdmin: false,
        canManageChat: false,
        canManageSpace: false,
        canManageMembers: false,
      }
      return NextResponse.json(guestResponse)
    }

    // 🌟 SuperAdmin 체크
    const userIsSuperAdmin = await isSuperAdmin(userId)

    // 공간 조회 (owner 확인용)
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: { ownerId: true },
    })

    if (!space) {
      return notFoundResponse("Space")
    }

    // 🛡️ SpaceMember에서 역할 확인
    const membership = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
      select: { role: true },
    })

    // 🔐 Owner 체크 (DB ownerId 또는 SpaceMember OWNER)
    const isOwner = space.ownerId === userId || membership?.role === SpaceRole.OWNER

    if (userIsSuperAdmin) {
      // SuperAdmin은 모든 권한
      const superAdminResponse: RoleResponse = {
        role: isOwner ? SpaceRole.OWNER : (membership?.role || SpaceRole.PARTICIPANT),
        isOwner,
        isStaff: membership?.role === SpaceRole.STAFF,
        isSuperAdmin: true,
        canManageChat: true,
        canManageSpace: true,
        canManageMembers: true, // SuperAdmin은 OWNER 임명 가능
      }
      return NextResponse.json(superAdminResponse)
    }

    if (isOwner) {
      const ownerResponse: RoleResponse = {
        role: SpaceRole.OWNER,
        isOwner: true,
        isStaff: false,
        isSuperAdmin: false,
        canManageChat: true,
        canManageSpace: true,
        canManageMembers: true, // OWNER는 STAFF 관리 가능
      }
      return NextResponse.json(ownerResponse)
    }

    if (membership?.role === SpaceRole.STAFF) {
      const staffResponse: RoleResponse = {
        role: SpaceRole.STAFF,
        isOwner: false,
        isStaff: true,
        isSuperAdmin: false,
        canManageChat: true,  // STAFF는 채팅 관리 가능
        canManageSpace: false, // STAFF는 공간 설정 불가
        canManageMembers: false, // STAFF는 멤버 관리 불가
      }
      return NextResponse.json(staffResponse)
    }

    // 📋 기본: PARTICIPANT
    const participantResponse: RoleResponse = {
      role: SpaceRole.PARTICIPANT,
      isOwner: false,
      isStaff: false,
      isSuperAdmin: false,
      canManageChat: false,
      canManageSpace: false,
      canManageMembers: false,
    }
    return NextResponse.json(participantResponse)

  } catch (error) {
    console.error("[My Role API] Failed to get role:", error)
    return NextResponse.json(
      { error: "Failed to get role" },
      { status: 500 }
    )
  }
}
