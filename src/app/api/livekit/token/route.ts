import { NextRequest, NextResponse } from "next/server"
import { AccessToken, RoomServiceClient } from "livekit-server-sdk"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_URL = process.env.LIVEKIT_URL || "http://localhost:7880"

// 개발환경 폴백 키 (운영환경에서는 사용 불가)
const DEV_API_KEY = "devkey"
const DEV_API_SECRET = "devsecret"

// ============================================
// 🧹 중복 참가자 정리 (세션 전환 시)
// ============================================
/**
 * 같은 닉네임을 가진 다른 identity의 참가자를 Room에서 제거합니다.
 * 이렇게 하면 게스트 → 인증 사용자 전환 시 중복 표시를 방지합니다.
 */
async function removeDuplicateParticipants(
  roomName: string,
  newIdentity: string,
  participantName: string,
  apiKey: string,
  apiSecret: string
): Promise<void> {
  try {
    const roomService = new RoomServiceClient(LIVEKIT_URL, apiKey, apiSecret)
    const participants = await roomService.listParticipants(roomName)

    // 같은 이름을 가진 다른 identity 찾기
    const duplicates = participants.filter(
      (p) => p.name === participantName && p.identity !== newIdentity
    )

    if (duplicates.length > 0) {
      console.log(`[LiveKit Token] 🧹 Removing ${duplicates.length} duplicate participant(s) with name "${participantName}"`)

      for (const dup of duplicates) {
        try {
          await roomService.removeParticipant(roomName, dup.identity)
          console.log(`[LiveKit Token] ✅ Removed duplicate participant: ${dup.identity}`)
        } catch (removeError) {
          console.warn(`[LiveKit Token] ⚠️ Failed to remove participant ${dup.identity}:`, removeError)
        }
      }
    }
  } catch (error) {
    // Room이 아직 없거나 조회 실패 - 무시하고 계속 진행
    if (IS_DEV) {
      console.log("[LiveKit Token] 🔍 Could not check for duplicates (room may not exist yet):", error)
    }
  }
}

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
    // 🔒 보안: participantId는 서버에서 파생하여 클라이언트 입력을 덮어씀
    const session = await auth()
    let serverParticipantId: string
    let serverParticipantName: string = participantName

    // 인증된 사용자인 경우
    if (session?.user?.id) {
      // 인증된 사용자의 participantId는 서버에서 생성
      serverParticipantId = `user-${session.user.id}`
      // 🔄 클라이언트가 보낸 닉네임 우선 사용 (Socket.io와 동기화)
      serverParticipantName = participantName || session.user.name || "Unknown"
      if (IS_DEV) {
        console.log("[LiveKit Token] Authenticated user:", session.user.id, "→ participantId:", serverParticipantId)
      }
    } else if (sessionToken) {
      // 개발 모드: dev- 접두사로 시작하는 세션 토큰은 테스트용
      const isDevSessionToken = IS_DEV && sessionToken.startsWith("dev-")

      if (isDevSessionToken) {
        // dev 세션에서는 클라이언트에서 전달한 participantId를 그대로 사용해 Socket과 ID 동기화
        serverParticipantId = participantId
        console.log("[LiveKit Token] Dev mode session token → participantId (client provided):", serverParticipantId)
      } else {
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

        // 🔒 보안 핵심: 서버에서 participantId 생성 (클라이언트 입력 무시)
        serverParticipantId = `guest-${guestSession.id}`
        serverParticipantName = guestSession.nickname

        if (IS_DEV) {
          console.log("[LiveKit Token] Guest session validated:", guestSession.id, "→ participantId:", serverParticipantId)
        }
      }
    } else if (IS_DEV) {
      // 개발환경에서 세션 없이 접근 시 임시 ID 생성
      serverParticipantId = `dev-anon-${Date.now()}`
      console.log("[LiveKit Token] Dev mode without session → participantId:", serverParticipantId)
    } else {
      // 운영환경에서는 세션 필수
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // 6. 🧹 중복 참가자 정리 (세션 전환 시 기존 게스트 세션 제거)
    await removeDuplicateParticipants(
      roomName,
      serverParticipantId,
      serverParticipantName,
      apiKey,
      apiSecret
    )

    // 7. 토큰 생성 (🔒 서버에서 생성한 participantId 사용)
    const token = new AccessToken(apiKey, apiSecret, {
      identity: serverParticipantId,
      name: serverParticipantName,
      ttl: 60 * 60 * 4, // 4 hours
    })

    // 8. Room 권한 부여
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
        participantId: serverParticipantId,
        participantName: serverParticipantName,
      })
    }

    // 🔒 서버에서 생성한 participantId를 반환하여 클라이언트가 동기화에 사용
    return NextResponse.json({
      token: jwt,
      participantId: serverParticipantId,
      participantName: serverParticipantName,
    })
  } catch (error) {
    console.error("[LiveKit Token] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
