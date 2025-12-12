/**
 * Space Detail API Routes
 *
 * GET /api/spaces/[id] - 공간 상세 조회
 * PATCH /api/spaces/[id] - 공간 수정
 * DELETE /api/spaces/[id] - 공간 삭제 (soft delete)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SpaceAccessType, SpaceStatus } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"

// 개발환경 테스트용 사용자 ID (seed.ts의 TEST_USER_ID와 동일)
const DEV_TEST_USER_ID = "test-user-dev-001"

// ============================================
// Types
// ============================================
interface UpdateSpaceBody {
  name?: string
  description?: string
  accessType?: SpaceAccessType
  accessSecret?: string
  logoUrl?: string
  primaryColor?: string
  loadingMessage?: string
  status?: SpaceStatus
  maxUsers?: number
}

interface RouteParams {
  params: Promise<{ id: string }>
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
    console.warn("[Spaces API] Using dev test user - not for production!")
    return DEV_TEST_USER_ID
  }

  return null
}

/**
 * SuperAdmin 여부 확인
 */
async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  })
  return user?.isSuperAdmin || false
}

// ============================================
// GET /api/spaces/[id] - 공간 상세 조회
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // ID 형식 검증
    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    const space = await prisma.space.findUnique({
      where: { id, deletedAt: null },
      include: {
        template: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            eventLogs: true,
            guestSessions: true,
          },
        },
      },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    return NextResponse.json(space)
  } catch (error) {
    console.error("Failed to fetch space:", error)
    return NextResponse.json(
      { error: "Failed to fetch space" },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/spaces/[id] - 공간 수정
// ============================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. 인증 확인
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // 2. ID 형식 검증
    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 3. Request body 파싱
    const body: UpdateSpaceBody = await request.json()

    // 4. 입력값 검증
    if (body.name !== undefined && (body.name.length === 0 || body.name.length > 100)) {
      return NextResponse.json(
        { error: "Name must be 1-100 characters" },
        { status: 400 }
      )
    }

    if (body.description !== undefined && body.description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      )
    }

    if (body.maxUsers !== undefined && (body.maxUsers < 1 || body.maxUsers > 1000)) {
      return NextResponse.json(
        { error: "Max users must be between 1 and 1000" },
        { status: 400 }
      )
    }

    // 5. 공간 조회
    const space = await prisma.space.findUnique({
      where: { id, deletedAt: null },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 6. 소유자 또는 SuperAdmin 권한 확인
    const isSuperAdmin = await checkIsSuperAdmin(userId)
    if (space.ownerId !== userId && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 7. 공간 업데이트
    const updatedSpace = await prisma.space.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.accessType && { accessType: body.accessType }),
        ...(body.accessSecret !== undefined && { accessSecret: body.accessSecret }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
        ...(body.loadingMessage !== undefined && { loadingMessage: body.loadingMessage }),
        ...(body.status && { status: body.status }),
        ...(body.maxUsers && { maxUsers: body.maxUsers }),
      },
      include: {
        template: true,
      },
    })

    if (IS_DEV) {
      console.log("[Spaces API] Space updated:", id, "by", userId)
    }

    return NextResponse.json(updatedSpace)
  } catch (error) {
    console.error("Failed to update space:", error)
    return NextResponse.json(
      { error: "Failed to update space" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/spaces/[id] - 공간 삭제 (soft delete)
// ============================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. 인증 확인
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // 2. ID 형식 검증
    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 3. 공간 조회
    const space = await prisma.space.findUnique({
      where: { id, deletedAt: null },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 4. 소유자 또는 SuperAdmin 권한 확인
    const isSuperAdmin = await checkIsSuperAdmin(userId)
    if (space.ownerId !== userId && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 5. Soft delete
    await prisma.space.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: SpaceStatus.ARCHIVED,
      },
    })

    if (IS_DEV) {
      console.log("[Spaces API] Space deleted:", id, "by", userId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete space:", error)
    return NextResponse.json(
      { error: "Failed to delete space" },
      { status: 500 }
    )
  }
}
