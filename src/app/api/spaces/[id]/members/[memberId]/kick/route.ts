/**
 * Member Kick API
 *
 * POST /api/spaces/[id]/members/[memberId]/kick - 강퇴
 *
 * Phase 6: 채팅 관리 시스템
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireManagePermission } from "@/lib/space-auth"
import { ForbiddenError, NotFoundError } from "@/lib/space-permissions"

// ============================================
// POST - 강퇴
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: spaceId, memberId } = await params
    const body = await request.json()
    const { reason, ban = false } = body

    // 1. 관리 권한 확인 (STAFF 이상)
    const { actor, target } = await requireManagePermission(spaceId, memberId)

    // 2. 멤버 상태 업데이트
    if (ban) {
      // 밴 처리: 제재 상태로 변경
      await prisma.spaceMember.update({
        where: { id: memberId },
        data: {
          restriction: "BANNED",
          restrictedBy: actor.userId,
          restrictedReason: reason,
        },
      })
    } else {
      // 단순 강퇴: 멤버십 삭제
      await prisma.spaceMember.delete({
        where: { id: memberId },
      })
    }

    // 3. 이벤트 로그 기록
    await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId: target.userId,
        guestSessionId: target.guestSessionId,
        eventType: "MEMBER_KICKED",
        payload: {
          kickedBy: actor.userId,
          reason,
          banned: ban,
        },
      },
    })

    return NextResponse.json({
      success: true,
      banned: ban,
      reason,
    })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Failed to kick member:", error)
    return NextResponse.json(
      { error: "Failed to kick member" },
      { status: 500 }
    )
  }
}
