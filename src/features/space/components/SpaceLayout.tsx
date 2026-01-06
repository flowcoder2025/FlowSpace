"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"

import { SpaceHeader } from "./SpaceHeader"
import { FloatingChatOverlay, type AdminCommandResult } from "./chat"
import { ParticipantPanel, type ParticipantViewMode } from "./video/ParticipantPanel"
import { ScreenShareOverlay } from "./video/ScreenShare"
import { ControlBar } from "./controls/ControlBar"
import { VirtualJoystick } from "./controls/VirtualJoystick"
import { GameCanvas } from "./game/GameCanvas"
import { SpaceSettingsModal } from "./SpaceSettingsModal"
import { MediaSettingsModal, type MediaSettingsTab } from "./settings"
import { MemberPanel } from "./MemberPanel"
import { RecordingIndicator } from "./RecordingIndicator"
import { EditorPanel, EditorModeIndicator } from "./editor"
import { IOSAudioActivator } from "./IOSAudioActivator"
import { useSocket } from "../socket"
import { LiveKitRoomProvider, useLiveKitMedia } from "../livekit"
import { useNotificationSound, useChatStorage, usePastMessages, mergePastMessages, useAudioSettings, useAudioGateProcessor } from "../hooks"
import { generateFullHelpMessages, getNextRotatingHint, getWelcomeMessage, HINT_INTERVAL_MS } from "../utils/commandHints"
import { useEditorCommands } from "../hooks/useEditorCommands"
import { useEditorStore } from "../stores/editorStore"
import { eventBridge, GameEvents, type EditorCanvasClickPayload } from "../game/events"
import type { ParsedEditorCommand, GridPosition } from "../types/editor.types"
import type { ChatMessageData, AvatarColor, ReplyToData, AnnouncementData, MessageDeletedData, RecordingStatusData, ReactionData, ReactionType } from "../socket/types"
import { parseAvatarString, getLegacyAvatarColor, getSafeAvatarString } from "../avatar"
import type { ChatMessage } from "../types/space.types"
import type { SpaceRole } from "@prisma/client"

// ============================================
// SpaceLayout Props
// ============================================
interface SpaceLayoutProps {
  spaceId: string
  spaceName: string
  spaceLogoUrl?: string | null
  spacePrimaryColor?: string | null
  spaceInviteCode?: string // 초대 코드 (인게임 초대 링크용)
  userNickname: string
  userId: string
  userAvatarColor?: AvatarColor // Legacy prop (backwards compatibility)
  userAvatar?: string // New format: "classic:default" or "custom:office_male"
  userRole?: SpaceRole // 🛡️ 사용자 역할 (OWNER/STAFF/PARTICIPANT)
  isSuperAdmin?: boolean // 🌟 플랫폼 관리자 (모든 공간에서 관리 권한)
  sessionToken?: string // 게스트 세션 토큰 (LiveKit 인증용)
  onExit: () => void
  onNicknameChange?: (nickname: string, avatar: string) => void // 닉네임 변경 콜백
}

// ============================================
// SpaceLayout Component
// ZEP 스타일 레이아웃: 좌측 채팅 + 중앙 게임 + 우측 참가자
// ============================================
// Helper to convert socket message to ChatMessage
function socketToChatMessage(data: ChatMessageData): ChatMessage {
  return {
    id: data.id,
    senderId: data.senderId,
    senderNickname: data.senderNickname,
    content: data.content,
    timestamp: new Date(data.timestamp),
    type: data.type,
    // 📬 귓속말 전용 필드
    targetId: data.targetId,
    targetNickname: data.targetNickname,
    // 💬 답장 필드
    replyTo: data.replyTo,
  }
}

// ============================================
// 📦 메모리 관리: 메시지 상한
// ============================================
const MAX_MESSAGES = 500

/**
 * 메시지 배열에 새 메시지를 추가하고 최대 개수를 초과하면 오래된 메시지 제거
 * @param prev 기존 메시지 배열
 * @param newMessages 추가할 메시지 (단일 또는 배열)
 * @returns 제한된 메시지 배열
 */
function addMessagesWithLimit(
  prev: ChatMessage[],
  newMessages: ChatMessage | ChatMessage[]
): ChatMessage[] {
  const messagesToAdd = Array.isArray(newMessages) ? newMessages : [newMessages]
  const combined = [...prev, ...messagesToAdd]

  // 최대 개수 초과 시 오래된 메시지(앞쪽) 제거
  if (combined.length > MAX_MESSAGES) {
    return combined.slice(combined.length - MAX_MESSAGES)
  }
  return combined
}

/**
 * SpaceLayout - LiveKitRoomProvider로 SpaceLayoutContent를 래핑
 *
 * @livekit/components-react 공식 훅 사용을 위해 LiveKitRoom 컨텍스트 제공
 */
export function SpaceLayout(props: SpaceLayoutProps) {
  return (
    <LiveKitRoomProvider
      spaceId={props.spaceId}
      participantId={props.userId}
      participantName={props.userNickname}
      sessionToken={props.sessionToken}
    >
      <SpaceLayoutContent {...props} />
    </LiveKitRoomProvider>
  )
}

/**
 * SpaceLayoutContent - 실제 UI 로직
 * LiveKitRoom 컨텍스트 내부에서 useLiveKitMedia 훅 사용
 */
