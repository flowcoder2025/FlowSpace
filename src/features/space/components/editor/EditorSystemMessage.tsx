/**
 * Editor System Message Component
 *
 * 에디터 작업 결과 알림 (토스트 스타일)
 * - 성공/실패/정보/경고 메시지
 * - 자동 페이드아웃
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================
// Types
// ============================================

export type SystemMessageType = "info" | "success" | "warning" | "error"

export interface SystemMessage {
  id: string
  type: SystemMessageType
  message: string
  timestamp: number
}

export interface EditorSystemMessageProps {
  /** 메시지 목록 */
  messages: SystemMessage[]
  /** 메시지 제거 콜백 */
  onRemove?: (id: string) => void
  /** 자동 제거 시간 (ms) */
  autoRemoveDelay?: number
  /** 최대 표시 개수 */
  maxMessages?: number
  /** 추가 클래스명 */
  className?: string
}

// ============================================
// Component
// ============================================

export function EditorSystemMessage({
  messages,
  onRemove,
  autoRemoveDelay = 3000,
  maxMessages = 5,
  className,
}: EditorSystemMessageProps) {
  // Only show recent messages
  const visibleMessages = messages.slice(-maxMessages)

  return (
    <div
      className={cn(
        "pointer-events-none flex flex-col-reverse gap-2",
        className
      )}
    >
      {visibleMessages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onRemove={onRemove}
          autoRemoveDelay={autoRemoveDelay}
        />
      ))}
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

interface MessageItemProps {
  message: SystemMessage
  onRemove?: (id: string) => void
  autoRemoveDelay: number
}

function MessageItem({ message, onRemove, autoRemoveDelay }: MessageItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Auto remove
  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, autoRemoveDelay - 300)

    const removeTimer = setTimeout(() => {
      onRemove?.(message.id)
    }, autoRemoveDelay)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [message.id, autoRemoveDelay, onRemove])

  // Manual remove
  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onRemove?.(message.id), 200)
  }, [message.id, onRemove])

  // Icon and colors based on type
  const { Icon, bgColor, borderColor, textColor } = getMessageStyles(message.type)

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm transition-all duration-200",
        bgColor,
        borderColor,
        isVisible && !isExiting
          ? "translate-x-0 opacity-100"
          : "translate-x-4 opacity-0"
      )}
    >
      <Icon className={cn("size-4 shrink-0", textColor)} />
      <span className={cn("flex-1 text-sm", textColor)}>{message.message}</span>
      <button
        onClick={handleRemove}
        className={cn(
          "shrink-0 rounded p-0.5 transition-colors hover:bg-black/10",
          textColor
        )}
        aria-label="닫기"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

// ============================================
// Helper Functions
// ============================================

function getMessageStyles(type: SystemMessageType) {
  switch (type) {
    case "success":
      return {
        Icon: CheckCircle,
        bgColor: "bg-green-500/90",
        borderColor: "border-green-600/50",
        textColor: "text-white",
      }
    case "error":
      return {
        Icon: AlertCircle,
        bgColor: "bg-red-500/90",
        borderColor: "border-red-600/50",
        textColor: "text-white",
      }
    case "warning":
      return {
        Icon: AlertTriangle,
        bgColor: "bg-yellow-500/90",
        borderColor: "border-yellow-600/50",
        textColor: "text-black",
      }
    case "info":
    default:
      return {
        Icon: Info,
        bgColor: "bg-blue-500/90",
        borderColor: "border-blue-600/50",
        textColor: "text-white",
      }
  }
}

// ============================================
// Hook for managing system messages
// ============================================

export function useEditorSystemMessages() {
  const [messages, setMessages] = useState<SystemMessage[]>([])

  const addMessage = useCallback(
    (message: string, type: SystemMessageType = "info") => {
      const newMessage: SystemMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        message,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, newMessage])
      return newMessage.id
    },
    []
  )

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    addMessage,
    removeMessage,
    clearMessages,
  }
}
