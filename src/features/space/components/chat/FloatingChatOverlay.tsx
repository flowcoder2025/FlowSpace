"use client"

/**
 * FloatingChatOverlay - 게임 내 플로팅 채팅
 *
 * 스타일:
 * - 반투명 배경의 채팅창
 * - 드래그 가능한 상단 바
 * - 타임스탬프:닉네임:내용 형식
 *
 * 기능:
 * - Enter 키로 채팅 활성화 → 입력 → Enter로 전송+비활성화
 * - 드래그 이동 가능 (상단 바)
 * - 이모지 리액션 (👍 ❤️ ✅)
 */
import { useEffect, useCallback, useState, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useChatMode } from "../../hooks/useChatMode"
import { useChatDrag } from "../../hooks/useChatDrag"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInputArea } from "./ChatInputArea"
import type { ChatMessage, ReactionType } from "../../types/space.types"

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


  // 로컬 리액션 상태 (낙관적 UI 업데이트용)
  const [localReactions, setLocalReactions] = useState<
    Record<string, { type: ReactionType; userId: string; userNickname: string }[]>
  >({})

  // 리액션 토글 핸들러
  const handleReact = useCallback(
    (messageId: string, type: ReactionType) => {
      setLocalReactions((prev) => {
        const reactions = prev[messageId] || []
        const existingIndex = reactions.findIndex(
          (r) => r.type === type && r.userId === currentUserId
        )

        if (existingIndex >= 0) {
          return {
            ...prev,
            [messageId]: reactions.filter((_, i) => i !== existingIndex),
          }
        } else {
          return {
            ...prev,
            [messageId]: [
              ...reactions,
              { type, userId: currentUserId, userNickname: "" },
            ],
          }
        }
      })

      if (onReact) {
        onReact(messageId, type)
      }
    },
    [currentUserId, onReact]
  )

  // 메시지에 로컬 리액션 적용 (투명도 없이 항상 동일)
  const displayMessages = useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      reactions: localReactions[msg.id] || msg.reactions || [],
    }))
  }, [messages, localReactions])

  // 전역 Enter 키 리스너
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isActive) return

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
      className="w-80 flex flex-col rounded-lg overflow-hidden shadow-lg border border-white/10 bg-black/70 backdrop-blur-sm"
    >
      {/* 드래그 가능한 헤더 바 */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "h-7 flex items-center justify-between px-3 bg-black/50 border-b border-white/10 select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <span className="text-[11px] text-white/70 font-medium">채팅</span>
        <span className="text-[10px] text-white/40">
          {isActive ? "Esc로 닫기" : "Enter로 입력"}
        </span>
      </div>

      {/* 메시지 목록 */}
      <div className="flex flex-col justify-end min-h-[100px] max-h-[180px]">
        <ChatMessageList
          messages={displayMessages}
          currentUserId={currentUserId}
          isActive={isActive}
          onReact={handleReact}
        />
      </div>

      {/* 입력 영역 - 활성화 시만 표시 */}
      <ChatInputArea
        onSend={onSendMessage}
        onDeactivate={deactivate}
        isActive={isActive}
      />
    </div>
  )
}
