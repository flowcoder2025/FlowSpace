/**
 * useChatMode - 채팅 모드 상태 관리 훅
 *
 * 채팅 모드:
 * - INACTIVE: 읽기 전용, 게임 입력 활성
 * - ACTIVE: 채팅 입력 활성, 게임 입력 차단
 *
 * 버그 수정:
 * - 전송 후 즉시 재활성화 방지 (100ms cooldown)
 */
import { useState, useCallback, useEffect, useRef } from "react"
import { eventBridge, GameEvents } from "../game/events"

export type ChatMode = "ACTIVE" | "INACTIVE"

// 재활성화 방지 cooldown (ms)
const REACTIVATION_COOLDOWN = 150

export function useChatMode() {
  const [mode, setMode] = useState<ChatMode>("INACTIVE")
  // 마지막 비활성화 시점 추적 (재활성화 방지용)
  const lastDeactivateRef = useRef<number>(0)

  // Enter 키로 모드 토글 (cooldown 적용)
  const toggleMode = useCallback(() => {
    setMode((prev) => {
      if (prev === "ACTIVE") {
        // 비활성화 시 타임스탬프 기록
        lastDeactivateRef.current = Date.now()
        return "INACTIVE"
      } else {
        // 활성화 시 cooldown 체크
        if (Date.now() - lastDeactivateRef.current < REACTIVATION_COOLDOWN) {
          return prev // cooldown 중이면 활성화 안 함
        }
        return "ACTIVE"
      }
    })
  }, [])

  // 활성화 (cooldown 적용)
  const activate = useCallback(() => {
    if (Date.now() - lastDeactivateRef.current < REACTIVATION_COOLDOWN) {
      return // cooldown 중이면 활성화 안 함
    }
    setMode("ACTIVE")
  }, [])

  // 비활성화 (타임스탬프 기록)
  const deactivate = useCallback(() => {
    lastDeactivateRef.current = Date.now()
    setMode("INACTIVE")
  }, [])

  // eventBridge로 Phaser에 상태 전파
  useEffect(() => {
    eventBridge.emit(GameEvents.CHAT_FOCUS_CHANGED, { isActive: mode === "ACTIVE" })
  }, [mode])

  return {
    mode,
    isActive: mode === "ACTIVE",
    toggleMode,
    activate,
    deactivate,
  }
}
