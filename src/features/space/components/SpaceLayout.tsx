"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels"
import { cn } from "@/lib/utils"

import { SpaceHeader } from "./SpaceHeader"
import { FloatingChatOverlay } from "./chat"
import { ParticipantPanel } from "./video/ParticipantPanel"
import { ScreenShareOverlay } from "./video/ScreenShare"
import { ControlBar } from "./controls/ControlBar"
import { GameCanvas } from "./game/GameCanvas"
import { SpaceSettingsModal } from "./SpaceSettingsModal"
import { useSocket } from "../socket"
import { LiveKitRoomProvider, useLiveKitMedia } from "../livekit"
import type { ChatMessageData, AvatarColor } from "../socket/types"
import type { ChatMessage } from "../types/space.types"

// ============================================
// ResizeHandle Component
// ============================================
function ResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        "group relative flex w-1 items-center justify-center bg-border transition-colors hover:bg-primary/50 data-resize-handle-active:bg-primary",
        className
      )}
    >
      <div className="absolute h-8 w-1 rounded-full bg-muted-foreground/20 opacity-0 transition-opacity group-hover:opacity-100 group-data-resize-handle-active:opacity-100" />
    </PanelResizeHandle>
  )
}

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

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Socket message handlers
  const handleChatMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => [...prev, socketToChatMessage(data)])
  }, [])

  const handleSystemMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => [...prev, socketToChatMessage(data)])
  }, [])

  // 🔄 Local state for nickname/avatar (enables hot reload without socket reconnection)
  const [currentNickname, setCurrentNickname] = useState(userNickname)
  const [currentAvatarColor, setCurrentAvatarColor] = useState<AvatarColor>(userAvatarColor)

  // Socket connection for game position sync (🔒 sessionToken으로 서버 검증)
  const { players, socketError, effectivePlayerId, sendMessage, updateProfile } = useSocket({
    spaceId,
    playerId: userId,
    nickname: currentNickname,
    avatarColor: currentAvatarColor,
    sessionToken, // 게스트 세션 인증용
    onChatMessage: handleChatMessage,
    onSystemMessage: handleSystemMessage,
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
  const allParticipantTracks = useMemo(() => {
    const tracks = new Map(participantTracks)

    // Add local participant if not in tracks yet
    if (!tracks.has(resolvedUserId)) {
      tracks.set(resolvedUserId, {
        participantId: resolvedUserId,
        participantName: currentNickname, // 🔄 로컬 상태 사용
        isSpeaking: false,
      })
    }

    // Add socket players that might not have LiveKit tracks yet
    players.forEach((player) => {
      if (!tracks.has(player.id)) {
        tracks.set(player.id, {
          participantId: player.id,
          participantName: player.nickname,
          isSpeaking: false,
        })
      }
    })

    return tracks
  }, [participantTracks, players, resolvedUserId, currentNickname])

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
  const handleSendMessage = useCallback((content: string) => {
    sendMessage(content)
  }, [sendMessage])

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

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Center Panel - Game Canvas + Floating Chat */}
          <Panel defaultSize={isParticipantsOpen ? 80 : 100} className="overflow-hidden">
            <div className="relative h-full w-full overflow-hidden">
              <GameCanvas
                playerId={resolvedUserId}
                playerNickname={currentNickname}
                avatarColor={currentAvatarColor}
              />
              {/* 플로팅 채팅 오버레이 */}
              <FloatingChatOverlay
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUserId={resolvedUserId}
                isVisible={isChatOpen}
              />
            </div>
          </Panel>

          {/* Right Panel - Participants */}
          {isParticipantsOpen && (
            <>
              <ResizeHandle />
              <Panel
                defaultSize={20}
                minSize={15}
                maxSize={35}
                collapsible
                onCollapse={() => setIsParticipantsOpen(false)}
              >
                <ParticipantPanel
                  participantTracks={allParticipantTracks}
                  localParticipantId={resolvedUserId}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Control Bar */}
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
