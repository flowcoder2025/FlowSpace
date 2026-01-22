/**
 * Media Handlers
 * recording:start/stop, spotlight:activate/deactivate, proximity:set
 */

import { prisma } from "../prisma"
import { IS_DEV } from "../config"
import { type TypedServer, type TypedSocket } from "../utils"
import { verifyAdminPermission } from "../services"
import {
  recordingStates,
  spotlightStates,
  getOrCreateSpotlightState,
  getProximityState,
  setProximityState,
} from "../state"
import type {
  RecordingStatusData,
  SpotlightActivatedData,
  ChatMessageData,
} from "../../src/features/space/socket/types"

export function registerMediaHandlers(io: TypedServer, socket: TypedSocket) {
  // ============================================
  // Recording Events (Legal Compliance)
  // ============================================

  // Start recording
  socket.on("recording:start", async () => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("recording:error", { message: "공간 정보가 없습니다." })
      return
    }

    // Verify permission: STAFF or higher
    if (sessionToken) {
      const verification = await verifyAdminPermission(spaceId, sessionToken, "recording")
      if (!verification.valid) {
        socket.emit("recording:error", { message: verification.error || "녹화 권한이 없습니다. STAFF 이상만 녹화할 수 있습니다." })
        return
      }
    } else if (!IS_DEV) {
      socket.emit("recording:error", { message: "인증이 필요합니다." })
      return
    }

    // Check if already recording
    const existingRecording = recordingStates.get(spaceId)
    if (existingRecording?.isRecording) {
      socket.emit("recording:error", { message: `이미 ${existingRecording.recorderNickname}님이 녹화 중입니다.` })
      return
    }

    // Save recording state
    const recordingStatus: RecordingStatusData = {
      isRecording: true,
      recorderId: playerId,
      recorderNickname: nickname || "Unknown",
      startedAt: Date.now(),
    }
    recordingStates.set(spaceId, recordingStatus)

    // Broadcast to all participants (REC indicator)
    io.to(spaceId).emit("recording:started", recordingStatus)

    console.log(`[Socket] 🔴 Recording STARTED by ${nickname} in space ${spaceId}`)
  })

  // Stop recording
  socket.on("recording:stop", async () => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("recording:error", { message: "공간 정보가 없습니다." })
      return
    }

    const existingRecording = recordingStates.get(spaceId)

    // Not recording
    if (!existingRecording?.isRecording) {
      socket.emit("recording:error", { message: "현재 녹화 중이 아닙니다." })
      return
    }

    // Verify permission: recorder or STAFF can stop
    const isRecorder = existingRecording.recorderId === playerId
    if (!isRecorder && sessionToken) {
      const verification = await verifyAdminPermission(spaceId, sessionToken, "recording")
      if (!verification.valid) {
        socket.emit("recording:error", { message: "녹화 중지 권한이 없습니다." })
        return
      }
    } else if (!isRecorder && !IS_DEV) {
      socket.emit("recording:error", { message: "녹화 중지 권한이 없습니다." })
      return
    }

    // Update recording state
    const stoppedStatus: RecordingStatusData = {
      isRecording: false,
      recorderId: existingRecording.recorderId,
      recorderNickname: existingRecording.recorderNickname,
      startedAt: existingRecording.startedAt,
    }
    recordingStates.delete(spaceId)

    // Broadcast to all participants (REC cleared)
    io.to(spaceId).emit("recording:stopped", stoppedStatus)

    console.log(`[Socket] ⬛ Recording STOPPED by ${nickname} in space ${spaceId}`)
  })

  // ============================================
  // Spotlight Events
  // ============================================

  // Activate spotlight
  socket.on("spotlight:activate", async () => {
    const { spaceId, playerId, nickname, hasSpotlightGrant, spotlightGrantId } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("spotlight:error", { message: "공간 정보가 없습니다." })
      return
    }

    // Verify permission: must have spotlight grant
    if (!hasSpotlightGrant || !spotlightGrantId) {
      socket.emit("spotlight:error", { message: "스포트라이트 권한이 없습니다." })
      return
    }

    try {
      // Re-verify grant validity in DB
      const grant = await prisma.spotlightGrant.findFirst({
        where: {
          id: spotlightGrantId,
          spaceId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      })

      if (!grant) {
        socket.data.hasSpotlightGrant = false
        socket.data.spotlightGrantId = undefined
        socket.emit("spotlight:error", { message: "스포트라이트 권한이 만료되었습니다." })
        return
      }

      // Update to active
      await prisma.spotlightGrant.update({
        where: { id: spotlightGrantId },
        data: { isActive: true },
      })

      socket.data.isSpotlightActive = true

      // Update memory state
      const spotlightState = getOrCreateSpotlightState(spaceId)
      spotlightState.set(playerId, {
        participantId: playerId,
        nickname: nickname || "Unknown",
      })

      // Broadcast to all participants
      const activatedData: SpotlightActivatedData = {
        participantId: playerId,
        nickname: nickname || "Unknown",
        isActive: true,
      }
      io.to(spaceId).emit("spotlight:activated", activatedData)

      console.log(`[Socket] 🔦 Spotlight ACTIVATED by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Spotlight activate error:", error)
      socket.emit("spotlight:error", { message: "스포트라이트 활성화에 실패했습니다." })
    }
  })

  // Deactivate spotlight
  socket.on("spotlight:deactivate", async () => {
    const { spaceId, playerId, nickname, spotlightGrantId, isSpotlightActive } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("spotlight:error", { message: "공간 정보가 없습니다." })
      return
    }

    // Already deactivated
    if (!isSpotlightActive) {
      socket.emit("spotlight:error", { message: "스포트라이트가 이미 비활성화 상태입니다." })
      return
    }

    try {
      // Update DB
      if (spotlightGrantId) {
        await prisma.spotlightGrant.update({
          where: { id: spotlightGrantId },
          data: { isActive: false },
        })
      }

      socket.data.isSpotlightActive = false

      // Update memory state
      const spotlightState = spotlightStates.get(spaceId)
      if (spotlightState) {
        spotlightState.delete(playerId)
      }

      // Broadcast to all participants
      const deactivatedData: SpotlightActivatedData = {
        participantId: playerId,
        nickname: nickname || "Unknown",
        isActive: false,
      }
      io.to(spaceId).emit("spotlight:deactivated", deactivatedData)

      console.log(`[Socket] ⬛ Spotlight DEACTIVATED by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Spotlight deactivate error:", error)
      socket.emit("spotlight:error", { message: "스포트라이트 비활성화에 실패했습니다." })
    }
  })

  // ============================================
  // Proximity Communication
  // ============================================

  // Set proximity mode (admin only)
  socket.on("proximity:set", async (data: { enabled: boolean }) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    console.log(`[Socket] 📡 proximity:set received:`, { enabled: data.enabled, spaceId, playerId, nickname, sessionToken: sessionToken?.substring(0, 10) + '...' })

    if (!spaceId || !playerId) {
      console.warn(`[Socket] 📡 proximity:set failed: not in space`)
      socket.emit("proximity:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // Verify permission (STAFF or higher)
    if (sessionToken) {
      console.log(`[Socket] 📡 Verifying admin permission for proximity...`)
      const verification = await verifyAdminPermission(spaceId, sessionToken, "proximity")
      console.log(`[Socket] 📡 Verification result:`, verification)
      if (!verification.valid) {
        console.warn(`[Socket] 📡 proximity:set denied:`, verification.error)
        socket.emit("proximity:error", { message: verification.error || "근접 통신 설정 권한이 없습니다. STAFF 이상만 가능합니다." })
        return
      }
    } else if (!IS_DEV) {
      console.warn(`[Socket] 📡 proximity:set denied: no sessionToken in production`)
      socket.emit("proximity:error", { message: "권한이 없습니다." })
      return
    }

    // Update state
    setProximityState(spaceId, data.enabled)

    // Broadcast to all participants
    io.to(spaceId).emit("proximity:changed", {
      enabled: data.enabled,
      changedBy: nickname || "Unknown",
    })

    // System message
    const modeText = data.enabled ? "근접 모드" : "전역 모드"
    const systemMessage: ChatMessageData = {
      id: `sys-proximity-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `📡 음성/영상 통신이 ${modeText}로 변경되었습니다. (by ${nickname})`,
      timestamp: Date.now(),
      type: "system",
    }
    io.to(spaceId).emit("chat:system", systemMessage)

    console.log(`[Socket] 📡 Proximity ${data.enabled ? "ENABLED" : "DISABLED"} by ${nickname} in space ${spaceId}`)
  })
}
