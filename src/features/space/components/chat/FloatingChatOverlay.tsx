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
  const { position, size, isDragging, isResizing, handleMoveStart, handleResizeStart } = useChatDrag()
  const { isFullscreen, fullscreenElement } = useFullscreen()
  const messageListRef = useRef<ChatMessageListHandle>(null)

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
    content: "WASD 또는 방향키로 이동 · Space로 점프 · E로 상호작용",
    timestamp: new Date(0), // 항상 맨 위에 표시
    reactions: [],
  }), [])

  // 메시지에 로컬 리액션 적용 + 안내 메시지 추가
  const displayMessages = useMemo(() => {
    const messagesWithReactions = messages.map((msg) => ({
      ...msg,
      reactions: localReactions[msg.id] || msg.reactions || [],
    }))
    // 안내 메시지를 맨 앞에 추가
    return [GUIDE_MESSAGE, ...messagesWithReactions]
  }, [messages, localReactions, GUIDE_MESSAGE])

  // 전역 Enter 키 리스너 (전체화면 모드에서도 작동)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 채팅 활성화 상태면 무시 (입력창에서 처리)
      if (isActive) return

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
        toggleMode()
      }
    }

    // capture: true로 이벤트를 먼저 캡처하여 다른 핸들러보다 먼저 처리
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true })
  }, [isActive, toggleMode])

  if (!isVisible) return null

  // 메시지 영역 높이 계산 (전체 높이 - 헤더(조건부) - 입력창 여유)
  const headerHeight = showHeader ? 28 : 0
  const messageAreaHeight = size.height - headerHeight - (isActive ? 50 : 0)

  // 채팅 오버레이 콘텐츠
  // 🔧 전체화면 내부에서는 absolute 사용 (fixed는 fullscreen 컨텍스트에서 예상대로 작동하지 않을 수 있음)
  const chatOverlayContent = (
    <div
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
        // 🔧 전체화면 시 아주 미세한 배경 오버레이 (텍스트 가시성 향상)
        isFullscreen && "bg-black/20 backdrop-blur-[2px]"
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

      {/* 메시지 목록 - 동적 높이 */}
      <div
        className="flex-1 flex flex-col justify-end min-h-0 overflow-hidden"
        style={{ height: messageAreaHeight }}
      >
        <ChatMessageList
          ref={messageListRef}
          messages={displayMessages}
          currentUserId={currentUserId}
          isActive={isActive}
          onReact={handleReact}
          onDeactivate={handleDeactivate}
        />
      </div>

      {/* 입력 영역 - 활성화 시만 표시 */}
      <ChatInputArea
        onSend={onSendMessage}
        onDeactivate={handleDeactivate}
        isActive={isActive}
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
