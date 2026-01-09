/**
 * Party Zone Individual API Routes
 *
 * 개별 파티 존 관리 API
 * - GET: 특정 존 조회
 * - PUT: 존 수정 (OWNER/STAFF만)
 * - DELETE: 존 삭제 (OWNER/STAFF만)
 *
 * @see /docs/roadmap/SPATIAL-COMMUNICATION.md
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SpaceRole } from "@prisma/client"
import { isSuperAdmin } from "@/lib/space-auth"

// ============================================
// Types
// ============================================
interface UpdateZoneBody {
  name?: string
  bounds?: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
}

// ============================================
// Helper Functions
// ============================================
async function getUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

async function canManageZones(spaceId: string, userId: string): Promise<boolean> {
  // 1. SuperAdmin은 모든 공간의 존 관리 가능
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

  // 3. SpaceMember에서 OWNER 또는 STAFF 역할 확인
  const membership = await prisma.spaceMember.findFirst({
    where: {
      spaceId,
      userId,
      role: { in: [SpaceRole.OWNER, SpaceRole.STAFF] },
    },
  })
  return !!membership
}

// ============================================
// GET /api/spaces/[id]/zones/[zoneId] - 특정 존 조회
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> }
) {
  try {
    const { id: spaceId, zoneId } = await params

    const zone = await prisma.partyZone.findFirst({
      where: { id: zoneId, spaceId },
    })

    if (!zone) {
      return NextResponse.json(
        { error: "파티 존을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      zone: {
        id: zone.id,
        name: zone.name,
        bounds: {
          x1: zone.boundsX1,
          y1: zone.boundsY1,
          x2: zone.boundsX2,
          y2: zone.boundsY2,
        },
        createdBy: zone.createdBy,
        createdByType: zone.createdByType,
        createdAt: zone.createdAt,
      },
    })
  } catch (error) {
    console.error("[Zones API] GET [zoneId] error:", error)
    return NextResponse.json(
      { error: "파티 존을 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// ============================================
// PUT /api/spaces/[id]/zones/[zoneId] - 존 수정
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> }
) {
  try {
    const { id: spaceId, zoneId } = await params
    const userId = await getUserId()

    // 인증 확인
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    // 권한 확인 (STAFF 이상)
    const canManage = await canManageZones(spaceId, userId)
    if (!canManage) {
      return NextResponse.json(
        { error: "파티 존을 수정할 권한이 없습니다." },
        { status: 403 }
      )
    }

    // 존 존재 확인
    const existingZone = await prisma.partyZone.findFirst({
      where: { id: zoneId, spaceId },
    })

    if (!existingZone) {
      return NextResponse.json(
        { error: "파티 존을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const body: UpdateZoneBody = await request.json()
    const { name, bounds } = body

    // 업데이트 데이터 준비
    const updateData: {
      name?: string
      boundsX1?: number
      boundsY1?: number
      boundsX2?: number
      boundsY2?: number
    } = {}

    if (name && name.trim()) {
      updateData.name = name.trim()
    }

    if (bounds) {
      // 좌표 정규화
      const normalizedBounds = {
        x1: Math.min(bounds.x1, bounds.x2),
        y1: Math.min(bounds.y1, bounds.y2),
        x2: Math.max(bounds.x1, bounds.x2),
        y2: Math.max(bounds.y1, bounds.y2),
      }

      // 영역 크기 검증
      if (normalizedBounds.x1 === normalizedBounds.x2 || normalizedBounds.y1 === normalizedBounds.y2) {
        return NextResponse.json(
          { error: "존 영역은 최소 1x1 크기여야 합니다." },
          { status: 400 }
        )
      }

      updateData.boundsX1 = normalizedBounds.x1
      updateData.boundsY1 = normalizedBounds.y1
      updateData.boundsX2 = normalizedBounds.x2
      updateData.boundsY2 = normalizedBounds.y2
    }

    // 업데이트
    const updatedZone = await prisma.partyZone.update({
      where: { id: zoneId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      zone: {
        id: updatedZone.id,
        name: updatedZone.name,
        bounds: {
          x1: updatedZone.boundsX1,
          y1: updatedZone.boundsY1,
          x2: updatedZone.boundsX2,
          y2: updatedZone.boundsY2,
        },
        updatedAt: updatedZone.updatedAt,
      },
    })
  } catch (error) {
    console.error("[Zones API] PUT error:", error)
    return NextResponse.json(
      { error: "파티 존 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/spaces/[id]/zones/[zoneId] - 존 삭제
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> }
) {
  try {
    const { id: spaceId, zoneId } = await params
    const userId = await getUserId()

    // 인증 확인
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    // 권한 확인 (STAFF 이상)
    const canManage = await canManageZones(spaceId, userId)
    if (!canManage) {
      return NextResponse.json(
        { error: "파티 존을 삭제할 권한이 없습니다." },
        { status: 403 }
      )
    }

    // 존 존재 확인
    const zone = await prisma.partyZone.findFirst({
      where: { id: zoneId, spaceId },
    })

    if (!zone) {
      return NextResponse.json(
        { error: "파티 존을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 삭제
    await prisma.partyZone.delete({ where: { id: zoneId } })

    return NextResponse.json({
      success: true,
      deletedZoneId: zoneId,
    })
  } catch (error) {
    console.error("[Zones API] DELETE error:", error)
    return NextResponse.json(
      { error: "파티 존 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
