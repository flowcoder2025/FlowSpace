/**
 * Editor Status Bar Component
 *
 * 에디터 상태 표시 바
 * - 현재 모드 표시 (배치 중, 페어 대기 등)
 * - ESC/Enter 힌트
 * - Undo/Redo 버튼
 */

"use client"

import { useCallback } from "react"
import { Undo2, Redo2, MousePointer, Move, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  useEditorStore,
  useSelectedAsset,
  useHistoryState,
} from "../../stores/editorStore"
import type { EditorTool, PairPlacementPhase } from "../../types/editor.types"

// ============================================
// Types
// ============================================

export interface EditorStatusBarProps {
  /** 추가 클래스명 */
  className?: string
}

// ============================================
// Component
// ============================================

export function EditorStatusBar({ className }: EditorStatusBarProps) {
  // Store state
  const isActive = useEditorStore((state) => state.mode.isActive)
  const selectedTool = useEditorStore((state) => state.mode.selectedTool)
  const pairPhase = useEditorStore((state) => state.mode.pairPhase)
  const selectedAsset = useSelectedAsset()
  const { canUndo, canRedo } = useHistoryState()

  // Store actions
  const setTool = useEditorStore((state) => state.setTool)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)

  // Handlers
  const handleToolChange = useCallback(
    (tool: EditorTool) => {
      setTool(tool)
    },
    [setTool]
  )

  // Don't render if editor is not active
  if (!isActive) return null

  // Get status message
  const statusMessage = getStatusMessage(selectedTool, pairPhase, selectedAsset?.name)
  const hintMessage = getHintMessage(selectedTool, pairPhase)

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border/50 bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {/* Left: Tools */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon={<MousePointer className="size-4" />}
          label="선택"
          isActive={selectedTool === "select"}
          onClick={() => handleToolChange("select")}
        />
        <ToolButton
          icon={<Move className="size-4" />}
          label="이동"
          isActive={selectedTool === "move"}
          onClick={() => handleToolChange("move")}
        />
        <ToolButton
          icon={<Trash2 className="size-4" />}
          label="삭제"
          isActive={selectedTool === "delete"}
          onClick={() => handleToolChange("delete")}
        />

        <div className="mx-2 h-5 w-px bg-border" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          onClick={undo}
          disabled={!canUndo}
          aria-label="실행 취소"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          onClick={redo}
          disabled={!canRedo}
          aria-label="다시 실행"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>

      {/* Center: Status Message */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">{statusMessage}</span>
        {hintMessage && (
          <span className="text-xs text-muted-foreground">{hintMessage}</span>
        )}
      </div>

      {/* Right: Selected Asset Info */}
      <div className="flex items-center gap-2">
        {selectedAsset && (
          <div className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5">
            <span className="text-xs text-primary">
              {selectedAsset.requiresPair ? "🔗" : "📦"} {selectedAsset.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

interface ToolButtonProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function ToolButton({ icon, label, isActive, onClick }: ToolButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className={cn("size-7 p-0", isActive && "bg-primary text-primary-foreground")}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </Button>
  )
}

// ============================================
// Helper Functions
// ============================================

function getStatusMessage(
  tool: EditorTool,
  pairPhase: PairPlacementPhase,
  assetName?: string | null
): string {
  // Pair placement messages take priority
  if (pairPhase !== "idle") {
    switch (pairPhase) {
      case "placing_first":
        return `${assetName || "오브젝트"} 입구 배치 중...`
      case "placing_second":
        return `${assetName || "오브젝트"} 출구 배치 중...`
      case "complete":
        return "페어 배치 완료!"
    }
  }

  // Tool-based messages
  switch (tool) {
    case "select":
      return "선택 모드"
    case "place":
      return assetName ? `${assetName} 배치 모드` : "배치 모드"
    case "move":
      return "이동 모드"
    case "delete":
      return "삭제 모드"
    default:
      return "에디터 활성"
  }
}

function getHintMessage(
  tool: EditorTool,
  pairPhase: PairPlacementPhase
): string {
  // Pair placement hints
  if (pairPhase !== "idle" && pairPhase !== "complete") {
    return "ESC로 취소 · 클릭으로 배치"
  }

  // Tool-based hints
  switch (tool) {
    case "select":
      return "클릭으로 오브젝트 선택"
    case "place":
      return "클릭으로 배치 · ESC로 취소"
    case "move":
      return "드래그로 이동"
    case "delete":
      return "클릭으로 삭제"
    default:
      return ""
  }
}
