/**
 * Editor Mode Indicator Component
 *
 * 게임 캔버스 위에 표시되는 컴팩트한 모드 인디케이터
 * - 현재 상태 아이콘 + 간단한 텍스트
 * - 페어 배치 진행 상태
 */

"use client"

import { cn } from "@/lib/utils"
import { useEditorStore, useSelectedAsset } from "../../stores/editorStore"
import type { PairPlacementPhase, EditorTool } from "../../types/editor.types"

// ============================================
// Types
// ============================================

export interface EditorModeIndicatorProps {
  /** 추가 클래스명 */
  className?: string
}

// ============================================
// Component
// ============================================

export function EditorModeIndicator({ className }: EditorModeIndicatorProps) {
  // Store state
  const isActive = useEditorStore((state) => state.mode.isActive)
  const selectedTool = useEditorStore((state) => state.mode.selectedTool)
  const pairPhase = useEditorStore((state) => state.mode.pairPhase)
  const selectedAsset = useSelectedAsset()

  // Don't render if editor is not active
  if (!isActive) return null

  // Get indicator data
  const indicator = getIndicatorData(selectedTool, pairPhase, selectedAsset?.name)

  return (
    <div
      className={cn(
        "pointer-events-none flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1.5 shadow-md backdrop-blur-sm",
        className
      )}
    >
      {/* Icon */}
      <span className="text-lg">{indicator.icon}</span>

      {/* Text */}
      <div className="flex flex-col">
        <span className="text-xs font-medium leading-tight">{indicator.title}</span>
        {indicator.subtitle && (
          <span className="text-[10px] leading-tight text-muted-foreground">
            {indicator.subtitle}
          </span>
        )}
      </div>

      {/* Progress dots for pair placement */}
      {pairPhase !== "idle" && (
        <div className="ml-2 flex items-center gap-1">
          <ProgressDot
            active={pairPhase === "placing_first" || pairPhase === "placing_second" || pairPhase === "complete"}
            completed={pairPhase === "placing_second" || pairPhase === "complete"}
          />
          <div className="h-px w-2 bg-border" />
          <ProgressDot
            active={pairPhase === "placing_second" || pairPhase === "complete"}
            completed={pairPhase === "complete"}
          />
        </div>
      )}
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

interface ProgressDotProps {
  active: boolean
  completed: boolean
}

function ProgressDot({ active, completed }: ProgressDotProps) {
  return (
    <div
      className={cn(
        "size-2 rounded-full transition-colors",
        completed
          ? "bg-primary"
          : active
            ? "bg-primary/50 animate-pulse"
            : "bg-muted"
      )}
    />
  )
}

// ============================================
// Helper Functions
// ============================================

interface IndicatorData {
  icon: string
  title: string
  subtitle?: string
}

function getIndicatorData(
  tool: EditorTool,
  pairPhase: PairPlacementPhase,
  assetName?: string | null
): IndicatorData {
  // Pair placement indicators
  if (pairPhase !== "idle") {
    switch (pairPhase) {
      case "placing_first":
        return {
          icon: "🔗",
          title: "입구 배치",
          subtitle: assetName || "페어 오브젝트",
        }
      case "placing_second":
        return {
          icon: "🔗",
          title: "출구 배치",
          subtitle: "ESC 취소",
        }
      case "complete":
        return {
          icon: "✅",
          title: "배치 완료",
        }
    }
  }

  // Tool-based indicators
  switch (tool) {
    case "select":
      return {
        icon: "👆",
        title: "선택 모드",
      }
    case "place":
      return {
        icon: "📦",
        title: assetName || "배치 모드",
        subtitle: "클릭으로 배치",
      }
    case "move":
      return {
        icon: "✋",
        title: "이동 모드",
        subtitle: "드래그",
      }
    case "delete":
      return {
        icon: "🗑️",
        title: "삭제 모드",
        subtitle: "클릭으로 삭제",
      }
    default:
      return {
        icon: "✏️",
        title: "에디터",
      }
  }
}
