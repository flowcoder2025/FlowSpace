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

// Message type (공유 타입 - space.types.ts와 일치)
export type MessageType = "message" | "party" | "whisper" | "system" | "announcement"

// 답장 대상 정보 (Socket 전송용)
export interface ReplyToData {
  id: string                  // 원본 메시지 ID
  senderNickname: string      // 원본 작성자 닉네임
  content: string             // 원본 내용 미리보기 (최대 50자)
}

// Chat message data
export interface ChatMessageData {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: number
  type: MessageType

  // 귓속말 전용 필드
  targetId?: string           // 수신자 ID (whisper일 때만)
  targetNickname?: string     // 수신자 닉네임 (whisper일 때만)

  // 파티 전용 필드
  partyId?: string            // 파티/구역 ID (party일 때만)
  partyName?: string          // 파티/구역 이름 (party일 때만)

  // 답장 필드 (모든 메시지 타입에 적용 가능)
  replyTo?: ReplyToData       // 답장 대상 정보
}

// Room/Space data
export interface RoomData {
  spaceId: string
  players: PlayerPosition[]
  yourPlayerId: string // 🔒 서버에서 파생된 실제 플레이어 ID
}

// Profile update data (닉네임/아바타 핫 업데이트)
export interface ProfileUpdateData {
  nickname: string
  avatarColor: AvatarColor
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

  // Chat (답장 지원)
  "chat:message": (data: { content: string; replyTo?: ReplyToData }) => void

  // Whisper (귓속말, 답장 지원)
  "whisper:send": (data: { targetNickname: string; content: string; replyTo?: ReplyToData }) => void

  // Party (파티/구역 채팅)
  "party:join": (data: { partyId: string; partyName: string }) => void
  "party:leave": () => void
  "party:message": (data: { content: string }) => void

  // Profile update (닉네임/아바타 핫 변경)
  "player:updateProfile": (data: ProfileUpdateData) => void
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

  // Profile update (다른 플레이어의 프로필 변경 알림)
  "player:profileUpdated": (data: { id: string } & ProfileUpdateData) => void

  // Chat
  "chat:message": (message: ChatMessageData) => void
  "chat:system": (message: ChatMessageData) => void

  // Whisper (귓속말)
  "whisper:receive": (message: ChatMessageData) => void
  "whisper:sent": (message: ChatMessageData) => void  // 송신 확인 (내가 보낸 귓속말)
  "whisper:error": (data: { message: string }) => void

  // Party (파티/구역 채팅) - 단순히 구역 내 메시지만 구분
  "party:joined": (data: { partyId: string; partyName: string }) => void
  "party:left": (data: { partyId: string }) => void
  "party:message": (message: ChatMessageData) => void
  "party:error": (data: { message: string }) => void

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
  // 파티/구역 정보
  partyId?: string      // 현재 참가 중인 파티 ID
  partyName?: string    // 현재 참가 중인 파티 이름
}
