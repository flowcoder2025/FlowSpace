/**
 * Map Object Handlers
 * object:place, object:update, object:delete
 */

import { prisma } from "../prisma"
import { IS_DEV } from "../config"
import { type TypedServer, type TypedSocket } from "../utils"
import { verifyAdminPermission } from "../services"
import type {
  ObjectPlaceRequest,
  ObjectUpdateRequest,
  ObjectDeleteRequest,
  MapObjectData,
} from "../../src/features/space/socket/types"

export function registerObjectsHandlers(io: TypedServer, socket: TypedSocket) {
  // Place object
  socket.on("object:place", async (data: ObjectPlaceRequest) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("object:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // Verify permission (STAFF or higher)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "placeObject")
    if (!verification.valid) {
      socket.emit("object:error", { message: verification.error || "오브젝트 배치 권한이 없습니다." })
      return
    }

    try {
      // Save to DB
      const mapObject = await prisma.mapObject.create({
        data: {
          spaceId,
          assetId: data.assetId,
          positionX: data.position.x,
          positionY: data.position.y,
          rotation: data.rotation || 0,
          linkedObjectId: data.linkedObjectId,
          customData: data.customData as object | undefined,
          placedBy: playerId,
          placedByType: sessionToken.startsWith("auth-") ? "USER" : "GUEST",
        },
      })

      // Convert to MapObjectData
      const objectData: MapObjectData = {
        id: mapObject.id,
        assetId: mapObject.assetId,
        position: { x: mapObject.positionX, y: mapObject.positionY },
        rotation: mapObject.rotation as 0 | 90 | 180 | 270,
        linkedObjectId: mapObject.linkedObjectId || undefined,
        customData: mapObject.customData as Record<string, unknown> | undefined,
        placedBy: mapObject.placedBy,
        placedAt: mapObject.createdAt.toISOString(),
      }

      // Broadcast to all clients
      io.to(spaceId).emit("object:placed", {
        object: objectData,
        placedByNickname: nickname,
      })

      if (IS_DEV) {
        console.log(`[Socket] 📦 Object placed by ${nickname}: ${data.assetId} at (${data.position.x}, ${data.position.y})`)
      }
    } catch (error) {
      console.error("[Socket] Object place error:", error)
      socket.emit("object:error", { message: "오브젝트 배치에 실패했습니다." })
    }
  })

  // Update object
  socket.on("object:update", async (data: ObjectUpdateRequest) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("object:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // Verify permission (STAFF or higher)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "updateObject")
    if (!verification.valid) {
      socket.emit("object:error", { message: verification.error || "오브젝트 수정 권한이 없습니다." })
      return
    }

    try {
      // Check existing object
      const existing = await prisma.mapObject.findFirst({
        where: { id: data.objectId, spaceId },
      })

      if (!existing) {
        socket.emit("object:error", { message: "오브젝트를 찾을 수 없습니다." })
        return
      }

      // Prepare update data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {}

      if (data.position) {
        updateData.positionX = data.position.x
        updateData.positionY = data.position.y
      }
      if (data.rotation !== undefined) {
        updateData.rotation = data.rotation
      }
      if (data.linkedObjectId !== undefined) {
        updateData.linkedObjectId = data.linkedObjectId || null
      }
      if (data.customData !== undefined) {
        updateData.customData = data.customData || undefined
      }

      // DB update
      const mapObject = await prisma.mapObject.update({
        where: { id: data.objectId },
        data: updateData as Parameters<typeof prisma.mapObject.update>[0]["data"],
      })

      // Convert to MapObjectData
      const objectData: MapObjectData = {
        id: mapObject.id,
        assetId: mapObject.assetId,
        position: { x: mapObject.positionX, y: mapObject.positionY },
        rotation: mapObject.rotation as 0 | 90 | 180 | 270,
        linkedObjectId: mapObject.linkedObjectId || undefined,
        customData: mapObject.customData as Record<string, unknown> | undefined,
        placedBy: mapObject.placedBy,
        placedAt: mapObject.createdAt.toISOString(),
      }

      // Broadcast to all clients
      io.to(spaceId).emit("object:updated", {
        object: objectData,
        updatedByNickname: nickname,
      })

      if (IS_DEV) {
        console.log(`[Socket] 📦 Object updated by ${nickname}: ${data.objectId}`)
      }
    } catch (error) {
      console.error("[Socket] Object update error:", error)
      socket.emit("object:error", { message: "오브젝트 수정에 실패했습니다." })
    }
  })

  // Delete object
  socket.on("object:delete", async (data: ObjectDeleteRequest) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("object:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // Verify permission (STAFF or higher)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "deleteObject")
    if (!verification.valid) {
      socket.emit("object:error", { message: verification.error || "오브젝트 삭제 권한이 없습니다." })
      return
    }

    try {
      // Check existing object
      const existing = await prisma.mapObject.findFirst({
        where: { id: data.objectId, spaceId },
      })

      if (!existing) {
        socket.emit("object:error", { message: "오브젝트를 찾을 수 없습니다." })
        return
      }

      // Unlink connected objects
      if (existing.linkedObjectId) {
        await prisma.mapObject.updateMany({
          where: { linkedObjectId: existing.id },
          data: { linkedObjectId: null },
        })
      }

      // Delete from DB
      await prisma.mapObject.delete({
        where: { id: data.objectId },
      })

      // Broadcast to all clients
      io.to(spaceId).emit("object:deleted", {
        objectId: data.objectId,
        deletedBy: playerId,
        deletedByNickname: nickname,
      })

      if (IS_DEV) {
        console.log(`[Socket] 🗑️ Object deleted by ${nickname}: ${data.objectId}`)
      }
    } catch (error) {
      console.error("[Socket] Object delete error:", error)
      socket.emit("object:error", { message: "오브젝트 삭제에 실패했습니다." })
    }
  })
}
