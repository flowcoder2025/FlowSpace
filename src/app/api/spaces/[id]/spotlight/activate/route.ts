/**
 * Spotlight Activate API
 *
 * 스포트라이트 활성화/비활성화
 * - POST: 본인의 스포트라이트 활성화
 * - DELETE: 본인의 스포트라이트 비활성화
 *
 * @see /docs/roadmap/SPATIAL-COMMUNICATION.md
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/spaces/[id]/spotlight/activate - 스포트라이트 활성화
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params
    const session = await auth()

    // 인증 확인
    if (!session?.user?.id) {
      // 게스트 세션 확인
      const body = await request.json().catch(() => ({}))
      const { guestSessionToken } = body

      if (!guestSessionToken) {
        return NextResponse.json(
          { error: "인증이 필요합니다." },
          { status: 401 }
        )
      }

      // 게스트 세션으로 권한 확인
      const guestSession = await prisma.guestSession.findUnique({
        where: { sessionToken: guestSessionToken },
      })

      if (!guestSession || guestSession.spaceId !== spaceId) {
        return NextResponse.json(
          { error: "유효하지 않은 게스트 세션입니다." },
          { status: 401 }
        )
      }

      // 게스트의 스포트라이트 권한 확인
      const grant = await prisma.spotlightGrant.findFirst({
        where: {
          spaceId,
          guestSessionId: guestSession.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      })

      if (!grant) {
        return NextResponse.json(
          { error: "스포트라이트 권한이 없습니다." },
          { status: 403 }
        )
      }

      // 활성화
      await prisma.spotlightGrant.update({
        where: { id: grant.id },
        data: { isActive: true },
      })

      return NextResponse.json({
        success: true,
        grantId: grant.id,
        isActive: true,
      })
    }

    // 인증된 사용자의 권한 확인
    const grant = await prisma.spotlightGrant.findFirst({
      where: {
        spaceId,
        userId: session.user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    })

    if (!grant) {
      return NextResponse.json(
        { error: "스포트라이트 권한이 없습니다." },
        { status: 403 }
      )
    }

    // 활성화
    await prisma.spotlightGrant.update({
      where: { id: grant.id },
      data: { isActive: true },
    })

    return NextResponse.json({
      success: true,
      grantId: grant.id,
      isActive: true,
    })
  } catch (error) {
    console.error("[Spotlight Activate API] POST error:", error)
    return NextResponse.json(
      { error: "스포트라이트 활성화에 실패했습니다." },
      { status: 500 }
    )
  }
}

// DELETE /api/spaces/[id]/spotlight/activate - 스포트라이트 비활성화
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params
    const session = await auth()

    // 인증 확인
    if (!session?.user?.id) {
      // 게스트 세션 확인 (쿼리 파라미터로)
      const { searchParams } = new URL(request.url)
      const guestSessionToken = searchParams.get("guestSessionToken")

      if (!guestSessionToken) {
        return NextResponse.json(
          { error: "인증이 필요합니다." },
          { status: 401 }
        )
      }

      const guestSession = await prisma.guestSession.findUnique({
        where: { sessionToken: guestSessionToken },
      })

      if (!guestSession || guestSession.spaceId !== spaceId) {
        return NextResponse.json(
          { error: "유효하지 않은 게스트 세션입니다." },
          { status: 401 }
        )
      }

      // 비활성화
      await prisma.spotlightGrant.updateMany({
        where: {
          spaceId,
          guestSessionId: guestSession.id,
        },
        data: { isActive: false },
      })

      return NextResponse.json({
        success: true,
        isActive: false,
      })
    }

    // 인증된 사용자의 권한 비활성화
    await prisma.spotlightGrant.updateMany({
      where: {
        spaceId,
        userId: session.user.id,
      },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      isActive: false,
    })
  } catch (error) {
    console.error("[Spotlight Activate API] DELETE error:", error)
    return NextResponse.json(
      { error: "스포트라이트 비활성화에 실패했습니다." },
      { status: 500 }
    )
  }
}
