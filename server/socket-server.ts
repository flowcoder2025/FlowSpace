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
} from "../src/features/space/socket/types"

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10)

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

  // Join space
  socket.on("join:space", ({ spaceId, playerId, nickname }) => {
    // Store player data on socket
    socket.data.spaceId = spaceId
    socket.data.playerId = playerId
    socket.data.nickname = nickname

    // Join socket room
    socket.join(spaceId)

    // Get or create room state
    const room = getOrCreateRoom(spaceId)

    // Create initial player position
    const playerPosition: PlayerPosition = {
      id: playerId,
      nickname,
      x: 480, // Center of map (15 * 32)
      y: 320, // Center of map (10 * 32)
      direction: "down",
      isMoving: false,
    }

    // Add player to room
    room.set(playerId, playerPosition)

    // Send current room state to joining player
    socket.emit("room:joined", {
      spaceId,
      players: Array.from(room.values()),
    })

    // Notify other players in room
    socket.to(spaceId).emit("player:joined", playerPosition)

    // Send system message
    const systemMessage: ChatMessageData = {
      id: `sys-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `${nickname}님이 입장했습니다.`,
      timestamp: Date.now(),
      type: "system",
    }
    io.to(spaceId).emit("chat:system", systemMessage)

    console.log(`[Socket] Player ${playerId} (${nickname}) joined space ${spaceId}`)
  })

  // Leave space
  socket.on("leave:space", () => {
    const { spaceId, playerId, nickname } = socket.data

    if (spaceId && playerId) {
      socket.leave(spaceId)
      removePlayerFromRoom(spaceId, playerId)

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
  socket.on("player:move", (position) => {
    const { spaceId, nickname } = socket.data

    if (spaceId) {
      const room = rooms.get(spaceId)
      if (room) {
        // Update player position in room state
        const fullPosition: PlayerPosition = {
          ...position,
          nickname: nickname || "Unknown",
        }
        room.set(position.id, fullPosition)

        // Broadcast to other players in room
        socket.to(spaceId).emit("player:moved", fullPosition)
      }
    }
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
    const { spaceId, playerId, nickname } = socket.data

    if (spaceId && playerId) {
      removePlayerFromRoom(spaceId, playerId)

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
