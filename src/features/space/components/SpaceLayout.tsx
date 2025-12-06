"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels"
import { cn } from "@/lib/utils"

import { SpaceHeader } from "./SpaceHeader"
import { ChatPanel } from "./sidebar/ChatPanel"
import { ParticipantPanel } from "./video/ParticipantPanel"
import { ScreenShareOverlay } from "./video/ScreenShare"
import { ControlBar } from "./controls/ControlBar"
import { GameCanvas } from "./game/GameCanvas"
import { useSocket } from "../socket"
import { useLiveKit } from "../livekit"
import type { ChatMessageData } from "../socket/types"
import type { ChatMessage } from "../types/space.types"

// ============================================
// ResizeHandle Component
// ============================================
function ResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        "group relative flex w-1 items-center justify-center bg-border transition-colors hover:bg-primary/50 data-[resize-handle-active]:bg-primary",
        className
      )}
    >
      <div className="absolute h-8 w-1 rounded-full bg-muted-foreground/20 opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-active]:opacity-100" />
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
  onExit: () => void
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

export function SpaceLayout({
  spaceId,
  spaceName,
  spaceLogoUrl,
  spacePrimaryColor,
  userNickname,
  userId,
  onExit,
}: SpaceLayoutProps) {
  // Panel visibility
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(true)

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Socket message handlers
  const handleChatMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => [...prev, socketToChatMessage(data)])
  }, [])

  const handleSystemMessage = useCallback((data: ChatMessageData) => {
    setMessages((prev) => [...prev, socketToChatMessage(data)])
  }, [])

  // Socket connection for game position sync
  const { isConnected, players, sendMessage } = useSocket({
    spaceId,
    playerId: userId,
    nickname: userNickname,
    onChatMessage: handleChatMessage,
    onSystemMessage: handleSystemMessage,
  })

  // LiveKit for audio/video
  const {
    mediaState,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    participantTracks,
  } = useLiveKit({
    spaceId,
    participantId: userId,
    participantName: userNickname,
    enabled: true,
  })

  // Ensure local participant is in tracks (fallback if LiveKit not connected)
  const allParticipantTracks = useMemo(() => {
    const tracks = new Map(participantTracks)

    // Add local participant if not in tracks yet
    if (!tracks.has(userId)) {
      tracks.set(userId, {
        participantId: userId,
        participantName: userNickname,
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
  }, [participantTracks, players, userId, userNickname])

  // Find active screen share (first participant with screenTrack)
  const activeScreenShare = useMemo(() => {
    for (const track of allParticipantTracks.values()) {
      if (track.screenTrack) {
        return track
      }
    }
    return null
  }, [allParticipantTracks])

  // Screen share overlay visibility (show remote screen shares, hide own)
  const [showScreenShareOverlay, setShowScreenShareOverlay] = useState(true)

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

  const handleCloseScreenShareOverlay = useCallback(() => {
    setShowScreenShareOverlay(false)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <SpaceHeader
        spaceName={spaceName}
        spaceLogoUrl={spaceLogoUrl}
        spacePrimaryColor={spacePrimaryColor}
        userNickname={userNickname}
        onExit={onExit}
      />

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Chat */}
          {isChatOpen && (
            <>
              <Panel
                defaultSize={20}
                minSize={15}
                maxSize={35}
                collapsible
                onCollapse={() => setIsChatOpen(false)}
              >
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  currentUserId={userId}
                />
              </Panel>
              <ResizeHandle />
            </>
          )}

          {/* Center Panel - Game Canvas */}
          <Panel defaultSize={isChatOpen && isParticipantsOpen ? 60 : isChatOpen || isParticipantsOpen ? 80 : 100}>
            <GameCanvas
              playerId={userId}
              playerNickname={userNickname}
            />
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
                  localParticipantId={userId}
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
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={handleToggleChat}
        onToggleParticipants={handleToggleParticipants}
      />

      {/* Screen Share Overlay - Show when someone is sharing (except self) */}
      {activeScreenShare &&
       activeScreenShare.participantId !== userId &&
       showScreenShareOverlay && (
        <ScreenShareOverlay
          track={activeScreenShare}
          onClose={handleCloseScreenShareOverlay}
        />
      )}
    </div>
  )
}
