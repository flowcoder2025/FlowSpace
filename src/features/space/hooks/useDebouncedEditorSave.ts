"use client"

/**
 * useDebouncedEditorSave - 에디터 변경사항 디바운스 저장 훅
 *
 * Phase 5.4: 에디터에서 오브젝트 변경 시 너무 자주 서버에 요청하지 않도록
 * 디바운스를 적용합니다. 마지막 변경 후 일정 시간이 지나면 저장합니다.
 */

import { useRef, useCallback, useEffect } from "react"
import type { ObjectUpdateRequest } from "../socket/types"

interface UseDebouncedEditorSaveOptions {
  /** 디바운스 지연 시간 (ms) - 기본값 300ms */
  delay?: number
  /** 업데이트 콜백 */
  onUpdate: (data: ObjectUpdateRequest) => void
}

interface UseDebouncedEditorSaveReturn {
  /** 디바운스된 업데이트 함수 */
  debouncedUpdate: (data: ObjectUpdateRequest) => void
  /** 즉시 플러시 (보류 중인 모든 업데이트 즉시 전송) */
  flush: () => void
  /** 보류 중인 업데이트 취소 */
  cancel: () => void
}

/**
 * 에디터 변경사항 디바운스 저장 훅
 *
 * @example
 * ```tsx
 * const { debouncedUpdate, flush } = useDebouncedEditorSave({
 *   delay: 300,
 *   onUpdate: (data) => updateObject(data),
 * })
 *
 * // 드래그 중 매 프레임마다 호출해도 디바운스됨
 * const handleDrag = (objectId: string, newPosition: GridPosition) => {
 *   debouncedUpdate({
 *     objectId,
 *     position: newPosition,
 *   })
 * }
 *
 * // 드래그 종료 시 즉시 저장
 * const handleDragEnd = () => {
 *   flush()
 * }
 * ```
 */
export function useDebouncedEditorSave({
  delay = 300,
  onUpdate,
}: UseDebouncedEditorSaveOptions): UseDebouncedEditorSaveReturn {
  // 오브젝트별 대기 중인 업데이트 저장
  const pendingUpdatesRef = useRef<Map<string, ObjectUpdateRequest>>(new Map())
  // 디바운스 타이머
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // 콜백 ref (최신 참조 유지)
  const onUpdateRef = useRef(onUpdate)

  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // 보류 중인 업데이트 즉시 전송
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // 모든 대기 중인 업데이트 전송
    pendingUpdatesRef.current.forEach((data) => {
      onUpdateRef.current(data)
    })
    pendingUpdatesRef.current.clear()
  }, [])

  // 보류 중인 업데이트 취소
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    pendingUpdatesRef.current.clear()
  }, [])

  // 디바운스된 업데이트
  const debouncedUpdate = useCallback((data: ObjectUpdateRequest) => {
    // 같은 오브젝트의 이전 업데이트와 병합
    const existing = pendingUpdatesRef.current.get(data.objectId)
    const merged: ObjectUpdateRequest = {
      ...existing,
      ...data,
      objectId: data.objectId,
    }
    pendingUpdatesRef.current.set(data.objectId, merged)

    // 기존 타이머 취소 후 새 타이머 설정
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      flush()
    }, delay)
  }, [delay, flush])

  // 컴포넌트 언마운트 시 보류 중인 업데이트 전송
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      // 언마운트 시 보류 중인 업데이트 전송
      pendingUpdatesRef.current.forEach((data) => {
        onUpdateRef.current(data)
      })
    }
  }, [])

  return {
    debouncedUpdate,
    flush,
    cancel,
  }
}
