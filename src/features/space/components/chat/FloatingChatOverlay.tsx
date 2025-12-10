"use client"

/**
 * FloatingChatOverlay - LoL 인게임 스타일 채팅
 *
 * 스타일:
 * - 배경 없음 (텍스트만 표시)
 * - 텍스트 그림자로 가독성 확보
 * - 메시지 자동 페이드아웃 (10초)
 *
 * 기능:
 * - Enter 키로 채팅 모드 토글
 * - 드래그 이동 가능
 * - 이모지 리액션 (👍 ❤️ ✅)
 * - 타임스탬프:닉네임:내용 형식
 */
import { useEffect, useCallback, useState, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useChatMode } from "../../hooks/useChatMode"
import { useChatDrag } from "../../hooks/useChatDrag"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInputArea } from "./ChatInputArea"
import type { ChatMessage, ReactionType } from "../../types/space.types"

// ============================================
// 상수
// ============================================
const MESSAGE_FADE_TIME = 10000 // 10초 후 페이드아웃

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

  // 메시지별 opacity 상태 (메시지 ID → opacity)
  const [opacityMap, setOpacityMap] = useState<Record<string, number>>({})
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // 페이드아웃 타이머 설정 함수
  const scheduleFadeOut = useCallback((messageId: string) => {
    // 기존 타이머 취소
    const existingTimer = timersRef.current.get(messageId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 새 타이머 설정
    const timer = setTimeout(() => {
      setOpacityMap((prev) => ({ ...prev, [messageId]: 0.4 }))
      timersRef.current.delete(messageId)
    }, MESSAGE_FADE_TIME)

    timersRef.current.set(messageId, timer)
  }, [])

  // 새 메시지에 대해 페이드아웃 타이머 설정
  const processedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    messages.forEach((msg) => {
      if (!processedIdsRef.current.has(msg.id)) {
        processedIdsRef.current.add(msg.id)
        setOpacityMap((prev) => ({ ...prev, [msg.id]: 1 }))
        scheduleFadeOut(msg.id)
      }
    })
  }, [messages, scheduleFadeOut])

  // 채팅 활성화 시 타이머 재설정 (opacity는 displayMessages에서 처리)
  const prevIsActiveRef = useRef(isActive)
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      // 비활성 → 활성으로 변경될 때만 타이머 재설정
      messages.forEach((msg) => {
        scheduleFadeOut(msg.id)
      })
    }
    prevIsActiveRef.current = isActive
  }, [isActive, messages, scheduleFadeOut])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])


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

  // 메시지에 opacity와 로컬 리액션 적용
  // isActive가 true일 때는 모든 메시지를 opacity 1로 표시
  const displayMessages = useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      isVisible: true,
      opacity: isActive ? 1 : (opacityMap[msg.id] ?? 1),
      reactions: localReactions[msg.id] || msg.reactions || [],
    }))
  }, [messages, opacityMap, localReactions, isActive])

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
      className="w-96 flex flex-col"
    >
      {/* 드래그 핸들 (투명, 상단에 위치) */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "h-3 cursor-grab select-none",
          isDragging && "cursor-grabbing"
        )}
      />

      {/* 메시지 목록 - LoL 스타일 */}
      <div className={cn(
        "flex flex-col justify-end min-h-[120px] max-h-[200px]",
        isActive && "max-h-[280px]"
      )}>
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

      {/* Enter 힌트 (비활성화 시) */}
      {!isActive && (
        <div className="mt-1">
          <span
            className="text-[10px] text-white/40 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          >
            Enter로 채팅
          </span>
        </div>
      )}
    </div>
  )
}
