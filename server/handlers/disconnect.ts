/**
 * Disconnect Handler
 * Cleanup on socket disconnect
 */

import { prisma } from "../prisma"
import { IS_DEV } from "../config"
import { logger, type TypedServer, type TypedSocket } from "../utils"
import { logGuestEvent } from "../services"
import { cleanupRateLimitState } from "../middleware/rate-limit"
import {
  removePlayerFromRoom,
  removeFromPartyRoom,
  recordingStates,
  spotlightStates,
} from "../state"
import type {
  ChatMessageData,
  RecordingStatusData,
  SpotlightActivatedData,
} from "../../src/features/space/socket/types"

export function registerDisconnectHandler(io: TypedServer, socket: TypedSocket) {
  socket.on("disconnect", (reason) => {
    const { spaceId, playerId, nickname, sessionToken, partyId, partyName } = socket.data

    // Cleanup rate limit state (playerId-based)
    if (playerId && spaceId) {
      cleanupRateLimitState(io, playerId, spaceId)
    }

    if (spaceId && playerId) {
      removePlayerFromRoom(spaceId, playerId)

      // Recording cleanup: stop recording if recorder disconnects
      const existingRecording = recordingStates.get(spaceId)
      if (existingRecording?.isRecording && existingRecording.recorderId === playerId) {
        const stoppedStatus: RecordingStatusData = {
          isRecording: false,
          recorderId: existingRecording.recorderId,
          recorderNickname: existingRecording.recorderNickname,
          startedAt: existingRecording.startedAt,
        }
        recordingStates.delete(spaceId)
        io.to(spaceId).emit("recording:stopped", stoppedStatus)
        console.log(`[Socket] ⬛ Recording auto-stopped (${nickname} disconnected) in space ${spaceId}`)
      }

      // Spotlight cleanup: deactivate if active
      const spotlightState = spotlightStates.get(spaceId)
      if (spotlightState?.has(playerId)) {
        spotlightState.delete(playerId)

        // DB update (async, ignore failures)
        if (socket.data.spotlightGrantId) {
          prisma.spotlightGrant.update({
            where: { id: socket.data.spotlightGrantId },
            data: { isActive: false },
          }).catch(() => {})
        }

        // Notify other participants
        const deactivatedData: SpotlightActivatedData = {
          participantId: playerId,
          nickname: nickname || "Unknown",
          isActive: false,
        }
        io.to(spaceId).emit("spotlight:deactivated", deactivatedData)
        console.log(`[Socket] ⬛ Spotlight auto-deactivated (${nickname} disconnected) in space ${spaceId}`)
      }

      // Party cleanup: remove from party room
      if (partyId) {
        removeFromPartyRoom(spaceId, partyId, socket.id)

        if (IS_DEV) {
          console.log(`[Socket] ${nickname} disconnected from party zone ${partyName} (${partyId})`)
        }
      }

      // EXIT event logging (async, ignore failures)
      if (sessionToken) {
        logGuestEvent(sessionToken, spaceId, "EXIT", { reason: `disconnect:${reason}` }).catch(() => {})
      }

      // Notify other players
      socket.to(spaceId).emit("player:left", { id: playerId })

      // System message
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

    logger.info("E2002", "Client disconnected", { socketId: socket.id, reason })
  })
}
