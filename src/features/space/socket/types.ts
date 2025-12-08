/**
 * Socket.io Event Types
 * Shared type definitions for client-server communication
 */

// Avatar color type
export type AvatarColor = "default" | "red" | "green" | "purple" | "orange" | "pink"

// Player position data
export interface PlayerPosition {
  id: string
  nickname: string
  x: number
  y: number
  direction: "up" | "down" | "left" | "right"
  isMoving: boolean
  avatarColor?: AvatarColor
}

// Player jump data
export interface PlayerJumpData {
  id: string
  x: number
  y: number
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
  yourPlayerId: string // 🔒 서버에서 파생된 실제 플레이어 ID
}

// Client to Server events
export interface ClientToServerEvents {
  // Connection (🔒 sessionToken 추가 - 보안 검증용)
  "join:space": (data: {
    spaceId: string
    playerId: string
    nickname: string
    avatarColor?: AvatarColor
    sessionToken?: string // 게스트 세션 토큰 (서버에서 검증)
  }) => void
  "leave:space": () => void

  // Movement
  "player:move": (position: Omit<PlayerPosition, "nickname">) => void

  // Jump
  "player:jump": (data: PlayerJumpData) => void

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

  // Jump
  "player:jumped": (data: PlayerJumpData) => void

  // Chat
  "chat:message": (message: ChatMessageData) => void
  "chat:system": (message: ChatMessageData) => void

  // Error (🔒 세션 검증 실패 등)
  "error": (data: { message: string }) => void
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
  avatarColor?: AvatarColor
  sessionToken?: string // 🔒 세션 토큰 (중복 접속 방지용)
}
