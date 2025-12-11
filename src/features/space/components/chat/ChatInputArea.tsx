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
 * - /닉네임 형태로 귓속말 전송
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { parseChatInput, isWhisperFormat } from "../../utils/chatParser"

// ============================================
// ChatInputArea Props
// ============================================
interface ChatInputAreaProps {
  onSend: (message: string) => void
  onSendWhisper?: (targetNickname: string, content: string) => void  // 📬 귓속말 전송
  onDeactivate: () => void
  isActive: boolean
}

// ============================================
// ChatInputArea Component
// ============================================
export function ChatInputArea({ onSend, onSendWhisper, onDeactivate, isActive }: ChatInputAreaProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // 귓속말 모드인지 확인 (힌트 표시용)
  const isWhisperMode = isWhisperFormat(value)

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
      // 🔒 모든 키 입력이 게임 엔진으로 전파되지 않도록 차단
      e.stopPropagation()

      if (e.key === "Enter") {
        e.preventDefault()
        if (value.trim()) {
          // 📬 입력 파싱하여 일반 메시지/귓속말 구분
          const parsed = parseChatInput(value)

          if (parsed.type === "whisper" && parsed.target && onSendWhisper) {
            // 귓속말 전송
            onSendWhisper(parsed.target, parsed.content)
          } else {
            // 일반 메시지 전송
            onSend(parsed.content)
          }
          setValue("")
        }
        onDeactivate()
      } else if (e.key === "Escape") {
        e.preventDefault()
        setValue("")
        onDeactivate()
      }
      // WASD, 방향키 등 다른 키는 기본 동작 (텍스트 입력) 허용
    },
    [value, onSend, onSendWhisper, onDeactivate]
  )

  if (!isActive) return null

  return (
    <div className="mt-1">
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/10 shadow-lg"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* 입력 프롬프트 - 귓속말 모드일 때 색상 변경 */}
        <span
          className={`text-[11px] shrink-0 ${isWhisperMode ? "text-purple-400" : "text-white/60"}`}
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          {isWhisperMode ? "[귓속말]" : "[전체]"}
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
