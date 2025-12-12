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
import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage, ReactionType, MessageReaction, ReplyTo, ChatFontSize } from "../../types/space.types"
import { CHAT_FONT_SIZES } from "../../types/space.types"
import type { PlayerPosition } from "../../socket/types"
import { parseContentWithUrls, type ContentSegment } from "../../utils/chatFilter"
import { hasPermission } from "@/lib/space-permissions"
import type { SpaceRole } from "@prisma/client"

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
// 답장 아이콘 컴포넌트
// ============================================
function ReplyIcon({ className }: { className?: string }) {
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
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  )
}

// ============================================
// 삭제 아이콘 컴포넌트
// ============================================
function TrashIcon({ className }: { className?: string }) {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

// ============================================
// 링크 아이콘 컴포넌트
// ============================================
function ExternalLinkIcon({ className }: { className?: string }) {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

// ============================================
// 링크 렌더링 컴포넌트
// ============================================
interface LinkifiedContentProps {
  content: string
  className?: string
}

function LinkifiedContent({ content, className }: LinkifiedContentProps) {
  const segments = useMemo(() => parseContentWithUrls(content), [content])

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.value}</span>
        }

        // URL 링크 렌더링
        return (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center gap-0.5",
              "text-sky-400 hover:text-sky-300 underline underline-offset-2",
              "transition-colors duration-150"
            )}
            title={`새 탭에서 열기: ${segment.href}`}
          >
            {/* URL 표시 (너무 길면 축약) */}
            <span className="break-all">
              {segment.value.length > 50
                ? segment.value.slice(0, 47) + "..."
                : segment.value}
            </span>
            <ExternalLinkIcon className="w-3 h-3 shrink-0 opacity-70" />
          </a>
        )
      })}
    </span>
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
// 리액션 + 답장 + 삭제 버튼 컴포넌트
// ============================================
interface ActionButtonsProps {
  messageId: string
  message: ChatMessage
  reactions?: MessageReaction[]
  currentUserId: string
  onReact: (messageId: string, type: ReactionType) => void
  onReply?: (message: ChatMessage) => void
  onDelete?: (messageId: string) => void
  canDelete?: boolean  // OWNER/STAFF 권한 체크 결과
  isVisible: boolean
  showReplyButton?: boolean
}

function ActionButtons({
  messageId,
  message,
  reactions = [],
  currentUserId,
  onReact,
  onReply,
  onDelete,
  canDelete = false,
  isVisible,
  showReplyButton = true,
}: ActionButtonsProps) {
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
      {/* 답장 버튼 */}
      {showReplyButton && onReply && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReply(message)
          }}
          className={cn(
            "text-[11px] px-1 rounded transition-all",
            "hover:text-white active:scale-95",
            "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          )}
          title="답장"
        >
          <ReplyIcon className="w-3 h-3 text-white/70" />
        </button>
      )}
      {/* 리액션 버튼들 */}
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
      {/* 삭제 버튼 (OWNER/STAFF만 표시) */}
      {canDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(messageId)
          }}
          className={cn(
            "text-[11px] px-1 rounded transition-all",
            "hover:text-red-400 active:scale-95",
            "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          )}
          title="메시지 삭제"
        >
          <TrashIcon className="w-3 h-3 text-white/50 hover:text-red-400" />
        </button>
      )}
    </span>
  )
}

// ============================================
// 인용 블록 컴포넌트 (카카오톡 스타일)
// ============================================
interface ReplyQuoteProps {
  replyTo: ReplyTo
  onClick?: () => void
}

function ReplyQuote({ replyTo, onClick }: ReplyQuoteProps) {
  // 내용 미리보기 (최대 30자)
  const preview = replyTo.content.length > 30
    ? replyTo.content.slice(0, 30) + "..."
    : replyTo.content

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        "flex items-center gap-1 text-[10px] mb-0.5 px-1.5 py-0.5 rounded",
        "bg-white/5 border-l-2 border-white/40",
        "hover:border-white/60 transition-colors cursor-pointer",
        "text-left w-fit max-w-[200px]"
      )}
    >
      <span className="text-primary/80 font-medium shrink-0">
        {replyTo.senderNickname}
      </span>
      <span className="text-white/50 truncate">
        {preview}
      </span>
    </button>
  )
}

