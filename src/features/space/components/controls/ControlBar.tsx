"use client"

import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui"
import { useMediaDevices } from "../../hooks"

// ============================================
// Icons
// ============================================
const MicIcon = ({ muted }: { muted?: boolean }) => (
  <svg
    className="size-5"
    fill="none"
    stroke={muted ? "var(--color-destructive)" : "var(--color-primary)"}
    viewBox="0 0 24 24"
  >
    {muted ? (
      <>
        {/* 빗금 */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19L5 5" />
        {/* 마이크 본체 */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" />
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
  <svg
    className="size-5"
    fill="none"
    stroke={off ? "var(--color-destructive)" : "var(--color-primary)"}
    viewBox="0 0 24 24"
  >
    {off ? (
      <>
        {/* 빗금 */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364L5.636 5.636" />
        {/* 카메라 본체 */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </>
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    )}
  </svg>
)

const ScreenShareIcon = ({ active }: { active?: boolean }) => (
  <svg
    className="size-5"
    fill="none"
    stroke={active ? "var(--color-primary)" : "var(--color-destructive)"}
    viewBox="0 0 24 24"
  >
    {!active && (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18L6 6" />
    )}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const ChatIcon = ({ active }: { active?: boolean }) => (
  <svg
    className="size-5"
    fill="none"
    stroke={active ? "var(--color-primary)" : "var(--color-destructive)"}
    viewBox="0 0 24 24"
  >
    {!active && (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18L6 6" />
    )}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const UsersIcon = ({ active }: { active?: boolean }) => (
  <svg
    className="size-5"
    fill="none"
    stroke={active ? "var(--color-primary)" : "var(--color-destructive)"}
    viewBox="0 0 24 24"
  >
    {!active && (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18L6 6" />
    )}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const MicSmallIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v1a7 7 0 01-14 0v-1M12 19v4m-4 0h8" />
  </svg>
)

const SpeakerIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2l4-4v14l-4-4z" />
  </svg>
)

const CameraSmallIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

// ============================================
// MediaError Type (also exported from LiveKitMediaContext)
// ============================================
export type MediaError = {
  type: "permission_denied" | "not_found" | "not_connected" | "unknown"
  message: string
}

// ============================================
// AlertIcon for error display
// ============================================
const AlertIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
  mediaError?: MediaError | null
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleScreenShare: () => void
  onToggleChat: () => void
  onToggleParticipants: () => void
  onOpenSettings?: () => void
  onDismissError?: () => void
}

// ============================================
// ControlBar Component
// ZEP 스타일: 중앙 하단 플로팅 pill 형태
// ============================================
export function ControlBar({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isChatOpen,
  isParticipantsOpen,
  mediaError,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onOpenSettings,
  onDismissError,
}: ControlBarProps) {
  // 미디어 장치 훅
  const {
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
  } = useMediaDevices()

  return (
    <div className="absolute inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center rounded-full bg-black/30 px-3 py-2 shadow-lg backdrop-blur-sm border border-white/10">
      {/* Media Error Alert */}
      {mediaError && (
        <div className="absolute -top-12 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-destructive-foreground shadow-lg">
          <AlertIcon />
          <span className="text-sm">{mediaError.message}</span>
          {onDismissError && (
            <button
              onClick={onDismissError}
              className="ml-2 rounded p-0.5 hover:bg-destructive-foreground/20"
              aria-label="에러 닫기"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        {/* Mic Toggle + Device Selector */}
        <div className="group flex items-center">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleMic}
            className="rounded-r-none border-r-0 border-white/30 text-white bg-transparent hover:bg-white/10 group-hover:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label={isMicOn ? "마이크 끄기" : "마이크 켜기"}
          >
            <MicIcon muted={!isMicOn} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-6 rounded-l-none border-l-0 px-1 border-white/30 text-white bg-transparent hover:bg-white/10 group-hover:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="오디오 설정"
              >
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-64">
              {/* 마이크 선택 */}
              <DropdownMenuLabel className="flex items-center gap-2">
                <MicSmallIcon />
                마이크
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={selectedAudioInput || ""}
                onValueChange={selectAudioInput}
              >
                {audioInputDevices.length === 0 ? (
                  <DropdownMenuItem disabled>
                    장치를 찾을 수 없습니다
                  </DropdownMenuItem>
                ) : (
                  audioInputDevices.map((device) => (
                    <DropdownMenuRadioItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-sm"
                    >
                      {device.label}
                    </DropdownMenuRadioItem>
                  ))
                )}
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              {/* 스피커 선택 */}
              <DropdownMenuLabel className="flex items-center gap-2">
                <SpeakerIcon />
                스피커
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={selectedAudioOutput || ""}
                onValueChange={selectAudioOutput}
              >
                {audioOutputDevices.length === 0 ? (
                  <DropdownMenuItem disabled>
                    장치를 찾을 수 없습니다
                  </DropdownMenuItem>
                ) : (
                  audioOutputDevices.map((device) => (
                    <DropdownMenuRadioItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-sm"
                    >
                      {device.label}
                    </DropdownMenuRadioItem>
                  ))
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Camera Toggle + Device Selector */}
        <div className="group flex items-center">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleCamera}
            className="rounded-r-none border-r-0 border-white/30 text-white bg-transparent hover:bg-white/10 group-hover:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
          >
            <CameraIcon off={!isCameraOn} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-6 rounded-l-none border-l-0 px-1 border-white/30 text-white bg-transparent hover:bg-white/10 group-hover:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="비디오 설정"
              >
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-64">
              {/* 카메라 선택 */}
              <DropdownMenuLabel className="flex items-center gap-2">
                <CameraSmallIcon />
                카메라
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={selectedVideoInput || ""}
                onValueChange={selectVideoInput}
              >
                {videoInputDevices.length === 0 ? (
                  <DropdownMenuItem disabled>
                    장치를 찾을 수 없습니다
                  </DropdownMenuItem>
                ) : (
                  videoInputDevices.map((device) => (
                    <DropdownMenuRadioItem
                      key={device.deviceId}
                      value={device.deviceId}
                      className="text-sm"
                    >
                      {device.label}
                    </DropdownMenuRadioItem>
                  ))
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Screen Share Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleScreenShare}
          className="border-white/30 text-white bg-transparent hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label={isScreenSharing ? "화면 공유 중지" : "화면 공유"}
        >
          <ScreenShareIcon active={isScreenSharing} />
        </Button>

        <div className="mx-1 h-5 w-px bg-white/20" />

        {/* Chat Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            onToggleChat()
            // 클릭 후 포커스 해제 (스페이스바로 재토글 방지)
            ;(document.activeElement as HTMLElement)?.blur()
          }}
          className="border-white/30 text-white bg-transparent hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label={isChatOpen ? "채팅 닫기" : "채팅 열기"}
        >
          <ChatIcon active={isChatOpen} />
        </Button>

        {/* Participants Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            onToggleParticipants()
            // 클릭 후 포커스 해제 (스페이스바로 재토글 방지)
            ;(document.activeElement as HTMLElement)?.blur()
          }}
          className="border-white/30 text-white bg-transparent hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label={isParticipantsOpen ? "참가자 목록 닫기" : "참가자 목록 열기"}
        >
          <UsersIcon active={isParticipantsOpen} />
        </Button>

        {/* Settings */}
        {onOpenSettings && (
          <>
            <div className="mx-1 h-5 w-px bg-white/20" />
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenSettings}
              className="border-white/30 text-white bg-transparent hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="설정"
            >
              <SettingsIcon />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
