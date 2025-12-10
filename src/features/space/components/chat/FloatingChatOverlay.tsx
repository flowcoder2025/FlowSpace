"use client"

/**
 * FloatingChatOverlay - 플로팅 채팅 오버레이 컨테이너
 *
 * 기능:
 * - 드래그 가능한 헤더
 * - 반투명 배경
 * - 채팅 활성화 시 확장
 * - Enter 키로 채팅 모드 토글
 */
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { useChatMode } from "../../hooks/useChatMode"
import { useChatDrag } from "../../hooks/useChatDrag"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInputArea } from "./ChatInputArea"
import type { ChatMessage } from "../../types/space.types"

// ============================================
// Icons
// ============================================
const ChatIcon = () => (
  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
)

const GripIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="8" cy="6" r="1.5" />
    <circle cx="16" cy="6" r="1.5" />
    <circle cx="8" cy="12" r="1.5" />
    <circle cx="16" cy="12" r="1.5" />
    <circle cx="8" cy="18" r="1.5" />
    <circle cx="16" cy="18" r="1.5" />
  </svg>
)

// ============================================
// FloatingChatOverlay Props
// ============================================
interface FloatingChatOverlayProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  currentUserId: string
  isVisible?: boolean
}

// ============================================
// FloatingChatOverlay Component
// ============================================
export function FloatingChatOverlay({
  messages,
  onSendMessage,
  currentUserId,
  isVisible = true,
}: FloatingChatOverlayProps) {
  const { isActive, toggleMode, deactivate } = useChatMode()
  const { position, isDragging, handleMouseDown } = useChatDrag()

  // 전역 Enter 키 리스너 (채팅 비활성 상태에서만)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 채팅이 이미 활성화되어 있으면 무시
      if (isActive) return

      // 다른 입력 요소에 포커스가 있으면 무시
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === "Enter") {
        e.preventDefault()
        toggleMode()
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [isActive, toggleMode])

  if (!isVisible) return null

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: 40,
      }}
      className={cn(
        "w-72 flex flex-col rounded-lg border border-border/40",
        "bg-background/75 backdrop-blur-md shadow-lg",
        "transition-all duration-200 ease-out",
        isActive ? "h-80" : "h-36",
        isDragging && "cursor-grabbing shadow-xl"
      )}
    >
      {/* 드래그 가능한 헤더 */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 border-b border-border/30",
          "cursor-grab select-none shrink-0",
          isDragging && "cursor-grabbing"
        )}
      >
        <span className="text-muted-foreground/50">
          <GripIcon />
        </span>
        <span className="text-muted-foreground/70">
          <ChatIcon />
        </span>
        <span className="text-[10px] font-medium text-muted-foreground flex-1">
          채팅
        </span>
        <span
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded",
            isActive
              ? "bg-primary/20 text-primary"
              : "bg-muted/50 text-muted-foreground/60"
          )}
        >
          {isActive ? "입력 중" : "Enter"}
        </span>
      </div>

      {/* 메시지 목록 */}
      <ChatMessageList
        messages={messages}
        currentUserId={currentUserId}
        isActive={isActive}
      />

      {/* 입력 영역 (활성화 시만) */}
      <ChatInputArea
        onSend={onSendMessage}
        onDeactivate={deactivate}
        isActive={isActive}
      />
    </div>
  )
}