// ============================================
// 개별 메시지 렌더링
// ============================================
interface ChatMessageItemProps {
  message: ChatMessage
  isOwn: boolean
  currentUserId: string
  resolveNickname: (senderId: string | undefined, fallback: string) => string  // 🔄 SSOT
  fontSize: number  // 🔤 글씨 크기 (px)
  onReact: (messageId: string, type: ReactionType) => void
  onReply?: (message: ChatMessage) => void
  onDelete?: (messageId: string) => void
  canDelete?: boolean
  onScrollToMessage?: (messageId: string) => void
}

function ChatMessageItem({
  message,
  isOwn,
  currentUserId,
  resolveNickname,
  fontSize,
  onReact,
  onReply,
  onDelete,
  canDelete,
  onScrollToMessage,
}: ChatMessageItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isSystem = message.type === "system" || message.type === "announcement"
  const isWhisper = message.type === "whisper"
  const timeStr = formatTime(message.timestamp)

  // 🔄 SSOT: 현재 닉네임으로 해석 (이름 변경 시 모든 메시지에 즉시 반영)
  const displayNickname = resolveNickname(message.senderId, message.senderNickname)

  // 인용 클릭 핸들러
  const handleQuoteClick = useCallback(() => {
    if (message.replyTo && onScrollToMessage) {
      onScrollToMessage(message.replyTo.id)
    }
  }, [message.replyTo, onScrollToMessage])

  // 시스템 메시지 (노란색) - 답장 불가
  if (isSystem) {
    return (
      <div className="py-0.5 px-2">
        <span className="text-yellow-400/90" style={{ fontSize: `${fontSize}px` }}>
          <span className="text-white/40 mr-1">[{timeStr}]</span>
          <LinkifiedContent content={message.content} />
        </span>
      </div>
    )
  }

  // 📬 귓속말 메시지 (보라색)
  if (isWhisper) {
    const isSent = message.senderId === currentUserId
    // 🔄 SSOT: 보낸 사람/받는 사람 이름도 현재 이름으로 표시
    const resolvedTargetNickname = message.targetId
      ? resolveNickname(message.targetId, message.targetNickname || "")
      : message.targetNickname || ""
    const directionLabel = isSent
      ? `→ ${resolvedTargetNickname}`
      : `← ${displayNickname}`

    return (
      <div
        className="py-0.5 px-2 hover:bg-purple-500/10 rounded"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-message-id={message.id}
      >
        {/* 인용 블록 (답장인 경우) */}
        {message.replyTo && (
          <ReplyQuote replyTo={message.replyTo} onClick={handleQuoteClick} />
        )}
        <span className="leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
          {/* 타임스탬프 */}
          <span className="text-white/40 mr-1">[{timeStr}]</span>
          {/* 귓속말 라벨 */}
          <span className="text-purple-400 font-medium mr-1">[귓속말]</span>
          {/* 방향 표시 (→ 받는사람 또는 ← 보낸사람) */}
          <span className="text-purple-300">
            {directionLabel}
          </span>
          {/* 구분자 */}
          <span className="text-purple-300/50">: </span>
          {/* 내용 */}
          <LinkifiedContent content={message.content} className="text-purple-100" />
          {/* 액션 버튼 (답장 + 리액션 + 삭제) */}
          <ActionButtons
            messageId={message.id}
            message={message}
            reactions={message.reactions}
            currentUserId={currentUserId}
            onReact={onReact}
            onReply={onReply}
            onDelete={onDelete}
            canDelete={canDelete}
            isVisible={isHovered}
          />
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
      data-message-id={message.id}
    >
      {/* 인용 블록 (답장인 경우) */}
      {message.replyTo && (
        <ReplyQuote replyTo={message.replyTo} onClick={handleQuoteClick} />
      )}
      <span className="leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
        {/* 타임스탬프 */}
        <span className="text-white/40 mr-1">[{timeStr}]</span>
        {/* 🔄 SSOT: 닉네임 (현재 이름으로 표시) */}
        <span className={cn("font-semibold", nicknameColor)}>
          {displayNickname}
        </span>
        {/* 구분자 */}
        <span className="text-white/50">: </span>
        {/* 내용 */}
        <LinkifiedContent content={message.content} className="text-white/90" />
        {/* 액션 버튼 (답장 + 리액션 + 삭제) */}
        <ActionButtons
          messageId={message.id}
          message={message}
          reactions={message.reactions}
          currentUserId={currentUserId}
          onReact={onReact}
          onReply={onReply}
          onDelete={onDelete}
          canDelete={canDelete}
          isVisible={isHovered}
        />
      </span>
      {/* 기존 리액션 표시 */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="pl-12 text-white/60" style={{ fontSize: `${Math.max(fontSize - 1, 9)}px` }}>
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
  players: Map<string, PlayerPosition>  // 🔄 SSOT: 현재 닉네임 조회용
  currentUserId: string
  isActive: boolean
  userRole?: SpaceRole  // 사용자 역할 (OWNER/STAFF/PARTICIPANT)
  fontSize?: ChatFontSize  // 🔤 글씨 크기
  onReact?: (messageId: string, type: ReactionType) => void
  onReply?: (message: ChatMessage) => void  // 답장 콜백
  onDeleteMessage?: (messageId: string) => void  // 메시지 삭제 콜백
  onDeactivate?: () => void  // 채팅 기록 영역에서 Enter 시 비활성화
}

export interface ChatMessageListHandle {
  scrollToBottom: () => void
  scrollToMessage: (messageId: string) => void  // 특정 메시지로 스크롤
}

// ============================================
// ChatMessageList Component
// ============================================
// 스크롤 속도 상수
const SCROLL_STEP = 40

export const ChatMessageList = forwardRef<ChatMessageListHandle, ChatMessageListProps>(
  function ChatMessageList({ messages, players, currentUserId, isActive, userRole, fontSize = "medium", onReact, onReply, onDeleteMessage, onDeactivate }, ref) {
    // 🔤 폰트 크기 픽셀 값
    const fontSizePx = CHAT_FONT_SIZES[fontSize]
    const containerRef = useRef<HTMLDivElement>(null)
    const [userScrolled, setUserScrolled] = useState(false)
    // 새 메시지 알림용 (과거 기록 보는 중 신규 메시지 있음)
    const [hasNewMessages, setHasNewMessages] = useState(false)
    // 이전 메시지 수 추적 (상태로 관리)
    const [prevMessageCount, setPrevMessageCount] = useState(messages.length)
    // 하이라이트된 메시지 ID (스크롤 후 잠시 표시)
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)

    // 🔄 SSOT: players Map에서 현재 닉네임 조회 (없으면 fallback 사용)
    const resolveNickname = useCallback((senderId: string | undefined, fallbackNickname: string): string => {
      if (!senderId) return fallbackNickname
      const player = players.get(senderId)
      return player?.nickname || fallbackNickname
    }, [players])

    // 메시지 삭제 권한 체크 (OWNER/STAFF만 가능)
    const canDelete = useMemo(() => {
      if (!userRole) return false
      return hasPermission(userRole, "chat:delete")
    }, [userRole])

    // 최하단 스크롤 함수
    const scrollToBottom = useCallback(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
        setUserScrolled(false)
        setHasNewMessages(false)
      }
    }, [])

    // 특정 메시지로 스크롤 (인용 클릭 시)
    const scrollToMessage = useCallback((messageId: string) => {
      if (!containerRef.current) return

      const messageElement = containerRef.current.querySelector(
        `[data-message-id="${messageId}"]`
      ) as HTMLElement | null

      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
        // 하이라이트 효과
        setHighlightedMessageId(messageId)
        setTimeout(() => setHighlightedMessageId(null), 2000)
      }
    }, [])

    // 외부에서 호출 가능하도록 ref로 노출
    useImperativeHandle(ref, () => ({
      scrollToBottom,
      scrollToMessage,
    }), [scrollToBottom, scrollToMessage])

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
                <div
                  key={msg.id}
                  className={cn(
                    "transition-all duration-300",
                    highlightedMessageId === msg.id && "ring-1 ring-white/30 rounded"
                  )}
                >
                  <ChatMessageItem
                    message={msg}
                    isOwn={msg.senderId === currentUserId}
                    currentUserId={currentUserId}
                    resolveNickname={resolveNickname}
                    fontSize={fontSizePx}
                    onReact={handleReact}
                    onReply={onReply}
                    onDelete={onDeleteMessage}
                    canDelete={canDelete}
                    onScrollToMessage={scrollToMessage}
                  />
                </div>
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
