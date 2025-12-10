"use client"

/**
 * ChatInputArea - LoL 인게임 스타일 입력창
 *
 * 스타일:
 * - 반투명 배경 (활성화 시만)
 * - 텍스트 그림자
 * - 심플한 입력창
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
    <div className="mt-1">
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* 입력 프롬프트 */}
        <span
          className="text-[11px] text-white/60 shrink-0"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          [전체]
        </span>
        {/* 입력창 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/40"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
          autoComplete="off"
          spellCheck={false}
        />
        {/* ESC 힌트 */}
        <span
          className="text-[9px] text-white/40 shrink-0"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          ESC
        </span>
      </div>
    </div>
  )
}
