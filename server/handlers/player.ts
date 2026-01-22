/**
 * Player Handlers
 * player:move, player:jump, player:updateProfile event handlers
 */

import { IS_DEV } from "../config"
import { rooms } from "../state"
import type { TypedServer, TypedSocket } from "../utils"
import type {
  PlayerPosition,
  PlayerJumpData,
  ProfileUpdateData,
} from "../../src/features/space/socket/types"

export function registerPlayerHandlers(io: TypedServer, socket: TypedSocket) {
  // Player movement
  // Security: Use socket.data.playerId, not position.id from client
  socket.on("player:move", (position) => {
    const { spaceId, playerId, nickname, avatarColor, avatarConfig } = socket.data

    // Ignore if not yet joined (no playerId)
    if (!spaceId || !playerId) return

    const room = rooms.get(spaceId)
    if (room) {
      // Internal state keeps full position (needed for player:joined etc.)
      const fullPosition: PlayerPosition = {
        ...position,
        id: playerId,
        nickname: nickname || "Unknown",
        avatarColor: avatarColor || "default",
        avatarConfig,
      }
      room.set(playerId, fullPosition)

      // Broadcast: exclude avatar info (lightweight move packets)
      const movePosition: PlayerPosition = {
        id: playerId,
        nickname: nickname || "Unknown",
        x: position.x,
        y: position.y,
        direction: position.direction,
        isMoving: position.isMoving,
        // avatarColor, avatarConfig omitted - move packet optimization
      }
      socket.to(spaceId).emit("player:moved", movePosition)
    }
  })

  // Player jump
  // Security: Use socket.data.playerId, not data.id from client
  socket.on("player:jump", (data: PlayerJumpData) => {
    const { spaceId, playerId } = socket.data

    // Ignore if not yet joined
    if (!spaceId || !playerId) return

    // Force server-verified playerId
    const verifiedJumpData: PlayerJumpData = {
      ...data,
      id: playerId,
    }

    // Broadcast jump event to other players
    socket.to(spaceId).emit("player:jumped", verifiedJumpData)
    console.log(`[Socket] Player ${playerId} jumped at (${verifiedJumpData.x}, ${verifiedJumpData.y})`)
  })

  // Profile update (nickname/avatar hot update)
  socket.on("player:updateProfile", (data: ProfileUpdateData) => {
    const { spaceId, playerId } = socket.data

    if (!spaceId || !playerId) return

    // Update socket data
    socket.data.nickname = data.nickname
    if (data.avatarColor) {
      socket.data.avatarColor = data.avatarColor
    }
    if (data.avatarConfig) {
      socket.data.avatarConfig = data.avatarConfig
    }

    // Update room state
    const room = rooms.get(spaceId)
    if (room) {
      const player = room.get(playerId)
      if (player) {
        room.set(playerId, {
          ...player,
          nickname: data.nickname,
          ...(data.avatarColor && { avatarColor: data.avatarColor }),
          ...(data.avatarConfig && { avatarConfig: data.avatarConfig }),
        })
      }
    }

    // Broadcast to other players
    socket.to(spaceId).emit("player:profileUpdated", {
      id: playerId,
      nickname: data.nickname,
      ...(data.avatarColor && { avatarColor: data.avatarColor }),
      ...(data.avatarConfig && { avatarConfig: data.avatarConfig }),
    })

    if (IS_DEV) {
      console.log(`[Socket] Profile updated for ${playerId}: ${data.nickname} (color: ${data.avatarColor}, config: ${data.avatarConfig ? 'yes' : 'no'})`)
    }
  })
}
