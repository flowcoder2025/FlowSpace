/**
 * Member Mute API
 *
 * POST /api/spaces/[id]/members/[memberId]/mute - 음소거
 * DELETE /api/spaces/[id]/members/[memberId]/mute - 음소거 해제
 *
 * Phase 6: 채팅 관리 시스템
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireManagePermission } from "@/lib/space-auth"
import { ForbiddenError, NotFoundError } from "@/lib/space-permissions"

// ============================================
// POST - 음소거
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: spaceId, memberId } = await params
    const body = await request.json()
    const { duration, reason } = body // duration: 분 단위

    // 1. 관리 권한 확인 (STAFF 이상)
    const { actor, target } = await requireManagePermission(spaceId, memberId)

    // 2. 음소거 기간 계산
    const mutedUntil = duration
      ? new Date(Date.now() + duration * 60 * 1000)
      : null // null = 영구

    // 3. 멤버 상태 업데이트
    const updatedMember = await prisma.spaceMember.update({
      where: { id: memberId },
      data: {
        restriction: "MUTED",
        restrictedUntil: mutedUntil,
        restrictedBy: actor.userId,
        restrictedReason: reason,
      },
    })

    // 4. 이벤트 로그 기록
    await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId: target.userId,
        guestSessionId: target.guestSessionId,
        eventType: "MEMBER_MUTED",
        payload: {
          mutedBy: actor.userId,
          duration,
          reason,
          mutedUntil: mutedUntil?.toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      mutedUntil: mutedUntil?.toISOString() ?? null,
      reason,
    })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Failed to mute member:", error)
    return NextResponse.json(
      { error: "Failed to mute member" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - 음소거 해제
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: spaceId, memberId } = await params

    // 1. 관리 권한 확인 (STAFF 이상)
    const { actor, target } = await requireManagePermission(spaceId, memberId)

    // 2. 멤버 상태 업데이트
    await prisma.spaceMember.update({
      where: { id: memberId },
      data: {
        restriction: "NONE",
        restrictedUntil: null,
        restrictedBy: null,
        restrictedReason: null,
      },
    })

    // 3. 이벤트 로그 기록
    await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId: target.userId,
        guestSessionId: target.guestSessionId,
        eventType: "MEMBER_UNMUTED",
        payload: { unmutedBy: actor.userId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Failed to unmute member:", error)
    return NextResponse.json(
      { error: "Failed to unmute member" },
      { status: 500 }
    )
  }
}
