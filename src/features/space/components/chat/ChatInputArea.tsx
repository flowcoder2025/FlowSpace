"use client"

/**
 * ChatInputArea - 채팅 입력 영역
 *
 * 기능:
 * - Enter로 메시지 전송 + 모드 비활성화
 * - ESC로 모드 비활성화 (입력 취소)
 * - 활성화 시 자동 포커스
 */
import { useState, useRef, useEffect, useCallback } from "react"

// ============================================
// ChatInputArea Props
// ============================================
interface ChatInputAreaProps {
  onSend: (message: string) => void
  onDeactivate: () => void
  isActive: boolean
}

// ============================================
// ChatInputArea Component
// ============================================
export function ChatInputArea({ onSend, onDeactivate, isActive }: ChatInputAreaProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // 활성화 시 포커스
  useEffect(() => {
    if (isActive) {
      // 약간의 지연으로 포커스 안정성 확보
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        if (value.trim()) {
          onSend(value.trim())
          setValue("")
        }
        onDeactivate()
      } else if (e.key === "Escape") {
        e.preventDefault()
        setValue("")
        onDeactivate()
      }
    },
    [value, onSend, onDeactivate]
  )

  if (!isActive) return null

  return (
    <div className="border-t border-white/10 px-2 py-1.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지 입력... (Enter 전송, ESC 취소)"
        className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/40"
        autoComplete="off"
      />
    </div>
  )
}
