"use client"

/**
 * FloatingChatOverlay - 게임 내 플로팅 채팅
 *
 * 스타일:
 * - 반투명 배경의 채팅창
 * - 드래그 가능한 상단 바
 * - 리사이즈 가능 (우하단 핸들)
 * - 타임스탬프:닉네임:내용 형식
 *
 * 기능:
 * - Enter 키로 채팅 활성화 → 입력 → Enter로 전송+비활성화
 * - 드래그 이동 가능 (상단 바)
 * - 크기 조절 가능 (우하단 핸들)
 * - 이모지 리액션 (👍 ❤️ ✅)
 * - 전체화면 모드에서도 표시 (Portal 사용)
 */
import { useEffect, useCallback, useState, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { useChatMode } from "../../hooks/useChatMode"
import { useChatDrag } from "../../hooks/useChatDrag"
import { useFullscreen } from "../../hooks/useFullscreen"
import { ChatMessageList, type ChatMessageListHandle } from "./ChatMessageList"
import { ChatInputArea, type AdminCommandResult } from "./ChatInputArea"
import { ChatTabs } from "./ChatTabs"
import { filterMessagesByTab, calculateUnreadCounts } from "../../utils/chatFilter"
import type { ChatMessage, ReactionType, ChatTab, ReplyTo, ChatFontSize } from "../../types/space.types"
import type { ReplyToData, PlayerPosition } from "../../socket/types"
import type { SpaceRole } from "@prisma/client"
import type { ParsedEditorCommand } from "../../types/editor.types"

// ============================================
// FloatingChatOverlay Props
// ============================================
interface FloatingChatOverlayProps {
  messages: ChatMessage[]
  players: Map<string, PlayerPosition>  // 🔄 SSOT: 현재 닉네임 조회용
  onSendMessage: (content: string, replyTo?: ReplyToData) => void  // 답장 지원
  onSendWhisper?: (targetNickname: string, content: string, replyTo?: ReplyToData) => void  // 📬 귓속말 전송 + 답장
  onReact?: (messageId: string, type: ReactionType) => void
  onAdminCommand?: (result: AdminCommandResult) => void  // 🛡️ 관리 명령어
  onEditorCommand?: (command: ParsedEditorCommand) => void  // 🎨 에디터 명령어
  onDeleteMessage?: (messageId: string) => void  // 🗑️ 메시지 삭제 (OWNER/STAFF)
  currentUserId: string
  userRole?: SpaceRole  // 🛡️ 사용자 역할 (OWNER/STAFF/PARTICIPANT)
  isVisible?: boolean
  whisperHistory?: string[]  // 📬 귓속말 히스토리 (최근 대화 상대)
  spaceId?: string  // ⚙️ 스태프 관리용 공간 ID
  // 📜 Phase 4: 과거 메시지 페이지네이션
  onLoadMore?: () => void  // 스크롤 상단 도달 시 호출
  isLoadingMore?: boolean  // 과거 메시지 로딩 중
  hasMoreMessages?: boolean  // 더 불러올 메시지 존재 여부
}

// ============================================
// FloatingChatOverlay Component
// ============================================
export function FloatingChatOverlay({
  messages,
  players,
  onSendMessage,
  onSendWhisper,
  onReact,
  onAdminCommand,
  onEditorCommand,
  onDeleteMessage,
  currentUserId,
  userRole,
  isVisible = true,
  whisperHistory = [],
  spaceId,
  // 📜 Phase 4: 과거 메시지 페이지네이션
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = true,
}: FloatingChatOverlayProps) {
  const { isActive, toggleMode, deactivate } = useChatMode()
  const { position, size, isDragging, isResizing, handleMoveStart, handleResizeStart } = useChatDrag()
  const { isFullscreen, fullscreenElement } = useFullscreen()
  const messageListRef = useRef<ChatMessageListHandle>(null)

  // ⚙️ 채팅 관리 권한 여부 (OWNER 또는 STAFF)
  const canManageChat = userRole === "OWNER" || userRole === "STAFF"

  // 🔤 글씨 크기 상태 (localStorage 연동)
  const [chatFontSize, setChatFontSize] = useState<ChatFontSize>("medium")

  // 🔤 초기 로드 시 localStorage에서 글씨 크기 불러오기
  // 컴포넌트 마운트 시 한 번만 실행되는 초기화 로직
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = localStorage.getItem("flowspace-chat-font-size")
    if (saved && ["small", "medium", "large", "xlarge"].includes(saved)) {
      setChatFontSize(saved as ChatFontSize)
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 🔤 글씨 크기 변경 핸들러 (localStorage 저장)
  const handleFontSizeChange = useCallback((size: ChatFontSize) => {
    setChatFontSize(size)
    localStorage.setItem("flowspace-chat-font-size", size)
  }, [])


  // 📬 탭 상태
  const [activeTab, setActiveTab] = useState<ChatTab>("all")
  // 마지막으로 읽은 시간 (탭별)
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<ChatTab, Date>>({
    all: new Date(),
    party: new Date(),
    whisper: new Date(),
    system: new Date(),
    links: new Date(),
  })
  // 💬 답장 상태
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)

  // 헤더 표시 상태 (활성화 중 + 비활성화 후 5초간만 표시)
  const [showHeader, setShowHeader] = useState(true)
  const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // isActive 변화 감지하여 헤더 표시/숨김 제어
  // 활성화 상태 변경 시 동기 setState가 필요하므로 lint 규칙 비활성화
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isActive) {
      // 활성화 시 헤더 표시 + 타이머 클리어
      setShowHeader(true)
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current)
        headerTimeoutRef.current = null
      }
    } else {
      // 비활성화 시 5초 후 헤더 숨김
      headerTimeoutRef.current = setTimeout(() => {
        setShowHeader(false)
      }, 5000)
    }

    return () => {
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current)
      }
    }
  }, [isActive])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 비활성화 시 최신 메시지로 스크롤
  const handleDeactivate = useCallback(() => {
    messageListRef.current?.scrollToBottom()
    deactivate()
  }, [deactivate])

  // 🔧 활성화 시 최신 메시지로 스크롤 (입력창이 나타나면서 메시지가 가려지는 문제 해결)
  useEffect(() => {
    if (isActive) {
      // 약간의 지연 후 스크롤 (레이아웃 변경 완료 대기)
      const timer = setTimeout(() => {
        messageListRef.current?.scrollToBottom()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  // 💬 답장 버튼 클릭 핸들러
  const handleReply = useCallback((message: ChatMessage) => {
    // 답장 대상 정보 설정
    const replyToInfo: ReplyTo = {
      id: message.id,
      senderNickname: message.senderNickname,
      content: message.content.slice(0, 50),  // 미리보기는 50자까지
    }
    setReplyTo(replyToInfo)
    // 채팅 모드 활성화 (아직 아니면)
    if (!isActive) {
      toggleMode()
    }
  }, [isActive, toggleMode])

  // 💬 답장 취소 핸들러
  const handleCancelReply = useCallback(() => {
    setReplyTo(null)
  }, [])

  // 💬 메시지 전송 핸들러 (답장 정보 포함)
  const handleSendMessage = useCallback((content: string, replyToData?: ReplyTo) => {
    // ReplyTo → ReplyToData 변환
    const socketReplyTo: ReplyToData | undefined = replyToData
      ? {
          id: replyToData.id,
          senderNickname: replyToData.senderNickname,
          content: replyToData.content,
        }
      : undefined
    onSendMessage(content, socketReplyTo)
    setReplyTo(null)
  }, [onSendMessage])

  // 💬 귓속말 전송 핸들러 (답장 정보 포함)
  const handleSendWhisper = useCallback((targetNickname: string, content: string, replyToData?: ReplyTo) => {
    if (!onSendWhisper) return
    // ReplyTo → ReplyToData 변환
    const socketReplyTo: ReplyToData | undefined = replyToData
      ? {
          id: replyToData.id,
          senderNickname: replyToData.senderNickname,
          content: replyToData.content,
        }
      : undefined
    onSendWhisper(targetNickname, content, socketReplyTo)
    setReplyTo(null)
  }, [onSendWhisper])

  // 📬 탭 변경 핸들러 (변경 시 해당 탭의 읽음 시간 업데이트)
  const handleTabChange = useCallback((tab: ChatTab) => {
    setActiveTab(tab)
    setLastReadTimestamps((prev) => ({
      ...prev,
      [tab]: new Date(),
    }))
    // 탭 변경 시 스크롤을 최하단으로
    messageListRef.current?.scrollToBottom()
  }, [])

  // 📬 읽지 않은 메시지 카운트 계산 (SSOT: chatFilter.ts)
  const unreadCounts = useMemo(
    () => calculateUnreadCounts(messages, lastReadTimestamps, currentUserId),
    [messages, lastReadTimestamps, currentUserId]
  )

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

  // 조작 안내 시스템 메시지
  const GUIDE_MESSAGE: ChatMessage = useMemo(() => ({
    id: "system-guide-controls",
    type: "system",
    senderId: "system",
    senderNickname: "시스템",
    content: "WASD/방향키 이동 · Space 점프 · E 상호작용 · 명령어: @도움말(@help)",
    timestamp: new Date(0), // 항상 맨 위에 표시
    reactions: [],
  }), [])

  // 📬 탭별 필터링 + 로컬 리액션 적용 + 안내 메시지 추가
  const displayMessages = useMemo(() => {
    // 1. 탭에 따라 메시지 필터링
    const filteredMessages = filterMessagesByTab(messages, activeTab, currentUserId)

    // 2. 로컬 리액션 적용
    const messagesWithReactions = filteredMessages.map((msg) => ({
      ...msg,
      reactions: localReactions[msg.id] || msg.reactions || [],
    }))

    // 3. 안내 메시지를 맨 앞에 추가 (전체 탭에서만)
    if (activeTab === "all") {
      return [GUIDE_MESSAGE, ...messagesWithReactions]
    }

    return messagesWithReactions
  }, [messages, localReactions, GUIDE_MESSAGE, activeTab, currentUserId])

  // 채팅 영역 ref (외부 클릭 감지용)
  const chatOverlayRef = useRef<HTMLDivElement>(null)

  // 채팅 영역 외부 클릭 시 비활성화
  useEffect(() => {
    if (!isActive) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 채팅 오버레이 내부 클릭이면 무시
      if (chatOverlayRef.current?.contains(target)) return
      // 외부 클릭 시 비활성화
      handleDeactivate()
    }

    // mousedown으로 빠르게 감지 (click보다 먼저 발생)
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isActive, handleDeactivate])

  // 전역 Enter 키 리스너 (전체화면 모드에서도 작동)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // input/textarea/contenteditable에서는 무시
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === "Enter") {
        // 이벤트 전파 차단 (전체화면 종료 방지)
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()

        // 채팅 활성화 상태면 비활성화, 아니면 활성화
        if (isActive) {
          handleDeactivate()
        } else {
          toggleMode()
        }
      }
    }

    // capture: true로 이벤트를 먼저 캡처하여 다른 핸들러보다 먼저 처리
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true })
  }, [isActive, toggleMode, handleDeactivate])

  if (!isVisible) return null

  // 메시지 영역 높이 계산 (전체 높이 - 헤더(조건부) - 탭(조건부) - 입력창 여유)
  const headerHeight = showHeader ? 28 : 0
  const tabsHeight = isActive ? 28 : 0  // 탭 높이 (활성화 시에만)
  const messageAreaHeight = size.height - headerHeight - tabsHeight - (isActive ? 50 : 0)

  // 채팅 오버레이 콘텐츠
  // 🔧 전체화면 내부에서는 absolute 사용 (fixed는 fullscreen 컨텍스트에서 예상대로 작동하지 않을 수 있음)
  const chatOverlayContent = (
    <div
      ref={chatOverlayRef}
      style={{
        position: isFullscreen ? "absolute" : "fixed",
        left: isFullscreen ? position.x : undefined,
        top: isFullscreen ? position.y : undefined,
        transform: isFullscreen ? undefined : `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: size.width,
        height: size.height,
        willChange: isDragging || isResizing ? "transform, width, height" : "auto",
        zIndex: 2147483647,  // 최대 z-index로 항상 최전방 표시
      }}
      className={cn(
        "flex flex-col rounded-lg",
        // 🔧 항상 반투명 배경 오버레이 적용 (텍스트 가시성 향상)
        "bg-black/40 backdrop-blur-sm border border-white/10"
      )}
    >
      {/* 드래그 가능한 헤더 바 (활성화 중 + 비활성화 후 5초간만 표시) */}
      {showHeader && (
        <div
          onMouseDown={handleMoveStart}
          className={cn(
            "h-7 flex items-center justify-between px-3 rounded-t-lg bg-black/40 backdrop-blur-sm border border-b-0 border-white/5 select-none shrink-0",
            "transition-opacity duration-300",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          <span className="text-[11px] text-white/70 font-medium">채팅</span>
          <span className="text-[10px] text-white/40">
            {isActive ? "Esc로 닫기" : "Enter로 입력"}
          </span>
        </div>
      )}

      {/* 📬 채팅 탭 (활성화 시에만 표시) */}
      {isActive && (
        <ChatTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadCounts={unreadCounts}
          onDeactivate={handleDeactivate}
          className="bg-black/30 backdrop-blur-sm"
          canManageChat={canManageChat}
          fontSize={chatFontSize}
          onFontSizeChange={handleFontSizeChange}
        />
      )}

      {/* 메시지 목록 - 동적 높이 */}
      <div
        className="flex-1 flex flex-col justify-end min-h-0 overflow-hidden"
        style={{ height: messageAreaHeight }}
      >
        <ChatMessageList
          ref={messageListRef}
          messages={displayMessages}
          players={players}
          currentUserId={currentUserId}
          isActive={isActive}
          userRole={userRole}
          fontSize={chatFontSize}
          onReact={handleReact}
          onReply={handleReply}
          onDeleteMessage={onDeleteMessage}
          onDeactivate={handleDeactivate}
          // 📜 Phase 4: 과거 메시지 페이지네이션
          onLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          hasMoreMessages={hasMoreMessages}
        />
      </div>

      {/* 입력 영역 - 활성화 시만 표시 */}
      <ChatInputArea
        onSend={handleSendMessage}
        onSendWhisper={handleSendWhisper}
        onAdminCommand={onAdminCommand}
        onEditorCommand={onEditorCommand}
        onDeactivate={handleDeactivate}
        isActive={isActive}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
        whisperHistory={whisperHistory}
      />

      {/* 리사이즈 핸들 (우하단) */}
      <div
        onMouseDown={handleResizeStart}
        className={cn(
          "absolute bottom-0 right-0 w-4 h-4 cursor-se-resize",
          "hover:bg-white/10 rounded-br-lg transition-colors",
          isResizing && "bg-white/20"
        )}
        style={{
          // 대각선 리사이즈 아이콘 표시
          background: isResizing
            ? "rgba(255,255,255,0.2)"
            : "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.15) 50%)",
        }}
        title="크기 조절"
      />
    </div>
  )

  // 전체화면 모드일 때는 전체화면 요소 내부에 Portal로 렌더링
  // 그렇지 않으면 일반 렌더링
  if (isFullscreen && fullscreenElement) {
    return createPortal(chatOverlayContent, fullscreenElement)
  }

  return chatOverlayContent
}
