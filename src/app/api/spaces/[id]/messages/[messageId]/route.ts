/**
 * Message Management API
 *
 * DELETE /api/spaces/[id]/messages/[messageId] - 메시지 삭제
 *
 * Phase 6: 채팅 관리 시스템
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSpaceRole } from "@/lib/space-auth"
import { ForbiddenError, NotFoundError } from "@/lib/space-permissions"

// ============================================
// DELETE - 메시지 삭제
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: spaceId, messageId } = await params

    // 1. STAFF 이상 권한 확인
    const { member: actor } = await requireSpaceRole(spaceId, "STAFF")

    // 2. 메시지 조회
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      )
    }

    if (message.spaceId !== spaceId) {
      return NextResponse.json(
        { error: "Message does not belong to this space" },
        { status: 400 }
      )
    }

    // 3. 소프트 삭제 (실제 삭제 대신 플래그 설정)
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedBy: actor.userId,
        deletedAt: new Date(),
      },
    })

    // 4. 이벤트 로그 기록
    await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId: actor.userId,
        eventType: "MESSAGE_DELETED",
        payload: {
          messageId,
          deletedBy: actor.userId,
          originalSenderId: message.senderId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      messageId,
      deletedBy: actor.userId,
    })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Failed to delete message:", error)
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    )
  }
}
