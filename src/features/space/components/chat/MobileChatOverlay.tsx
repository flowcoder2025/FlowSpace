"use client"

/**
 * MobileChatOverlay - 모바일 전용 채팅 UI
 *
 * 모바일에서는 데스크톱의 드래그 가능한 플로팅 채팅 대신
 * 더 간단하고 터치 친화적인 UI를 제공합니다.
 *
 * 구조:
 * - 하단 고정 입력 바 (항상 표시)
 * - 채팅 아이콘 버튼 + 읽지 않은 메시지 뱃지
 * - 전체화면 채팅 목록 오버레이 (버튼 클릭 시)
 */

import { useState, useCallback, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { ChatMessageList, type ChatMessageListHandle } from "./ChatMessageList"
import { ChatTabs } from "./ChatTabs"
import { filterMessagesByTab, calculateUnreadCounts } from "../../utils/chatFilter"
import type { ChatMessage, ReactionType, ChatTab, ReplyTo, ChatFontSize } from "../../types/space.types"
import type { ReplyToData, PlayerPosition } from "../../socket/types"
import type { SpaceRole } from "@prisma/client"
import type { ParsedEditorCommand } from "../../types/editor.types"
import type { AdminCommandResult } from "./ChatInputArea"

// ============================================
// Icons
// ============================================
const ChatIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const SendIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const CloseIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// ============================================
// Types
// ============================================
interface MobileChatOverlayProps {
  messages: ChatMessage[]
  players: Map<string, PlayerPosition>
  onSendMessage: (content: string, replyTo?: ReplyToData) => void
  onSendWhisper?: (targetNickname: string, content: string, replyTo?: ReplyToData) => void
  onReact?: (messageId: string, type: ReactionType) => void
  onAdminCommand?: (result: AdminCommandResult) => void
  onEditorCommand?: (command: ParsedEditorCommand) => void
  onDeleteMessage?: (messageId: string) => void
  currentUserId: string
  userRole?: SpaceRole
  whisperHistory?: string[]
  // 📜 Phase 4: 과거 메시지 페이지네이션
  onLoadMore?: () => void
  isLoadingMore?: boolean
  hasMoreMessages?: boolean
}

// ============================================
// MobileChatOverlay Component
// ============================================
export function MobileChatOverlay({
  messages,
  players,
  onSendMessage,
  onSendWhisper,
  onReact,
  onAdminCommand: _onAdminCommand,  // 📌 향후 모바일 관리 기능용 (예약)
  onEditorCommand: _onEditorCommand, // 📌 향후 모바일 에디터 기능용 (예약)
  onDeleteMessage,
  currentUserId,
  userRole,
  whisperHistory: _whisperHistory = [], // 📌 향후 모바일 귓속말 자동완성용 (예약)
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = true,
}: MobileChatOverlayProps) {
  // 상태
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [activeTab, setActiveTab] = useState<ChatTab>("all")
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messageListRef = useRef<ChatMessageListHandle>(null)

  // 🔤 글씨 크기 상태 (lazy initializer로 localStorage에서 로드)
  const [chatFontSize, setChatFontSize] = useState<ChatFontSize>(() => {
    if (typeof window === "undefined") return "medium"
    const saved = localStorage.getItem("flowspace-chat-font-size")
    if (saved && ["small", "medium", "large", "xlarge"].includes(saved)) {
      return saved as ChatFontSize
    }
    return "medium"
  })

  const handleFontSizeChange = useCallback((size: ChatFontSize) => {
    setChatFontSize(size)
    localStorage.setItem("flowspace-chat-font-size", size)
  }, [])

  // 권한 체크
  const canManageChat = userRole === "OWNER" || userRole === "STAFF"

  // 마지막 읽은 시간 (탭별)
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<ChatTab, Date>>({
    all: new Date(),
    party: new Date(),
    whisper: new Date(),
    system: new Date(),
    links: new Date(),
  })

  // 읽지 않은 메시지 카운트
  const unreadCounts = useMemo(
    () => calculateUnreadCounts(messages, lastReadTimestamps, currentUserId),
    [messages, lastReadTimestamps, currentUserId]
  )

  // 총 읽지 않은 메시지 수 (닫힌 상태에서 표시용)
  const totalUnread = useMemo(() => {
    // 채팅이 열려있으면 0 반환 (실시간으로 보고 있으므로)
    if (isOpen) return 0
    return unreadCounts.all + unreadCounts.whisper + unreadCounts.party
  }, [isOpen, unreadCounts])

  // 로컬 리액션 상태
  const [localReactions, setLocalReactions] = useState<
    Record<string, { type: ReactionType; userId: string; userNickname: string }[]>
  >({})

  // 탭별 필터링된 메시지
  const displayMessages = useMemo(() => {
    const filteredMessages = filterMessagesByTab(messages, activeTab, currentUserId)
    return filteredMessages.map((msg) => ({
      ...msg,
      reactions: localReactions[msg.id] || msg.reactions || [],
    }))
  }, [messages, localReactions, activeTab, currentUserId])

  // 채팅 열기
  const handleOpen = useCallback(() => {
    setIsOpen(true)
    // 열 때 현재 탭의 읽음 시간 업데이트
    setLastReadTimestamps((prev) => ({
      ...prev,
      [activeTab]: new Date(),
    }))
    // 스크롤 하단으로
    setTimeout(() => {
      messageListRef.current?.scrollToBottom()
    }, 100)
  }, [activeTab])

  // 채팅 닫기
  const handleClose = useCallback(() => {
    setIsOpen(false)
    setReplyTo(null)
  }, [])

  // 탭 변경
  const handleTabChange = useCallback((tab: ChatTab) => {
    setActiveTab(tab)
    setLastReadTimestamps((prev) => ({
      ...prev,
      [tab]: new Date(),
    }))
    messageListRef.current?.scrollToBottom()
  }, [])

  // 메시지 전송
  const handleSend = useCallback(() => {
    const content = inputValue.trim()
    if (!content) return

    // 귓속말 처리 (/w 닉네임 내용)
    const whisperMatch = content.match(/^\/w\s+(\S+)\s+(.+)$/i)
    if (whisperMatch && onSendWhisper) {
      const [, targetNickname, message] = whisperMatch
      const socketReplyTo: ReplyToData | undefined = replyTo
        ? { id: replyTo.id, senderNickname: replyTo.senderNickname, content: replyTo.content }
        : undefined
      onSendWhisper(targetNickname, message, socketReplyTo)
    } else {
      const socketReplyTo: ReplyToData | undefined = replyTo
        ? { id: replyTo.id, senderNickname: replyTo.senderNickname, content: replyTo.content }
        : undefined
      onSendMessage(content, socketReplyTo)
    }

    setInputValue("")
    setReplyTo(null)
  }, [inputValue, replyTo, onSendMessage, onSendWhisper])

  // 리액션 핸들러
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
            [messageId]: [...reactions, { type, userId: currentUserId, userNickname: "" }],
          }
        }
      })
      onReact?.(messageId, type)
    },
    [currentUserId, onReact]
  )

  // 답장 핸들러
  const handleReply = useCallback((message: ChatMessage) => {
    setReplyTo({
      id: message.id,
      senderNickname: message.senderNickname,
      content: message.content.slice(0, 50),
    })
    inputRef.current?.focus()
  }, [])

  // 답장 취소
  const handleCancelReply = useCallback(() => {
    setReplyTo(null)
  }, [])

  // 키보드 이벤트
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <>
      {/* 하단 입력 바 (항상 표시) - ControlBar 위에 위치 */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-2 pb-2 pointer-events-auto">
        {/* 답장 미리보기 */}
        {replyTo && (
          <div className="mb-1 flex items-center gap-2 rounded-t-lg bg-black/70 px-3 py-1.5 text-xs">
            <span className="text-white/50">↩</span>
            <span className="truncate text-white/70">
              <span className="font-medium text-primary">{replyTo.senderNickname}</span>
              {": "}
              {replyTo.content}
            </span>
            <button
              onClick={handleCancelReply}
              className="ml-auto shrink-0 text-white/50 hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        <div className={cn(
          "flex items-center gap-2 bg-black/70 backdrop-blur-sm p-2",
          replyTo ? "rounded-b-lg" : "rounded-lg"
        )}>
          {/* 채팅 열기 버튼 + 뱃지 */}
          <button
            onClick={handleOpen}
            className="relative shrink-0 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 active:bg-white/30"
            aria-label="채팅 열기"
          >
            <ChatIcon />
            {totalUnread > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>

          {/* 입력창 */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:bg-white/15 focus:ring-1 focus:ring-primary/50"
          />

          {/* 전송 버튼 */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              "shrink-0 rounded-full p-2 transition-colors",
              inputValue.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                : "bg-white/10 text-white/30"
            )}
            aria-label="전송"
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* 채팅 목록 오버레이 (열림 시) */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black/80 backdrop-blur-sm pointer-events-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-lg font-medium text-white">채팅</span>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="닫기"
            >
              <CloseIcon />
            </button>
          </div>

          {/* 탭 */}
          <ChatTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            unreadCounts={unreadCounts}
            onDeactivate={handleClose}
            canManageChat={canManageChat}
            fontSize={chatFontSize}
            onFontSizeChange={handleFontSizeChange}
            className="border-b border-white/10"
          />

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-hidden">
            <ChatMessageList
              ref={messageListRef}
              messages={displayMessages}
              players={players}
              currentUserId={currentUserId}
              isActive={true}
              userRole={userRole}
              fontSize={chatFontSize}
              onReact={handleReact}
              onReply={handleReply}
              onDeleteMessage={onDeleteMessage}
              onDeactivate={handleClose}
              onLoadMore={onLoadMore}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
            />
          </div>

          {/* 하단 입력창 (오버레이 내부용) */}
          <div className="border-t border-white/10 p-3">
            {/* 답장 미리보기 */}
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                <span className="text-white/50">↩</span>
                <span className="truncate text-white/70">
                  <span className="font-medium text-primary">{replyTo.senderNickname}</span>
                  {": "}
                  {replyTo.content}
                </span>
                <button
                  onClick={handleCancelReply}
                  className="ml-auto shrink-0 text-white/50 hover:text-white"
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/50 outline-none focus:bg-white/15 focus:ring-1 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={cn(
                  "shrink-0 rounded-full p-2.5 transition-colors",
                  inputValue.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                    : "bg-white/10 text-white/30"
                )}
                aria-label="전송"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
