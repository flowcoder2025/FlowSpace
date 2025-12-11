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
 * - 답장 모드 시 원본 메시지 인용 표시
 */
import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { parseChatInput, isWhisperFormat } from "../../utils/chatParser"
import type { ReplyTo } from "../../types/space.types"

// ============================================
// X 아이콘 컴포넌트 (답장 취소용)
// ============================================
function XIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ============================================
// ChatInputArea Props
// ============================================
interface ChatInputAreaProps {
  onSend: (message: string, replyTo?: ReplyTo) => void  // 답장 정보 포함 가능
  onSendWhisper?: (targetNickname: string, content: string, replyTo?: ReplyTo) => void  // 📬 귓속말 전송
  onDeactivate: () => void
  isActive: boolean
  replyTo?: ReplyTo | null  // 답장 중인 메시지
  onCancelReply?: () => void  // 답장 취소 콜백
}

// ============================================
// ChatInputArea Component
// ============================================
export function ChatInputArea({
  onSend,
  onSendWhisper,
  onDeactivate,
  isActive,
  replyTo,
  onCancelReply,
}: ChatInputAreaProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // 귓속말 모드인지 확인 (힌트 표시용)
  const isWhisperMode = isWhisperFormat(value)
  // 답장 모드인지 확인
  const isReplyMode = !!replyTo

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
            // 귓속말 전송 (답장 정보 포함)
            onSendWhisper(parsed.target, parsed.content, replyTo || undefined)
          } else {
            // 일반 메시지 전송 (답장 정보 포함)
            onSend(parsed.content, replyTo || undefined)
          }
          setValue("")
          // 답장 모드 종료
          if (onCancelReply) {
            onCancelReply()
          }
        }
        onDeactivate()
      } else if (e.key === "Escape") {
        e.preventDefault()
        setValue("")
        // 답장 모드도 취소
        if (onCancelReply) {
          onCancelReply()
        }
        onDeactivate()
      }
      // WASD, 방향키 등 다른 키는 기본 동작 (텍스트 입력) 허용
    },
    [value, onSend, onSendWhisper, onDeactivate, replyTo, onCancelReply]
  )

  if (!isActive) return null

  // 답장 미리보기 텍스트 (최대 30자)
  const replyPreview = replyTo
    ? replyTo.content.length > 30
      ? replyTo.content.slice(0, 30) + "..."
      : replyTo.content
    : ""

  return (
    <div className="mt-1">
      {/* 답장 모드 표시 (입력창 위) */}
      {isReplyMode && replyTo && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-2 py-1 mb-1 rounded-t-lg",
            "bg-primary/10 border-l-2 border-primary/60"
          )}
        >
          <div className="flex items-center gap-1 min-w-0 text-[10px]">
            <span className="text-primary/80 font-medium shrink-0">
              {replyTo.senderNickname}
            </span>
            <span className="text-white/40">에게 답장</span>
            <span className="text-white/50 truncate ml-1">
              &ldquo;{replyPreview}&rdquo;
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancelReply?.()
            }}
            className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
            title="답장 취소"
          >
            <XIcon className="w-3 h-3 text-white/40 hover:text-white/70" />
          </button>
        </div>
      )}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 border border-white/10 shadow-lg",
          isReplyMode ? "rounded-b-lg" : "rounded-lg"
        )}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* 입력 프롬프트 - 귓속말/답장 모드일 때 색상 변경 */}
        <span
          className={cn(
            "text-[11px] shrink-0",
            isReplyMode ? "text-primary" : isWhisperMode ? "text-purple-400" : "text-white/60"
          )}
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          {isReplyMode ? "[답장]" : isWhisperMode ? "[귓속말]" : "[전체]"}
        </span>
        {/* 입력창 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isReplyMode ? "답장을 입력하세요..." : "메시지를 입력하세요..."}
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
