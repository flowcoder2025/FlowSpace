/**
 * My Spaces API
 *
 * GET /api/my-spaces
 * Returns all spaces where user has membership (any role)
 *
 * 🔒 인증된 사용자만 접근 가능
 *
 * Response:
 * - spaces: Array of spaces with user's role
 * - OWNER/STAFF 역할: visitors, events 통계 포함 (SSOT)
 *
 * ⚠️ SSOT: 방문자 계산 = guestSessions + SpaceEventLog(ENTER) unique userId
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // 1. SpaceMember를 통해 참여 중인 모든 공간 조회
    const memberships = await prisma.spaceMember.findMany({
      where: {
        userId,
        space: { deletedAt: null },
      },
      include: {
        space: {
          include: {
            template: { select: { name: true } },
            owner: { select: { id: true, name: true, image: true } },
            _count: {
              select: {
                members: true,
                guestSessions: true,
                eventLogs: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // 2. OWNER/STAFF 역할 공간에 대해 인증 사용자 방문 수 조회 (SSOT)
    const managedSpaceIds = memberships
      .filter((m) => m.role === "OWNER" || m.role === "STAFF")
      .map((m) => m.space.id)

    const authVisitorMap = new Map<string, number>()

    if (managedSpaceIds.length > 0) {
      // 공간별 unique userId 수 조회
      const authVisitorGroups = await prisma.spaceEventLog.groupBy({
        by: ["spaceId", "userId"],
        where: {
          spaceId: { in: managedSpaceIds },
          eventType: "ENTER",
          userId: { not: null },
        },
      })

      // 공간별 unique 인증 사용자 수 맵 생성
      authVisitorGroups.forEach((item) => {
        const current = authVisitorMap.get(item.spaceId) || 0
        authVisitorMap.set(item.spaceId, current + 1)
      })
    }

    // 3. 공간 데이터 변환
    const spaces = memberships.map((membership) => {
      const isManager = membership.role === "OWNER" || membership.role === "STAFF"
      const guestCount = membership.space._count.guestSessions
      const authCount = authVisitorMap.get(membership.space.id) || 0

      return {
        id: membership.space.id,
        name: membership.space.name,
        template: membership.space.template.name,
        status: membership.space.status,
        role: membership.role,
        inviteCode: membership.space.inviteCode,
        members: membership.space._count.members,
        // OWNER/STAFF만 통계 포함 (SSOT)
        ...(isManager && {
          visitors: guestCount + authCount,
          events: membership.space._count.eventLogs,
        }),
        owner: {
          id: membership.space.owner.id,
          name: membership.space.owner.name,
          image: membership.space.owner.image,
        },
        isOwner: membership.space.owner.id === userId,
        joinedAt: membership.createdAt.toISOString(),
        createdAt: membership.space.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ spaces })
  } catch (error) {
    console.error("Error fetching my spaces:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
