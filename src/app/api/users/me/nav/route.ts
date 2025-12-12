/**
 * User Navigation Info API
 *
 * GET /api/users/me/nav
 * Returns navigation-related role info for current user
 *
 * Response:
 * - isSuperAdmin: boolean (can see /admin)
 * - hasManageableSpaces: boolean (can see /dashboard)
 * - hasAnySpaces: boolean (can see /my-spaces)
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

    // 병렬로 역할 정보 조회
    const [user, manageableMembership, anyMembership] = await Promise.all([
      // SuperAdmin 확인
      prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true },
      }),

      // OWNER 또는 STAFF 역할이 있는지 확인
      prisma.spaceMember.findFirst({
        where: {
          userId,
          role: { in: ["OWNER", "STAFF"] },
          space: { deletedAt: null },
        },
      }),

      // 참여 중인 공간이 있는지 확인
      prisma.spaceMember.findFirst({
        where: {
          userId,
          space: { deletedAt: null },
        },
      }),
    ])

    // 소유한 공간이 있는지도 확인
    const ownedSpace = await prisma.space.findFirst({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
    })

    return NextResponse.json({
      isSuperAdmin: user?.isSuperAdmin ?? false,
      hasManageableSpaces: !!manageableMembership || !!ownedSpace,
      hasAnySpaces: !!anyMembership,
    })
  } catch (error) {
    console.error("Error fetching user nav info:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
