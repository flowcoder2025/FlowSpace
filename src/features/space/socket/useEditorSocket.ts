"use client"

/**
 * useEditorSocket - 맵 에디터 실시간 동기화 훅
 *
 * Phase 5.3: 클라이언트에서 맵 오브젝트 배치/수정/삭제를 Socket.io로 전송하고
 * 다른 클라이언트의 변경사항을 실시간으로 수신합니다.
 */

import { useEffect, useCallback, useRef } from "react"
import { io, Socket } from "socket.io-client"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MapObjectData,
  ObjectPlaceRequest,
  ObjectUpdateRequest,
  ObjectDeleteRequest,
  ObjectPlacedData,
  ObjectUpdatedData,
  ObjectDeletedData,
  ObjectsSyncData,
  GridPosition,
} from "./types"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
const IS_DEV = process.env.NODE_ENV === "development"

interface UseEditorSocketOptions {
  /** 기존 Socket 인스턴스 (useSocket에서 공유) */
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
  /** 오브젝트 배치됨 콜백 */
  onObjectPlaced?: (data: ObjectPlacedData) => void
  /** 오브젝트 업데이트됨 콜백 */
  onObjectUpdated?: (data: ObjectUpdatedData) => void
  /** 오브젝트 삭제됨 콜백 */
  onObjectDeleted?: (data: ObjectDeletedData) => void
  /** 전체 오브젝트 동기화 콜백 (입장 시) */
  onObjectsSync?: (data: ObjectsSyncData) => void
  /** 오브젝트 에러 콜백 */
  onObjectError?: (message: string) => void
}

interface UseEditorSocketReturn {
  /** 오브젝트 배치 요청 */
  placeObject: (data: ObjectPlaceRequest) => void
  /** 오브젝트 업데이트 요청 */
  updateObject: (data: ObjectUpdateRequest) => void
  /** 오브젝트 삭제 요청 */
  deleteObject: (objectId: string) => void
}

/**
 * 맵 에디터 실시간 동기화 훅
 *
 * @example
 * ```tsx
 * const { placeObject, updateObject, deleteObject } = useEditorSocket({
 *   socket,
 *   onObjectPlaced: (data) => {
 *     // 다른 사용자가 배치한 오브젝트 추가
 *     addObject(data.object)
 *   },
 *   onObjectUpdated: (data) => {
 *     // 오브젝트 상태 업데이트
 *     updateLocalObject(data.object)
 *   },
 *   onObjectDeleted: (data) => {
 *     // 오브젝트 제거
 *     removeObject(data.objectId)
 *   },
 * })
 *
 * // 오브젝트 배치
 * placeObject({
 *   assetId: "chair",
 *   position: { x: 5, y: 10 },
 *   rotation: 0,
 * })
 * ```
 */
