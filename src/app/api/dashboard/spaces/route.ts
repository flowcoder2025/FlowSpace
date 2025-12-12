/**
 * Dashboard Spaces API
 *
 * GET /api/dashboard/spaces
 * Returns spaces where user is OWNER or STAFF (for dashboard management)
 *
 * 🔒 인증된 사용자만 접근 가능
 *
 * Response:
 * - spaces: Array of managed spaces with stats
 * - role information for each space
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

    // 1. 본인이 OWNER 또는 STAFF인 SpaceMember 조회
    const memberships = await prisma.spaceMember.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "STAFF"] },
        space: { deletedAt: null },
      },
      include: {
        space: {
          include: {
            template: { select: { name: true } },
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
    })

    // 2. Space 소유자(ownerId)로도 조회 (SpaceMember가 없어도 소유자인 경우)
    const ownedSpaces = await prisma.space.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
      include: {
        template: { select: { name: true } },
        _count: {
          select: {
            members: true,
            guestSessions: true,
            eventLogs: true,
          },
        },
      },
    })

    // 3. 중복 제거 후 병합
    const spaceMap = new Map<string, {
      id: string
      name: string
      template: string
      status: string
      role: "OWNER" | "STAFF"
      members: number
      visitors: number
      events: number
      inviteCode: string
      createdAt: string
    }>()

    // 소유한 공간 먼저 추가 (OWNER 역할)
    for (const space of ownedSpaces) {
      spaceMap.set(space.id, {
        id: space.id,
        name: space.name,
        template: space.template.name,
        status: space.status,
        role: "OWNER",
        members: space._count.members,
        visitors: space._count.guestSessions,
        events: space._count.eventLogs,
        inviteCode: space.inviteCode,
        createdAt: space.createdAt.toISOString(),
      })
    }

    // SpaceMember 기반 추가 (이미 있으면 role만 업데이트 가능)
    for (const membership of memberships) {
      const space = membership.space
      if (!spaceMap.has(space.id)) {
        spaceMap.set(space.id, {
          id: space.id,
          name: space.name,
          template: space.template.name,
          status: space.status,
          role: membership.role as "OWNER" | "STAFF",
          members: space._count.members,
          visitors: space._count.guestSessions,
          events: space._count.eventLogs,
          inviteCode: space.inviteCode,
          createdAt: space.createdAt.toISOString(),
        })
      }
    }

    // 4. 배열로 변환 및 정렬 (최신순)
    const spaces = Array.from(spaceMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ spaces })
  } catch (error) {
    console.error("Error fetching dashboard spaces:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
