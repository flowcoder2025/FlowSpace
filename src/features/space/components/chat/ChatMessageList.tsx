"use client"

/**
 * ChatMessageList - 채팅 메시지 목록
 *
 * 스타일:
 * - 타임스탬프 [HH:MM] 닉네임: 내용 형식
 *
 * 기능:
 * - 이모지 리액션 (👍 ❤️ ✅)
 * - 자동 스크롤 (과거 기록 보는 중엔 유지)
 * - 마우스 호버 시 리액션 버튼 표시
 * - 스크롤바 활성화 시에만 표시
 * - 최신 메시지 이동 버튼
 */
import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage, ReactionType, MessageReaction } from "../../types/space.types"

// ============================================
// 화살표 아이콘 컴포넌트
// ============================================
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ============================================
// 리액션 이모지 매핑
// ============================================
const REACTION_EMOJI: Record<ReactionType, string> = {
  thumbsup: "👍",
  heart: "❤️",
  check: "✅",
}

// ============================================
// 타임스탬프 포맷 함수
// ============================================
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
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
  message: ChatMessage
  isOwn: boolean
  currentUserId: string
  onReact: (messageId: string, type: ReactionType) => void
}

function ChatMessageItem({ message, isOwn, currentUserId, onReact }: ChatMessageItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isSystem = message.type === "system" || message.type === "announcement"
  const timeStr = formatTime(message.timestamp)

  // 시스템 메시지 (노란색)
  if (isSystem) {
    return (
      <div className="py-0.5 px-2">
        <span className="text-[11px] text-yellow-400/90">
          <span className="text-white/40 mr-1">[{timeStr}]</span>
          {message.content}
        </span>
      </div>
    )
  }

  // 닉네임 색상
  const nicknameColor = isOwn ? "text-primary" : "text-emerald-400"

  return (
    <div
      className="py-0.5 px-2 hover:bg-white/5 rounded"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-[11px] leading-relaxed">
        {/* 타임스탬프 */}
        <span className="text-white/40 mr-1">[{timeStr}]</span>
        {/* 닉네임 */}
        <span className={cn("font-semibold", nicknameColor)}>
          {message.senderNickname}
        </span>
        {/* 구분자 */}
        <span className="text-white/50">: </span>
        {/* 내용 */}
        <span className="text-white/90">
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
        <div className="pl-12 text-[10px] text-white/60">
          {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
            const count = message.reactions!.filter((r) => r.type === type).length
            if (count === 0) return null
            return (
              <span key={type} className="mr-1.5">
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
// ChatMessageList Props & Handle
// ============================================
interface ChatMessageListProps {
  messages: ChatMessage[]
  currentUserId: string
  isActive: boolean
  onReact?: (messageId: string, type: ReactionType) => void
  onDeactivate?: () => void  // 채팅 기록 영역에서 Enter 시 비활성화
}

export interface ChatMessageListHandle {
  scrollToBottom: () => void
}

// ============================================
// ChatMessageList Component
// ============================================
// 스크롤 속도 상수
const SCROLL_STEP = 40

export const ChatMessageList = forwardRef<ChatMessageListHandle, ChatMessageListProps>(
  function ChatMessageList({ messages, currentUserId, isActive, onReact, onDeactivate }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [userScrolled, setUserScrolled] = useState(false)
    // 새 메시지 알림용 (과거 기록 보는 중 신규 메시지 있음)
    const [hasNewMessages, setHasNewMessages] = useState(false)
    // 이전 메시지 수 추적 (상태로 관리)
    const [prevMessageCount, setPrevMessageCount] = useState(messages.length)

    // 최하단 스크롤 함수
    const scrollToBottom = useCallback(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
        setUserScrolled(false)
        setHasNewMessages(false)
      }
    }, [])

    // 외부에서 호출 가능하도록 ref로 노출
    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }), [scrollToBottom])

    // 새 메시지 감지 및 처리
    // 메시지 수 변화에 반응하여 알림 표시 또는 자동 스크롤
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
      const newCount = messages.length

      if (newCount > prevMessageCount) {
        // 새 메시지가 도착함
        if (userScrolled) {
          // 과거 기록 보는 중이면 알림 표시
          setHasNewMessages(true)
        } else {
          // 최하단에 있으면 자동 스크롤
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        }
      }

      setPrevMessageCount(newCount)
    }, [messages.length, prevMessageCount, userScrolled])
    /* eslint-enable react-hooks/set-state-in-effect */

    // 스크롤 핸들러
    const handleScroll = useCallback(() => {
      const el = containerRef.current
      if (!el) return

      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 30

      if (isAtBottom) {
        setUserScrolled(false)
        setHasNewMessages(false)
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

    // 키보드 핸들러 (방향키 스크롤 + Enter 비활성화)
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const el = containerRef.current
        if (!el) return

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault()
            el.scrollTop -= SCROLL_STEP
            setUserScrolled(true)
            break
          case "ArrowDown":
            e.preventDefault()
            el.scrollTop += SCROLL_STEP
            // 최하단 도달 체크
            if (el.scrollHeight - el.scrollTop <= el.clientHeight + 30) {
              setUserScrolled(false)
              setHasNewMessages(false)
            }
            break
          case "Enter":
            e.preventDefault()
            // 채팅 비활성화
            if (onDeactivate) {
              scrollToBottom()
              onDeactivate()
            }
            break
        }
      },
      [onDeactivate, scrollToBottom]
    )

    // 최근 메시지만 표시 (성능 최적화)
    const recentMessages = messages.slice(-50)

    return (
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          tabIndex={isActive ? 0 : -1}
          onScroll={handleScroll}
          onKeyDown={isActive ? handleKeyDown : undefined}
          className={cn(
            "h-full overflow-y-auto py-1 flex flex-col",
            // 활성화 시에만 스크롤바 표시
            isActive ? "chat-scrollbar" : "chat-scrollbar-hidden",
            "outline-none"  // 포커스 표시 없음 (키보드 스크롤은 작동)
          )}
        >
          {/* 메시지를 하단에 고정하기 위한 스페이서 */}
          <div className="flex-1" />

          {/* 메시지 목록 */}
          <div className="flex flex-col">
            {recentMessages.length === 0 ? (
              <div className="py-2 px-2">
                <span className="text-[11px] text-white/40">
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
        </div>

        {/* 최신 메시지 이동 버튼 (과거 기록 보는 중 + 활성화 상태) */}
        {isActive && userScrolled && (
          <button
            onClick={scrollToBottom}
            className={cn(
              "absolute bottom-2 left-1/2 -translate-x-1/2",
              "flex items-center gap-1 px-3 py-1.5 rounded-full",
              "bg-black/60 backdrop-blur-sm border border-white/10",
              "text-[11px] text-white/80 hover:bg-black/80 hover:text-white",
              "transition-all duration-200 shadow-lg",
              hasNewMessages && "animate-pulse"
            )}
          >
            <ChevronDownIcon className="w-3 h-3" />
            {hasNewMessages ? "새 메시지" : "최신으로"}
          </button>
        )}
      </div>
    )
  }
)
