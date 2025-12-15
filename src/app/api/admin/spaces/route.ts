/**
 * Admin Spaces List API
 *
 * GET /api/admin/spaces
 * Returns all spaces with statistics (SuperAdmin only)
 *
 * 🔒 SuperAdmin 전용 API (Phase 2)
 *
 * ⚠️ SSOT: 방문자 계산은 dashboard/spaces와 동일한 로직 사용
 * - 게스트: GuestSession count
 * - 인증 사용자: SpaceEventLog에서 unique userId count
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // 🔒 SuperAdmin 권한 확인
    const isAdmin = await isSuperAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: SuperAdmin only" }, { status: 403 })
    }

    // 🔓 SuperAdmin은 모든 공간을 볼 수 있음
    const spaces = await prisma.space.findMany({
      where: { deletedAt: null },
      include: {
        template: {
          select: { name: true },
        },
        _count: {
          select: {
            guestSessions: true,
            eventLogs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // 📊 SSOT: 인증 사용자 방문 수 조회 (공간별 unique userId)
    const spaceIds = spaces.map((s) => s.id)

    const authVisitorGroups = await prisma.spaceEventLog.groupBy({
      by: ["spaceId", "userId"],
      where: {
        spaceId: { in: spaceIds },
        eventType: "ENTER",
        userId: { not: null },
      },
    })

    // 공간별 unique 인증 사용자 수 맵
    const authVisitorMap = new Map<string, number>()
    authVisitorGroups.forEach((item) => {
      const current = authVisitorMap.get(item.spaceId) || 0
      authVisitorMap.set(item.spaceId, current + 1)
    })

    // Transform spaces with combined visitor count
    const transformedSpaces = spaces.map((space) => {
      const guestCount = space._count.guestSessions
      const authCount = authVisitorMap.get(space.id) || 0
      return {
        id: space.id,
        name: space.name,
        template: space.template.name,
        status: space.status,
        visitors: guestCount + authCount, // 📊 SSOT: 게스트 + 인증 사용자 합산
        events: space._count.eventLogs,
        inviteCode: space.inviteCode,
        createdAt: space.createdAt.toISOString(),
        createdAtFormatted: space.createdAt.toLocaleDateString("ko-KR"),
      }
    })

    return NextResponse.json({ spaces: transformedSpaces })
  } catch (error) {
    console.error("Error fetching admin spaces:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
