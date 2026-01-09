/**
 * Party Zone API Routes
 *
 * 파티 존 관리 API
 * - GET: 현재 공간의 파티 존 목록
 * - POST: 파티 존 생성 (OWNER/STAFF만)
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
interface PartyZoneBounds {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface CreateZoneBody {
  name: string
  bounds: PartyZoneBounds
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
// GET /api/spaces/[id]/zones - 파티 존 목록
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params

    // 공간 존재 확인
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: { id: true },
    })

    if (!space) {
      return NextResponse.json(
        { error: "공간을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 파티 존 목록 조회
    const zones = await prisma.partyZone.findMany({
      where: { spaceId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        boundsX1: true,
        boundsY1: true,
        boundsX2: true,
        boundsY2: true,
        createdBy: true,
        createdByType: true,
        createdAt: true,
      },
    })

    // bounds 형태로 변환
    const zonesWithBounds = zones.map((zone) => ({
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
    }))

    return NextResponse.json({
      zones: zonesWithBounds,
      count: zones.length,
    })
  } catch (error) {
    console.error("[Zones API] GET error:", error)
    return NextResponse.json(
      { error: "파티 존 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/spaces/[id]/zones - 파티 존 생성
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params
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
        { error: "파티 존을 생성할 권한이 없습니다." },
        { status: 403 }
      )
    }

    const body: CreateZoneBody = await request.json()
    const { name, bounds } = body

    // 입력 검증
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "존 이름을 입력해야 합니다." },
        { status: 400 }
      )
    }

    if (!bounds || typeof bounds.x1 !== "number" || typeof bounds.y1 !== "number" ||
        typeof bounds.x2 !== "number" || typeof bounds.y2 !== "number") {
      return NextResponse.json(
        { error: "존 영역(bounds)을 올바르게 지정해야 합니다." },
        { status: 400 }
      )
    }

    // 좌표 정규화 (x1 < x2, y1 < y2)
    const normalizedBounds = {
      x1: Math.min(bounds.x1, bounds.x2),
      y1: Math.min(bounds.y1, bounds.y2),
      x2: Math.max(bounds.x1, bounds.x2),
      y2: Math.max(bounds.y1, bounds.y2),
    }

    // 영역 크기 검증 (최소 1x1)
    if (normalizedBounds.x1 === normalizedBounds.x2 || normalizedBounds.y1 === normalizedBounds.y2) {
      return NextResponse.json(
        { error: "존 영역은 최소 1x1 크기여야 합니다." },
        { status: 400 }
      )
    }

    // 파티 존 생성
    const zone = await prisma.partyZone.create({
      data: {
        spaceId,
        name: name.trim(),
        boundsX1: normalizedBounds.x1,
        boundsY1: normalizedBounds.y1,
        boundsX2: normalizedBounds.x2,
        boundsY2: normalizedBounds.y2,
        createdBy: userId,
        createdByType: "USER",
      },
    })

    return NextResponse.json({
      success: true,
      zone: {
        id: zone.id,
        name: zone.name,
        bounds: normalizedBounds,
        createdAt: zone.createdAt,
      },
    })
  } catch (error) {
    console.error("[Zones API] POST error:", error)
    return NextResponse.json(
      { error: "파티 존 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
