/**
 * Socket.io Event Types
 * Shared type definitions for client-server communication
 */

// Player position data
export interface PlayerPosition {
  id: string
  nickname: string
  x: number
  y: number
  direction: "up" | "down" | "left" | "right"
  isMoving: boolean
}

// Chat message data
export interface ChatMessageData {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: number
  type: "message" | "system"
}

// Room/Space data
export interface RoomData {
  spaceId: string
  players: PlayerPosition[]
}

// Client to Server events
export interface ClientToServerEvents {
  // Connection
  "join:space": (data: { spaceId: string; playerId: string; nickname: string }) => void
  "leave:space": () => void

  // Movement
  "player:move": (position: Omit<PlayerPosition, "nickname">) => void

  // Chat
  "chat:message": (data: { content: string }) => void
}

// Server to Client events
export interface ServerToClientEvents {
  // Connection
  "room:joined": (data: RoomData) => void
  "player:joined": (player: PlayerPosition) => void
  "player:left": (data: { id: string }) => void

  // Movement
  "player:moved": (position: PlayerPosition) => void

  // Chat
  "chat:message": (message: ChatMessageData) => void
  "chat:system": (message: ChatMessageData) => void
}

// Inter-server events (not used in MVP)
export interface InterServerEvents {
  ping: () => void
}

// Socket data (attached to socket)
export interface SocketData {
  spaceId: string
  playerId: string
  nickname: string
}
