/**
 * Space Detail API Routes
 *
 * GET /api/spaces/[id] - 공간 상세 조회
 * PATCH /api/spaces/[id] - 공간 수정
 * DELETE /api/spaces/[id] - 공간 삭제 (soft delete)
 */

import { NextRequest, NextResponse } from "next/server"
// import { auth } from "@/lib/auth" // TODO: 인증 구현 후 활성화
import { prisma } from "@/lib/prisma"
import { SpaceAccessType, SpaceStatus } from "@prisma/client"

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
// GET /api/spaces/[id] - 공간 상세 조회
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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
    // TODO: 인증 구현 후 실제 사용자 ID 사용
    // const session = await auth()
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }
    // const userId = session.user.id

    // 임시: 테스트용 사용자 ID (실제 구현 시 제거)
    const userId = "test-user-dev-001"

    const { id } = await params
    const body: UpdateSpaceBody = await request.json()

    const space = await prisma.space.findUnique({
      where: { id, deletedAt: null },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 소유자만 수정 가능
    if (space.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
    // TODO: 인증 구현 후 실제 사용자 ID 사용
    // const session = await auth()
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }
    // const userId = session.user.id

    // 임시: 테스트용 사용자 ID (실제 구현 시 제거)
    const userId = "test-user-dev-001"

    const { id } = await params

    const space = await prisma.space.findUnique({
      where: { id, deletedAt: null },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 소유자만 삭제 가능
    if (space.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Soft delete
    await prisma.space.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: SpaceStatus.ARCHIVED,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete space:", error)
    return NextResponse.json(
      { error: "Failed to delete space" },
      { status: 500 }
    )
  }
}
