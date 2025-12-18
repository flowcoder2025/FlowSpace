/**
 * Space feature hooks
 */
export { useChatMode, type ChatMode } from "./useChatMode"
export { useChatDrag } from "./useChatDrag"
export { useFullscreen, useFullscreenToggle } from "./useFullscreen"
export { useNotificationSound, type NotificationSoundType } from "./useNotificationSound"
export { useChatStorage } from "./useChatStorage"
export { useMediaDevices, type MediaDeviceInfo } from "./useMediaDevices"
export { useScreenRecorder, type RecordingState, type NotificationType } from "./useScreenRecorder"

// Editor hooks
export {
  useEditorCommands,
  type UseEditorCommandsOptions,
  type UseEditorCommandsReturn,
} from "./useEditorCommands"

export {
  usePairPlacement,
  type UsePairPlacementOptions,
  type UsePairPlacementReturn,
} from "./usePairPlacement"

// Phase 5.4: 디바운스 저장 훅
export { useDebouncedEditorSave } from "./useDebouncedEditorSave"

// Phase 6: 과거 메시지 페이지네이션
export { usePastMessages, mergePastMessages } from "./usePastMessages"
