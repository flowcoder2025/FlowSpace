/**
 * Party Handlers
 * party:join, party:leave, party:message event handlers
 */

import { prisma } from "../prisma"
import { IS_DEV } from "../config"
import { logger, sanitizeMessageContent, type TypedServer, type TypedSocket } from "../utils"
import { checkRateLimit } from "../middleware/rate-limit"
import {
  getPartyRoomId,
  getOrCreatePartyRoom,
  removeFromPartyRoom,
} from "../state"
import type { ChatMessageData } from "../../src/features/space/socket/types"

export function registerPartyHandlers(io: TypedServer, socket: TypedSocket) {
  // Party join (enter party zone - receive party messages)
  socket.on("party:join", ({ partyId, partyName }) => {
    const { spaceId, playerId, nickname } = socket.data

    if (!spaceId || !playerId) return

    // Leave previous party (only one party at a time)
    if (socket.data.partyId) {
      const oldPartyId = socket.data.partyId
      const oldPartyRoomId = getPartyRoomId(spaceId, oldPartyId)

      removeFromPartyRoom(spaceId, oldPartyId, socket.id)
      socket.leave(oldPartyRoomId)

      if (IS_DEV) {
        console.log(`[Socket] ${nickname} left party zone ${oldPartyId}`)
      }
    }

    // Join new party room
    const partyRoom = getOrCreatePartyRoom(spaceId, partyId)
    const partyRoomId = getPartyRoomId(spaceId, partyId)

    partyRoom.add(socket.id)
    socket.join(partyRoomId)

    // Store party info on socket
    socket.data.partyId = partyId
    socket.data.partyName = partyName

    // Send join confirmation
    socket.emit("party:joined", { partyId, partyName })

    if (IS_DEV) {
      console.log(`[Socket] ${nickname} entered party zone ${partyName} (${partyId})`)
    }
  })

  // Party leave (exit party zone - stop receiving party messages)
  socket.on("party:leave", () => {
    const { spaceId, playerId, nickname, partyId, partyName } = socket.data

    if (!spaceId || !playerId || !partyId) return

    const partyRoomId = getPartyRoomId(spaceId, partyId)

    // Remove from party room
    removeFromPartyRoom(spaceId, partyId, socket.id)
    socket.leave(partyRoomId)

    // Clear party info from socket
    socket.data.partyId = undefined
    socket.data.partyName = undefined

    // Send leave confirmation
    socket.emit("party:left", { partyId })

    if (IS_DEV) {
      console.log(`[Socket] ${nickname} left party zone ${partyName} (${partyId})`)
    }
  })

  // Party message + DB save
  socket.on("party:message", ({ content }) => {
    const { spaceId, playerId, nickname, partyId, partyName, sessionToken } = socket.data

    if (!spaceId || !playerId || !partyId || !content.trim()) {
      if (!partyId) {
        socket.emit("party:error", { message: "파티에 참가하지 않았습니다." })
      }
      return
    }

    // Rate limit check
    const rateCheck = checkRateLimit(playerId, content)
    if (!rateCheck.allowed) {
      socket.emit("party:error", { message: rateCheck.reason || "메시지 전송이 제한되었습니다." })
      return
    }

    const partyRoomId = getPartyRoomId(spaceId, partyId)
    const now = Date.now()
    const tempId = `party-${now}-${playerId}`

    // Party message
    const partyMessage: ChatMessageData = {
      id: tempId,
      senderId: playerId,
      senderNickname: nickname || "Unknown",
      content: sanitizeMessageContent(content.trim()),
      timestamp: now,
      type: "party",
      partyId,
      partyName,
    }

    // Send to all party members (including sender)
    io.to(partyRoomId).emit("party:message", partyMessage)

    // Background DB save
    const senderType = sessionToken?.startsWith("auth-") ? "USER" : "GUEST"
    const senderId = sessionToken?.replace("auth-", "").replace("guest-", "") || playerId

    prisma.chatMessage.create({
      data: {
        spaceId,
        senderId,
        senderType,
        senderName: nickname || "Unknown",
        content: sanitizeMessageContent(content.trim()),
        type: "PARTY",
        targetId: partyId, // Store partyId as targetId
      },
    }).then((savedMessage) => {
      // ID update for party room only
      io.to(partyRoomId).emit("chat:messageIdUpdate", {
        tempId,
        realId: savedMessage.id,
      })
    }).catch((error) => {
      logger.error("E3001", "Failed to save party message", { spaceId, partyId, playerId, error: (error as Error).message })
      // Party messages don't rollback (already sent, just log failure)
    })

    if (IS_DEV) {
      logger.info("I3003", "Party message", { partyName, nickname, contentPreview: content.trim().substring(0, 30) })
    }
  })
}
