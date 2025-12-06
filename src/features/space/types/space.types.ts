/**
 * Space Feature Types
 * ZEP 스타일 2D 메타버스 공간 관련 타입 정의
 */

// ============================================
// Participant Types
// ============================================
export interface Participant {
  id: string
  nickname: string
  avatar: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  position?: { x: number; y: number }
}

// ============================================
// Chat Types
// ============================================
export interface ChatMessage {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: Date
  type: "message" | "system" | "announcement"
}

// ============================================
// Space State Types
// ============================================
export interface SpaceState {
  id: string
  name: string
  participants: Participant[]
  localParticipant: Participant | null
  messages: ChatMessage[]
  isConnected: boolean
  isChatOpen: boolean
  isParticipantsOpen: boolean
}

// ============================================
// Control Bar Types
// ============================================
export interface MediaControls {
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
}

// ============================================
// Panel Visibility Types
// ============================================
export interface PanelVisibility {
  chat: boolean
  participants: boolean
}
