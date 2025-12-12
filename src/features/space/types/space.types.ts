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
export type ReactionType = "thumbsup" | "heart" | "check"

export interface MessageReaction {
  type: ReactionType
  userId: string
  userNickname: string
}

/**
 * 메시지 타입
 * - message: 일반 채팅 메시지 (전체 공개)
 * - party: 파티/구역 채팅 (같은 구역 내 사용자에게만)
 * - whisper: 귓속말 (특정 사용자에게만 전송)
 * - system: 시스템 알림 (입장/퇴장, 조작 가이드 등)
 * - announcement: 공지사항
 */
export type MessageType = "message" | "party" | "whisper" | "system" | "announcement"

/**
 * 채팅 탭 타입
 * - all: 모든 메시지 표시 (일반 + 파티 + 귓속말 + 시스템)
 * - party: 파티/구역 채팅만 표시
 * - whisper: 귓속말만 표시 (송신 + 수신)
 * - system: 시스템 메시지만 표시
 * - links: URL이 포함된 메시지만 표시
 */
export type ChatTab = "all" | "party" | "whisper" | "system" | "links"

/**
 * 파티/구역 정보
 * 맵 내 특정 영역을 파티 채팅 구역으로 지정
 */
export interface PartyZone {
  id: string
  name: string
  // 구역 범위 (사각형 기준)
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * 답장 대상 정보 (카카오톡 스타일 인라인 답장)
 */
export interface ReplyTo {
  id: string                  // 원본 메시지 ID
  senderNickname: string      // 원본 작성자 닉네임
  content: string             // 원본 내용 미리보기 (최대 50자)
}

export interface ChatMessage {
  id: string
  senderId: string
  senderNickname: string
  content: string
  timestamp: Date
  type: MessageType
  reactions?: MessageReaction[]

  // 귓속말 전용 필드
  targetId?: string           // 수신자 ID (whisper일 때만)
  targetNickname?: string     // 수신자 닉네임 (whisper일 때만)

  // 파티 전용 필드
  partyId?: string            // 파티/구역 ID (party일 때만)
  partyName?: string          // 파티/구역 이름 (party일 때만)

  // 답장 필드 (모든 메시지 타입에 적용 가능)
  replyTo?: ReplyTo           // 답장 대상 정보
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

// ============================================
// Chat Font Size Types
// ============================================
/**
 * 채팅 글씨 크기 옵션
 * - small: 10px (작게)
 * - medium: 11px (기본)
 * - large: 13px (크게)
 * - xlarge: 15px (매우 크게)
 */
export type ChatFontSize = "small" | "medium" | "large" | "xlarge"

/**
 * 채팅 글씨 크기별 픽셀 값
 */
export const CHAT_FONT_SIZES: Record<ChatFontSize, number> = {
  small: 10,
  medium: 11,
  large: 13,
  xlarge: 15,
}

/**
 * 채팅 글씨 크기 순서 (조절용)
 */
export const CHAT_FONT_SIZE_ORDER: ChatFontSize[] = ["small", "medium", "large", "xlarge"]
