import { NextRequest, NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET

// 개발환경 폴백 키 (운영환경에서는 사용 불가)
const DEV_API_KEY = "devkey"
const DEV_API_SECRET = "devsecret"

// Room name validation pattern (space-{uuid} format)
const ROOM_NAME_PATTERN = /^space-[a-zA-Z0-9-]+$/

// Participant ID validation pattern (uuid or dev-{timestamp})
const PARTICIPANT_ID_PATTERN = /^[a-zA-Z0-9-]+$/

// ============================================
// Helper Functions
// ============================================
function validateRoomName(roomName: string): boolean {
  if (!roomName || typeof roomName !== "string") return false
  if (roomName.length > 100) return false
  return ROOM_NAME_PATTERN.test(roomName)
}

function validateParticipantId(participantId: string): boolean {
  if (!participantId || typeof participantId !== "string") return false
  if (participantId.length > 100) return false
  return PARTICIPANT_ID_PATTERN.test(participantId)
}

function validateParticipantName(name: string): boolean {
  if (!name || typeof name !== "string") return false
  if (name.length > 50) return false
  return true
}

// ============================================
// POST /api/livekit/token - Generate LiveKit access token
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. 환경변수 검증 (운영환경 필수)
    let apiKey = LIVEKIT_API_KEY
    let apiSecret = LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      if (IS_DEV) {
        // 개발환경에서만 폴백 허용
        console.warn("[LiveKit Token] Using dev credentials - not for production!")
        apiKey = DEV_API_KEY
        apiSecret = DEV_API_SECRET
      } else {
        // 운영환경에서는 환경변수 필수
        console.error("[LiveKit Token] LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required in production")
        return NextResponse.json(
          { error: "LiveKit is not configured" },
          { status: 503 }
        )
      }
    }

    // 2. Request body 파싱 및 검증
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    const { roomName, participantName, participantId, sessionToken } = body

    // 3. 필수 필드 검증
    if (!roomName || !participantName || !participantId) {
      return NextResponse.json(
        { error: "Missing required fields: roomName, participantName, participantId" },
        { status: 400 }
      )
    }

    // 4. 입력값 형식 검증
    if (!validateRoomName(roomName)) {
      return NextResponse.json(
        { error: "Invalid room name format" },
        { status: 400 }
      )
    }

    if (!validateParticipantId(participantId)) {
      return NextResponse.json(
        { error: "Invalid participant ID format" },
        { status: 400 }
      )
    }

    if (!validateParticipantName(participantName)) {
      return NextResponse.json(
        { error: "Invalid participant name" },
        { status: 400 }
      )
    }

    // 5. 세션 검증 (인증된 사용자 또는 게스트 세션)
    const session = await auth()

    // 인증된 사용자인 경우 participantId 검증
    if (session?.user?.id) {
      // 인증된 사용자의 participantId는 userId와 일치해야 함
      // (또는 서버에서 발급한 ID 사용)
      if (IS_DEV) {
        console.log("[LiveKit Token] Authenticated user:", session.user.id)
      }
    } else if (sessionToken) {
      // 게스트 세션 토큰 검증
      const guestSession = await prisma.guestSession.findUnique({
        where: { sessionToken },
        select: {
          id: true,
          nickname: true,
          spaceId: true,
          expiresAt: true,
        },
      }).catch(() => null)

      if (!guestSession) {
        return NextResponse.json(
          { error: "Invalid session token" },
          { status: 401 }
        )
      }

      // 세션 만료 여부 확인
      if (new Date() > guestSession.expiresAt) {
        return NextResponse.json(
          { error: "Session has expired" },
          { status: 401 }
        )
      }

      // roomName과 세션의 spaceId 일치 확인
      const expectedRoomName = `space-${guestSession.spaceId}`
      if (roomName !== expectedRoomName) {
        return NextResponse.json(
          { error: "Room name does not match session" },
          { status: 403 }
        )
      }

      if (IS_DEV) {
        console.log("[LiveKit Token] Guest session validated:", guestSession.id)
      }
    } else if (!IS_DEV) {
      // 운영환경에서는 세션 필수
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // 6. 토큰 생성
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: participantName,
      ttl: 60 * 60 * 4, // 4 hours
    })

    // 7. Room 권한 부여
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await token.toJwt()

    if (IS_DEV) {
      console.log("[LiveKit Token] Token generated for:", {
        roomName,
        participantId,
        participantName,
      })
    }

    return NextResponse.json({ token: jwt })
  } catch (error) {
    console.error("[LiveKit Token] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
