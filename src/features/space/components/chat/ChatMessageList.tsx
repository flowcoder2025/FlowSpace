"use client"

/**
 * ChatMessageList - 채팅 메시지 목록 (스크롤 가능)
 *
 * 기능:
 * - 마우스 휠 스크롤
 * - 방향키 스크롤 (포커스 시)
 * - 자동 스크롤 (새 메시지)
 */
import { useRef, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "../../types/space.types"

// ============================================
// ChatMessageItem - 개별 메시지 렌더링
// ============================================
interface ChatMessageItemProps {
  message: ChatMessage
  isOwn: boolean
}

function ChatMessageItem({ message, isOwn }: ChatMessageItemProps) {
  const isSystem = message.type === "system" || message.type === "announcement"

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isSystem) {
    return (
      <div className="py-0.5 text-center">
        <span className="text-[10px] text-muted-foreground/70">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-2 py-1",
          isOwn
            ? "bg-primary/90 text-primary-foreground"
            : "bg-muted/80"
        )}
      >
        {!isOwn && (
          <span className="text-[10px] font-semibold block mb-0.5 text-foreground/80">
            {message.senderNickname}
          </span>
        )}
        <span className="text-xs break-words">{message.content}</span>
        <span
          className={cn(
            "text-[9px] block text-right mt-0.5",
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground/60"
          )}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

// ============================================
// ChatMessageList Props
// ============================================
interface ChatMessageListProps {
  messages: ChatMessage[]
  currentUserId: string
  isActive: boolean
}

// ============================================
// ChatMessageList Component
// ============================================
export function ChatMessageList({ messages, currentUserId, isActive }: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)

  // 새 메시지 시 자동 스크롤 (사용자가 위로 스크롤하지 않은 경우)
  useEffect(() => {
    if (!userScrolled && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, userScrolled])

  // 방향키 스크롤
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!containerRef.current) return

    if (e.key === "ArrowUp") {
      e.preventDefault()
      containerRef.current.scrollTop -= 40
      setUserScrolled(true)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      containerRef.current.scrollTop += 40
    }
  }, [])

  // 스크롤 핸들러 - 바닥에 도달하면 userScrolled 리셋
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (el && el.scrollHeight - el.scrollTop <= el.clientHeight + 10) {
      setUserScrolled(false)
    } else {
      setUserScrolled(true)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      tabIndex={isActive ? 0 : -1}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-0",
        "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
        isActive && "focus:outline-none focus:ring-1 focus:ring-primary/30 rounded"
      )}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] text-muted-foreground/50">
            메시지가 없습니다
          </span>
        </div>
      ) : (
        messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
          />
        ))
      )}
    </div>
  )
}
