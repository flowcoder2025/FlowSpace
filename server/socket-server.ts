/**
 * Standalone Socket.io Server
 * Runs alongside Next.js development server
 *
 * Usage: npx ts-node --esm server/socket-server.ts
 *    or: npm run socket:dev
 */

import { Server } from "socket.io"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  PlayerPosition,
  ChatMessageData,
  PlayerJumpData,
  AvatarColor,
} from "../src/features/space/socket/types"

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10)
const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
// 🔒 보안: NODE_ENV === "development"로 명시적 제한
// staging, test, 미설정 환경에서 인증 우회 방지
const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// 📊 이벤트 로깅 함수
// ============================================
async function logGuestEvent(
  sessionToken: string,
  spaceId: string,
  eventType: "EXIT" | "CHAT",
  payload?: Record<string, unknown>
): Promise<boolean> {
  try {
    // dev- 세션과 auth- 세션은 로깅 스킵 (게스트 세션만 로깅)
    if (!sessionToken || sessionToken.startsWith("dev-") || sessionToken.startsWith("auth-")) {
      return false
    }

    const response = await fetch(`${NEXT_API_URL}/api/guest/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, spaceId, eventType, payload }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn(`[Socket] Event logging failed:`, errorData.error || "Unknown error")
      return false
    }

    const data = await response.json()
    if (IS_DEV) {
      console.log(`[Socket] Event logged: ${eventType} for space ${spaceId}`)
    }
    return data.logged === true
  } catch (error) {
    console.error("[Socket] Event logging error:", error)
    return false
  }
}

// ============================================
// 🔒 세션 검증 함수
// ============================================
interface VerifySessionResult {
  valid: boolean
  participantId?: string
  nickname?: string
  avatar?: string
  error?: string
}

async function verifyGuestSession(
  sessionToken: string,
  spaceId: string
): Promise<VerifySessionResult> {
  try {
    const response = await fetch(`${NEXT_API_URL}/api/guest/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, spaceId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { valid: false, error: errorData.error || "Session verification failed" }
    }

    const data = await response.json()
    return {
      valid: true,
      participantId: data.participantId,
      nickname: data.nickname,
      avatar: data.avatar,
    }
  } catch (error) {
    console.error("[Socket] Session verification error:", error)
    return { valid: false, error: "Failed to verify session" }
  }
}

// Create Socket.io server
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(PORT, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})

// Room state: spaceId -> Map<playerId, PlayerPosition>
const rooms = new Map<string, Map<string, PlayerPosition>>()

function getOrCreateRoom(spaceId: string): Map<string, PlayerPosition> {
  if (!rooms.has(spaceId)) {
    rooms.set(spaceId, new Map())
  }
  return rooms.get(spaceId)!
}

