"use client"

import { useState, useCallback, useMemo, useEffect } from "react"

import { SpaceHeader } from "./SpaceHeader"
import { FloatingChatOverlay } from "./chat"
import { ParticipantPanel, type ParticipantViewMode } from "./video/ParticipantPanel"
import { ScreenShareOverlay } from "./video/ScreenShare"
import { ControlBar } from "./controls/ControlBar"
import { GameCanvas } from "./game/GameCanvas"
import { SpaceSettingsModal } from "./SpaceSettingsModal"
import { useSocket } from "../socket"
import { LiveKitRoomProvider, useLiveKitMedia } from "../livekit"
import { useNotificationSound, useChatStorage } from "../hooks"
import type { ChatMessageData, AvatarColor, ReplyToData } from "../socket/types"
import type { ChatMessage } from "../types/space.types"

// ============================================
// SpaceLayout Props
// ============================================
interface SpaceLayoutProps {
  spaceId: string
  spaceName: string
  spaceLogoUrl?: string | null
  spacePrimaryColor?: string | null
  userNickname: string
  userId: string
  userAvatarColor?: AvatarColor
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
  userNickname,
  userId,
  userAvatarColor = "default",
  sessionToken,
  onExit,
  onNicknameChange,
}: SpaceLayoutProps) {
  // Panel visibility
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(true)

  // 🎬 참가자 패널 뷰 모드 (sidebar | grid | hidden)
  const [participantViewMode, setParticipantViewMode] = useState<ParticipantViewMode>("sidebar")

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // 💾 채팅 내역 localStorage 영속성
  const { loadMessages, saveMessages } = useChatStorage({ spaceId })

  // 📥 컴포넌트 마운트 시 저장된 메시지 로드
  // localStorage에서 초기 데이터 로드 시 동기 setState가 필요하므로 lint 규칙 비활성화
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedMessages = loadMessages()
    if (savedMessages.length > 0) {
      setMessages(savedMessages)
    }
  }, [loadMessages])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 💾 메시지 변경 시 저장 (디바운스됨)
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages)
    }
  }, [messages, saveMessages])

  // 🔔 알림음 훅
  const { playWhisperSound } = useNotificationSound()

  // Socket message handlers
  const handleChatMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => [...prev, socketToChatMessage(data)])
  }, [])

  const handleSystemMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => [...prev, socketToChatMessage(data)])
  }, [])

  // 📬 귓속말 메시지 핸들러 (송신/수신 모두 같은 핸들러)
  const handleWhisperMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => [...prev, socketToChatMessage(data)])
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
    setMessages((prev) => [...prev, errorMessage])
  }, [])

  // 🔄 Local state for nickname/avatar (enables hot reload without socket reconnection)
  const [currentNickname, setCurrentNickname] = useState(userNickname)
  const [currentAvatarColor, setCurrentAvatarColor] = useState<AvatarColor>(userAvatarColor)

  // Socket connection for game position sync (🔒 sessionToken으로 서버 검증)
  const { players, socketError, effectivePlayerId, sendMessage, sendWhisper, updateProfile } = useSocket({
    spaceId,
    playerId: userId,
    nickname: currentNickname,
    avatarColor: currentAvatarColor,
    sessionToken, // 게스트 세션 인증용
    onChatMessage: handleChatMessage,
    onSystemMessage: handleSystemMessage,
    onWhisperMessage: handleWhisperMessage,  // 📬 귓속말 수신
    onWhisperError: handleWhisperError,      // 📬 귓속말 에러
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
  } = useLiveKitMedia()

  // 🔒 서버 파생 ID 통합: Socket → LiveKit → 원본 userId 순서로 우선순위
  // Socket과 LiveKit 모두 서버에서 검증된 ID를 반환하므로 둘 중 하나를 사용
  const resolvedUserId = effectivePlayerId ?? localParticipantId ?? userId

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
    // 또는 기존 트랙에 avatarColor 추가
    players.forEach((player) => {
      const existingTrack = tracks.get(player.id)
      if (existingTrack) {
        // 기존 트랙에 avatarColor 추가
        tracks.set(player.id, { ...existingTrack, avatarColor: player.avatarColor || "default" })
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

  // Find active screen share (first participant with screenTrack)
  const activeScreenShare = useMemo(() => {
    for (const track of allParticipantTracks.values()) {
      if (track.screenTrack) {
        return track
      }
    }
    return null
  }, [allParticipantTracks])

  // 🔧 마지막으로 닫은 화면공유 트랙 ID (새 화면공유 감지용)
  // 파생 상태 패턴: closedScreenTrackId와 현재 트랙 ID 비교로 표시 여부 결정
  const [closedScreenTrackId, setClosedScreenTrackId] = useState<string | null>(null)

  // Screen share overlay visibility - derived from track ID comparison
  // 새 화면공유가 시작되면 (트랙 ID가 달라지면) 자동으로 오버레이 재활성화
  const showScreenShareOverlay = useMemo(() => {
    const screenTrack = activeScreenShare?.screenTrack
    if (!screenTrack) return false
    return screenTrack.id !== closedScreenTrackId
  }, [activeScreenShare, closedScreenTrackId])

  // Handlers
  const handleSendMessage = useCallback((content: string, replyTo?: ReplyToData) => {
    sendMessage(content, replyTo)
  }, [sendMessage])

  // 📬 귓속말 전송 핸들러 (답장 지원)
  const handleSendWhisper = useCallback((targetNickname: string, content: string, replyTo?: ReplyToData) => {
    sendWhisper(targetNickname, content, replyTo)
  }, [sendWhisper])

  const handleToggleMic = useCallback(async () => {
    await toggleMicrophone()
  }, [toggleMicrophone])

  const handleToggleCamera = useCallback(async () => {
    await toggleCamera()
  }, [toggleCamera])

  const handleToggleScreenShare = useCallback(async () => {
    await toggleScreenShare()
  }, [toggleScreenShare])

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev)
  }, [])

  const handleToggleParticipants = useCallback(() => {
    setIsParticipantsOpen((prev) => !prev)
    // 참가자 패널이 꺼지면 뷰 모드를 hidden으로, 켜지면 sidebar로
    setParticipantViewMode((prev) => prev === "hidden" ? "sidebar" : prev)
  }, [])

  // 🎬 뷰 모드 변경 핸들러
  const handleViewModeChange = useCallback((mode: ParticipantViewMode) => {
    setParticipantViewMode(mode)
    // hidden 모드면 패널도 닫기, 그 외에는 패널 열기
    setIsParticipantsOpen(mode !== "hidden")
  }, [])

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true)
  }, [])

  const handleSaveSettings = useCallback((nickname: string, avatar: string) => {
    // 🔄 Hot reload: 로컬 상태 업데이트 + 소켓으로 프로필 전송
    const typedAvatar = avatar as AvatarColor
    setCurrentNickname(nickname)
    setCurrentAvatarColor(typedAvatar)

    // Socket으로 프로필 업데이트 (게임엔진 리렌더링 없이)
    updateProfile({ nickname, avatarColor: typedAvatar })

    // 부모에게도 알림 (옵션, localStorage 동기화용)
    if (onNicknameChange) {
      onNicknameChange(nickname, avatar)
    }
  }, [onNicknameChange, updateProfile])

  // 🔧 오버레이 닫을 때 현재 트랙 ID 저장 (같은 트랙 재표시 방지)
  // setClosedScreenTrackId로 닫힌 트랙 ID를 저장하면 showScreenShareOverlay가 자동으로 false로 계산됨
  const handleCloseScreenShareOverlay = useCallback(() => {
    const screenTrack = activeScreenShare?.screenTrack
    if (screenTrack) {
      setClosedScreenTrackId(screenTrack.id)
    }
  }, [activeScreenShare])

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
      <div className="relative flex-1 overflow-hidden bg-[#1a1a2e]">
        {/* Game Canvas - 전체 영역 */}
        <GameCanvas
          playerId={resolvedUserId}
          playerNickname={currentNickname}
          avatarColor={currentAvatarColor}
        />

        {/* 플로팅 채팅 오버레이 (좌측 하단) */}
        <FloatingChatOverlay
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendWhisper={handleSendWhisper}
          currentUserId={resolvedUserId}
          isVisible={isChatOpen}
        />

        {/* 플로팅 참가자 비디오 - 뷰 모드에 따라 다르게 렌더링 */}
        {isParticipantsOpen && participantViewMode === "sidebar" && (
          <div className="pointer-events-auto absolute right-2 top-2 z-20 w-44 max-h-[calc(100%-80px)] overflow-y-auto">
            <ParticipantPanel
              participantTracks={allParticipantTracks}
              localParticipantId={resolvedUserId}
              viewMode={participantViewMode}
              onViewModeChange={handleViewModeChange}
            />
          </div>
        )}

        {/* 그리드 모드 - 전체 화면 오버레이 */}
        {isParticipantsOpen && participantViewMode === "grid" && (
          <div className="pointer-events-auto absolute inset-0 z-30 bg-black/90 backdrop-blur-sm">
            <ParticipantPanel
              participantTracks={allParticipantTracks}
              localParticipantId={resolvedUserId}
              viewMode={participantViewMode}
              onViewModeChange={handleViewModeChange}
              className="h-full"
            />
          </div>
        )}

        {/* 플로팅 컨트롤 바 (하단 중앙) */}
        <ControlBar
          isMicOn={mediaState.isMicrophoneEnabled}
          isCameraOn={mediaState.isCameraEnabled}
          isScreenSharing={mediaState.isScreenShareEnabled}
          isChatOpen={isChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          mediaError={displayError}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleChat={handleToggleChat}
          onToggleParticipants={handleToggleParticipants}
          onOpenSettings={handleOpenSettings}
          onDismissError={handleDismissError}
        />
      </div>

      {/* Settings Modal */}
      <SpaceSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        spaceId={spaceId}
        currentNickname={currentNickname}
        currentAvatar={currentAvatarColor}
        onSave={handleSaveSettings}
      />

      {/* Screen Share Overlay - Show when someone is sharing (except self) */}
      {activeScreenShare &&
       activeScreenShare.participantId !== resolvedUserId &&
       showScreenShareOverlay && (
        <ScreenShareOverlay
          track={activeScreenShare}
          onClose={handleCloseScreenShareOverlay}
        />
      )}
    </div>
  )
}
