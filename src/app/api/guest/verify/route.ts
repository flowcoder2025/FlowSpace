/**
 * Guest Session Verification API
 *
 * POST /api/guest/verify - 게스트 세션 토큰 검증 및 서버 발급 ID 반환
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // 4. 세션 유효성 검증
    if (!guestSession) {
      return NextResponse.json(
        { error: "Session not found", valid: false },
        { status: 404 }
      )
    }

    // 5. spaceId 일치 확인
    if (guestSession.spaceId !== body.spaceId) {
      return NextResponse.json(
        { error: "Session does not match space", valid: false },
        { status: 403 }
      )
    }

    // 6. 만료 여부 확인
    if (new Date() > guestSession.expiresAt) {
      return NextResponse.json(
        { error: "Session has expired", valid: false },
        { status: 401 }
      )
    }

    // 7. 서버에서 발급한 participantId 생성 (세션 ID 기반)
    // 이 ID는 클라이언트가 조작할 수 없는 서버 발급 ID
    const participantId = `guest-${guestSession.id}`

    const response: VerifyResponse = {
      valid: true,
      sessionId: guestSession.id,
      participantId,
      nickname: guestSession.nickname,
      avatar: guestSession.avatar,
      spaceId: guestSession.spaceId,
      expiresAt: guestSession.expiresAt,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Failed to verify guest session:", error)
    return NextResponse.json(
      { error: "Failed to verify session", valid: false },
      { status: 500 }
    )
  }
}
