"use client"

/**
 * ChatMessageList - LoL 인게임 스타일 메시지 목록
 *
 * 스타일:
 * - 배경 없음, 텍스트 + 그림자만
 * - 닉네임: 내용 형식
 * - 메시지별 opacity 지원 (페이드아웃)
 *
 * 기능:
 * - 이모지 리액션 (👍 ❤️ ✅)
 * - 자동 스크롤
 * - 마우스 호버 시 리액션 버튼 표시
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
// 확장된 메시지 타입 (opacity 포함)
// ============================================
interface ExtendedChatMessage extends ChatMessage {
  opacity?: number
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
  const reactionCounts = (Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
    const typeReactions = reactions.filter((r) => r.type === type)
    const hasReacted = typeReactions.some((r) => r.userId === currentUserId)
    return { type, count: typeReactions.length, hasReacted }
  })

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 ml-2 transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {reactionCounts.map(({ type, count, hasReacted }) => (
        <button
          key={type}
          onClick={(e) => {
            e.stopPropagation()
            onReact(messageId, type)
          }}
          className={cn(
            "text-[11px] px-1 rounded transition-all",
            "hover:bg-white/20 active:scale-95",
            "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
            hasReacted && "bg-white/20"
          )}
        >
          {REACTION_EMOJI[type]}
          {count > 0 && <span className="ml-0.5 text-[10px]">{count}</span>}
        </button>
      ))}
    </span>
  )
}

// ============================================
// 개별 메시지 렌더링
// ============================================
interface ChatMessageItemProps {
  message: ExtendedChatMessage
  isOwn: boolean
  currentUserId: string
  onReact: (messageId: string, type: ReactionType) => void
}

function ChatMessageItem({ message, isOwn, currentUserId, onReact }: ChatMessageItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isSystem = message.type === "system" || message.type === "announcement"
  const opacity = message.opacity ?? 1

  // 시스템 메시지 (노란색)
  if (isSystem) {
    return (
      <div
        className="py-0.5 transition-opacity duration-500"
        style={{ opacity }}
      >
        <span
          className="text-[12px] text-yellow-400 font-medium"
          style={{
            textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)",
          }}
        >
          {message.content}
        </span>
      </div>
    )
  }

  // 닉네임 색상
  const nicknameColor = isOwn ? "text-cyan-400" : "text-lime-400"

  return (
    <div
      className="py-0.5 transition-opacity duration-500"
      style={{ opacity }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className="text-[12px] leading-relaxed"
        style={{
          textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)",
        }}
      >
        {/* 닉네임 */}
        <span className={cn("font-bold", nicknameColor)}>
          {message.senderNickname}
        </span>
        {/* 구분자 */}
        <span className="text-white/70">: </span>
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
        <div
          className="pl-4 text-[10px]"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
            const count = message.reactions!.filter((r) => r.type === type).length
            if (count === 0) return null
            return (
              <span key={type} className="mr-1.5 text-white/80">
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
  messages: ExtendedChatMessage[]
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

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    if (!userScrolled && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, userScrolled])

  // 스크롤 핸들러
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (el && el.scrollHeight - el.scrollTop <= el.clientHeight + 10) {
      setUserScrolled(false)
    } else {
      setUserScrolled(true)
    }
  }, [])

  // 리액션 핸들러
  const handleReact = useCallback(
    (messageId: string, type: ReactionType) => {
      if (onReact) {
        onReact(messageId, type)
      }
    },
    [onReact]
  )

  // 최근 메시지만 표시 (성능 최적화)
  const recentMessages = messages.slice(-50)

  return (
    <div
      ref={containerRef}
      tabIndex={isActive ? 0 : -1}
      onScroll={handleScroll}
      className={cn(
        "overflow-y-auto px-1 min-h-0",
        "scrollbar-none", // 스크롤바 숨김 (LoL 스타일)
        isActive && "focus:outline-none"
      )}
    >
      {recentMessages.length === 0 ? (
        <div className="py-2">
          <span
            className="text-[11px] text-white/50"
            style={{
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            채팅을 시작하세요...
          </span>
        </div>
      ) : (
        recentMessages.map((msg) => (
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
