"use client"

import { cn } from "@/lib/utils"
import type { SpotlightStatusData } from "../socket/types"

// ============================================
// SpotlightIndicator - 스포트라이트 상태 표시 컴포넌트
// 활성 스포트라이트가 있을 때 전역 표시
// ============================================

interface SpotlightIndicatorProps {
  /** 현재 스포트라이트 상태 */
  spotlightStatus: SpotlightStatusData | null
  /** 추가 CSS 클래스 */
  className?: string
  /** 컴팩트 모드 (작은 크기) */
  compact?: boolean
}

export function SpotlightIndicator({
  spotlightStatus,
  className,
  compact = false,
}: SpotlightIndicatorProps) {
  // 활성 스포트라이트가 없으면 렌더링하지 않음
  if (!spotlightStatus?.activeSpotlights?.length) {
    return null
  }

  const activeCount = spotlightStatus.activeSpotlights.length
  const firstActive = spotlightStatus.activeSpotlights[0]

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-yellow-500 text-black font-medium shadow-lg",
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="스포트라이트 활성화"
    >
      {/* 스포트라이트 아이콘 */}
      <span className="relative flex size-4">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </span>

      {/* 스포트라이트 텍스트 */}
      <span className="font-medium">스포트라이트</span>

      {/* 활성 사용자 정보 */}
      {!compact && firstActive && (
        <span className="text-yellow-900 text-xs">
          {activeCount > 1 ? `${firstActive.nickname} 외 ${activeCount - 1}명` : firstActive.nickname}
        </span>
      )}
    </div>
  )
}
