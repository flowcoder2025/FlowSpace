/**
 * Standalone Socket.io Server
 * Entry point for the socket server
 *
 * Usage: npx ts-node --esm server/index.ts
 *    or: npm run socket:dev
 */

import { createServer } from "http"
import { Server } from "socket.io"
import { PORT, CORS_ORIGINS } from "./config"
import { logger, type TypedServer, type TypedSocket } from "./utils"
import { rooms, partyRooms } from "./state"
import { formatUptime, getStorageMetrics } from "./utils/format"
import { registerHandlers } from "./handlers"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../src/features/space/socket/types"

// Create HTTP server for health checks and metrics
const httpServer = createServer((req, res) => {
  const url = req.url || ""
  const method = req.method || "GET"

  console.log(`[Socket] HTTP ${method} ${url} from ${req.socket.remoteAddress}`)

  // CORS headers
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }

  // OPTIONS request (CORS preflight)
  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  // Health check
  if (url === "/health" || url === "/") {
    const response = { status: "ok", timestamp: Date.now(), uptime: process.uptime() }
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders })
    res.end(JSON.stringify(response))
    console.log(`[Socket] Health check responded: 200 OK`)
    return
  }

  // Metrics API
  if (url === "/metrics" && method === "GET") {
    const cpuUsage = process.cpuUsage()
    const memUsage = process.memoryUsage()
    const totalConnections = io.sockets.sockets.size
    const roomStats: Array<{ spaceId: string; connections: number }> = []

    for (const [spaceId, players] of rooms.entries()) {
      roomStats.push({ spaceId, connections: players.size })
    }

    const uptimeSeconds = process.uptime()
    const startTime = Date.now() - (uptimeSeconds * 1000)
    const storage = getStorageMetrics()

    const response = {
      server: "socket.io",
      version: "2.0.0",
      timestamp: Date.now(),
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: formatUptime(uptimeSeconds),
        startTime: new Date(startTime).toISOString(),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        totalMicroseconds: cpuUsage.user + cpuUsage.system,
      },
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      },
      storage: storage ? {
        totalGB: storage.totalGB,
        usedGB: storage.usedGB,
        availableGB: storage.availableGB,
        usedPercent: storage.usedPercent,
        mountPoint: storage.mountPoint,
      } : null,
      connections: {
        total: totalConnections,
        rooms: roomStats,
        roomCount: rooms.size,
      },
      parties: {
        count: partyRooms.size,
      },
    }

    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders })
    res.end(JSON.stringify(response, null, 2))
    console.log(`[Socket] Metrics API responded: ${totalConnections} connections`)
    return
  }

  // Presence API
  if (url.startsWith("/presence/") && method === "GET") {
    const spaceId = url.replace("/presence/", "")

    if (!spaceId) {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders })
      res.end(JSON.stringify({ error: "spaceId is required" }))
      return
    }

    const roomSocketIds = io.sockets.adapter.rooms.get(spaceId)
    const onlineUsers: Array<{
      id: string
      nickname: string
      avatarColor?: string
      userId?: string
      memberId?: string
      role?: string
    }> = []

    if (roomSocketIds) {
      for (const socketId of roomSocketIds) {
        const socket = io.sockets.sockets.get(socketId)
        if (socket && socket.data) {
          onlineUsers.push({
            id: socket.data.playerId,
            nickname: socket.data.nickname,
            avatarColor: socket.data.avatarColor,
            userId: socket.data.userId,
            memberId: socket.data.memberId,
            role: socket.data.role,
          })
        }
      }
    }

    const response = {
      spaceId,
      onlineUsers,
      count: onlineUsers.length,
      timestamp: Date.now(),
    }

    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders })
    res.end(JSON.stringify(response))
    console.log(`[Socket] Presence API: ${spaceId} has ${onlineUsers.length} online users`)
    return
  }

  // 404 for other routes
  res.writeHead(404, corsHeaders)
  res.end()
})

// Create Socket.io server
const io: TypedServer = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 10000,
})

// Handle new connections
io.on("connection", (socket: TypedSocket) => {
  logger.info("E2001", "Client connected", { socketId: socket.id })

  // Register all event handlers
  registerHandlers(io, socket)
})

// Startup log
logger.info("E6001", "Starting server", { port: PORT, env: process.env.NODE_ENV, cors: CORS_ORIGINS })

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("E6002", "Received SIGTERM, shutting down gracefully")
  httpServer.close(() => {
    logger.info("E6002", "Server closed")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  logger.info("E6002", "Received SIGINT, shutting down gracefully")
  httpServer.close(() => {
    logger.info("E6002", "Server closed")
    process.exit(0)
  })
})

// Start server
httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info("E6001", "Server successfully running", { port: PORT, healthCheck: `http://0.0.0.0:${PORT}/health` })
})

httpServer.on("error", (err) => {
  logger.error("E6003", "Server error", { error: err.message })
  process.exit(1)
})

// Export for testing
export { io, httpServer }
