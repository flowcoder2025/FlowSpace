/**
 * Chat Handlers
 * chat:message, whisper:send, reaction:toggle event handlers
 */

import { prisma } from "../prisma"
import { IS_DEV } from "../config"
import { logger, sanitizeMessageContent, findAllSocketsByNickname, type TypedServer, type TypedSocket } from "../utils"
import { checkRateLimit } from "../middleware/rate-limit"
import type {
  ChatMessageData,
  ReactionAddRequest,
  ReactionData,
} from "../../src/features/space/socket/types"

export function registerChatHandlers(io: TypedServer, socket: TypedSocket) {
  // Chat message (with reply support) - Optimistic Broadcasting + async DB save
  socket.on("chat:message", ({ content, replyTo }) => {
    const { spaceId, playerId, nickname, restriction, sessionToken } = socket.data

    // Check mute status
    if (restriction === "MUTED") {
      socket.emit("chat:error", { message: "음소거 상태입니다. 채팅을 보낼 수 없습니다." })
      return
    }

    // Rate limit check (playerId-based)
    const rateCheck = checkRateLimit(playerId, content)
    if (!rateCheck.allowed) {
      socket.emit("chat:error", { message: rateCheck.reason || "메시지 전송이 제한되었습니다." })
      return
    }

    if (spaceId && playerId && content.trim()) {
      const now = Date.now()
      const tempId = `msg-${now}-${playerId}`

      // 1. Immediate broadcast (no delay)
      const message: ChatMessageData = {
        id: tempId,
        senderId: playerId,
        senderNickname: nickname || "Unknown",
        content: sanitizeMessageContent(content.trim()),
        timestamp: now,
        type: "message",
        ...(replyTo && { replyTo }),
      }
      io.to(spaceId).emit("chat:message", message)

      // 2. Background DB save (async, non-blocking)
      const senderType = sessionToken?.startsWith("auth-") ? "USER" : "GUEST"
      const senderId = sessionToken?.replace("auth-", "").replace("guest-", "") || playerId

      prisma.chatMessage.create({
        data: {
          spaceId,
          senderId,
          senderType,
          senderName: nickname || "Unknown",
          content: sanitizeMessageContent(content.trim()),
          type: "MESSAGE",
        },
      }).then((savedMessage) => {
        // 3. ID update broadcast (for delete feature)
        io.to(spaceId).emit("chat:messageIdUpdate", {
          tempId,
          realId: savedMessage.id,
        })
      }).catch((error) => {
        logger.error("E3001", "Failed to save chat message", { spaceId, playerId, error: (error as Error).message })
        // Rollback event on DB save failure
        io.to(spaceId).emit("chat:messageFailed", {
          tempId,
          reason: "메시지 저장에 실패했습니다. 다시 시도해주세요.",
        })
      })
    }
  })

  // Reaction toggle (real-time sync)
  socket.on("reaction:toggle", ({ messageId, type }: ReactionAddRequest) => {
    const { spaceId, playerId, nickname } = socket.data

    if (!spaceId || !playerId || !messageId || !type) {
      if (IS_DEV) {
        console.warn(`[Socket] 👍 Reaction rejected: missing data`, { spaceId: !!spaceId, playerId: !!playerId, messageId: !!messageId, type: !!type })
      }
      return
    }

    // Warning if no nickname (for debugging)
    if (!nickname) {
      console.warn(`[Socket] 👍 Reaction by user without nickname: playerId=${playerId}`)
    }

    // Reaction data
    const reactionData: ReactionData = {
      messageId,
      type,
      userId: playerId,
      userNickname: nickname || "익명",
      action: "add", // Client handles toggle
    }

    // Broadcast to others (sender uses optimistic update)
    socket.to(spaceId).emit("reaction:updated", reactionData)

    if (IS_DEV) {
      console.log(`[Socket] 👍 Reaction ${type} on message ${messageId.substring(0, 10)}... by ${nickname || playerId}`)
    }
  })

  // Whisper (with reply support) + DB save
  socket.on("whisper:send", ({ targetNickname, content, replyTo }) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (!spaceId || !playerId || !content.trim()) return

    // Rate limit check
    const rateCheck = checkRateLimit(playerId, content)
    if (!rateCheck.allowed) {
      socket.emit("whisper:error", { message: rateCheck.reason || "메시지 전송이 제한되었습니다." })
      return
    }

    // Prevent self-whisper
    if (targetNickname === nickname) {
      socket.emit("whisper:error", { message: "자기 자신에게는 귓속말을 보낼 수 없습니다." })
      return
    }

    // Find all sockets with target nickname
    const targetSockets = findAllSocketsByNickname(io, spaceId, targetNickname)
      .filter(s => s.data.playerId !== playerId) // Exclude self

    // Target not found
    if (targetSockets.length === 0) {
      socket.emit("whisper:error", { message: `"${targetNickname}" 님을 찾을 수 없습니다.` })
      return
    }

    // Nickname spoofing detection - same nickname with different playerIds
    const uniquePlayerIds = new Set(targetSockets.map(s => s.data.playerId))
    if (uniquePlayerIds.size > 1) {
      logger.warn("E5001", "Nickname spoofing detected", { targetNickname, uniqueCount: uniquePlayerIds.size, spaceId })
      socket.emit("whisper:error", { message: `"${targetNickname}" 닉네임이 중복되어 귓속말을 보낼 수 없습니다. 상대방에게 닉네임 변경을 요청하세요.` })
      return
    }

    // Get playerId from first socket (for message data)
    const targetPlayerId = targetSockets[0].data.playerId

    // 1. Optimistic Broadcasting with temp ID
    const tempId = `whisper-${Date.now()}-${playerId}`
    const whisperMessage: ChatMessageData = {
      id: tempId,
      senderId: playerId,
      senderNickname: nickname || "Unknown",
      content: sanitizeMessageContent(content.trim()),
      timestamp: Date.now(),
      type: "whisper",
      targetId: targetPlayerId,
      targetNickname: targetNickname,
      ...(replyTo && { replyTo }),
    }

    // Send to all receiver sockets
    for (const targetSocket of targetSockets) {
      targetSocket.emit("whisper:receive", whisperMessage)
    }

    // Confirmation to sender
    socket.emit("whisper:sent", whisperMessage)

    if (IS_DEV) {
      console.log(`[Socket] Whisper from ${nickname} to ${targetNickname}: ${content.trim().substring(0, 30)}...`)
    }

    // 2. Background DB save
    const senderType = sessionToken?.startsWith("auth-") ? "USER" : "GUEST"
    const senderId = sessionToken?.replace("auth-", "").replace("guest-", "") || playerId

    prisma.chatMessage.create({
      data: {
        spaceId,
        senderId,
        senderType,
        senderName: nickname || "Unknown",
        content: sanitizeMessageContent(content.trim()),
        type: "WHISPER",
        targetId: targetPlayerId,
      },
    }).then((savedMessage) => {
      // 3. ID update for sender and receivers
      const idUpdateData = { tempId, realId: savedMessage.id }

      socket.emit("whisper:messageIdUpdate", idUpdateData)

      for (const targetSocket of targetSockets) {
        targetSocket.emit("whisper:messageIdUpdate", idUpdateData)
      }

      if (IS_DEV) {
        logger.info("I3002", "Whisper saved to DB", { tempId, realId: savedMessage.id })
      }
    }).catch((error) => {
      logger.error("E3001", "Failed to save whisper message", { spaceId, playerId, error: (error as Error).message })
      // Rollback event
      const failedData = { tempId, reason: "귓속말 저장에 실패했습니다." }
      socket.emit("whisper:messageFailed", failedData)
      for (const targetSocket of targetSockets) {
        targetSocket.emit("whisper:messageFailed", failedData)
      }
    })
  })
}
