/**
 * Guest Session Verification API
 *
 * POST /api/guest/verify - 게스트 세션 토큰 검증 및 서버 발급 ID 반환
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceEventType } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"

// 중복 ENTER 방지: 같은 세션이 N분 내에 다시 입장 시 무시
const DUPLICATE_ENTER_THRESHOLD_MINUTES = 5

// ============================================
// Types
// ============================================
interface VerifyRequestBody {
  sessionToken: string
  spaceId: string
}

interface VerifyResponse {
  valid: boolean
  sessionId: string
  participantId: string // 서버에서 발급한 고유 ID
  nickname: string
  avatar: string
  spaceId: string
  expiresAt: Date
}

// ============================================
// POST /api/guest/verify - 세션 토큰 검증
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json()

    // 1. 필수 필드 검증
    if (!body.sessionToken || !body.spaceId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionToken, spaceId" },
        { status: 400 }
      )
    }

    // 2. 입력값 형식 검증
    if (body.sessionToken.length > 100 || body.spaceId.length > 100) {
      return NextResponse.json(
        { error: "Invalid input format" },
        { status: 400 }
      )
    }

    // 3. 세션 조회
    const guestSession = await prisma.guestSession.findUnique({
      where: { sessionToken: body.sessionToken },
      select: {
        id: true,
        sessionToken: true,
        nickname: true,
        avatar: true,
        spaceId: true,
        expiresAt: true,
      },
    })

    // 📊 Phase 3.17: 일관된 에러 응답 (정보 누수 방지)
    // 모든 세션 검증 실패는 동일한 에러 메시지로 반환하여 공격자가
    // 세션 존재 여부, 공간 일치 여부, 만료 여부를 추론할 수 없도록 함
    const genericError = { error: "Invalid session", valid: false }
    const genericStatus = 401

    // 4. 세션 유효성 검증
    if (!guestSession) {
      return NextResponse.json(genericError, { status: genericStatus })
    }

    // 5. spaceId 일치 확인
    if (guestSession.spaceId !== body.spaceId) {
      return NextResponse.json(genericError, { status: genericStatus })
    }

    // 6. 만료 여부 확인
    if (new Date() > guestSession.expiresAt) {
      return NextResponse.json(genericError, { status: genericStatus })
    }

    // 7. 서버에서 발급한 participantId 생성 (세션 ID 기반)
    // 이 ID는 클라이언트가 조작할 수 없는 서버 발급 ID
    const participantId = `guest-${guestSession.id}`

    // 8. ENTER 이벤트 기록 (재입장 시에도 기록, 5분 중복 방지)
    // 게스트 세션 생성 시 ENTER가 기록되지만, 세션 재사용 시에도 입장 기록 필요
    let enterLogged = false
    try {
      const recentEnter = await prisma.spaceEventLog.findFirst({
        where: {
          spaceId: guestSession.spaceId,
          guestSessionId: guestSession.id,
          eventType: SpaceEventType.ENTER,
          createdAt: {
            gte: new Date(Date.now() - DUPLICATE_ENTER_THRESHOLD_MINUTES * 60 * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
      })

      if (!recentEnter) {
        await prisma.spaceEventLog.create({
          data: {
            spaceId: guestSession.spaceId,
            guestSessionId: guestSession.id,
            eventType: SpaceEventType.ENTER,
            payload: {
              nickname: guestSession.nickname,
              avatar: guestSession.avatar,
              source: "verify", // 세션 재검증을 통한 입장
            },
          },
        })
        enterLogged = true

        if (IS_DEV) {
          console.log(`[Guest Verify] ENTER recorded: session=${guestSession.id}, space=${guestSession.spaceId}`)
        }
      } else {
        if (IS_DEV) {
          console.log(`[Guest Verify] Duplicate ENTER skipped: session=${guestSession.id}`)
        }
      }
    } catch (logError) {
      // 이벤트 로깅 실패해도 세션 검증은 성공으로 처리
      console.error("[Guest Verify] Failed to log ENTER event:", logError)
    }

    const response: VerifyResponse = {
      valid: true,
      sessionId: guestSession.id,
      participantId,
      nickname: guestSession.nickname,
      avatar: guestSession.avatar,
      spaceId: guestSession.spaceId,
      expiresAt: guestSession.expiresAt,
    }

    return NextResponse.json({ ...response, enterLogged })
  } catch (error) {
    console.error("Failed to verify guest session:", error)
    return NextResponse.json(
      { error: "Failed to verify session", valid: false },
      { status: 500 }
    )
  }
}
