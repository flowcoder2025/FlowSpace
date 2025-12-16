/**
 * Socket module exports
 */
export { useSocket } from "./useSocket"
export type { SocketError } from "./useSocket"

// Phase 5.3: 에디터 실시간 동기화 훅
export { useEditorSocket } from "./useEditorSocket"
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
} from "./useEditorSocket"

export type {
  PlayerPosition,
  ChatMessageData,
  RoomData,
  ClientToServerEvents,
  ServerToClientEvents,
} from "./types"
