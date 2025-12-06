"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { VStack, HStack, Text, Button, Input } from "@/components/ui"
import type { ChatMessage } from "../../types/space.types"

// ============================================
// Send Icon
// ============================================
const SendIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

// ============================================
// ChatPanel Props
// ============================================
interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  currentUserId: string
  className?: string
}

// ============================================
// ChatPanel Component
// ============================================
export function ChatPanel({
  messages,
  onSendMessage,
  currentUserId,
  className,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue("")
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b px-3">
        <Text weight="semibold" size="sm">채팅</Text>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        <VStack gap="sm">
          {messages.length === 0 ? (
            <Text tone="muted" size="sm" className="text-center py-8">
              아직 메시지가 없습니다
            </Text>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === currentUserId
              const isSystem = message.type === "system" || message.type === "announcement"

              if (isSystem) {
                return (
                  <div key={message.id} className="py-1 text-center">
                    <Text size="xs" tone="muted">
                      {message.content}
                    </Text>
                  </div>
                )
              }

              return (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    isOwn
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {!isOwn && (
                    <Text size="xs" weight="semibold" className="mb-1">
                      {message.senderNickname}
                    </Text>
                  )}
                  <Text size="sm">{message.content}</Text>
                  <Text
                    size="xs"
                    className={cn(
                      "mt-1 text-right",
                      isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t p-3">
        <HStack gap="sm">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()}>
            <SendIcon />
          </Button>
        </HStack>
      </form>
    </div>
  )
}