function removePlayerFromRoom(spaceId: string, playerId: string): void {
  const room = rooms.get(spaceId)
  if (room) {
    room.delete(playerId)
    if (room.size === 0) {
      rooms.delete(spaceId)
    }
  }
}

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`)

  // Join space - 🔒 세션 토큰 검증 추가
  socket.on("join:space", async ({ spaceId, playerId, nickname, avatarColor, sessionToken }) => {
    // 🔒 보안: 세션 토큰 검증 (운영환경에서는 필수)
    let verifiedPlayerId = playerId
    let verifiedNickname = nickname
    let verifiedAvatarColor = avatarColor || "default"

    // 개발 모드에서 dev- 세션은 검증 스킵 (테스트 편의)
    const isDevSession = IS_DEV && sessionToken?.startsWith("dev-")
    // 🔐 인증 사용자 세션 (NextAuth 로그인 사용자)
    const isAuthSession = sessionToken?.startsWith("auth-")

    if (isAuthSession) {
      // 🔐 NextAuth 인증 사용자는 게스트 세션 검증 스킵
      // playerId는 이미 page.tsx에서 `user-{userId}` 형태로 설정됨
      verifiedPlayerId = playerId // user-{userId}
      verifiedNickname = nickname
      verifiedAvatarColor = avatarColor || "default"
      console.log(`[Socket] Auth session detected, using auth user ID: ${verifiedPlayerId}`)
    } else if (sessionToken && !isDevSession) {
      const verification = await verifyGuestSession(sessionToken, spaceId)

      if (!verification.valid) {
        console.warn(`[Socket] Session verification failed for ${socket.id}:`, verification.error)
        // 운영환경에서는 연결 거부
        if (!IS_DEV) {
          socket.emit("error", { message: "Invalid session" })
          socket.disconnect(true)
          return
        }
        // 개발환경에서는 경고만 출력하고 진행
        console.warn("[Socket] DEV MODE: Allowing connection despite invalid session")
      } else {
        // 🔒 서버에서 검증된 값으로 덮어쓰기 (클라이언트 입력 무시)
        verifiedPlayerId = verification.participantId!
        verifiedNickname = verification.nickname!
        verifiedAvatarColor = (verification.avatar as AvatarColor) || "default"

        if (IS_DEV) {
          console.log(`[Socket] Session verified: ${verifiedPlayerId} (${verifiedNickname})`)
        }
      }
    } else if (!IS_DEV && !sessionToken) {
      // 운영환경에서 세션 토큰 없이 접근 시 거부
      console.warn(`[Socket] No session token provided for ${socket.id}`)
      socket.emit("error", { message: "Session token required" })
      socket.disconnect(true)
      return
    } else if (IS_DEV) {
      // 개발환경에서 세션 없이 접근 시 임시 ID 생성
      if (!sessionToken) {
        verifiedPlayerId = `dev-anon-${Date.now()}`
        console.log(`[Socket] DEV MODE: No session, using temp ID: ${verifiedPlayerId}`)
      } else {
        // dev- 세션의 경우 클라이언트가 보낸 ID 그대로 사용 (page.tsx에서 이미 생성됨)
        // verifiedPlayerId는 이미 playerId로 초기화되어 있음
        console.log(`[Socket] DEV MODE: Dev session, using client ID: ${verifiedPlayerId}`)
      }
    }

    // Store player data on socket (🔒 검증된 값 사용)
    socket.data.spaceId = spaceId
    socket.data.playerId = verifiedPlayerId
    socket.data.nickname = verifiedNickname
    socket.data.avatarColor = verifiedAvatarColor
    socket.data.sessionToken = sessionToken // 중복 접속 방지용

    // Join socket room
    socket.join(spaceId)

    // Get or create room state
    const room = getOrCreateRoom(spaceId)

    // 🔒 중복 접속 체크: 같은 playerId가 이미 있으면 기존 세션 제거
    const existingEntry = Array.from(room.entries()).find(([_, p]) => p.id === verifiedPlayerId)
    if (existingEntry) {
      console.log(`[Socket] Duplicate session detected for ${verifiedPlayerId}, updating position`)
      // 기존 위치 정보 유지 (재연결 시 위치 보존)
    }

    // Create initial player position
    const playerPosition: PlayerPosition = {
      id: verifiedPlayerId,
      nickname: verifiedNickname,
      x: existingEntry ? existingEntry[1].x : 480, // 기존 위치 또는 중앙
      y: existingEntry ? existingEntry[1].y : 320,
      direction: existingEntry ? existingEntry[1].direction : "down",
      isMoving: false,
      avatarColor: verifiedAvatarColor,
    }

    // Add player to room
    room.set(verifiedPlayerId, playerPosition)

    // Send current room state to joining player (🔒 yourPlayerId 포함 - 클라이언트가 서버 파생 ID 인지)
    socket.emit("room:joined", {
      spaceId,
      players: Array.from(room.values()),
      yourPlayerId: verifiedPlayerId,
    })

    // Notify other players in room
    socket.to(spaceId).emit("player:joined", playerPosition)

    // Send system message
    const systemMessage: ChatMessageData = {
      id: `sys-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `${verifiedNickname}님이 입장했습니다.`,
      timestamp: Date.now(),
      type: "system",
    }
    io.to(spaceId).emit("chat:system", systemMessage)

    console.log(`[Socket] Player ${verifiedPlayerId} (${verifiedNickname}) joined space ${spaceId}`)
  })

  // Leave space
  socket.on("leave:space", async () => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (spaceId && playerId) {
      socket.leave(spaceId)
      removePlayerFromRoom(spaceId, playerId)

      // 📊 EXIT 이벤트 로깅 (비동기, 실패해도 퇴장 처리는 계속)
      if (sessionToken) {
        logGuestEvent(sessionToken, spaceId, "EXIT", { reason: "leave" }).catch(() => {})
      }

      // Notify other players
      socket.to(spaceId).emit("player:left", { id: playerId })

      // Send system message
      if (nickname) {
        const systemMessage: ChatMessageData = {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderNickname: "시스템",
          content: `${nickname}님이 퇴장했습니다.`,
          timestamp: Date.now(),
          type: "system",
        }
        io.to(spaceId).emit("chat:system", systemMessage)
      }

      console.log(`[Socket] Player ${playerId} left space ${spaceId}`)
    }
  })

  // Player movement
  // 🔒 보안: 클라이언트가 보낸 position.id를 신뢰하지 않고 socket.data.playerId 사용
  socket.on("player:move", (position) => {
    const { spaceId, playerId, nickname, avatarColor } = socket.data

    // 🔒 playerId가 없으면 아직 join:space 완료 전이므로 무시
    if (!spaceId || !playerId) return

    const room = rooms.get(spaceId)
    if (room) {
      // 🔒 클라이언트 ID/avatarColor 무시, 서버에서 검증된 값으로 덮어쓰기
      const fullPosition: PlayerPosition = {
        ...position,
        id: playerId, // 🔒 서버 검증 ID 강제 사용
        nickname: nickname || "Unknown",
        avatarColor: avatarColor || "default", // 🔒 서버 검증 색상 강제 사용 (클라이언트 값 무시)
      }
      room.set(playerId, fullPosition)

      // Broadcast to other players in room
      socket.to(spaceId).emit("player:moved", fullPosition)
    }
  })

  // Player jump
  // 🔒 보안: 클라이언트가 보낸 data.id를 신뢰하지 않고 socket.data.playerId 사용
  socket.on("player:jump", (data: PlayerJumpData) => {
    const { spaceId, playerId } = socket.data

    // 🔒 playerId가 없으면 아직 join:space 완료 전이므로 무시
    if (!spaceId || !playerId) return

    // 🔒 클라이언트 ID 무시, 서버에서 검증된 playerId로 덮어쓰기
    const verifiedJumpData: PlayerJumpData = {
      ...data,
      id: playerId, // 🔒 서버 검증 ID 강제 사용
    }

    // Broadcast jump event to other players in room
    socket.to(spaceId).emit("player:jumped", verifiedJumpData)
    console.log(`[Socket] Player ${playerId} jumped at (${verifiedJumpData.x}, ${verifiedJumpData.y})`)
  })

  // Chat message
  socket.on("chat:message", ({ content }) => {
    const { spaceId, playerId, nickname } = socket.data

    if (spaceId && playerId && content.trim()) {
      const message: ChatMessageData = {
        id: `msg-${Date.now()}-${playerId}`,
        senderId: playerId,
        senderNickname: nickname || "Unknown",
        content: content.trim(),
        timestamp: Date.now(),
        type: "message",
      }

      // Broadcast to all players in room (including sender)
      io.to(spaceId).emit("chat:message", message)
    }
  })

  // Disconnect
  socket.on("disconnect", (reason) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (spaceId && playerId) {
      removePlayerFromRoom(spaceId, playerId)

      // 📊 EXIT 이벤트 로깅 (비동기, 실패해도 disconnect 처리는 계속)
      if (sessionToken) {
        logGuestEvent(sessionToken, spaceId, "EXIT", { reason: `disconnect:${reason}` }).catch(() => {})
      }

      // Notify other players
      socket.to(spaceId).emit("player:left", { id: playerId })

      // Send system message
      if (nickname) {
        const systemMessage: ChatMessageData = {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderNickname: "시스템",
          content: `${nickname}님이 연결이 끊어졌습니다.`,
          timestamp: Date.now(),
          type: "system",
        }
        io.to(spaceId).emit("chat:system", systemMessage)
      }
    }

    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`)
  })
})

console.log(`[Socket] Server running on port ${PORT}`)
console.log(`[Socket] CORS enabled for: http://localhost:3000`)
