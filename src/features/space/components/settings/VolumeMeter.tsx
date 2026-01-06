"use client"

/**
 * VolumeMeter
 *
 * 실시간 볼륨 레벨 시각화 컴포넌트
 * - 세그먼트 스타일 (디스코드와 유사)
 * - 입력 감도 표시 라인
 * - 반응형 애니메이션
 */

import { cn } from "@/lib/utils"
import { useMemo } from "react"

interface VolumeMeterProps {
  /** 현재 볼륨 레벨 (0-100) */
  level: number
  /** 입력 감도 임계값 (0-100, 선택적) */
  sensitivity?: number
  /** 세그먼트 수 */
  segments?: number
  /** 높이 */
  height?: number
  /** 추가 클래스 */
  className?: string
  /** 가로 방향 여부 */
  horizontal?: boolean
}

export function VolumeMeter({
  level,
  sensitivity,
  segments = 20,
  height = 8,
  className,
  horizontal = true,
}: VolumeMeterProps) {
  // 활성화된 세그먼트 수 계산
  const activeSegments = useMemo(() => {
    return Math.round((level / 100) * segments)
  }, [level, segments])

  // 감도 표시 위치 (세그먼트 인덱스)
  const sensitivitySegment = useMemo(() => {
    if (sensitivity === undefined) return null
    return Math.round((sensitivity / 100) * segments)
  }, [sensitivity, segments])

  // 세그먼트 색상 결정
  const getSegmentColor = (index: number, isActive: boolean) => {
    if (!isActive) return "bg-muted"

    // 볼륨 레벨에 따른 색상 그라데이션
    const percentage = index / segments
    if (percentage > 0.8) return "bg-red-500" // 높은 볼륨 (경고)
    if (percentage > 0.6) return "bg-yellow-500" // 중간-높음
    return "bg-primary" // 정상 범위
  }

  return (
    <div className={cn("relative", className)}>
      {/* 세그먼트 바 */}
      <div
        className={cn(
          "flex gap-0.5",
          horizontal ? "flex-row" : "flex-col-reverse"
        )}
        style={{ height: horizontal ? height : "auto" }}
      >
        {Array.from({ length: segments }).map((_, index) => {
          const isActive = index < activeSegments
          const isSensitivityMark = sensitivitySegment !== null && index === sensitivitySegment

          return (
            <div
              key={index}
              className={cn(
                "flex-1 rounded-sm transition-colors duration-75",
                getSegmentColor(index, isActive),
                isSensitivityMark && "ring-1 ring-foreground/50"
              )}
              style={{
                minWidth: horizontal ? 4 : "auto",
                minHeight: horizontal ? "auto" : 4,
              }}
            />
          )
        })}
      </div>

      {/* 감도 표시 라인 */}
      {sensitivity !== undefined && (
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/50"
          style={{
            left: `${sensitivity}%`,
            transform: "translateX(-50%)",
          }}
        />
      )}
    </div>
  )
}

/**
 * 간단한 볼륨 바 (세그먼트 없음)
 */
export function SimpleVolumeMeter({
  level,
  className,
}: {
  level: number
  className?: string
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-75",
          level > 80 ? "bg-red-500" : level > 60 ? "bg-yellow-500" : "bg-primary"
        )}
        style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
      />
    </div>
  )
}
