/**
 * Pair Object Placement Hook
 *
 * 페어 오브젝트(포털 등) 배치 상태 관리
 * 상태 머신: IDLE → PLACING_FIRST → PLACING_SECOND → COMPLETE
 */

import { useCallback, useEffect } from "react"
import { useEditorStore } from "../stores/editorStore"
import type {
  GridPosition,
  PlacedObject,
  PairPlacementPhase,
} from "../types/editor.types"
import { isPairObject, getAssetById } from "@/config"

// ============================================
// Types
// ============================================

export interface UsePairPlacementOptions {
  /** 시스템 메시지 콜백 */
  onSystemMessage?: (message: string, type: "info" | "success" | "warning" | "error") => void
  /** 배치 완료 콜백 */
  onPairComplete?: (firstObject: PlacedObject, secondObject: PlacedObject) => void
}

export interface UsePairPlacementReturn {
  /** 현재 페어 배치 단계 */
  phase: PairPlacementPhase
  /** 페어 배치 중인 에셋 ID */
  pairAssetId: string | null
  /** 첫 번째 위치 */
  firstPosition: GridPosition | null
  /** 페어 배치 활성화 여부 */
  isPlacingPair: boolean
  /** 페어 배치 시작 */
  startPairPlacement: (assetId: string) => boolean
  /** 위치 확인 (첫 번째 또는 두 번째) */
  confirmPosition: (position: GridPosition) => Promise<PlacedObject | null>
  /** 페어 배치 취소 */
  cancelPairPlacement: () => void
  /** 현재 단계 라벨 (UI 표시용) */
  currentStepLabel: string
}

// ============================================
// Hook Implementation
// ============================================

