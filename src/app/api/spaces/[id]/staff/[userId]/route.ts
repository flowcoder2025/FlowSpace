/**
 * Staff Member API
 *
 * DELETE /api/spaces/[id]/staff/[userId] - STAFF 해제
 *
 * Phase 6: 권한 관리 시스템
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSpaceRole, addOrUpdateSpaceMember } from "@/lib/space-auth"
import { ForbiddenError, NotFoundError } from "@/lib/space-permissions"

// ============================================
// DELETE /api/spaces/[id]/staff/[userId] - STAFF 해제
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: spaceId, userId } = await params

    // 1. OWNER 권한 확인
    const { member: actor } = await requireSpaceRole(spaceId, "OWNER")

    // 2. 대상 멤버 조회
    const targetMember = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    // 3. STAFF가 아닌 경우 에러
    if (targetMember.role !== "STAFF") {
      return NextResponse.json(
        { error: "User is not a staff member" },
        { status: 400 }
      )
    }

    // 4. PARTICIPANT로 강등
    const member = await addOrUpdateSpaceMember(spaceId, userId, null, "PARTICIPANT")

    // 5. 이벤트 로그 기록
    await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId,
        eventType: "STAFF_REMOVED",
        payload: { removedBy: actor.userId },
      },
    })

    return NextResponse.json({
      success: true,
      member: {
        id: member.memberId,
        userId: member.userId,
        role: member.role,
      },
    })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Failed to remove staff:", error)
    return NextResponse.json(
      { error: "Failed to remove staff" },
      { status: 500 }
    )
  }
}
