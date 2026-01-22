/**
 * Admin Handlers
 * admin:mute, admin:unmute, admin:kick, admin:deleteMessage, admin:announce
 */

import { prisma } from "../prisma"
import { IS_DEV, NEXT_API_URL } from "../config"
import {
  logger,
  findSocketByMemberId,
  findAllSocketsByNickname,
  extractNickname,
  type TypedServer,
  type TypedSocket,
} from "../utils"
import { verifyAdminPermission, saveMemberRestriction } from "../services"
import type {
  AdminMuteRequest,
  AdminUnmuteRequest,
  AdminKickRequest,
  AdminDeleteMessageRequest,
  AdminAnnounceRequest,
  MemberMutedData,
  MemberUnmutedData,
  MemberKickedData,
  MessageDeletedData,
  AnnouncementData,
  ChatMessageData,
} from "../../src/features/space/socket/types"

export function registerAdminHandlers(io: TypedServer, socket: TypedSocket) {
  // Mute (admin:mute) - nickname-based support
  socket.on("admin:mute", async (data: AdminMuteRequest) => {
    const { spaceId, sessionToken, nickname } = socket.data
    if (!spaceId) {
      socket.emit("admin:error", { action: "mute", message: "공간에 연결되지 않았습니다." })
      return
    }

    // Nickname-based processing (nickname: prefix)
    const targetNicknameFromPrefix = extractNickname(data.targetMemberId)

    if (targetNicknameFromPrefix) {
      // Verify permission (STAFF or higher)
      if (sessionToken) {
        const verification = await verifyAdminPermission(spaceId, sessionToken, "mute")
        if (!verification.valid) {
          socket.emit("admin:error", { action: "mute", message: verification.error || "권한이 없습니다." })
          return
        }
      } else if (!IS_DEV) {
        socket.emit("admin:error", { action: "mute", message: "인증이 필요합니다." })
        return
      }

      // Find all target sockets by nickname
      const targetSockets = findAllSocketsByNickname(io, spaceId, targetNicknameFromPrefix)

      if (targetSockets.length === 0) {
        socket.emit("admin:error", { action: "mute", message: `'${targetNicknameFromPrefix}' 사용자를 찾을 수 없습니다.` })
        return
      }

      // Apply mute to all target sockets
      for (const targetSocket of targetSockets) {
        targetSocket.data.restriction = "MUTED"
      }
      console.log(`[Socket] 🔇 Applied MUTED restriction to ${targetSockets.length} socket(s) for "${targetNicknameFromPrefix}"`)

      // Get playerId from first socket
      const firstTargetSocket = targetSockets[0]

      // Save mute status to DB
      const targetPlayerId = firstTargetSocket.data.playerId
      if (targetPlayerId) {
        const saved = await saveMemberRestriction(
          spaceId,
          targetPlayerId,
          "MUTED",
          socket.data.playerId,
          data.duration,
          data.reason
        )
        if (saved) {
          console.log(`[Socket] 💾 Saved MUTED restriction to DB for ${targetPlayerId}`)
        }
      }

      // System message
      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔇 ${targetNicknameFromPrefix}님이 ${nickname}님에 의해 음소거되었습니다.${data.duration ? ` (${data.duration}분)` : ""}${data.reason ? ` 사유: ${data.reason}` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      // Broadcast mute event
      const mutedData: MemberMutedData = {
        memberId: firstTargetSocket.data.playerId || "",
        nickname: targetNicknameFromPrefix,
        mutedBy: socket.data.playerId || "",
        mutedByNickname: nickname || "",
        duration: data.duration,
        reason: data.reason,
        mutedUntil: data.duration ? new Date(Date.now() + data.duration * 60000).toISOString() : undefined,
      }
      io.to(spaceId).emit("member:muted", mutedData)

      console.log(`[Socket] ${targetNicknameFromPrefix} muted by ${nickname} in space ${spaceId} (nickname-based)`)
      return
    }

    // Legacy: memberId-based API call (admin dashboard)
    if (!sessionToken) {
      socket.emit("admin:error", { action: "mute", message: "인증이 필요합니다." })
      return
    }

    try {
      const response = await fetch(
        `${NEXT_API_URL}/api/spaces/${spaceId}/members/${data.targetMemberId}/mute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `next-auth.session-token=${sessionToken.replace("auth-", "")}`,
          },
          body: JSON.stringify({
            duration: data.duration,
            reason: data.reason,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        socket.emit("admin:error", { action: "mute", message: errorData.error || "음소거 실패" })
        return
      }

      const result = await response.json()
      const targetSocket = findSocketByMemberId(io, spaceId, data.targetMemberId)
      const targetNickname = targetSocket?.data.nickname || "Unknown"

      const mutedData: MemberMutedData = {
        memberId: data.targetMemberId,
        nickname: targetNickname,
        mutedBy: socket.data.playerId || "",
        mutedByNickname: nickname || "",
        duration: data.duration,
        reason: data.reason,
        mutedUntil: result.mutedUntil,
      }
      io.to(spaceId).emit("member:muted", mutedData)

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔇 ${targetNickname}님이 ${nickname}님에 의해 음소거되었습니다.${data.reason ? ` (사유: ${data.reason})` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      console.log(`[Socket] Member ${data.targetMemberId} muted by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Mute error:", error)
      socket.emit("admin:error", { action: "mute", message: "내부 오류가 발생했습니다." })
    }
  })

  // Unmute (admin:unmute) - nickname-based support
  socket.on("admin:unmute", async (data: AdminUnmuteRequest) => {
    const { spaceId, sessionToken, nickname } = socket.data
    if (!spaceId) {
      socket.emit("admin:error", { action: "unmute", message: "공간에 연결되지 않았습니다." })
      return
    }

    // Nickname-based processing
    const targetNicknameFromPrefix = extractNickname(data.targetMemberId)

    if (targetNicknameFromPrefix) {
      // Verify permission
      if (sessionToken) {
        const verification = await verifyAdminPermission(spaceId, sessionToken, "unmute")
        if (!verification.valid) {
          socket.emit("admin:error", { action: "unmute", message: verification.error || "권한이 없습니다." })
          return
        }
      } else if (!IS_DEV) {
        socket.emit("admin:error", { action: "unmute", message: "인증이 필요합니다." })
        return
      }

      // Find all target sockets by nickname
      const targetSockets = findAllSocketsByNickname(io, spaceId, targetNicknameFromPrefix)

      if (targetSockets.length === 0) {
        socket.emit("admin:error", { action: "unmute", message: `'${targetNicknameFromPrefix}' 사용자를 찾을 수 없습니다.` })
        return
      }

      // Remove mute from all target sockets
      for (const targetSocket of targetSockets) {
        targetSocket.data.restriction = "NONE"
      }
      console.log(`[Socket] 🔊 Removed MUTED restriction from ${targetSockets.length} socket(s) for "${targetNicknameFromPrefix}"`)

      // Save unmute to DB
      const firstTargetSocket = targetSockets[0]
      const targetPlayerId = firstTargetSocket.data.playerId
      if (targetPlayerId) {
        const saved = await saveMemberRestriction(spaceId, targetPlayerId, "NONE")
        if (saved) {
          console.log(`[Socket] 💾 Saved NONE restriction to DB for ${targetPlayerId}`)
        }
      }

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔊 ${targetNicknameFromPrefix}님의 음소거가 ${nickname}님에 의해 해제되었습니다.`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      const unmutedData: MemberUnmutedData = {
        memberId: firstTargetSocket.data.playerId || "",
        nickname: targetNicknameFromPrefix,
        unmutedBy: socket.data.playerId || "",
        unmutedByNickname: nickname || "",
      }
      io.to(spaceId).emit("member:unmuted", unmutedData)

      console.log(`[Socket] ${targetNicknameFromPrefix} unmuted by ${nickname} in space ${spaceId} (nickname-based)`)
      return
    }

    // Legacy: memberId-based API call
    if (!sessionToken) {
      socket.emit("admin:error", { action: "unmute", message: "인증이 필요합니다." })
      return
    }

    try {
      const response = await fetch(
        `${NEXT_API_URL}/api/spaces/${spaceId}/members/${data.targetMemberId}/mute`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `next-auth.session-token=${sessionToken.replace("auth-", "")}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        socket.emit("admin:error", { action: "unmute", message: errorData.error || "음소거 해제 실패" })
        return
      }

      const targetSocket = findSocketByMemberId(io, spaceId, data.targetMemberId)
      const targetNickname = targetSocket?.data.nickname || "Unknown"

      const unmutedData: MemberUnmutedData = {
        memberId: data.targetMemberId,
        nickname: targetNickname,
        unmutedBy: socket.data.playerId || "",
        unmutedByNickname: nickname || "",
      }
      io.to(spaceId).emit("member:unmuted", unmutedData)

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔊 ${targetNickname}님의 음소거가 해제되었습니다.`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      console.log(`[Socket] Member ${data.targetMemberId} unmuted by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Unmute error:", error)
      socket.emit("admin:error", { action: "unmute", message: "내부 오류가 발생했습니다." })
    }
  })

  // Kick/Ban (admin:kick) - nickname-based support
  socket.on("admin:kick", async (data: AdminKickRequest) => {
    const { spaceId, sessionToken, nickname } = socket.data
    if (!spaceId) {
      socket.emit("admin:error", { action: "kick", message: "공간에 연결되지 않았습니다." })
      return
    }

    // Nickname-based processing
    const targetNicknameFromPrefix = extractNickname(data.targetMemberId)

    if (targetNicknameFromPrefix) {
      // Verify permission
      if (sessionToken) {
        const verification = await verifyAdminPermission(spaceId, sessionToken, "kick")
        if (!verification.valid) {
          socket.emit("admin:error", { action: "kick", message: verification.error || "권한이 없습니다." })
          return
        }
      } else if (!IS_DEV) {
        socket.emit("admin:error", { action: "kick", message: "인증이 필요합니다." })
        return
      }

      // Find all target sockets
      const targetSockets = findAllSocketsByNickname(io, spaceId, targetNicknameFromPrefix)

      if (targetSockets.length === 0) {
        socket.emit("admin:error", { action: "kick", message: `'${targetNicknameFromPrefix}' 사용자를 찾을 수 없습니다.` })
        return
      }

      const firstTargetSocket = targetSockets[0]

      // System message
      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🚫 ${targetNicknameFromPrefix}님이 ${nickname}님에 의해 ${data.ban ? "차단" : "강퇴"}되었습니다.${data.reason ? ` (사유: ${data.reason})` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      // Broadcast kick event
      const kickedData: MemberKickedData = {
        memberId: firstTargetSocket.data.playerId || "",
        nickname: targetNicknameFromPrefix,
        kickedBy: socket.data.playerId || "",
        kickedByNickname: nickname || "",
        reason: data.reason,
        banned: data.ban || false,
      }
      io.to(spaceId).emit("member:kicked", kickedData)

      // Disconnect all target sockets
      for (const targetSocket of targetSockets) {
        targetSocket.emit("error", { message: data.ban ? "이 공간에서 차단되었습니다." : "이 공간에서 강퇴되었습니다." })
        targetSocket.disconnect(true)
      }

      console.log(`[Socket] 🚫 Kicked ${targetSockets.length} socket(s) for "${targetNicknameFromPrefix}" by ${nickname} in space ${spaceId}`)
      return
    }

    // Legacy: memberId-based API call
    if (!sessionToken) {
      socket.emit("admin:error", { action: "kick", message: "세션 토큰이 없습니다." })
      return
    }

    try {
      const response = await fetch(
        `${NEXT_API_URL}/api/spaces/${spaceId}/members/${data.targetMemberId}/kick`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `next-auth.session-token=${sessionToken.replace("auth-", "")}`,
          },
          body: JSON.stringify({
            reason: data.reason,
            ban: data.ban,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        socket.emit("admin:error", { action: "kick", message: errorData.error || "강퇴 처리에 실패했습니다." })
        return
      }

      const targetSocket = findSocketByMemberId(io, spaceId, data.targetMemberId)
      const targetNickname = targetSocket?.data.nickname || "Unknown"

      const kickedData: MemberKickedData = {
        memberId: data.targetMemberId,
        nickname: targetNickname,
        kickedBy: socket.data.playerId || "",
        kickedByNickname: nickname || "",
        reason: data.reason,
        banned: data.ban || false,
      }

      io.to(spaceId).emit("member:kicked", kickedData)

      // Disconnect kicked socket
      if (targetSocket) {
        targetSocket.emit("error", { message: data.ban ? "이 공간에서 차단되었습니다." : "이 공간에서 강퇴되었습니다." })
        targetSocket.disconnect(true)
      }

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🚫 ${targetNickname}님이 ${nickname}님에 의해 ${data.ban ? "차단" : "강퇴"}되었습니다.${data.reason ? ` (사유: ${data.reason})` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      console.log(`[Socket] Member ${data.targetMemberId} ${data.ban ? "banned" : "kicked"} by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Kick error:", error)
      socket.emit("admin:error", { action: "kick", message: "내부 오류가 발생했습니다." })
    }
  })

  // Delete message (admin:deleteMessage)
  socket.on("admin:deleteMessage", async (data: AdminDeleteMessageRequest) => {
    const { spaceId, sessionToken, nickname, playerId } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("admin:error", { action: "deleteMessage", message: "공간에 연결되지 않았습니다." })
      return
    }

    // Verify permission
    const verification = await verifyAdminPermission(spaceId, sessionToken, "deleteMessage")
    if (!verification.valid) {
      socket.emit("admin:error", { action: "deleteMessage", message: verification.error || "권한이 없습니다." })
      return
    }

    try {
      // Find message
      const message = await prisma.chatMessage.findUnique({
        where: { id: data.messageId },
      })

      if (!message) {
        socket.emit("admin:error", { action: "deleteMessage", message: "메시지를 찾을 수 없습니다." })
        return
      }

      if (message.spaceId !== spaceId) {
        socket.emit("admin:error", { action: "deleteMessage", message: "이 공간의 메시지가 아닙니다." })
        return
      }

      // Soft delete
      await prisma.chatMessage.update({
        where: { id: data.messageId },
        data: {
          isDeleted: true,
          deletedBy: verification.userId,
          deletedAt: new Date(),
        },
      })

      // Event log
      await prisma.spaceEventLog.create({
        data: {
          spaceId,
          userId: verification.userId,
          eventType: "MESSAGE_DELETED",
          payload: {
            messageId: data.messageId,
            deletedBy: verification.userId,
            originalSenderId: message.senderId,
          },
        },
      })

      const deletedData: MessageDeletedData = {
        messageId: data.messageId,
        deletedBy: playerId || "",
        deletedByNickname: nickname || "",
      }

      io.to(spaceId).emit("chat:messageDeleted", deletedData)

      console.log(`[Socket] Message ${data.messageId} deleted by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Delete message error:", error)
      socket.emit("admin:error", { action: "deleteMessage", message: "내부 오류가 발생했습니다." })
    }
  })

  // Announce (admin:announce)
  socket.on("admin:announce", async (data: AdminAnnounceRequest) => {
    const { spaceId, sessionToken, nickname, playerId } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("admin:error", { action: "announce", message: "Not connected to space" })
      return
    }

    // Verify permission (STAFF or higher)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "announce")
    if (!verification.valid) {
      socket.emit("admin:error", { action: "announce", message: verification.error || "Permission denied" })
      return
    }

    const announcement: AnnouncementData = {
      id: `announce-${Date.now()}`,
      content: data.content.trim(),
      senderId: playerId || "",
      senderNickname: nickname || "",
      timestamp: Date.now(),
    }

    // Send announcement event only (client handles display)
    io.to(spaceId).emit("space:announcement", announcement)

    console.log(`[Socket] Announcement by ${nickname} in space ${spaceId}: ${data.content.substring(0, 50)}...`)
  })
}
