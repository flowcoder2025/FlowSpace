/**
 * Space Feature Module
 * ZEP 스타일 2D 메타버스 공간 기능
 */

// ============================================
// Components
// ============================================
export { SpaceLayout } from "./components/SpaceLayout"
export { SpaceHeader } from "./components/SpaceHeader"
export { ChatPanel } from "./components/sidebar/ChatPanel"
export { ParticipantPanel } from "./components/video/ParticipantPanel"
export { ControlBar } from "./components/controls/ControlBar"
export { GameCanvas } from "./components/game/GameCanvas"

// ============================================
// Socket (Multiplayer)
// ============================================
export { useSocket } from "./socket"
export type {
  PlayerPosition,
  ChatMessageData,
  RoomData,
} from "./socket/types"

// ============================================
// LiveKit (Video/Audio)
// ============================================
export { useLiveKit } from "./livekit"
export type {
  LiveKitConfig,
  MediaState,
  ParticipantTrack,
} from "./livekit/types"

// ============================================
// Types
// ============================================
export type {
  Participant,
  ChatMessage,
  SpaceState,
  MediaControls,
  PanelVisibility,
} from "./types/space.types"
