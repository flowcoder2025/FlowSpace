/**
 * Staff Management API
 *
 * POST /api/spaces/[id]/staff - STAFF 지정
 * GET /api/spaces/[id]/staff - STAFF 목록 조회
 *
 * Phase 6: 권한 관리 시스템
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSpaceRole, addOrUpdateSpaceMember } from "@/lib/space-auth"
import { ForbiddenError, NotFoundError } from "@/lib/space-permissions"

// ============================================
// POST /api/spaces/[id]/staff - STAFF 지정
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // 1. OWNER 권한 확인
    await requireSpaceRole(spaceId, "OWNER")

    // 2. 대상 사용자 존재 확인 + OWNER 여부 확인 (동시 조회)
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    const existingMember = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
      select: { role: true },
    })

    // 📊 Phase 3.15: 일관된 에러 응답 (사용자 열거 방지)
    // 사용자 미존재, OWNER 역할 변경 시도 모두 동일한 메시지로 응답
    const cannotAssign = !targetUser || existingMember?.role === "OWNER"
    if (cannotAssign) {
      return NextResponse.json(
        { error: "Cannot assign staff role to this user" },
        { status: 400 }
      )
    }

    // 4. STAFF 역할 부여
    const member = await addOrUpdateSpaceMember(spaceId, userId, null, "STAFF")

    // 5. 이벤트 로그 기록
    await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId,
        eventType: "STAFF_ASSIGNED",
        payload: { assignedBy: (await requireSpaceRole(spaceId, "OWNER")).member.userId },
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
    console.error("Failed to assign staff:", error)
    return NextResponse.json(
      { error: "Failed to assign staff" },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/spaces/[id]/staff - STAFF 목록 조회
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: spaceId } = await params

    // OWNER 또는 STAFF만 조회 가능
    await requireSpaceRole(spaceId, "STAFF")

    const staffMembers = await prisma.spaceMember.findMany({
      where: {
        spaceId,
        role: "STAFF",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      data: staffMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Failed to fetch staff:", error)
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    )
  }
}
