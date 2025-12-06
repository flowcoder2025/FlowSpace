/**
 * Admin Spaces List API
 *
 * GET /api/admin/spaces
 * Returns user's spaces with statistics
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

    // Get user's spaces with template info
    const spaces = await prisma.space.findMany({
      where: { ownerId: userId, deletedAt: null },
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
