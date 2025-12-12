/**
 * Space Members API Routes
 *
 * GET /api/spaces/[id]/members - 공간 멤버 목록 조회
 * POST /api/spaces/[id]/members - 스태프 추가
 * DELETE /api/spaces/[id]/members - 스태프 제거
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SpaceRole } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"
const DEV_TEST_USER_ID = "test-user-dev-001"

// ============================================
// Types
// ============================================
interface RouteParams {
  params: Promise<{ id: string }>
}

interface AddMemberBody {
  userId: string
  role: SpaceRole
}

interface RemoveMemberBody {
  userId: string
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
    console.warn("[Members API] Using dev test user - not for production!")
    return DEV_TEST_USER_ID
  }

  return null
}

async function isSpaceOwner(spaceId: string, userId: string): Promise<boolean> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId, deletedAt: null },
    select: { ownerId: true },
  })
  return space?.ownerId === userId
}

// ============================================
// GET /api/spaces/[id]/members - 멤버 목록 조회
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

    // 인증 확인
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // OWNER 권한 확인
    const isOwner = await isSpaceOwner(spaceId, userId)
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 멤버 목록 조회 (STAFF만)
    const members = await prisma.spaceMember.findMany({
      where: {
        spaceId,
        role: SpaceRole.STAFF,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error("[Members API] Failed to fetch members:", error)
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/spaces/[id]/members - 스태프 추가
// ============================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    // ID 형식 검증
    if (!spaceId || spaceId.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 인증 확인
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // OWNER 권한 확인
    const isOwner = await isSpaceOwner(spaceId, userId)
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Request body 파싱
    const body: AddMemberBody = await request.json()

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // 자기 자신을 스태프로 추가하는 것 방지
    if (body.userId === userId) {
      return NextResponse.json(
        { error: "Cannot add yourself as staff" },
        { status: 400 }
      )
    }

    // 대상 사용자 존재 확인
    const targetUser = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, name: true, email: true, image: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // 이미 멤버인지 확인
    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: body.userId,
        },
      },
    })

    if (existingMember) {
      // 이미 존재하면 역할 업데이트
      const updated = await prisma.spaceMember.update({
        where: { id: existingMember.id },
        data: { role: SpaceRole.STAFF },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      return NextResponse.json({
        member: {
          id: updated.id,
          userId: updated.userId,
          role: updated.role,
          user: updated.user,
          createdAt: updated.createdAt,
        },
      })
    }

    // 새 멤버 추가
    const member = await prisma.spaceMember.create({
      data: {
        spaceId,
        userId: body.userId,
        role: SpaceRole.STAFF,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (IS_DEV) {
      console.log("[Members API] Staff added:", body.userId, "to space:", spaceId)
    }

    return NextResponse.json({
      member: {
        id: member.id,
        userId: member.userId,
        role: member.role,
        user: member.user,
        createdAt: member.createdAt,
      },
    })
  } catch (error) {
    console.error("[Members API] Failed to add staff:", error)
    return NextResponse.json(
      { error: "Failed to add staff" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/spaces/[id]/members - 스태프 제거
// ============================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    // ID 형식 검증
    if (!spaceId || spaceId.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 인증 확인
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // OWNER 권한 확인
    const isOwner = await isSpaceOwner(spaceId, userId)
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Request body 파싱
    const body: RemoveMemberBody = await request.json()

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // 멤버 삭제 (또는 역할을 PARTICIPANT로 변경)
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: body.userId,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    // 스태프 역할 제거 (멤버십은 유지하고 역할만 PARTICIPANT로)
    await prisma.spaceMember.update({
      where: { id: member.id },
      data: { role: SpaceRole.PARTICIPANT },
    })

    if (IS_DEV) {
      console.log("[Members API] Staff removed:", body.userId, "from space:", spaceId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Members API] Failed to remove staff:", error)
    return NextResponse.json(
      { error: "Failed to remove staff" },
      { status: 500 }
    )
  }
}
