/**
 * Space Invite API Route
 *
 * GET /api/spaces/invite/[code] - 초대 코드로 공간 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceAccessType } from "@prisma/client"

interface RouteParams {
  params: Promise<{ code: string }>
}

// ============================================
// GET /api/spaces/invite/[code] - 초대 코드로 공간 조회
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params

    const space = await prisma.space.findUnique({
      where: {
        inviteCode: code,
        deletedAt: null,
      },
      include: {
        template: {
          select: {
            id: true,
            key: true,
            name: true,
            previewUrl: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            guestSessions: {
              where: {
                expiresAt: { gt: new Date() },
              },
            },
          },
        },
      },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 접근 정책에 따른 응답 조정
    const response = {
      id: space.id,
      name: space.name,
      description: space.description,
      template: space.template,
      owner: space.owner,
      accessType: space.accessType,
      requiresPassword: space.accessType === SpaceAccessType.PASSWORD,
      logoUrl: space.logoUrl,
      primaryColor: space.primaryColor,
      loadingMessage: space.loadingMessage,
      maxUsers: space.maxUsers,
      currentUsers: space._count.guestSessions,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Failed to fetch space by invite code:", error)
    return NextResponse.json(
      { error: "Failed to fetch space" },
      { status: 500 }
    )
  }
}
