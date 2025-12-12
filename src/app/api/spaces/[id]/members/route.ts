/**
 * Space Members API Routes
 *
 * GET /api/spaces/[id]/members - 공간 멤버 목록 조회 (전체: OWNER/STAFF/PARTICIPANT)
 * POST /api/spaces/[id]/members - 멤버 추가 (OWNER: SuperAdmin만, STAFF: OWNER/SuperAdmin)
 * PATCH /api/spaces/[id]/members - 역할 변경
 * DELETE /api/spaces/[id]/members - 멤버 역할 제거
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SpaceRole } from "@prisma/client"
import { isSuperAdmin } from "@/lib/space-auth"

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

interface UpdateRoleBody {
  userId: string
  newRole: SpaceRole
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

async function canManageMembers(spaceId: string, userId: string): Promise<boolean> {
  // 1. SuperAdmin은 모든 공간의 멤버 관리 가능
  if (await isSuperAdmin(userId)) {
    return true
  }

  // 2. 공간 소유자 확인 (DB의 ownerId)
  const space = await prisma.space.findUnique({
    where: { id: spaceId, deletedAt: null },
    select: { ownerId: true },
  })
  if (space?.ownerId === userId) {
    return true
  }

  // 3. SpaceMember에서 OWNER 역할 확인 (복수 OWNER 지원)
  const ownerMembership = await prisma.spaceMember.findFirst({
    where: {
      spaceId,
      userId,
      role: SpaceRole.OWNER,
    },
  })
  return !!ownerMembership
}

async function isSpaceOwner(spaceId: string, userId: string): Promise<boolean> {
  // DB의 ownerId 확인
  const space = await prisma.space.findUnique({
    where: { id: spaceId, deletedAt: null },
    select: { ownerId: true },
  })
  if (space?.ownerId === userId) {
    return true
  }

  // SpaceMember에서 OWNER 역할 확인
  const ownerMembership = await prisma.spaceMember.findFirst({
    where: {
      spaceId,
      userId,
      role: SpaceRole.OWNER,
    },
  })
  return !!ownerMembership
}

// ============================================
// GET /api/spaces/[id]/members - 멤버 목록 조회 (전체)
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get("role") as SpaceRole | null

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

    // OWNER 또는 SuperAdmin 권한 확인
    const canManage = await canManageMembers(spaceId, userId)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 공간 정보 조회 (원본 소유자 정보 포함)
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: {
        id: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 멤버 목록 조회 (전체 또는 역할별 필터)
    const whereClause: { spaceId: string; role?: SpaceRole } = { spaceId }
    if (roleFilter && Object.values(SpaceRole).includes(roleFilter)) {
      whereClause.role = roleFilter
    }

    const members = await prisma.spaceMember.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        guestSession: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER → STAFF → PARTICIPANT
        { createdAt: "desc" },
      ],
    })

    // 원본 소유자가 SpaceMember에 없으면 추가 (호환성)
    const ownerInMembers = members.some(
      (m) => m.userId === space.ownerId && m.role === SpaceRole.OWNER
    )

    const formattedMembers = members.map((m) => ({
      id: m.id,
      spaceId: m.spaceId,
      userId: m.userId,
      guestSessionId: m.guestSessionId,
      displayName: m.displayName,
      role: m.role,
      restriction: m.restriction,
      user: m.user,
      guestSession: m.guestSession,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }))

    // 원본 소유자를 목록에 추가 (SpaceMember에 없는 경우)
    if (!ownerInMembers && space.owner) {
      formattedMembers.unshift({
        id: `owner-${space.ownerId}`,
        spaceId: space.id,
        userId: space.ownerId,
        guestSessionId: null,
        displayName: null,
        role: SpaceRole.OWNER,
        restriction: "NONE" as const,
        user: space.owner,
        guestSession: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({
      members: formattedMembers,
      totalCount: formattedMembers.length,
      byRole: {
        OWNER: formattedMembers.filter((m) => m.role === SpaceRole.OWNER).length,
        STAFF: formattedMembers.filter((m) => m.role === SpaceRole.STAFF).length,
        PARTICIPANT: formattedMembers.filter((m) => m.role === SpaceRole.PARTICIPANT).length,
      },
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
// POST /api/spaces/[id]/members - 멤버 추가
// - OWNER 임명: SuperAdmin만 가능
// - STAFF 임명: OWNER 또는 SuperAdmin 가능
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

    // Request body 파싱
    const body: AddMemberBody = await request.json()

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // 역할 기본값: STAFF
    const targetRole = body.role || SpaceRole.STAFF

    // 권한 검증
    const userIsSuperAdmin = await isSuperAdmin(userId)
    const userIsOwner = await isSpaceOwner(spaceId, userId)

    // OWNER 임명은 SuperAdmin만 가능
    if (targetRole === SpaceRole.OWNER) {
      if (!userIsSuperAdmin) {
        return NextResponse.json(
          { error: "Only SuperAdmin can appoint OWNER" },
          { status: 403 }
        )
      }
    } else {
      // STAFF/PARTICIPANT 임명은 OWNER 또는 SuperAdmin
      if (!userIsSuperAdmin && !userIsOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // 자기 자신을 스태프로 추가하는 것 방지 (SuperAdmin은 예외)
    if (body.userId === userId && !userIsSuperAdmin) {
      return NextResponse.json(
        { error: "Cannot add yourself" },
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
        data: { role: targetRole },
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
          spaceId: updated.spaceId,
          userId: updated.userId,
          displayName: updated.displayName,
          role: updated.role,
          restriction: updated.restriction,
          user: updated.user,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
        updated: true,
      })
    }

    // 새 멤버 추가
    const member = await prisma.spaceMember.create({
      data: {
        spaceId,
        userId: body.userId,
        role: targetRole,
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
      console.log(`[Members API] ${targetRole} added:`, body.userId, "to space:", spaceId)
    }

    return NextResponse.json({
      member: {
        id: member.id,
        spaceId: member.spaceId,
        userId: member.userId,
        displayName: member.displayName,
        role: member.role,
        restriction: member.restriction,
        user: member.user,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      },
      created: true,
    })
  } catch (error) {
    console.error("[Members API] Failed to add member:", error)
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/spaces/[id]/members - 역할 변경
// - OWNER로 변경: SuperAdmin만 가능
// - STAFF로 변경: OWNER 또는 SuperAdmin
// - OWNER 양도: 현재 OWNER가 다른 사용자에게 양도
// ============================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Request body 파싱
    const body: UpdateRoleBody = await request.json()

    if (!body.userId || !body.newRole) {
      return NextResponse.json(
        { error: "userId and newRole are required" },
        { status: 400 }
      )
    }

    // 유효한 역할인지 검증
    if (!Object.values(SpaceRole).includes(body.newRole)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    // 권한 검증
    const userIsSuperAdmin = await isSuperAdmin(userId)
    const userIsOwner = await isSpaceOwner(spaceId, userId)

    // OWNER로 변경은 SuperAdmin만 가능
    if (body.newRole === SpaceRole.OWNER) {
      if (!userIsSuperAdmin) {
        return NextResponse.json(
          { error: "Only SuperAdmin can assign OWNER role" },
          { status: 403 }
        )
      }
    } else {
      // STAFF/PARTICIPANT 변경은 OWNER 또는 SuperAdmin
      if (!userIsSuperAdmin && !userIsOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
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

    // 기존 멤버십 확인
    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: body.userId,
        },
      },
    })

    if (existingMember) {
      // 기존 멤버 역할 업데이트
      const updated = await prisma.spaceMember.update({
        where: { id: existingMember.id },
        data: { role: body.newRole },
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
        console.log(`[Members API] Role changed: ${body.userId} -> ${body.newRole} in space:`, spaceId)
      }

      return NextResponse.json({
        member: {
          id: updated.id,
          spaceId: updated.spaceId,
          userId: updated.userId,
          displayName: updated.displayName,
          role: updated.role,
          restriction: updated.restriction,
          user: updated.user,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      })
    }

    // 멤버십이 없으면 새로 생성
    const member = await prisma.spaceMember.create({
      data: {
        spaceId,
        userId: body.userId,
        role: body.newRole,
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
      console.log(`[Members API] New member with role ${body.newRole}:`, body.userId, "in space:", spaceId)
    }

    return NextResponse.json({
      member: {
        id: member.id,
        spaceId: member.spaceId,
        userId: member.userId,
        displayName: member.displayName,
        role: member.role,
        restriction: member.restriction,
        user: member.user,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      },
    })
  } catch (error) {
    console.error("[Members API] Failed to update role:", error)
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/spaces/[id]/members - 멤버 역할 제거
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

    // OWNER 또는 SuperAdmin 권한 확인
    const canManage = await canManageMembers(spaceId, userId)
    if (!canManage) {
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

    // 멤버 찾기
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

    // OWNER는 삭제 불가 (SuperAdmin도 불가 - 안전장치)
    if (member.role === SpaceRole.OWNER) {
      return NextResponse.json(
        { error: "Cannot remove OWNER. Use role change instead." },
        { status: 400 }
      )
    }

    // 역할 제거 (PARTICIPANT로 변경)
    await prisma.spaceMember.update({
      where: { id: member.id },
      data: { role: SpaceRole.PARTICIPANT },
    })

    if (IS_DEV) {
      console.log("[Members API] Role removed:", body.userId, "from space:", spaceId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Members API] Failed to remove role:", error)
    return NextResponse.json(
      { error: "Failed to remove role" },
      { status: 500 }
    )
  }
}
