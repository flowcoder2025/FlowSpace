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
// Editor Components
// ============================================
export {
  EditorPanel,
  EditorStatusBar,
  EditorModeIndicator,
  EditorSystemMessage,
  useEditorSystemMessages,
} from "./components/editor"
export type {
  EditorPanelProps,
  EditorStatusBarProps,
  EditorModeIndicatorProps,
  EditorSystemMessageProps,
  SystemMessage,
  SystemMessageType,
} from "./components/editor"

// ============================================
// Editor Stores
// ============================================
export {
  useEditorStore,
  useEditorActive,
  useSelectedTool,
  useSelectedAsset,
  usePairPlacement as useEditorPairPlacement,
  useEditorPanel,
  usePlacedObjects,
  useHistoryState,
} from "./stores"

// ============================================
// Editor Hooks
// ============================================
export {
  useEditorCommands,
  usePairPlacement,
  type UseEditorCommandsOptions,
  type UseEditorCommandsReturn,
  type UsePairPlacementOptions,
  type UsePairPlacementReturn,
} from "./hooks"

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

// Editor Types
export type {
  EditorStore,
  EditorStoreState,
  EditorModeState,
  EditorPanelState,
  EditorTool,
  PairPlacementPhase,
  PlacedObject,
  HistoryEntry,
  GridPosition,
} from "./types/editor.types"
