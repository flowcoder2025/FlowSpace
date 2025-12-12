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
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // 2. 공간 데이터 변환
    const spaces = memberships.map((membership) => ({
      id: membership.space.id,
      name: membership.space.name,
      template: membership.space.template.name,
      status: membership.space.status,
      role: membership.role,
      inviteCode: membership.space.inviteCode,
      members: membership.space._count.members,
      owner: {
        id: membership.space.owner.id,
        name: membership.space.owner.name,
        image: membership.space.owner.image,
      },
      isOwner: membership.space.owner.id === userId,
      joinedAt: membership.createdAt.toISOString(),
      createdAt: membership.space.createdAt.toISOString(),
    }))

    return NextResponse.json({ spaces })
  } catch (error) {
    console.error("Error fetching my spaces:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