export function usePairPlacement(options: UsePairPlacementOptions = {}): UsePairPlacementReturn {
  const { onSystemMessage, onPairComplete } = options

  // Store state
  const mode = useEditorStore((state) => state.mode)
  const placeObject = useEditorStore((state) => state.placeObject)
  const updateObject = useEditorStore((state) => state.updateObject)
  const deleteObject = useEditorStore((state) => state.deleteObject)
  const setPairPhase = useEditorStore((state) => state.setPairPhase)
  const setPairFirstPosition = useEditorStore((state) => state.setPairFirstPosition)
  const selectAsset = useEditorStore((state) => state.selectAsset)
  const objects = useEditorStore((state) => state.objects)

  const { pairPhase: phase, pairFirstPosition: firstPosition, selectedAsset } = mode

  // 현재 배치 중인 페어 에셋 ID
  const pairAssetId = selectedAsset?.requiresPair ? selectedAsset.id : null

  // 페어 배치 활성화 여부
  const isPlacingPair = phase !== "idle" && phase !== "complete"

  // 현재 단계 라벨
  const currentStepLabel = getStepLabel(phase, selectedAsset?.name)

  /**
   * 페어 배치 시작
   */
  const startPairPlacement = useCallback(
    (assetId: string): boolean => {
      const asset = getAssetById(assetId)

      if (!asset) {
        onSystemMessage?.(`에셋 '${assetId}'을(를) 찾을 수 없습니다.`, "error")
        return false
      }

      if (!isPairObject(assetId)) {
        onSystemMessage?.(`'${asset.name}'은(는) 페어 오브젝트가 아닙니다.`, "warning")
        return false
      }

      // 에셋 선택 및 페어 배치 시작
      selectAsset(asset)
      setPairPhase("placing_first")
      setPairFirstPosition(null)

      const pairConfig = asset.pairConfig
      const firstLabel = pairConfig?.labels.first || "시작"
      onSystemMessage?.(`'${asset.name}' ${firstLabel} 위치를 선택하세요.`, "info")

      return true
    },
    [selectAsset, setPairPhase, setPairFirstPosition, onSystemMessage]
  )

  /**
   * 페어 배치 취소
   */
  const cancelPairPlacement = useCallback(async () => {
    // 첫 번째 위치가 배치된 상태에서 취소하면 삭제
    if (phase === "placing_second" && firstPosition && selectedAsset) {
      const objectsArray = Array.from(objects.values())
      const firstObject = objectsArray.find(
        (obj) =>
          obj.assetId === selectedAsset.id &&
          obj.position.x === firstPosition.x &&
          obj.position.y === firstPosition.y
      )

      if (firstObject) {
        await deleteObject(firstObject.id)
      }
    }

    // 상태 초기화
    selectAsset(null)
    setPairPhase("idle")
    setPairFirstPosition(null)

    onSystemMessage?.("페어 배치가 취소되었습니다.", "info")
  }, [
    phase,
    firstPosition,
    selectedAsset,
    objects,
    deleteObject,
    selectAsset,
    setPairPhase,
    setPairFirstPosition,
    onSystemMessage,
  ])

  /**
   * 위치 확인 (첫 번째 또는 두 번째)
   */
  const confirmPosition = useCallback(
    async (position: GridPosition): Promise<PlacedObject | null> => {
      if (!selectedAsset || !isPairObject(selectedAsset.id)) {
        return null
      }

      const pairConfig = selectedAsset.pairConfig

      if (phase === "placing_first") {
        // 첫 번째 위치 배치
        const firstObject = await placeObject({
          assetId: selectedAsset.id,
          position,
          customData: {
            pairType: pairConfig?.type || "portal",
            pairRole: "first",
          },
        })

        if (firstObject) {
          setPairFirstPosition(position)
          setPairPhase("placing_second")

          const secondLabel = pairConfig?.labels.second || "끝"
          onSystemMessage?.(
            `${pairConfig?.labels.first || "시작"} 위치 배치 완료. ${secondLabel} 위치를 선택하세요.`,
            "info"
          )

          return firstObject
        } else {
          onSystemMessage?.("첫 번째 위치 배치에 실패했습니다.", "error")
          return null
        }
      }

      if (phase === "placing_second" && firstPosition) {
        // 두 번째 위치 배치 - 첫 번째 오브젝트 찾기
        const objectsArray = Array.from(objects.values())
        const firstObject = objectsArray.find(
          (obj) =>
            obj.assetId === selectedAsset.id &&
            obj.position.x === firstPosition.x &&
            obj.position.y === firstPosition.y
        )

        if (!firstObject) {
          onSystemMessage?.("첫 번째 오브젝트를 찾을 수 없습니다.", "error")
          cancelPairPlacement()
          return null
        }

        // 두 번째 오브젝트 배치
        const secondObject = await placeObject({
          assetId: selectedAsset.id,
          position,
          linkedObjectId: firstObject.id,
          customData: {
            pairType: pairConfig?.type || "portal",
            pairRole: "second",
          },
        })

        if (secondObject) {
          // 첫 번째 오브젝트에 두 번째 링크 설정
          await updateObject({
            id: firstObject.id,
            linkedObjectId: secondObject.id,
          })

          // 페어 배치 완료
          setPairPhase("complete")

          onSystemMessage?.(
            `'${selectedAsset.name}' 페어 배치가 완료되었습니다.`,
            "success"
          )

          // 완료 콜백
          onPairComplete?.(firstObject, secondObject)

          // 상태 초기화
          setTimeout(() => {
            selectAsset(null)
            setPairPhase("idle")
            setPairFirstPosition(null)
          }, 500)

          return secondObject
        } else {
          onSystemMessage?.("두 번째 위치 배치에 실패했습니다.", "error")
          return null
        }
      }

      return null
    },
    [
      selectedAsset,
      phase,
      firstPosition,
      objects,
      placeObject,
      updateObject,
      selectAsset,
      setPairPhase,
      setPairFirstPosition,
      onSystemMessage,
      onPairComplete,
      cancelPairPlacement,
    ]
  )

  // ESC 키로 취소
  useEffect(() => {
    if (!isPlacingPair) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        cancelPairPlacement()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlacingPair, cancelPairPlacement])

  return {
    phase,
    pairAssetId,
    firstPosition,
    isPlacingPair,
    startPairPlacement,
    confirmPosition,
    cancelPairPlacement,
    currentStepLabel,
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * 단계별 라벨 생성
 */
function getStepLabel(phase: PairPlacementPhase, assetName?: string | null): string {
  const name = assetName || "오브젝트"

  switch (phase) {
    case "idle":
      return ""
    case "placing_first":
      return `${name} 시작 위치 선택 중...`
    case "placing_second":
      return `${name} 끝 위치 선택 중...`
    case "complete":
      return `${name} 배치 완료!`
  }
}
