/**
 * Admin Spaces List API
 *
 * GET /api/admin/spaces
 * Returns all spaces with statistics (SuperAdmin only)
 *
 * 🔒 SuperAdmin 전용 API (Phase 2)
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

    // Transform spaces
    const transformedSpaces = spaces.map((space) => ({
      id: space.id,
      name: space.name,
      template: space.template.name,
      status: space.status,
      visitors: space._count.guestSessions,
      events: space._count.eventLogs,
      inviteCode: space.inviteCode,
      createdAt: space.createdAt.toISOString(),
      createdAtFormatted: space.createdAt.toLocaleDateString("ko-KR"),
    }))

    return NextResponse.json({ spaces: transformedSpaces })
  } catch (error) {
    console.error("Error fetching admin spaces:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
