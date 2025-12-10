"use client"

/**
 * ChatMessageList - ZEP 스타일 미니멀 채팅 오버레이
 *
 * 기능:
 * - 텍스트만 표시 (박스 없음)
 * - 형식: HH:MM 닉네임: 내용
 * - 이모지 리액션 (👍 ❤️ ✅)
 * - 자동 스크롤
 */
import { useRef, useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage, ReactionType, MessageReaction } from "../../types/space.types"

// ============================================
// 리액션 이모지 매핑
// ============================================
const REACTION_EMOJI: Record<ReactionType, string> = {
  thumbsup: "👍",
  heart: "❤️",
  check: "✅",
}

// ============================================
// 리액션 버튼 컴포넌트
// ============================================
interface ReactionButtonsProps {
  messageId: string
  reactions?: MessageReaction[]
  currentUserId: string
  onReact: (messageId: string, type: ReactionType) => void
  isVisible: boolean
}

function ReactionButtons({
  messageId,
  reactions = [],
  currentUserId,
  onReact,
  isVisible,
}: ReactionButtonsProps) {
  // 각 리액션 타입별 카운트 및 사용자 리액션 여부
  const reactionCounts = (Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
    const typeReactions = reactions.filter((r) => r.type === type)
    const hasReacted = typeReactions.some((r) => r.userId === currentUserId)
    return { type, count: typeReactions.length, hasReacted }
  })

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 ml-1 transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {reactionCounts.map(({ type, count, hasReacted }) => (
        <button
          key={type}
          onClick={() => onReact(messageId, type)}
          className={cn(
            "text-[10px] px-1 py-0.5 rounded hover:bg-white/20 transition-colors",
            hasReacted && "bg-white/30"
          )}
          title={`${REACTION_EMOJI[type]} 반응`}
        >
          {REACTION_EMOJI[type]}
          {count > 0 && <span className="ml-0.5 text-[9px]">{count}</span>}
        </button>
      ))}
    </div>
  )
}

// ============================================
// 개별 메시지 렌더링
// ============================================
interface ChatMessageItemProps {
  message: ChatMessage
  isOwn: boolean
  currentUserId: string
  onReact: (messageId: string, type: ReactionType) => void
}

function ChatMessageItem({ message, isOwn, currentUserId, onReact }: ChatMessageItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isSystem = message.type === "system" || message.type === "announcement"

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // 시스템 메시지
  if (isSystem) {
    return (
      <div className="py-0.5">
        <span className="text-[11px] text-yellow-300/90 drop-shadow-sm">
          ⚡ {message.content}
        </span>
      </div>
    )
  }

  // 닉네임 색상 (발신자 구분용)
  const nicknameColor = isOwn
    ? "text-cyan-300"
    : "text-emerald-300"

  return (
    <div
      className="py-0.5 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-[11px] leading-relaxed drop-shadow-md">
        {/* 타임스탬프 */}
        <span className="text-white/50 mr-1">
          {formatTime(message.timestamp)}
        </span>
        {/* 닉네임 */}
        <span className={cn("font-semibold mr-1", nicknameColor)}>
          {message.senderNickname}:
        </span>
        {/* 내용 */}
        <span className="text-white">
          {message.content}
        </span>
        {/* 리액션 버튼 */}
        <ReactionButtons
          messageId={message.id}
          reactions={message.reactions}
          currentUserId={currentUserId}
          onReact={onReact}
          isVisible={isHovered}
        />
      </span>
      {/* 기존 리액션 표시 */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="pl-12 text-[10px] text-white/70">
          {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
            const count = message.reactions!.filter((r) => r.type === type).length
            if (count === 0) return null
            return (
              <span key={type} className="mr-1">
                {REACTION_EMOJI[type]} {count}
              </span>
            )
          })}
        </div>
      )}
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
  onReact?: (messageId: string, type: ReactionType) => void
}

// ============================================
// ChatMessageList Component
// ============================================
export function ChatMessageList({
  messages,
  currentUserId,
  isActive,
  onReact,
}: ChatMessageListProps) {
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

  // 리액션 핸들러 (외부로 전달)
  const handleReact = useCallback(
    (messageId: string, type: ReactionType) => {
      if (onReact) {
        onReact(messageId, type)
      }
    },
    [onReact]
  )

  return (
    <div
      ref={containerRef}
      tabIndex={isActive ? 0 : -1}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto px-2 py-1 min-h-0",
        "scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent",
        isActive && "focus:outline-none"
      )}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-[11px] text-white/40 drop-shadow-sm">
            채팅을 시작하세요
          </span>
        </div>
      ) : (
        messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            currentUserId={currentUserId}
            onReact={handleReact}
          />
        ))
      )}
    </div>
  )
}
