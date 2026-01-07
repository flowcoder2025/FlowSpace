/**
 * Guest Event Logging API
 *
 * POST /api/guest/event - 게스트 이벤트 로그 기록 (Socket 서버 전용)
 *
 * 🔒 보안: sessionToken 검증 후 이벤트 기록
 * EXIT 이벤트 로깅을 위해 Socket 서버에서 호출
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceEventType } from "@prisma/client"

// 중복 EXIT 방지: 같은 세션이 N초 내에 다시 퇴장 시 무시
const DUPLICATE_EXIT_THRESHOLD_SECONDS = 10

// ============================================
// Types
// ============================================
interface LogEventRequestBody {
  sessionToken: string
  spaceId: string
  eventType: "EXIT" | "CHAT"
  payload?: Record<string, unknown>
}

// ============================================
// POST /api/guest/event - 이벤트 로그 기록
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body: LogEventRequestBody = await request.json()

    // 1. 필수 필드 검증
    if (!body.sessionToken || !body.spaceId || !body.eventType) {
      return NextResponse.json(
        { error: "Missing required fields: sessionToken, spaceId, eventType" },
        { status: 400 }
      )
    }

    // 2. 이벤트 타입 검증
    const validEventTypes = ["EXIT", "CHAT"]
    if (!validEventTypes.includes(body.eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${validEventTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // 3. 세션 조회 (sessionToken으로)
    const guestSession = await prisma.guestSession.findUnique({
      where: { sessionToken: body.sessionToken },
      select: {
        id: true,
        spaceId: true,
        nickname: true,
        avatar: true,
        expiresAt: true,
      },
    })

    // 4. 세션 유효성 검증
    if (!guestSession) {
      return NextResponse.json(
        { error: "Session not found", logged: false },
        { status: 404 }
      )
    }

    // 5. spaceId 일치 확인
    if (guestSession.spaceId !== body.spaceId) {
      return NextResponse.json(
        { error: "Session does not match space", logged: false },
        { status: 403 }
      )
    }

    // 6. 세션 만료 체크 (EXIT 이벤트는 만료된 세션도 허용 - 체류시간 계산 위해)
    const isExpired = new Date() > guestSession.expiresAt
    if (isExpired && body.eventType !== "EXIT") {
      return NextResponse.json(
        { error: "Session has expired", logged: false },
        { status: 401 }
      )
    }

    // 7. EXIT 이벤트 중복 방지 (N초 내 동일 세션)
    if (body.eventType === "EXIT") {
      const recentExit = await prisma.spaceEventLog.findFirst({
        where: {
          spaceId: body.spaceId,
          guestSessionId: guestSession.id,
          eventType: SpaceEventType.EXIT,
          createdAt: {
            gte: new Date(Date.now() - DUPLICATE_EXIT_THRESHOLD_SECONDS * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
      })

      if (recentExit) {
        console.log(`[Guest Event] Duplicate EXIT skipped for session ${guestSession.id}`)
        return NextResponse.json({
          logged: false,
          skipped: true,
          message: "Recent exit already recorded",
        })
      }
    }

    // 8. 이벤트 로그 생성
    const eventLog = await prisma.spaceEventLog.create({
      data: {
        spaceId: body.spaceId,
        guestSessionId: guestSession.id,
        eventType: SpaceEventType[body.eventType as keyof typeof SpaceEventType],
        payload: {
          nickname: guestSession.nickname,
          avatar: guestSession.avatar,
          ...(body.payload || {}),
        },
      },
    })

    console.log(`[Guest Event] ${body.eventType} logged for session ${guestSession.id}`)

    return NextResponse.json({
      logged: true,
      eventId: eventLog.id,
      eventType: body.eventType,
    })
  } catch (error) {
    console.error("Failed to log guest event:", error)
    return NextResponse.json(
      { error: "Failed to log event", logged: false },
      { status: 500 }
    )
  }
}
