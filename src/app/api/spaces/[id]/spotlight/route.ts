/**
 * Spotlight API Routes
 *
 * 스포트라이트 권한 관리 API
 * - GET: 현재 공간의 스포트라이트 권한 목록
 * - POST: 스포트라이트 권한 부여 (OWNER/STAFF만)
 * - DELETE: 스포트라이트 권한 취소 (OWNER/STAFF만)
 *
 * @see /docs/roadmap/SPATIAL-COMMUNICATION.md
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageSpace } from "@/lib/space-auth"
import {
  getUserIdFromSession,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/api-helpers"

// GET /api/spaces/[id]/spotlight - 스포트라이트 권한 목록
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params

    // 스포트라이트 권한 목록 조회
    const grants = await prisma.spotlightGrant.findMany({
      where: { spaceId },
      orderBy: { grantedAt: "desc" },
    })

    // userId/guestSessionId로 사용자 정보 조회
    const userIds = grants.filter((g) => g.userId).map((g) => g.userId!)
    const guestIds = grants.filter((g) => g.guestSessionId).map((g) => g.guestSessionId!)

    const [users, guests] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      guestIds.length > 0
        ? prisma.guestSession.findMany({
            where: { id: { in: guestIds } },
            select: { id: true, nickname: true },
          })
        : Promise.resolve([]),
    ])

    // 사용자 정보 매핑
    const userMap = new Map(users.map((u) => [u.id, u]))
    const guestMap = new Map(guests.map((g) => [g.id, g]))

    const grantsWithInfo = grants.map((grant) => {
      let targetInfo: { id: string; name: string; type: "user" | "guest" } | null = null

      if (grant.userId) {
        const user = userMap.get(grant.userId)
        if (user) {
          targetInfo = { id: user.id, name: user.name || user.email || "Unknown", type: "user" }
        }
      } else if (grant.guestSessionId) {
        const guest = guestMap.get(grant.guestSessionId)
        if (guest) {
          targetInfo = { id: guest.id, name: guest.nickname, type: "guest" }
        }
      }

      return {
        id: grant.id,
        targetInfo,
        isActive: grant.isActive,
        grantedBy: grant.grantedBy,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
      }
    })

    return NextResponse.json({
      grants: grantsWithInfo,
      activeCount: grants.filter((g) => g.isActive).length,
    })
  } catch (error) {
    console.error("[Spotlight API] GET error:", error)
    return NextResponse.json(
      { error: "스포트라이트 권한 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    )
  }
}

// POST /api/spaces/[id]/spotlight - 스포트라이트 권한 부여
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params
    const userId = await getUserIdFromSession()

    // 인증 확인
    if (!userId) {
      return unauthorizedResponse()
    }

    // 권한 확인 (STAFF 이상) - space-auth.ts의 통합 함수 사용
    const canManage = await canManageSpace(userId, spaceId)
    if (!canManage) {
      return forbiddenResponse("스포트라이트 권한을 부여할 권한이 없습니다.")
    }

    const body = await request.json()
    const { targetUserId, targetGuestSessionId, expiresAt } = body

    // 대상 검증
    if (!targetUserId && !targetGuestSessionId) {
      return NextResponse.json(
        { error: "대상 사용자를 지정해야 합니다." },
        { status: 400 }
      )
    }

    // 기존 권한 확인 (중복 방지)
    const existingGrant = await prisma.spotlightGrant.findFirst({
      where: {
        spaceId,
        OR: [
          targetUserId ? { userId: targetUserId } : {},
          targetGuestSessionId ? { guestSessionId: targetGuestSessionId } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    })

    if (existingGrant) {
      return NextResponse.json(
        { error: "이미 스포트라이트 권한이 부여된 사용자입니다." },
        { status: 409 }
      )
    }

    // 대상 사용자 존재 확인
    if (targetUserId) {
      const user = await prisma.user.findUnique({ where: { id: targetUserId } })
      if (!user) {
        return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
      }
    } else if (targetGuestSessionId) {
      const guest = await prisma.guestSession.findUnique({ where: { id: targetGuestSessionId } })
      if (!guest) {
        return NextResponse.json({ error: "게스트 세션을 찾을 수 없습니다." }, { status: 404 })
      }
    }

    // 권한 생성
    const grant = await prisma.spotlightGrant.create({
      data: {
        spaceId,
        userId: targetUserId || null,
        guestSessionId: targetGuestSessionId || null,
        grantedBy: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({
      success: true,
      grant: {
        id: grant.id,
        isActive: grant.isActive,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
      },
    })
  } catch (error) {
    console.error("[Spotlight API] POST error:", error)
    return NextResponse.json(
      { error: "스포트라이트 권한 부여에 실패했습니다." },
      { status: 500 }
    )
  }
}

// DELETE /api/spaces/[id]/spotlight - 스포트라이트 권한 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params
    const userId = await getUserIdFromSession()

    // 인증 확인
    if (!userId) {
      return unauthorizedResponse()
    }

    // 권한 확인 (STAFF 이상) - space-auth.ts의 통합 함수 사용
    const canManage = await canManageSpace(userId, spaceId)
    if (!canManage) {
      return forbiddenResponse("스포트라이트 권한을 취소할 권한이 없습니다.")
    }

    const { searchParams } = new URL(request.url)
    const grantId = searchParams.get("grantId")
    const targetUserId = searchParams.get("targetUserId")
    const targetGuestSessionId = searchParams.get("targetGuestSessionId")

    // 삭제 대상 찾기
    let grant

    if (grantId) {
      grant = await prisma.spotlightGrant.findFirst({
        where: { id: grantId, spaceId },
      })
    } else if (targetUserId) {
      grant = await prisma.spotlightGrant.findFirst({
        where: { spaceId, userId: targetUserId },
      })
    } else if (targetGuestSessionId) {
      grant = await prisma.spotlightGrant.findFirst({
        where: { spaceId, guestSessionId: targetGuestSessionId },
      })
    } else {
      return NextResponse.json(
        { error: "삭제할 권한을 지정해야 합니다." },
        { status: 400 }
      )
    }

    if (!grant) {
      return notFoundResponse("스포트라이트 권한")
    }

    // 권한 삭제
    await prisma.spotlightGrant.delete({ where: { id: grant.id } })

    return NextResponse.json({
      success: true,
      revokedGrantId: grant.id,
    })
  } catch (error) {
    console.error("[Spotlight API] DELETE error:", error)
    return NextResponse.json(
      { error: "스포트라이트 권한 취소에 실패했습니다." },
      { status: 500 }
    )
  }
}
