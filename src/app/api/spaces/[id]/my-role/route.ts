/**
 * Space Role API
 *
 * GET /api/spaces/[id]/my-role - 현재 사용자의 공간 역할 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SpaceRole } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"

// 개발환경 테스트용 사용자 ID
const DEV_TEST_USER_ID = "test-user-dev-001"

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
  canManageChat: boolean  // chat:delete, chat:mute 등
  canManageSpace: boolean // space:settings 등
}

// ============================================
// Helper Functions
// ============================================
async function getUserId(): Promise<string | null> {
  const session = await auth()

  if (session?.user?.id) {
    return session.user.id
  }

  if (IS_DEV) {
    console.warn("[My Role API] Using dev test user - not for production!")
    return DEV_TEST_USER_ID
  }

  return null
}

// ============================================
// GET /api/spaces/[id]/my-role - 현재 사용자의 역할 조회
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    // ID 형식 검증
    if (!spaceId || spaceId.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 사용자 ID 확인 (로그인 필수)
    const userId = await getUserId()

    // 🎫 게스트는 항상 PARTICIPANT
    if (!userId) {
      const guestResponse: RoleResponse = {
        role: SpaceRole.PARTICIPANT,
        isOwner: false,
        isStaff: false,
        canManageChat: false,
        canManageSpace: false,
      }
      return NextResponse.json(guestResponse)
    }

    // 공간 조회 (owner 확인용)
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: { ownerId: true },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 🔐 Owner 체크
    if (space.ownerId === userId) {
      const ownerResponse: RoleResponse = {
        role: SpaceRole.OWNER,
        isOwner: true,
        isStaff: false,
        canManageChat: true,
        canManageSpace: true,
      }
      return NextResponse.json(ownerResponse)
    }

    // 🛡️ SpaceMember에서 STAFF 역할 확인
    const membership = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
      select: { role: true },
    })

    if (membership?.role === SpaceRole.STAFF) {
      const staffResponse: RoleResponse = {
        role: SpaceRole.STAFF,
        isOwner: false,
        isStaff: true,
        canManageChat: true,  // STAFF는 채팅 관리 가능
        canManageSpace: false, // STAFF는 공간 설정 불가
      }
      return NextResponse.json(staffResponse)
    }

    // 📋 기본: PARTICIPANT
    const participantResponse: RoleResponse = {
      role: SpaceRole.PARTICIPANT,
      isOwner: false,
      isStaff: false,
      canManageChat: false,
      canManageSpace: false,
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
