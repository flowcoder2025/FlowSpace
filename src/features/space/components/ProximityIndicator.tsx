"use client"

/**
 * ProximityIndicator
 *
 * 근접 기반 커뮤니케이션 상태 표시 컴포넌트
 * - 근접 모드 활성화 시 범위 내/외 사용자 수 표시
 * - 디버그 정보 토글 가능
 *
 * @see /docs/roadmap/SPATIAL-COMMUNICATION.md
 */

import { useState, memo } from "react"
import { Users, Radio, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProximityIndicatorProps {
  /** 근접 모드 활성화 여부 */
  enabled: boolean
  /** 범위 내 사용자 수 */
  inRangeCount: number
  /** 범위 외 사용자 수 */
  outOfRangeCount: number
  /** 범위 내 사용자 닉네임 목록 */
  inRangeUsers?: string[]
  /** 범위 외 사용자 닉네임 목록 */
  outOfRangeUsers?: string[]
  /** 추가 클래스 */
  className?: string
}

export const ProximityIndicator = memo(function ProximityIndicator({
  enabled,
  inRangeCount,
  outOfRangeCount,
  inRangeUsers = [],
  outOfRangeUsers = [],
  className,
}: ProximityIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)

  // 비활성화 시 전역 모드 표시
  if (!enabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg bg-background/80 px-3 py-2 text-xs backdrop-blur-sm",
          className
        )}
      >
        <Radio className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">전역 모드</span>
      </div>
    )
  }

  const totalUsers = inRangeCount + outOfRangeCount

  return (
    <div
      className={cn(
        "relative rounded-lg bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      {/* 메인 인디케이터 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent/50 rounded-lg transition-colors w-full"
      >
        <Radio className="size-3.5 text-primary animate-pulse" />
        <span className="text-foreground font-medium">근접 모드</span>
        <div className="flex items-center gap-1.5 ml-auto">
          {/* 범위 내 */}
          <div className="flex items-center gap-1 text-green-500">
            <Volume2 className="size-3" />
            <span>{inRangeCount}</span>
          </div>
          {/* 범위 외 */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <VolumeX className="size-3" />
            <span>{outOfRangeCount}</span>
          </div>
        </div>
      </button>

      {/* 상세 정보 드롭다운 */}
      {showDetails && totalUsers > 0 && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-lg bg-background/95 p-2 shadow-lg backdrop-blur-sm border border-border z-50">
          {/* 범위 내 사용자 */}
          {inRangeUsers.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 text-xs text-green-500 mb-1">
                <Volume2 className="size-3" />
                <span className="font-medium">들을 수 있음</span>
              </div>
              <div className="space-y-0.5 pl-4">
                {inRangeUsers.map((user) => (
                  <div key={user} className="text-xs text-foreground/80 truncate">
                    {user}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 범위 외 사용자 */}
          {outOfRangeUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <VolumeX className="size-3" />
                <span className="font-medium">범위 밖</span>
              </div>
              <div className="space-y-0.5 pl-4">
                {outOfRangeUsers.slice(0, 5).map((user) => (
                  <div key={user} className="text-xs text-muted-foreground truncate">
                    {user}
                  </div>
                ))}
                {outOfRangeUsers.length > 5 && (
                  <div className="text-xs text-muted-foreground/60">
                    +{outOfRangeUsers.length - 5}명 더...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 범위 정보 */}
          <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            7×7 타일 범위 내 음성 수신
          </div>
        </div>
      )}
    </div>
  )
})