function SpaceLayoutContent({
  spaceId,
  spaceName,
  spaceLogoUrl,
  spacePrimaryColor,
  spaceInviteCode,
  userNickname,
  userId,
  userAvatarColor = "default",
  userAvatar, // New avatar format
  userRole,
  isSuperAdmin = false,
  sessionToken,
  onExit,
  onNicknameChange,
}: SpaceLayoutProps) {
  // Panel visibility
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isMemberPanelOpen, setIsMemberPanelOpen] = useState(false)

  // 🎮 모바일(터치) 디바이스 감지
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false
    return "ontouchstart" in window || navigator.maxTouchPoints > 0
  }, [])

  // 🎬 참가자 패널 뷰 모드 (sidebar | grid | hidden)
  const [participantViewMode, setParticipantViewMode] = useState<ParticipantViewMode>("sidebar")

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // 🔧 미디어 설정 모달
  const [isMediaSettingsOpen, setIsMediaSettingsOpen] = useState(false)
  const [mediaSettingsDefaultTab, setMediaSettingsDefaultTab] = useState<MediaSettingsTab>("audio")

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // 💾 채팅 내역 localStorage 영속성
  const { loadMessages, saveMessages } = useChatStorage({ spaceId })

  // 📥 컴포넌트 마운트 시 저장된 메시지 로드 (📦 500개 상한 적용)
  useEffect(() => {
    const savedMessages = loadMessages()
    if (savedMessages.length > 0) {
      // 저장된 메시지도 최대 개수 제한 적용
      const limitedMessages = savedMessages.length > MAX_MESSAGES
        ? savedMessages.slice(savedMessages.length - MAX_MESSAGES)
        : savedMessages
      setMessages(limitedMessages)
    }
  }, [loadMessages])

  // 💾 메시지 변경 시 저장 (디바운스됨)
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages)
    }
  }, [messages, saveMessages])

  // 📜 Phase 4: 과거 메시지 페이지네이션
  const {
    isLoading: isLoadingMore,
    hasMore: hasMoreMessages,
    loadPastMessages,
    reset: resetPastMessages,
  } = usePastMessages({
    spaceId,
    guestSessionId: sessionToken,
    limit: 50,
    enabled: true,
  })

  // 📜 과거 메시지 로드 핸들러 (스크롤 상단 도달 시)
  const handleLoadMore = useCallback(async () => {
    const pastMessages = await loadPastMessages()
    if (pastMessages.length > 0) {
      setMessages((prev) => mergePastMessages(prev, pastMessages))
    }
  }, [loadPastMessages])

  // 📜 공간 변경 시 페이지네이션 상태 초기화
  useEffect(() => {
    resetPastMessages()
  }, [spaceId, resetPastMessages])

  // 🔔 알림음 훅
  const { playWhisperSound } = useNotificationSound()

  // 🎮 캐릭터 위치/방향 상태 (Phaser에서 eventBridge로 업데이트, 향후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [characterPosition, _setCharacterPosition] = useState<GridPosition>({ x: 5, y: 5 })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [characterDirection, _setCharacterDirection] = useState<"up" | "down" | "left" | "right">("down")

  // Socket message handlers (📦 500개 메모리 상한 적용)
  const handleChatMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => addMessagesWithLimit(prev, socketToChatMessage(data)))
  }, [])

  const handleSystemMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => addMessagesWithLimit(prev, socketToChatMessage(data)))
  }, [])

  // 📬 귓속말 메시지 핸들러 (송신/수신 모두 같은 핸들러)
  const handleWhisperMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => addMessagesWithLimit(prev, socketToChatMessage(data)))
    // 🔔 수신한 귓속말만 알림음 재생 (내가 보낸 게 아닌 경우)
    if (data.senderId !== userId) {
      playWhisperSound()
    }
  }, [userId, playWhisperSound])

  // 📬 귓속말 에러 핸들러 (대상을 찾을 수 없을 때 등)
  const handleWhisperError = useCallback((error: string) => {
    // 시스템 메시지로 에러 표시
    const errorMessage: ChatMessage = {
      id: `whisper-error-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: error,
      timestamp: new Date(),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, errorMessage))
  }, [])

  // 🔄 Local state for nickname/avatar (enables hot reload without socket reconnection)
  const [currentNickname, setCurrentNickname] = useState(userNickname)
  const [currentAvatarColor, setCurrentAvatarColor] = useState<AvatarColor>(userAvatarColor)
  // 🔄 Full avatar string (new format: "classic:default" or "custom:office_male")
  const [currentAvatar, setCurrentAvatar] = useState(() =>
    userAvatar ? getSafeAvatarString(userAvatar) : `classic:${userAvatarColor}`
  )

  // 🛡️ 관리 명령어 에러 핸들러
  const handleAdminError = useCallback((action: string, message: string) => {
    const errorMessage: ChatMessage = {
      id: `admin-error-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `[${action}] ${message}`,
      timestamp: new Date(),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, errorMessage))
  }, [])

  // 🔇 채팅 에러 핸들러 (음소거 등)
  const handleChatError = useCallback((error: string) => {
    const errorMessage: ChatMessage = {
      id: `chat-error-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `🔇 ${error}`,
      timestamp: new Date(),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, errorMessage))
  }, [])

  // 📢 공지 메시지 핸들러
  const handleAnnouncement = useCallback((data: AnnouncementData) => {
    const announceMessage: ChatMessage = {
      id: data.id || `announce-${Date.now()}`,
      senderId: data.senderId,
      senderNickname: data.senderNickname,
      content: `📢 ${data.content}`,
      timestamp: new Date(data.timestamp),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, announceMessage))
  }, [])

  // 🗑️ 메시지 삭제 핸들러 (서버에서 삭제 이벤트 수신 시)
  const handleMessageDeleted = useCallback((data: MessageDeletedData) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId))
  }, [])

  // ⚡ 메시지 ID 업데이트 핸들러 (Optimistic Broadcasting용)
  // tempId → realId로 변환하여 삭제 기능 등이 제대로 작동하도록 함
  const handleMessageIdUpdate = useCallback((tempId: string, realId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === tempId ? { ...msg, id: realId } : msg
      )
    )
  }, [])

  // 🎬 녹화 시작 핸들러 (법적 고지 시스템 메시지)
  const handleRecordingStarted = useCallback((data: RecordingStatusData) => {
    const recordingMessage: ChatMessage = {
      id: `recording-start-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `🔴 ${data.recorderNickname}님이 녹화를 시작했습니다. 이 공간의 모든 내용이 녹화됩니다.`,
      timestamp: new Date(),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, recordingMessage))
  }, [])

  // 🎬 녹화 중지 핸들러
  const handleRecordingStopped = useCallback((data: RecordingStatusData) => {
    const recordingMessage: ChatMessage = {
      id: `recording-stop-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `⬛ ${data.recorderNickname}님이 녹화를 중지했습니다.`,
      timestamp: new Date(),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, recordingMessage))
  }, [])

  // 🎬 녹화 에러 핸들러
  const handleRecordingError = useCallback((message: string) => {
    const errorMessage: ChatMessage = {
      id: `recording-error-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `❌ 녹화 오류: ${message}`,
      timestamp: new Date(),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, errorMessage))
  }, [])

  // 👍 리액션 업데이트 핸들러 (다른 사용자의 리액션 수신)
  const handleReactionUpdated = useCallback((data: ReactionData) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== data.messageId) return msg

        const currentReactions = msg.reactions || []
        // 이미 같은 사용자가 같은 타입으로 리액션했는지 확인
        const existingIndex = currentReactions.findIndex(
          (r) => r.userId === data.userId && r.type === data.type
        )

        let newReactions
        if (existingIndex !== -1) {
          // 토글 off: 기존 리액션 제거
          newReactions = currentReactions.filter((_, i) => i !== existingIndex)
        } else {
          // 토글 on: 새 리액션 추가
          newReactions = [
            ...currentReactions,
            {
              type: data.type,
              userId: data.userId,
              userNickname: data.userNickname,
            },
          ]
        }

        return { ...msg, reactions: newReactions }
      })
    )
  }, [])

  // 🔄 Parse current avatar for socket (memoized to avoid recreation)
  const currentAvatarConfig = useMemo(
    () => parseAvatarString(currentAvatar),
    [currentAvatar]
  )

  // Socket connection for game position sync (🔒 sessionToken으로 서버 검증)
  const {
    players,
    socketError,
    effectivePlayerId,
    sendMessage,
    sendWhisper,
    updateProfile,
    // 🛡️ Phase 6: 관리 명령어 함수
    sendMuteCommand,
    sendUnmuteCommand,
    sendKickCommand,
    sendAnnounce,
    deleteMessage,
    // 👍 리액션 토글
    toggleReaction,
    // 🎬 녹화 상태 및 제어 (법적 준수)
    recordingStatus,
  } = useSocket({
    spaceId,
    playerId: userId,
    nickname: currentNickname,
    avatarColor: currentAvatarColor,
    avatarConfig: currentAvatarConfig, // 🔄 새 아바타 포맷 지원
    sessionToken, // 게스트 세션 인증용
    onChatMessage: handleChatMessage,
    onSystemMessage: handleSystemMessage,
    onWhisperMessage: handleWhisperMessage,  // 📬 귓속말 수신
    onWhisperError: handleWhisperError,      // 📬 귓속말 에러
    onAnnouncement: handleAnnouncement,      // 📢 공지 수신
    onMessageDeleted: handleMessageDeleted,  // 🗑️ 메시지 삭제
    onMessageIdUpdate: handleMessageIdUpdate, // ⚡ Optimistic ID 업데이트
    onAdminError: handleAdminError,          // 🛡️ 관리 에러
    onChatError: handleChatError,            // 🔇 채팅 에러 (음소거 등)
    onRecordingStarted: handleRecordingStarted,   // 🎬 녹화 시작
    onRecordingStopped: handleRecordingStopped,   // 🎬 녹화 중지
    onRecordingError: handleRecordingError,       // 🎬 녹화 에러
    onReactionUpdated: handleReactionUpdated,     // 👍 리액션 업데이트
  })

  // LiveKit for audio/video (@livekit/components-react 공식 훅 기반)
  const {
    mediaState,
    mediaError,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    participantTracks,
    localParticipantId,
    localAudioTrack,
    replaceAudioTrackWithProcessed,
    restartCamera,           // 📌 비디오 설정 적용용
    switchCameraDevice,      // 📌 카메라 장치 전환용
  } = useLiveKitMedia()

  // 📌 오디오 설정 (VAD 감도)
  const { settings: audioSettings } = useAudioSettings()

  // 🔊 AudioWorklet 기반 전문급 노이즈 게이트
  // - 별도 스레드에서 오디오 처리 (메인 스레드 차단 없음)
  // - 부드러운 Attack/Release 엔벨로프
  // - 히스테리시스로 채터링 방지
  const {
    processedTrack,
    // isGateOpen, // 향후 UI 피드백용 (게이트 상태 표시)
    isInitialized: isGateInitialized,
    error: gateError,
  } = useAudioGateProcessor({
    inputTrack: localAudioTrack,
    sensitivity: audioSettings.inputSensitivity,
    enabled: mediaState.isMicrophoneEnabled && audioSettings.inputSensitivity > 0,
  })

  // 🔊 AudioWorklet 처리된 트랙을 LiveKit에 적용
  // processedTrack이 준비되면 기존 마이크 트랙을 교체
  const hasReplacedTrackRef = useRef(false)

  useEffect(() => {
    // 📌 조건: 게이트 초기화 완료 + 처리된 트랙 존재 + 마이크 활성화 + 아직 교체 안함 + sensitivity > 0
    // sensitivity가 0이면 AudioWorklet을 사용하지 않고 원본 LiveKit 트랙 사용
    if (
      isGateInitialized &&
      processedTrack &&
      mediaState.isMicrophoneEnabled &&
      !hasReplacedTrackRef.current &&
      audioSettings.inputSensitivity > 0 // 📌 노이즈 게이트 활성화 시에만 트랙 교체
    ) {
      replaceAudioTrackWithProcessed(processedTrack)
        .then((success) => {
          if (success) {
            hasReplacedTrackRef.current = true
            console.log("[SpaceLayout] AudioWorklet 처리된 트랙으로 교체 완료")
          }
        })
        .catch((err) => {
          console.error("[SpaceLayout] 트랙 교체 실패:", err)
        })
    }

    // 마이크가 꺼지면 다음에 다시 교체할 수 있도록 플래그 리셋
    if (!mediaState.isMicrophoneEnabled) {
      hasReplacedTrackRef.current = false
    }
  }, [isGateInitialized, processedTrack, mediaState.isMicrophoneEnabled, replaceAudioTrackWithProcessed, audioSettings.inputSensitivity])

  // 🔊 게이트 에러 로깅 (개발 모드)
  useEffect(() => {
    if (gateError && process.env.NODE_ENV === "development") {
      console.warn("[SpaceLayout] AudioGate 에러:", gateError)
    }
  }, [gateError])

  // 🎨 에디터 상태 구독
  const isEditorActive = useEditorStore((state) => state.mode.isActive)
  const isEditorPanelOpen = useEditorStore((state) => state.panel.isOpen)
  const toggleEditor = useEditorStore((state) => state.toggleEditor)
  const selectedAsset = useEditorStore((state) => state.mode.selectedAsset)
  const placeObject = useEditorStore((state) => state.placeObject)
  const placedObjects = useEditorStore((state) => state.objects)

  // 🎨 페어 오브젝트 상태
  const pairPhase = useEditorStore((state) => state.mode.pairPhase)
  const pairFirstPosition = useEditorStore((state) => state.mode.pairFirstPosition)
  const setPairPhase = useEditorStore((state) => state.setPairPhase)
  const setPairFirstPosition = useEditorStore((state) => state.setPairFirstPosition)

  // 🎨 에디터 패널도 함께 닫기 위한 togglePanel
  const toggleEditorPanel = useEditorStore((state) => state.togglePanel)

  // 🎨 에디터 오브젝트 동기화
  const syncObjects = useEditorStore((state) => state.syncObjects)

  // 🎨 공간 로드 시 DB에서 오브젝트 불러오기
  useEffect(() => {
    const loadMapObjects = async () => {
      // 테스트 공간에서는 로드하지 않음
      if (spaceId === "test") {
        console.log("[SpaceLayout] Test space - skipping object load from DB")
        return
      }

      try {
        const response = await fetch(`/api/spaces/${spaceId}/objects`)
        if (!response.ok) {
          console.warn("[SpaceLayout] Failed to load map objects:", response.status)
          return
        }

        const data = await response.json()
        const objects = data.objects || []

        if (objects.length > 0) {
          // editorStore에 오브젝트 동기화
          const mappedObjects = objects.map((obj: {
            id: string
            assetId: string
            positionX: number
            positionY: number
            rotation: number
            linkedObjectId?: string
            customData?: Record<string, unknown>
            placedBy: string
            createdAt: string
          }) => ({
            id: obj.id,
            assetId: obj.assetId,
            position: { x: obj.positionX, y: obj.positionY },
            rotation: obj.rotation,
            linkedObjectId: obj.linkedObjectId,
            customData: obj.customData,
            placedBy: obj.placedBy,
            placedAt: new Date(obj.createdAt),
          }))

          syncObjects(mappedObjects)

          // Phaser에 렌더링 이벤트 전송
          for (const obj of mappedObjects) {
            eventBridge.emit(GameEvents.EDITOR_PLACE_OBJECT, {
              objectId: obj.id,
              assetId: obj.assetId,
              gridX: obj.position.x,
              gridY: obj.position.y,
              rotation: obj.rotation,
            })
          }

          console.log(`[SpaceLayout] Loaded ${objects.length} map objects from DB`)
        }
      } catch (error) {
        console.error("[SpaceLayout] Error loading map objects:", error)
      }
    }

    // 약간의 지연 후 로드 (Phaser 초기화 대기)
    const timer = setTimeout(loadMapObjects, 1000)
    return () => clearTimeout(timer)
  }, [spaceId, syncObjects])

  // 🎨 에디터 ESC 키 핸들러 (시스템 메시지 출력용 상태)
  const [pendingEditorClose, setPendingEditorClose] = useState(false)

  // 🎨 에디터 ESC 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 채팅 입력 중이거나 다른 입력 필드에 포커스 시 무시
      const activeElement = document.activeElement
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true"

      if (isInputFocused) return

      // ESC 키로 에디터 종료
      if (e.key === "Escape" && isEditorActive) {
        e.preventDefault()
        e.stopPropagation()
        toggleEditor()
        // 패널도 함께 닫기
        if (isEditorPanelOpen) {
          toggleEditorPanel()
        }
        // 시스템 메시지 출력 예약 (상태 변경 후 출력)
        setPendingEditorClose(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isEditorActive, isEditorPanelOpen, toggleEditor, toggleEditorPanel])

  // 🎨 에디터 종료 시 시스템 메시지 출력
  useEffect(() => {
    if (pendingEditorClose && !isEditorActive) {
      const editorCloseMessage: ChatMessage = {
        id: `editor-close-${Date.now()}`,
        senderId: "system",
        senderNickname: "에디터",
        content: "ℹ️ 에디터 모드가 종료되었습니다.",
        timestamp: new Date(),
        type: "system",
      }
      setMessages((prev) => addMessagesWithLimit(prev, editorCloseMessage))
      setPendingEditorClose(false)
    }
  }, [pendingEditorClose, isEditorActive])

  // 🎨 에디터 모드 변경 시 Phaser 게임에 이벤트 전송
  useEffect(() => {
    eventBridge.emit(GameEvents.EDITOR_MODE_CHANGED, {
      isActive: isEditorActive,
      selectedAssetId: selectedAsset?.id ?? null,
    })
  }, [isEditorActive, selectedAsset])

  // 🎨 에디터 캔버스 클릭 이벤트 처리 (오브젝트 배치)
  useEffect(() => {
    const handleCanvasClick = async (payload: unknown) => {
      const clickData = payload as EditorCanvasClickPayload
      const { gridX, gridY } = clickData

      // 에디터 모드가 아니거나 선택된 에셋이 없으면 무시
      if (!isEditorActive || !selectedAsset) {
        return
      }

      // 🚫 중복 배치 방지: 같은 위치에 오브젝트가 있는지 확인
      const existingObject = Array.from(placedObjects.values()).find(
        (obj) => obj.position.x === gridX && obj.position.y === gridY
      )
      if (existingObject) {
        const warningMessage: ChatMessage = {
          id: `editor-duplicate-${Date.now()}`,
          senderId: "system",
          senderNickname: "에디터",
          content: `⚠️ (${gridX}, ${gridY})에 이미 오브젝트가 있습니다. 삭제 후 다시 배치하세요.`,
          timestamp: new Date(),
          type: "system",
        }
        setMessages((prev) => addMessagesWithLimit(prev, warningMessage))
        return
      }

      // 🔗 페어 오브젝트 처리 (포털 등)
      if (selectedAsset.requiresPair) {
        const pairConfig = selectedAsset.pairConfig

        if (pairPhase === "idle") {
          // 첫 번째 위치 배치
          setPairFirstPosition({ x: gridX, y: gridY })
          setPairPhase("placing_second")

          // 첫 번째 위치 안내 메시지
          const firstMessage: ChatMessage = {
            id: `editor-pair-first-${Date.now()}`,
            senderId: "system",
            senderNickname: "에디터",
            content: `📍 ${pairConfig?.labels.first ?? "첫 번째 위치 선택됨"} (${gridX}, ${gridY})\n👆 ${pairConfig?.labels.second ?? "두 번째 위치를 클릭하세요."}`,
            timestamp: new Date(),
            type: "system",
          }
          setMessages((prev) => addMessagesWithLimit(prev, firstMessage))
          return
        } else if (pairPhase === "placing_second" && pairFirstPosition) {
          // 같은 위치에 두 번째 배치 불가
          if (pairFirstPosition.x === gridX && pairFirstPosition.y === gridY) {
            const samePositionMessage: ChatMessage = {
              id: `editor-pair-same-${Date.now()}`,
              senderId: "system",
              senderNickname: "에디터",
              content: `⚠️ 첫 번째 위치와 다른 곳을 선택하세요.`,
              timestamp: new Date(),
              type: "system",
            }
            setMessages((prev) => addMessagesWithLimit(prev, samePositionMessage))
            return
          }

          // 🗄️ 테스트 공간이 아닐 경우 DB에 저장
          const isTestSpace = spaceId === "test"

          let firstDbId: string | undefined
          let secondDbId: string | undefined

          if (!isTestSpace) {
            try {
              // 첫 번째 오브젝트 DB 저장
              const firstResponse = await fetch(`/api/spaces/${spaceId}/objects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  assetId: selectedAsset.id,
                  positionX: pairFirstPosition.x,
                  positionY: pairFirstPosition.y,
                  customData: { pairType: pairConfig?.type, pairRole: "entrance" },
                }),
              })

              if (!firstResponse.ok) {
                const error = await firstResponse.json()
                throw new Error(error.error || "Failed to save first object")
              }

              const firstData = await firstResponse.json()
              firstDbId = firstData.object.id

              // 두 번째 오브젝트 DB 저장 (linkedObjectId 포함)
              const secondResponse = await fetch(`/api/spaces/${spaceId}/objects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  assetId: selectedAsset.id,
                  positionX: gridX,
                  positionY: gridY,
                  linkedObjectId: firstDbId,
                  customData: { pairType: pairConfig?.type, pairRole: "exit" },
                }),
              })

              if (!secondResponse.ok) {
                const error = await secondResponse.json()
                throw new Error(error.error || "Failed to save second object")
              }

              const secondData = await secondResponse.json()
              secondDbId = secondData.object.id

              // 첫 번째 오브젝트에 linkedObjectId 업데이트 (양방향 연결)
              await fetch(`/api/spaces/${spaceId}/objects`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  objectId: firstDbId,
                  linkedObjectId: secondDbId,
                }),
              })
            } catch (error) {
              console.error("[SpaceLayout] Failed to save pair objects to DB:", error)
              const errorMessage: ChatMessage = {
                id: `editor-save-error-${Date.now()}`,
                senderId: "system",
                senderNickname: "에디터",
                content: `❌ DB 저장 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
                timestamp: new Date(),
                type: "system",
              }
              setMessages((prev) => addMessagesWithLimit(prev, errorMessage))
              // 페어 상태 초기화 후 리턴
              setPairPhase("idle")
              setPairFirstPosition(null)
              return
            }
          }

          // 첫 번째 오브젝트 로컬 스토어 배치 (DB ID 사용)
          const firstObject = await placeObject({
            assetId: selectedAsset.id,
            position: pairFirstPosition,
            customData: { pairType: pairConfig?.type, pairRole: "entrance", dbId: firstDbId },
          })

          // 두 번째 오브젝트 로컬 스토어 배치 (DB ID 사용)
          const secondObject = await placeObject({
            assetId: selectedAsset.id,
            position: { x: gridX, y: gridY },
            linkedObjectId: firstObject?.id,
            customData: { pairType: pairConfig?.type, pairRole: "exit", dbId: secondDbId },
          })

          if (firstObject && secondObject) {
            // Phaser에 렌더링 이벤트 전송 (두 개 모두)
            eventBridge.emit(GameEvents.EDITOR_PLACE_OBJECT, {
              objectId: firstDbId || firstObject.id,
              assetId: firstObject.assetId,
              gridX: pairFirstPosition.x,
              gridY: pairFirstPosition.y,
              rotation: 0,
            })
            eventBridge.emit(GameEvents.EDITOR_PLACE_OBJECT, {
              objectId: secondDbId || secondObject.id,
              assetId: secondObject.assetId,
              gridX,
              gridY,
              rotation: 0,
            })

            // 페어 배치 완료 메시지
            const saveStatus = isTestSpace ? "(테스트 공간 - 저장 안됨)" : "(💾 저장됨)"
            const pairCompleteMessage: ChatMessage = {
              id: `editor-pair-complete-${Date.now()}`,
              senderId: "system",
              senderNickname: "에디터",
              content: `✅ '${selectedAsset.name}' 페어 배치 완료! ${saveStatus}\n   📍 입구: (${pairFirstPosition.x}, ${pairFirstPosition.y})\n   📍 출구: (${gridX}, ${gridY})`,
              timestamp: new Date(),
              type: "system",
            }
            setMessages((prev) => addMessagesWithLimit(prev, pairCompleteMessage))
          }

          // 페어 상태 초기화
          setPairPhase("idle")
          setPairFirstPosition(null)
          return
        }
      }

      // 일반 오브젝트 배치
      const isTestSpace = spaceId === "test"
      let dbObjectId: string | undefined

      // 🗄️ 테스트 공간이 아닐 경우 DB에 저장
      if (!isTestSpace) {
        try {
          const response = await fetch(`/api/spaces/${spaceId}/objects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetId: selectedAsset.id,
              positionX: gridX,
              positionY: gridY,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || "Failed to save object")
          }

          const data = await response.json()
          dbObjectId = data.object.id
        } catch (error) {
          console.error("[SpaceLayout] Failed to save object to DB:", error)
          const errorMessage: ChatMessage = {
            id: `editor-save-error-${Date.now()}`,
            senderId: "system",
            senderNickname: "에디터",
            content: `❌ DB 저장 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
            timestamp: new Date(),
            type: "system",
          }
          setMessages((prev) => addMessagesWithLimit(prev, errorMessage))
          return
        }
      }

      // 로컬 스토어 배치
      const placedObject = await placeObject({
        assetId: selectedAsset.id,
        position: { x: gridX, y: gridY },
        customData: { dbId: dbObjectId },
      })

      if (placedObject) {
        // Phaser에 렌더링 이벤트 전송
        eventBridge.emit(GameEvents.EDITOR_PLACE_OBJECT, {
          objectId: dbObjectId || placedObject.id,
          assetId: placedObject.assetId,
          gridX,
          gridY,
          rotation: placedObject.rotation,
        })

        // 배치 성공 시스템 메시지
        const saveStatus = isTestSpace ? "(테스트 공간 - 저장 안됨)" : "(💾 저장됨)"
        const successMessage: ChatMessage = {
          id: `editor-place-${Date.now()}`,
          senderId: "system",
          senderNickname: "에디터",
          content: `✅ '${selectedAsset.name}'을(를) (${gridX}, ${gridY})에 배치했습니다. ${saveStatus}`,
          timestamp: new Date(),
          type: "system",
        }
        setMessages((prev) => addMessagesWithLimit(prev, successMessage))
      }
    }

    eventBridge.on(GameEvents.EDITOR_CANVAS_CLICK, handleCanvasClick)
    return () => {
      eventBridge.off(GameEvents.EDITOR_CANVAS_CLICK, handleCanvasClick)
    }
  }, [isEditorActive, selectedAsset, placeObject, placedObjects, pairPhase, pairFirstPosition, setPairPhase, setPairFirstPosition, spaceId])

  // 🎨 에디터 시스템 메시지 핸들러
  const handleEditorSystemMessage = useCallback((message: string, type: "info" | "success" | "warning" | "error") => {
    const typeEmoji = type === "success" ? "✅" : type === "warning" ? "⚠️" : type === "error" ? "❌" : "ℹ️"
    const editorMessage: ChatMessage = {
      id: `editor-${Date.now()}`,
      senderId: "system",
      senderNickname: "에디터",
      content: `${typeEmoji} ${message}`,
      timestamp: new Date(),
      type: "system",
    }
    setMessages((prev) => addMessagesWithLimit(prev, editorMessage))
  }, [])

  // 🎨 에디터 명령어 훅
  const { executeCommand: executeEditorCommand, canUseEditor } = useEditorCommands({
    userRole: userRole || "PARTICIPANT",
    characterPosition,
    characterDirection,
    userId,
    onSystemMessage: handleEditorSystemMessage,
  })

  // 🎨 에디터 명령어 핸들러
  const handleEditorCommand = useCallback(async (command: ParsedEditorCommand) => {
    if (!canUseEditor) {
      handleEditorSystemMessage("에디터 사용 권한이 없습니다.", "error")
      return
    }
    await executeEditorCommand(command)
  }, [canUseEditor, executeEditorCommand, handleEditorSystemMessage])

  // 🔒 서버 파생 ID 통합: Socket → LiveKit → 원본 userId 순서로 우선순위
  // Socket과 LiveKit 모두 서버에서 검증된 ID를 반환하므로 둘 중 하나를 사용
  const resolvedUserId = effectivePlayerId ?? localParticipantId ?? userId

  // 👍 리액션 핸들러 (Optimistic Update + 서버 전송)
  // - 로컬 상태를 즉시 업데이트하여 UI 반응성 개선
  // - 서버에서 발신자 제외 브로드캐스트하므로 로컬에서 먼저 처리 필요
  const handleReaction = useCallback(
    (messageId: string, type: ReactionType) => {
      // 📍 Optimistic Update: 로컬 상태 즉시 업데이트
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg

          const currentReactions = msg.reactions || []
          // 이미 같은 사용자가 같은 타입으로 리액션했는지 확인
          const existingIndex = currentReactions.findIndex(
            (r) => r.userId === resolvedUserId && r.type === type
          )

          let newReactions
          if (existingIndex !== -1) {
            // 토글 off: 기존 리액션 제거
            newReactions = currentReactions.filter((_, i) => i !== existingIndex)
          } else {
            // 토글 on: 새 리액션 추가
            newReactions = [
              ...currentReactions,
              {
                type,
                userId: resolvedUserId,
                userNickname: currentNickname,
              },
            ]
          }

          return { ...msg, reactions: newReactions }
        })
      )

      // 📡 서버로 전송 (다른 사용자들에게 브로드캐스트)
      toggleReaction(messageId, type)
    },
    [resolvedUserId, currentNickname, toggleReaction]
  )

  // Dismiss media error state - track which error was dismissed
  // (using error reference comparison instead of boolean flag to avoid effect setState)
  const [dismissedErrorRef, setDismissedErrorRef] = useState<typeof mediaError>(null)

  // Reset dismissed state when error changes by comparing references
  const handleDismissError = useCallback(() => {
    setDismissedErrorRef(mediaError)
  }, [mediaError])

  // Show error only if not dismissed (new error auto-shows by reference comparison)
  const displayError = mediaError && mediaError !== dismissedErrorRef ? mediaError : null

  // Ensure local participant is in tracks (fallback if LiveKit not connected)
  // 🔒 resolvedUserId 사용 (서버 파생 ID)
  // 🎨 avatarColor를 players에서 가져와서 추가
  const allParticipantTracks = useMemo(() => {
    const tracks = new Map(participantTracks)

    // Add local participant if not in tracks yet
    if (!tracks.has(resolvedUserId)) {
      tracks.set(resolvedUserId, {
        participantId: resolvedUserId,
        participantName: currentNickname, // 🔄 로컬 상태 사용
        isSpeaking: false,
        avatarColor: currentAvatarColor, // 🎨 로컬 유저 아바타 색상
      })
    } else {
      // 기존 트랙에 avatarColor 추가
      const existingTrack = tracks.get(resolvedUserId)!
      tracks.set(resolvedUserId, { ...existingTrack, avatarColor: currentAvatarColor })
    }

    // Add socket players that might not have LiveKit tracks yet
    // 또는 기존 트랙에 avatarColor + nickname 업데이트
    players.forEach((player) => {
      const existingTrack = tracks.get(player.id)
      if (existingTrack) {
        // 기존 트랙에 avatarColor 추가 + 닉네임 업데이트 (Socket.io 닉네임 우선)
        tracks.set(player.id, {
          ...existingTrack,
          participantName: player.nickname, // 🔄 Socket.io 닉네임으로 오버라이드
          avatarColor: player.avatarColor || "default",
        })
      } else {
        // 새 트랙 생성
        tracks.set(player.id, {
          participantId: player.id,
          participantName: player.nickname,
          isSpeaking: false,
          avatarColor: player.avatarColor || "default",
        })
      }
    })

    return tracks
  }, [participantTracks, players, resolvedUserId, currentNickname, currentAvatarColor])

  // 🧑‍🤝‍🧑 온라인 사용자 ID 목록 (Socket.io players에서 추출)
  const onlineUserIds = useMemo(() => {
    return Array.from(players.keys())
  }, [players])

  // 🛡️ OWNER 여부 확인 (userRole prop 기반)
  const isOwner = userRole === "OWNER"

  // Find active screen share (first participant with screenTrack)
  // 🔧 안정화: screenTrack이 실제로 존재하고 활성 상태인 경우만 반환
  const activeScreenShare = useMemo(() => {
    for (const track of allParticipantTracks.values()) {
      // screenTrack이 있고 아직 종료되지 않은 경우만 유효
      if (track.screenTrack && track.screenTrack.readyState !== "ended") {
        return track
      }
    }
    return null
  }, [allParticipantTracks])

  // 🔧 화면공유 안정화: 일시적인 null 상태를 무시하고 이전 값 유지
  // 귓속말 등 채팅 이벤트 처리 시 allParticipantTracks가 재계산되면서
  // 일시적으로 screenTrack이 undefined가 되는 문제 방지
  const stableScreenShareRef = useRef(activeScreenShare)
  const screenShareDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (activeScreenShare && activeScreenShare.screenTrack?.readyState !== "ended") {
      // 유효한 화면공유가 있으면 즉시 업데이트
      stableScreenShareRef.current = activeScreenShare
      if (screenShareDebounceRef.current) {
        clearTimeout(screenShareDebounceRef.current)
        screenShareDebounceRef.current = null
      }
    } else if (activeScreenShare === null && stableScreenShareRef.current) {
      // null이 되었지만 이전에 화면공유가 있었던 경우
      // 200ms 대기 후에도 null이면 실제 종료로 판단
      screenShareDebounceRef.current = setTimeout(() => {
        stableScreenShareRef.current = null
      }, 200)
    }

    return () => {
      if (screenShareDebounceRef.current) {
        clearTimeout(screenShareDebounceRef.current)
      }
    }
  }, [activeScreenShare])

  // 렌더링에 사용할 안정화된 화면공유 (즉시 반영 + 디바운스 null)
  const stableScreenShare = activeScreenShare ?? stableScreenShareRef.current

  // 🎤 모든 참가자의 오디오 트랙 수집 (녹화 시 믹싱용)
  const allAudioTracks = useMemo(() => {
    const tracks: MediaStreamTrack[] = []
    allParticipantTracks.forEach((track) => {
      if (track.audioTrack && !track.isAudioMuted) {
        tracks.push(track.audioTrack)
      }
    })
    return tracks
  }, [allParticipantTracks])

  // 📬 귓속말 히스토리 계산 (최근 대화 상대 닉네임 목록, 중복 제거)
  const whisperHistory = useMemo(() => {
    const nicknames: string[] = []
    const seen = new Set<string>()

    // 최신 메시지부터 역순으로 탐색
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.type === "whisper") {
        // 내가 보낸 귓속말: targetNickname
        if (msg.senderId === resolvedUserId && msg.targetNickname && !seen.has(msg.targetNickname)) {
          nicknames.push(msg.targetNickname)
          seen.add(msg.targetNickname)
        }
        // 내가 받은 귓속말: senderNickname
        if (msg.targetId === resolvedUserId && msg.senderNickname && !seen.has(msg.senderNickname)) {
          nicknames.push(msg.senderNickname)
          seen.add(msg.senderNickname)
        }
      }
    }

    return nicknames  // 최신 대화 상대부터 정렬됨
  }, [messages, resolvedUserId])

  // 💡 환영 메시지 + 회전 힌트 시스템
  // - 최초 입장 시: 전체 조작법 안내 1회
  // - 이후: 5분마다 랜덤 팁 표시
  const hasShownWelcome = useRef(false)

  useEffect(() => {
    const hasPermission = userRole === "OWNER" || userRole === "STAFF" || isSuperAdmin

    // 🎉 최초 입장 시 환영 메시지 (1회만)
    if (!hasShownWelcome.current) {
      hasShownWelcome.current = true
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: getWelcomeMessage(hasPermission),
        timestamp: new Date(),
        type: "system",
      }
      // 약간의 딜레이 후 표시 (UI가 완전히 로드된 후)
      setTimeout(() => {
        setMessages((prev) => addMessagesWithLimit(prev, welcomeMessage))
      }, 500)
    }

    // 💡 5분마다 회전 힌트 표시
    const hintInterval = setInterval(() => {
      const hint = getNextRotatingHint(hasPermission)
      const hintMessage: ChatMessage = {
        id: `hint-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: hint,
        timestamp: new Date(),
        type: "system",
      }
      setMessages((prev) => addMessagesWithLimit(prev, hintMessage))
    }, HINT_INTERVAL_MS)

    return () => clearInterval(hintInterval)
  }, [userRole, isSuperAdmin])

  // 🔧 마지막으로 닫은 화면공유 트랙 ID (새 화면공유 감지용)
  // 파생 상태 패턴: closedScreenTrackId와 현재 트랙 ID 비교로 표시 여부 결정
  const [closedScreenTrackId, setClosedScreenTrackId] = useState<string | null>(null)

  // Screen share overlay visibility - derived from track ID comparison
  // 🔧 stableScreenShare 사용: 일시적인 상태 변화에도 안정적으로 표시
  // 새 화면공유가 시작되면 (트랙 ID가 달라지면) 자동으로 오버레이 재활성화
  const showScreenShareOverlay = useMemo(() => {
    const screenTrack = stableScreenShare?.screenTrack
    if (!screenTrack) return false
    return screenTrack.id !== closedScreenTrackId
  }, [stableScreenShare, closedScreenTrackId])

  // Handlers
  const handleSendMessage = useCallback((content: string, replyTo?: ReplyToData) => {
    sendMessage(content, replyTo)
  }, [sendMessage])

  // 📬 귓속말 전송 핸들러 (답장 지원)
  const handleSendWhisper = useCallback((targetNickname: string, content: string, replyTo?: ReplyToData) => {
    sendWhisper(targetNickname, content, replyTo)
  }, [sendWhisper])

  // 🛡️ 관리 명령어 핸들러
  const handleAdminCommand = useCallback((result: AdminCommandResult) => {
    switch (result.command) {
      case "mute":
        if (result.targetNickname) {
          sendMuteCommand(result.targetNickname, result.duration, result.reason)
        }
        break
      case "unmute":
        if (result.targetNickname) {
          sendUnmuteCommand(result.targetNickname)
        }
        break
      case "kick":
        if (result.targetNickname) {
          sendKickCommand(result.targetNickname, result.reason, false)
        }
        break
      case "ban":
        if (result.targetNickname) {
          sendKickCommand(result.targetNickname, result.reason, true)
        }
        break
      case "announce":
        if (result.message) {
          sendAnnounce(result.message)
        }
        break
      case "help": {
        // 도움말 시스템 메시지 표시 (권한에 따라 다른 내용)
        const hasPermission = userRole === "OWNER" || userRole === "STAFF" || isSuperAdmin
        const helpLines = generateFullHelpMessages(hasPermission)

        // 각 줄을 개별 시스템 메시지로 변환
        const helpMessages: ChatMessage[] = helpLines.map((line, index) => ({
          id: `help-${Date.now()}-${index}`,
          senderId: "system",
          senderNickname: "시스템",
          content: line,
          timestamp: new Date(),
          type: "system" as const,
        }))

        setMessages((prev) => addMessagesWithLimit(prev, helpMessages))
        break
      }
    }
  }, [sendMuteCommand, sendUnmuteCommand, sendKickCommand, sendAnnounce, userRole, isSuperAdmin])

  const handleToggleMic = useCallback(async () => {
    await toggleMicrophone()
  }, [toggleMicrophone])

  const handleToggleCamera = useCallback(async () => {
    await toggleCamera()
  }, [toggleCamera])

  const handleToggleScreenShare = useCallback(async (options?: { audio?: boolean }) => {
    await toggleScreenShare(options)
  }, [toggleScreenShare])

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev)
  }, [])

  // 🧑‍🤝‍🧑 멤버 패널 토글
  const handleToggleMemberPanel = useCallback(() => {
    setIsMemberPanelOpen((prev) => !prev)
  }, [])

  // 🎬 뷰 모드 변경 핸들러
  // hidden 모드에서도 최소화된 버튼 그룹은 표시되어야 하므로 패널 상태 유지
  const handleViewModeChange = useCallback((mode: ParticipantViewMode) => {
    setParticipantViewMode(mode)
  }, [])

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true)
  }, [])

  // 🔧 미디어 설정 모달 열기 (탭 지정)
  const handleOpenMediaSettings = useCallback((tab: MediaSettingsTab) => {
    setMediaSettingsDefaultTab(tab)
    setIsMediaSettingsOpen(true)
  }, [])

  const handleSaveSettings = useCallback((nickname: string, avatar: string) => {
    // 🔄 Hot reload: 로컬 상태 업데이트 + 소켓으로 프로필 전송
    // avatar는 이제 "classic:default" 또는 "custom:office_male" 형식
    const safeAvatar = getSafeAvatarString(avatar)
    const legacyColor = getLegacyAvatarColor(safeAvatar)

    setCurrentNickname(nickname)
    setCurrentAvatar(safeAvatar)
    setCurrentAvatarColor(legacyColor)

    // Socket으로 프로필 업데이트 (게임엔진 리렌더링 없이)
    // 🔄 새 아바타 포맷을 avatarConfig로 전달
    const avatarConfig = parseAvatarString(safeAvatar)
    updateProfile({ nickname, avatarColor: legacyColor, avatarConfig })

    // 부모에게도 알림 (옵션, localStorage 동기화용)
    if (onNicknameChange) {
      onNicknameChange(nickname, safeAvatar)
    }
  }, [onNicknameChange, updateProfile])

  // 🔧 오버레이 닫을 때 현재 트랙 ID 저장 (같은 트랙 재표시 방지)
  // setClosedScreenTrackId로 닫힌 트랙 ID를 저장하면 showScreenShareOverlay가 자동으로 false로 계산됨
  const handleCloseScreenShareOverlay = useCallback(() => {
    const screenTrack = stableScreenShare?.screenTrack
    if (screenTrack) {
      setClosedScreenTrackId(screenTrack.id)
    }
  }, [stableScreenShare])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <SpaceHeader
        spaceName={spaceName}
        spaceLogoUrl={spaceLogoUrl}
        spacePrimaryColor={spacePrimaryColor}
        userNickname={currentNickname}
        onExit={onExit}
      />

      {/* 🔒 Socket Error Banner (세션 검증 실패 등) */}
      {socketError && (
        <div className="bg-destructive/10 border-b border-destructive px-4 py-2 text-center text-sm text-destructive">
          {socketError.type === "session_invalid" ? (
            <span>세션이 만료되었습니다. 페이지를 새로고침하거나 다시 입장해 주세요.</span>
          ) : socketError.type === "connection_failed" ? (
            <span>서버에 연결할 수 없습니다. 네트워크 연결을 확인해 주세요.</span>
          ) : (
            <span>{socketError.message}</span>
          )}
        </div>
      )}

      {/* Main Content - ZEP 스타일 플로팅 레이아웃 */}
      {/* 🎬 id="game-panel": 녹화 OSD 알림의 Portal 타겟 */}
      <div id="game-panel" className="relative flex-1 overflow-hidden bg-[#1a1a2e]">
        {/* Game Canvas - 전체 영역 */}
        <GameCanvas
          playerId={resolvedUserId}
          playerNickname={currentNickname}
          avatarColor={currentAvatarColor}
          avatar={userAvatar}
        />

        {/* 🎬 녹화 중 표시 (상단 중앙) - 법적 준수: 모든 참가자에게 REC 표시 */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2">
          <RecordingIndicator recordingStatus={recordingStatus} />
        </div>

        {/* 🎨 에디터 모드 인디케이터 (상단 좌측) */}
        {isEditorActive && (
          <div className="absolute left-4 top-2 z-30">
            <EditorModeIndicator />
          </div>
        )}

        {/* 🎨 에디터 패널 (좌측) */}
        {isEditorPanelOpen && (
          <div className="pointer-events-auto absolute left-2 top-14 z-30 max-h-[calc(100%-120px)]">
            <EditorPanel />
          </div>
        )}

        {/* 플로팅 채팅 오버레이 (좌측 하단) */}
        <FloatingChatOverlay
          messages={messages}
          players={players}
          onSendMessage={handleSendMessage}
          onSendWhisper={handleSendWhisper}
          onAdminCommand={handleAdminCommand}
          onEditorCommand={handleEditorCommand}
          onDeleteMessage={deleteMessage}
          onReact={handleReaction}
          currentUserId={resolvedUserId}
          userRole={userRole}
          isVisible={isChatOpen}
          whisperHistory={whisperHistory}
          spaceId={spaceId}
          // 📜 Phase 4: 과거 메시지 페이지네이션
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMoreMessages={hasMoreMessages}
        />

        {/* 플로팅 참가자 비디오 - 뷰 모드에 따라 다르게 렌더링 */}
        {/* 📱 반응형: 모바일에서 숨김 → sm에서 작게 → md에서 기본 크기 */}
        {participantViewMode === "sidebar" && (
          <div className="pointer-events-auto absolute right-2 top-2 z-20 hidden sm:block sm:w-36 md:w-44 max-h-[calc(100%-80px)] overflow-y-auto">
            <ParticipantPanel
              participantTracks={allParticipantTracks}
              localParticipantId={resolvedUserId}
              viewMode={participantViewMode}
              onViewModeChange={handleViewModeChange}
              canRecord={userRole === "OWNER" || userRole === "STAFF" || isSuperAdmin}
              spaceName={spaceName}
              inviteCode={spaceInviteCode}
              isMemberPanelOpen={isMemberPanelOpen}
              onToggleMemberPanel={handleToggleMemberPanel}
            />
          </div>
        )}

        {/* 그리드 모드 - 전체 화면 오버레이 (채팅과 동일한 반투명 배경) */}
        {participantViewMode === "grid" && (
          <div className="pointer-events-auto absolute inset-0 z-30 bg-black/30 backdrop-blur-sm">
            <ParticipantPanel
              participantTracks={allParticipantTracks}
              localParticipantId={resolvedUserId}
              viewMode={participantViewMode}
              onViewModeChange={handleViewModeChange}
              canRecord={userRole === "OWNER" || userRole === "STAFF" || isSuperAdmin}
              spaceName={spaceName}
              inviteCode={spaceInviteCode}
              isMemberPanelOpen={isMemberPanelOpen}
              onToggleMemberPanel={handleToggleMemberPanel}
              className="h-full"
            />
          </div>
        )}

        {/* 숨김 모드 - 최소화된 버튼 그룹만 표시 (우측 상단) */}
        {/* 📱 모바일에서도 표시 (참가자 수/필터 버튼만) */}
        {participantViewMode === "hidden" && (
          <div className="pointer-events-auto absolute right-2 top-2 z-20">
            <ParticipantPanel
              participantTracks={allParticipantTracks}
              localParticipantId={resolvedUserId}
              viewMode={participantViewMode}
              onViewModeChange={handleViewModeChange}
              inviteCode={spaceInviteCode}
              isMemberPanelOpen={isMemberPanelOpen}
              onToggleMemberPanel={handleToggleMemberPanel}
            />
          </div>
        )}

        {/* 📱 모바일 전용: 사이드바 모드일 때 숨김 버튼만 표시 */}
        {participantViewMode === "sidebar" && (
          <div className="pointer-events-auto absolute right-2 top-2 z-20 sm:hidden">
            <ParticipantPanel
              participantTracks={allParticipantTracks}
              localParticipantId={resolvedUserId}
              viewMode="hidden"
              onViewModeChange={handleViewModeChange}
              inviteCode={spaceInviteCode}
              isMemberPanelOpen={isMemberPanelOpen}
              onToggleMemberPanel={handleToggleMemberPanel}
            />
          </div>
        )}

        {/* 🧑‍🤝‍🧑 플로팅 멤버 패널 */}
        {/* 📱 모바일: 중앙 모달 스타일, sm+: 우측 상단 참가자 패널 좌측 */}
        {isMemberPanelOpen && (
          <>
            {/* 모바일: 반투명 배경 + 중앙 패널 */}
            <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/50 sm:hidden">
              <div className="w-[90%] max-w-sm max-h-[80vh] overflow-hidden rounded-lg">
                <MemberPanel
                  spaceId={spaceId}
                  isSuperAdmin={isSuperAdmin}
                  isOwner={isOwner}
                  onlineUserIds={onlineUserIds}
                  onClose={handleToggleMemberPanel}
                />
              </div>
            </div>
            {/* sm+: 기존 플로팅 위치 */}
            <div className="pointer-events-auto absolute right-40 sm:right-48 top-2 z-20 hidden sm:block w-56 md:w-64 max-h-[calc(100%-80px)]">
              <MemberPanel
                spaceId={spaceId}
                isSuperAdmin={isSuperAdmin}
                isOwner={isOwner}
                onlineUserIds={onlineUserIds}
                onClose={handleToggleMemberPanel}
              />
            </div>
          </>
        )}

        {/* 🎮 모바일 조이스틱 (터치 디바이스에서만 표시) */}
        {isTouchDevice && (
          <div className="pointer-events-auto absolute bottom-20 left-4 z-20">
            <VirtualJoystick size={100} opacity={0.7} />
          </div>
        )}

        {/* 플로팅 컨트롤 바 (하단 중앙) */}
        <ControlBar
          isMicOn={mediaState.isMicrophoneEnabled}
          isCameraOn={mediaState.isCameraEnabled}
          isScreenSharing={mediaState.isScreenShareEnabled}
          isChatOpen={isChatOpen}
          mediaError={displayError}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleChat={handleToggleChat}
          onOpenSettings={handleOpenSettings}
          onOpenMediaSettings={handleOpenMediaSettings}
          onDismissError={handleDismissError}
        />
      </div>

      {/* Settings Modal */}
      <SpaceSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        spaceId={spaceId}
        currentNickname={currentNickname}
        currentAvatar={currentAvatar}
        onSave={handleSaveSettings}
      />

      {/* 🔧 미디어 설정 모달 */}
      <MediaSettingsModal
        open={isMediaSettingsOpen}
        onOpenChange={setIsMediaSettingsOpen}
        defaultTab={mediaSettingsDefaultTab}
        onApply={restartCamera}  // 📌 설정 적용 시 카메라 재시작
      />

      {/* Screen Share Overlay - Show when someone is sharing (except self) */}
      {/* 🔧 stableScreenShare 사용: 일시적인 상태 변화에도 오버레이 유지 */}
      {stableScreenShare &&
       stableScreenShare.participantId !== resolvedUserId &&
       showScreenShareOverlay && (
        <ScreenShareOverlay
          key={stableScreenShare.participantId}  // 🔧 key 추가: 같은 참가자면 리마운트 방지
          track={stableScreenShare}
          onClose={handleCloseScreenShareOverlay}
          canRecord={userRole === "OWNER" || userRole === "STAFF" || isSuperAdmin}
          spaceName={spaceName}
          audioTrack={stableScreenShare.audioTrack}
          allAudioTracks={allAudioTracks}
        />
      )}

      {/* 🍎 iOS Safari 오디오 활성화 오버레이 */}
      {/* iOS Safari에서 다른 사용자 음성을 듣기 위해 마이크 권한이 필요함 */}
      <IOSAudioActivator />
    </div>
  )
}