export function useEditorSocket({
  socket,
  onObjectPlaced,
  onObjectUpdated,
  onObjectDeleted,
  onObjectsSync,
  onObjectError,
}: UseEditorSocketOptions): UseEditorSocketReturn {
  // 콜백 refs (최신 참조 유지)
  const onObjectPlacedRef = useRef(onObjectPlaced)
  const onObjectUpdatedRef = useRef(onObjectUpdated)
  const onObjectDeletedRef = useRef(onObjectDeleted)
  const onObjectsSyncRef = useRef(onObjectsSync)
  const onObjectErrorRef = useRef(onObjectError)

  // 콜백 업데이트
  useEffect(() => {
    onObjectPlacedRef.current = onObjectPlaced
    onObjectUpdatedRef.current = onObjectUpdated
    onObjectDeletedRef.current = onObjectDeleted
    onObjectsSyncRef.current = onObjectsSync
    onObjectErrorRef.current = onObjectError
  }, [onObjectPlaced, onObjectUpdated, onObjectDeleted, onObjectsSync, onObjectError])

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!socket) return

    // 오브젝트 배치됨
    const handleObjectPlaced = (data: ObjectPlacedData) => {
      if (IS_DEV) {
        console.log("[EditorSocket] 📦 Object placed:", data.object.assetId, "by", data.placedByNickname)
      }
      onObjectPlacedRef.current?.(data)
    }

    // 오브젝트 업데이트됨
    const handleObjectUpdated = (data: ObjectUpdatedData) => {
      if (IS_DEV) {
        console.log("[EditorSocket] 📝 Object updated:", data.object.id, "by", data.updatedByNickname)
      }
      onObjectUpdatedRef.current?.(data)
    }

    // 오브젝트 삭제됨
    const handleObjectDeleted = (data: ObjectDeletedData) => {
      if (IS_DEV) {
        console.log("[EditorSocket] 🗑️ Object deleted:", data.objectId, "by", data.deletedByNickname)
      }
      onObjectDeletedRef.current?.(data)
    }

    // 전체 오브젝트 동기화 (입장 시)
    const handleObjectsSync = (data: ObjectsSyncData) => {
      if (IS_DEV) {
        console.log("[EditorSocket] 🔄 Objects sync:", data.objects.length, "objects")
      }
      onObjectsSyncRef.current?.(data)
    }

    // 오브젝트 에러
    const handleObjectError = (data: { message: string }) => {
      if (IS_DEV) {
        console.error("[EditorSocket] ❌ Object error:", data.message)
      }
      onObjectErrorRef.current?.(data.message)
    }

    // 리스너 등록
    socket.on("object:placed", handleObjectPlaced)
    socket.on("object:updated", handleObjectUpdated)
    socket.on("object:deleted", handleObjectDeleted)
    socket.on("objects:sync", handleObjectsSync)
    socket.on("object:error", handleObjectError)

    // 클린업
    return () => {
      socket.off("object:placed", handleObjectPlaced)
      socket.off("object:updated", handleObjectUpdated)
      socket.off("object:deleted", handleObjectDeleted)
      socket.off("objects:sync", handleObjectsSync)
      socket.off("object:error", handleObjectError)
    }
  }, [socket])

  // 오브젝트 배치 요청
  const placeObject = useCallback((data: ObjectPlaceRequest) => {
    if (!socket?.connected) {
      if (IS_DEV) console.warn("[EditorSocket] Socket not connected, cannot place object")
      onObjectErrorRef.current?.("연결이 끊어져 오브젝트를 배치할 수 없습니다.")
      return
    }

    if (IS_DEV) {
      console.log("[EditorSocket] 📤 Placing object:", data.assetId, "at", data.position)
    }

    socket.emit("object:place", data)
  }, [socket])

  // 오브젝트 업데이트 요청
  const updateObject = useCallback((data: ObjectUpdateRequest) => {
    if (!socket?.connected) {
      if (IS_DEV) console.warn("[EditorSocket] Socket not connected, cannot update object")
      onObjectErrorRef.current?.("연결이 끊어져 오브젝트를 수정할 수 없습니다.")
      return
    }

    if (IS_DEV) {
      console.log("[EditorSocket] 📤 Updating object:", data.objectId)
    }

    socket.emit("object:update", data)
  }, [socket])

  // 오브젝트 삭제 요청
  const deleteObject = useCallback((objectId: string) => {
    if (!socket?.connected) {
      if (IS_DEV) console.warn("[EditorSocket] Socket not connected, cannot delete object")
      onObjectErrorRef.current?.("연결이 끊어져 오브젝트를 삭제할 수 없습니다.")
      return
    }

    if (IS_DEV) {
      console.log("[EditorSocket] 📤 Deleting object:", objectId)
    }

    socket.emit("object:delete", { objectId })
  }, [socket])

  return {
    placeObject,
    updateObject,
    deleteObject,
  }
}

// 타입 재export (편의성)
export type {
  MapObjectData,
  ObjectPlaceRequest,
  ObjectUpdateRequest,
  ObjectDeleteRequest,
  ObjectPlacedData,
  ObjectUpdatedData,
  ObjectDeletedData,
  ObjectsSyncData,
  GridPosition,
}
