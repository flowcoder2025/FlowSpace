/**
 * Messages API
 *
 * GET /api/spaces/[id]/messages - 과거 메시지 조회 (cursor 기반 페이지네이션)
 *
 * Phase 6: 채팅 시스템 - 과거 메시지 로딩
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSpaceMember } from "@/lib/space-auth"
import { MessageType, Prisma } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

// ============================================
// Types
// ============================================
interface RouteParams {
  params: Promise<{ id: string }>
}

interface MessageResponse {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: string  // ISO string
  type: "message" | "whisper" | "party" | "system" | "announcement"
  targetId?: string
  targetNickname?: string
  partyId?: string
  partyName?: string
}

interface PaginatedResponse {
  messages: MessageResponse[]
  nextCursor: string | null
  hasMore: boolean
}

// ============================================
// Helper Functions
// ============================================

/**
 * DB MessageType을 클라이언트 타입으로 변환
 */
function mapMessageType(dbType: MessageType): MessageResponse["type"] {
  const mapping: Record<MessageType, MessageResponse["type"]> = {
    MESSAGE: "message",
    WHISPER: "whisper",
    PARTY: "party",
    SYSTEM: "system",
    ANNOUNCEMENT: "announcement",
  }
  return mapping[dbType] || "message"
}

/**
 * DB 메시지를 클라이언트 응답 형식으로 변환
 */
function mapDbMessageToResponse(msg: {
  id: string
  senderId: string | null
  senderName: string
  content: string
  createdAt: Date
  type: MessageType
  targetId: string | null
}): MessageResponse {
  const type = mapMessageType(msg.type)

  return {
    id: msg.id,
    senderId: msg.senderId || "system",
    senderNickname: msg.senderName,
    content: msg.content,
    timestamp: msg.createdAt.toISOString(),
    type,
    // whisper일 때만 targetId 포함
    ...(type === "whisper" && msg.targetId && { targetId: msg.targetId }),
    // party일 때만 partyId 포함
    ...(type === "party" && msg.targetId && { partyId: msg.targetId }),
  }
}

// ============================================
// GET /api/spaces/[id]/messages
// ============================================
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<PaginatedResponse | { error: string }>> {
  try {
    const { id: spaceId } = await params
    const searchParams = request.nextUrl.searchParams

    // 1. 파라미터 파싱
    const cursor = searchParams.get("cursor")
    const limitParam = searchParams.get("limit")
    const guestSessionId = searchParams.get("guestSessionId")
    const typeFilter = searchParams.get("type") as MessageType | null

    const limit = Math.min(
      Math.max(parseInt(limitParam || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    )

    // 2. 인증 확인 (사용자 또는 게스트)
    const session = await auth()
    const userId = session?.user?.id || null

    if (!userId && !guestSessionId) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    // 3. 공간 존재 확인
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: { id: true },
    })

    if (!space) {
      return NextResponse.json(
        { error: "공간을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    // 4. 멤버십 확인
    const member = await getSpaceMember(spaceId, userId, guestSessionId)

    if (!member) {
      return NextResponse.json(
        { error: "이 공간의 멤버가 아닙니다" },
        { status: 403 }
      )
    }

    // 5. 현재 사용자의 ID (userId 또는 guestSessionId)
    const currentUserIdentifier = member.userId || member.guestSessionId || ""

    // 6. 메시지 조회 쿼리 구성
    const whereClause: Prisma.ChatMessageWhereInput = {
      spaceId,
      isDeleted: false,
      // whisper 필터: 공개 메시지 + 본인이 관련된 귓속말만
      OR: [
        { type: { in: ["MESSAGE", "SYSTEM", "ANNOUNCEMENT"] } },
        // 본인이 보낸 귓속말
        { type: "WHISPER", senderId: currentUserIdentifier },
        // 본인이 받은 귓속말
        { type: "WHISPER", targetId: currentUserIdentifier },
        // 파티 메시지 (현재는 모두 표시 - 파티 멤버십 체크는 복잡하므로 MVP에서 제외)
        { type: "PARTY" },
      ],
      // 타입 필터 (선택)
      ...(typeFilter && { type: typeFilter }),
    }

    // 7. cursor 기반 페이지네이션
    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },  // 최신순으로 가져옴
      take: limit + 1,  // 다음 페이지 존재 여부 확인용
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,  // cursor 자체는 제외
      }),
      select: {
        id: true,
        senderId: true,
        senderName: true,
        content: true,
        createdAt: true,
        type: true,
        targetId: true,
      },
    })

    // 8. 페이지네이션 처리
    const hasMore = messages.length > limit
    const resultMessages = hasMore ? messages.slice(0, limit) : messages

    // 9. 시간순 정렬 (오래된 것 → 최신 순)
    const sortedMessages = [...resultMessages].reverse()

    // 10. 응답 변환
    const response: PaginatedResponse = {
      messages: sortedMessages.map(mapDbMessageToResponse),
      nextCursor: hasMore ? resultMessages[resultMessages.length - 1].id : null,
      hasMore,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[Messages API] Error:", error)
    return NextResponse.json(
      { error: "메시지를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
