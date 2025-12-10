"use client"

/**
 * FloatingChatOverlay - ZEP 스타일 미니멀 채팅 오버레이
 *
 * 기능:
 * - 반투명 배경의 텍스트 오버레이
 * - 드래그 가능 (GPU 가속 transform 사용)
 * - Enter 키로 채팅 모드 토글
 * - 이모지 리액션 지원
 */
import { useEffect, useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import { useChatMode } from "../../hooks/useChatMode"
import { useChatDrag } from "../../hooks/useChatDrag"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInputArea } from "./ChatInputArea"
import type { ChatMessage, ReactionType } from "../../types/space.types"

// ============================================
// Icons
// ============================================
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
  onReact?: (messageId: string, type: ReactionType) => void
  currentUserId: string
  isVisible?: boolean
}

// ============================================
// FloatingChatOverlay Component
// ============================================
export function FloatingChatOverlay({
  messages,
  onSendMessage,
  onReact,
  currentUserId,
  isVisible = true,
}: FloatingChatOverlayProps) {
  const { isActive, toggleMode, deactivate } = useChatMode()
  const { position, isDragging, handleMouseDown } = useChatDrag()

  // 리액션 핸들러 (로컬 상태 업데이트용)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages)

  // 외부 메시지 동기화
  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  // 리액션 토글 핸들러
  const handleReact = useCallback(
    (messageId: string, type: ReactionType) => {
      // 로컬 상태 업데이트 (낙관적 UI)
      setLocalMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg

          const reactions = msg.reactions || []
          const existingIndex = reactions.findIndex(
            (r) => r.type === type && r.userId === currentUserId
          )

          if (existingIndex >= 0) {
            // 이미 반응했으면 제거
            return {
              ...msg,
              reactions: reactions.filter((_, i) => i !== existingIndex),
            }
          } else {
            // 새 반응 추가
            return {
              ...msg,
              reactions: [
                ...reactions,
                { type, userId: currentUserId, userNickname: "" },
              ],
            }
          }
        })
      )

      // 서버에 전송 (옵션)
      if (onReact) {
        onReact(messageId, type)
      }
    },
    [currentUserId, onReact]
  )

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
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        willChange: isDragging ? "transform" : "auto",
        zIndex: 40,
      }}
      className={cn(
        "w-80 flex flex-col rounded-lg",
        "bg-black/40 backdrop-blur-sm",
        "transition-[height,box-shadow] duration-200 ease-out",
        isActive ? "h-52" : "h-32",
        isDragging && "cursor-grabbing shadow-2xl"
      )}
    >
      {/* 드래그 가능한 헤더 */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "flex items-center gap-2 px-2 py-1 border-b border-white/10",
          "cursor-grab select-none shrink-0",
          isDragging && "cursor-grabbing"
        )}
      >
        <span className="text-white/30">
          <GripIcon />
        </span>
        <span className="text-[10px] font-medium text-white/60 flex-1">
          채팅
        </span>
        <span
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded",
            isActive
              ? "bg-cyan-500/30 text-cyan-300"
              : "bg-white/10 text-white/40"
          )}
        >
          {isActive ? "입력 중" : "Enter"}
        </span>
      </div>

      {/* 메시지 목록 */}
      <ChatMessageList
        messages={localMessages}
        currentUserId={currentUserId}
        isActive={isActive}
        onReact={handleReact}
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
