"use client"

import { cn } from "@/lib/utils"
import type { RecordingStatusData } from "../socket/types"

// ============================================
// RecordingIndicator - 녹화 중 표시 컴포넌트
// 법적 준수: 녹화 시 모든 참가자에게 REC 표시
// ============================================

interface RecordingIndicatorProps {
  /** 현재 녹화 상태 */
  recordingStatus: RecordingStatusData | null
  /** 추가 CSS 클래스 */
  className?: string
  /** 컴팩트 모드 (작은 크기) */
  compact?: boolean
}

export function RecordingIndicator({
  recordingStatus,
  className,
  compact = false,
}: RecordingIndicatorProps) {
  // 녹화 중이 아니면 렌더링하지 않음
  if (!recordingStatus?.isRecording) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-red-600 text-white font-medium shadow-lg",
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="녹화 중"
    >
      {/* 깜빡이는 REC 점 */}
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-white" />
      </span>

      {/* REC 텍스트 */}
      <span className="font-mono tracking-wider">REC</span>

      {/* 녹화자 정보 (컴팩트가 아닐 때만) */}
      {!compact && recordingStatus.recorderNickname && (
        <span className="text-red-100 text-xs">
          ({recordingStatus.recorderNickname})
        </span>
      )}
    </div>
  )
}
