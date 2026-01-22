/**
 * Room Handlers
 * join:space, leave:space event handlers
 */

import type { Server } from "socket.io"
import type { MapObject } from "@prisma/client"
import { prisma } from "../prisma"
import { IS_DEV } from "../config"
import { logger, sanitizeMessageContent, type TypedServer, type TypedSocket } from "../utils"
import { verifyGuestSession, loadMemberRestriction } from "../services"
import {
  rooms,
  getOrCreateRoom,
  removePlayerFromRoom,
  recordingStates,
  spotlightStates,
  getProximityState,
} from "../state"
import type {
  PlayerPosition,
  ChatMessageData,
  MapObjectData,
  AvatarColor,
  AvatarConfig,
  SpotlightStatusData,
} from "../../src/features/space/socket/types"

export function registerRoomHandlers(io: TypedServer, socket: TypedSocket) {
  // Join space - session token verification
  socket.on("join:space", async ({ spaceId, playerId, nickname, avatarColor, avatarConfig, sessionToken }) => {
    // Security: Session token verification (required in production)
    let verifiedPlayerId = playerId
    let verifiedNickname = nickname
    let verifiedAvatarColor: AvatarColor = avatarColor || "default"
    let verifiedAvatarConfig: AvatarConfig | undefined = avatarConfig

    // Dev session check (dev- prefix for testing)
    const isDevSession = IS_DEV && sessionToken?.startsWith("dev-")
    // Auth session check (NextAuth authenticated users)
    const isAuthSession = sessionToken?.startsWith("auth-")

    if (isAuthSession) {
      // NextAuth authenticated users skip guest session verification
      // playerId is already set as `user-{userId}` in page.tsx
      verifiedPlayerId = playerId
      verifiedNickname = nickname
      verifiedAvatarColor = avatarColor || "default"
      logger.info("I1001", "Auth session detected", { playerId: verifiedPlayerId, socketId: socket.id })
    } else if (sessionToken && !isDevSession) {
      const verification = await verifyGuestSession(sessionToken, spaceId)

      if (!verification.valid) {
        logger.warn("E1002", "Session verification failed", { socketId: socket.id, error: verification.error })
        // Reject connection in production
        if (!IS_DEV) {
          socket.emit("error", { message: "Invalid session" })
          socket.disconnect(true)
          return
        }
        // Allow in dev with warning
        logger.warn("E1002", "DEV MODE: Allowing connection despite invalid session", { socketId: socket.id })
      } else {
        // Overwrite with server-verified values (ignore client input)
        verifiedPlayerId = verification.participantId!
        verifiedNickname = verification.nickname!
        verifiedAvatarColor = (verification.avatar as AvatarColor) || "default"

        if (IS_DEV) {
          logger.info("I1002", "Session verified", { playerId: verifiedPlayerId, nickname: verifiedNickname })
        }
      }
    } else if (!IS_DEV && !sessionToken) {
      // Reject in production without session token
      logger.warn("E1001", "No session token provided", { socketId: socket.id })
      socket.emit("error", { message: "Session token required" })
      socket.disconnect(true)
      return
    } else if (IS_DEV) {
      // Dev mode without session - generate temp ID
      if (!sessionToken) {
        verifiedPlayerId = `dev-anon-${Date.now()}`
        logger.info("I1003", "DEV MODE: No session, using temp ID", { playerId: verifiedPlayerId })
      } else {
        // dev- session uses client-provided ID
        logger.info("I1003", "DEV MODE: Using client ID", { playerId: verifiedPlayerId })
      }
    }

    // Store verified player data on socket
    socket.data.spaceId = spaceId
    socket.data.playerId = verifiedPlayerId
    socket.data.nickname = verifiedNickname
    socket.data.avatarColor = verifiedAvatarColor
    socket.data.avatarConfig = verifiedAvatarConfig
    socket.data.sessionToken = sessionToken

    // Load mute status from DB (persists across server restarts)
    try {
      const memberRestriction = await loadMemberRestriction(spaceId, verifiedPlayerId, sessionToken)
      if (memberRestriction) {
        socket.data.restriction = memberRestriction.restriction
        socket.data.memberId = memberRestriction.memberId
        if (IS_DEV) {
          logger.info("I3001", "Loaded member restriction", { playerId: verifiedPlayerId, restriction: memberRestriction.restriction })
        }
      }
    } catch (error) {
      logger.error("E3002", "Failed to load member restriction", { playerId: verifiedPlayerId, error: (error as Error).message })
    }

    // Join socket room
    socket.join(spaceId)

    // Get or create room state
    const room = getOrCreateRoom(spaceId)

    // Handle duplicate session (reconnection with same playerId)
    const existingEntry = Array.from(room.entries()).find(([, p]) => p.id === verifiedPlayerId)
    if (existingEntry) {
      logger.warn("E2003", "Duplicate session detected", { playerId: verifiedPlayerId, spaceId })

      // Disconnect old socket
      const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
      if (socketsInRoom) {
        for (const oldSocketId of socketsInRoom) {
          if (oldSocketId === socket.id) continue
          const oldSocket = io.sockets.sockets.get(oldSocketId)
          if (oldSocket && oldSocket.data.playerId === verifiedPlayerId) {
            logger.info("E2003", "Disconnecting old socket", { oldSocketId, playerId: verifiedPlayerId })
            oldSocket.emit("error", { message: "다른 기기에서 접속하여 연결이 종료되었습니다." })
            oldSocket.disconnect(true)
            break
          }
        }
      }
    }

    // Create initial player position
    const playerPosition: PlayerPosition = {
      id: verifiedPlayerId,
      nickname: verifiedNickname,
      x: existingEntry ? existingEntry[1].x : 480,
      y: existingEntry ? existingEntry[1].y : 320,
      direction: existingEntry ? existingEntry[1].direction : "down",
      isMoving: false,
      avatarColor: verifiedAvatarColor,
      avatarConfig: verifiedAvatarConfig,
    }

    // Add player to room
    room.set(verifiedPlayerId, playerPosition)

    // Send room state to joining player
    socket.emit("room:joined", {
      spaceId,
      players: Array.from(room.values()),
      yourPlayerId: verifiedPlayerId,
    })

    // Sync map objects
    try {
      const mapObjects = await prisma.mapObject.findMany({
        where: { spaceId },
        orderBy: { createdAt: "asc" },
      })

      if (mapObjects.length > 0) {
        const objectsData: MapObjectData[] = mapObjects.map((obj: MapObject) => ({
          id: obj.id,
          assetId: obj.assetId,
          position: { x: obj.positionX, y: obj.positionY },
          rotation: obj.rotation as 0 | 90 | 180 | 270,
          linkedObjectId: obj.linkedObjectId || undefined,
          customData: obj.customData as Record<string, unknown> | undefined,
          placedBy: obj.placedBy,
          placedAt: obj.createdAt.toISOString(),
        }))

        socket.emit("objects:sync", { objects: objectsData })

        if (IS_DEV) {
          console.log(`[Socket] 🗺️ Synced ${mapObjects.length} objects for ${nickname}`)
        }
      }
    } catch (error) {
      console.error("[Socket] Objects sync error:", error)
    }

    // Send current recording status
    const currentRecordingState = recordingStates.get(spaceId)
    if (currentRecordingState?.isRecording) {
      socket.emit("recording:status", currentRecordingState)
    }

    // Send current spotlight status
    try {
      const spotlightState = spotlightStates.get(spaceId)
      const activeSpotlights = spotlightState
        ? Array.from(spotlightState.values())
        : []

      // Check own spotlight grant
      let hasGrant = false
      let grantId: string | undefined
      let expiresAt: string | undefined

      if (sessionToken) {
        let spotlightGrant = null

        // Query by userId for authenticated users
        if (socket.data.userId) {
          spotlightGrant = await prisma.spotlightGrant.findFirst({
            where: {
              spaceId,
              userId: socket.data.userId,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          })
        } else if (sessionToken.startsWith("guest-")) {
          // Query by guestSessionId for guests
          const guestSession = await prisma.guestSession.findUnique({
            where: { sessionToken },
            select: { id: true },
          })
          if (guestSession) {
            spotlightGrant = await prisma.spotlightGrant.findFirst({
              where: {
                spaceId,
                guestSessionId: guestSession.id,
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } },
                ],
              },
            })
          }
        }
        if (spotlightGrant) {
          hasGrant = true
          grantId = spotlightGrant.id
          expiresAt = spotlightGrant.expiresAt?.toISOString()
          socket.data.hasSpotlightGrant = true
          socket.data.spotlightGrantId = spotlightGrant.id
          socket.data.isSpotlightActive = spotlightGrant.isActive
        }
      }

      const spotlightStatus: SpotlightStatusData = {
        activeSpotlights,
        hasGrant,
        grantId,
        expiresAt,
      }
      socket.emit("spotlight:status", spotlightStatus)
    } catch (error) {
      console.error("[Socket] Spotlight status error:", error)
    }

    // Send current proximity status
    const proximityEnabled = getProximityState(spaceId)
    socket.emit("proximity:status", { enabled: proximityEnabled })

    // Notify other players
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
    const { spaceId, playerId, nickname } = socket.data

    if (spaceId && playerId) {
      socket.leave(spaceId)
      removePlayerFromRoom(spaceId, playerId)

      // Note: EXIT logging is handled in disconnect handler to prevent duplicates

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
}
