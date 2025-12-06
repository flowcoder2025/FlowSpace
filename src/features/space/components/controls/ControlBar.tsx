"use client"

import { cn } from "@/lib/utils"
import { Button, HStack } from "@/components/ui"

// ============================================
// Icons
// ============================================
const MicIcon = ({ muted }: { muted?: boolean }) => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {muted ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19L5 5M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v1a7 7 0 01-14 0v-1M12 19v4m-4 0h8" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v1a7 7 0 01-14 0v-1M12 19v4m-4 0h8" />
      </>
    )}
  </svg>
)

const CameraIcon = ({ off }: { off?: boolean }) => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {off ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364L5.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    )}
  </svg>
)

const ScreenShareIcon = ({ active }: { active?: boolean }) => (
  <svg className={cn("size-5", active && "text-primary")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const ChatIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

// ============================================
// ControlBar Props
// ============================================
interface ControlBarProps {
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  isChatOpen: boolean
  isParticipantsOpen: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleScreenShare: () => void
  onToggleChat: () => void
  onToggleParticipants: () => void
  onOpenSettings?: () => void
}

// ============================================
// ControlBar Component
// ============================================
export function ControlBar({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isChatOpen,
  isParticipantsOpen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onOpenSettings,
}: ControlBarProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-center border-t bg-background/95 px-4 backdrop-blur">
      <HStack gap="sm">
        {/* Mic Toggle */}
        <Button
          variant={isMicOn ? "outline" : "default"}
          size="icon"
          onClick={onToggleMic}
          className={cn(!isMicOn && "bg-destructive hover:bg-destructive/90")}
          aria-label={isMicOn ? "마이크 끄기" : "마이크 켜기"}
        >
          <MicIcon muted={!isMicOn} />
        </Button>

        {/* Camera Toggle */}
        <Button
          variant={isCameraOn ? "outline" : "default"}
          size="icon"
          onClick={onToggleCamera}
          className={cn(!isCameraOn && "bg-destructive hover:bg-destructive/90")}
          aria-label={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
        >
          <CameraIcon off={!isCameraOn} />
        </Button>

        {/* Screen Share Toggle */}
        <Button
          variant={isScreenSharing ? "default" : "outline"}
          size="icon"
          onClick={onToggleScreenShare}
          aria-label={isScreenSharing ? "화면 공유 중지" : "화면 공유"}
        >
          <ScreenShareIcon active={isScreenSharing} />
        </Button>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Chat Toggle */}
        <Button
          variant={isChatOpen ? "default" : "outline"}
          size="icon"
          onClick={onToggleChat}
          aria-label={isChatOpen ? "채팅 닫기" : "채팅 열기"}
        >
          <ChatIcon />
        </Button>

        {/* Participants Toggle */}
        <Button
          variant={isParticipantsOpen ? "default" : "outline"}
          size="icon"
          onClick={onToggleParticipants}
          aria-label={isParticipantsOpen ? "참가자 목록 닫기" : "참가자 목록 열기"}
        >
          <UsersIcon />
        </Button>

        {/* Settings */}
        {onOpenSettings && (
          <>
            <div className="mx-2 h-6 w-px bg-border" />
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenSettings}
              aria-label="설정"
            >
              <SettingsIcon />
            </Button>
          </>
        )}
      </HStack>
    </div>
  )
}
