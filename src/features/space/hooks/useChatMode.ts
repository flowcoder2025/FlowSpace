/**
 * useChatMode - 채팅 모드 상태 관리 훅
 *
 * 채팅 모드:
 * - INACTIVE: 읽기 전용, 게임 입력 활성
 * - ACTIVE: 채팅 입력 활성, 게임 입력 차단
 */
import { useState, useCallback, useEffect } from "react"
import { eventBridge, GameEvents } from "../game/events"

export type ChatMode = "ACTIVE" | "INACTIVE"

export function useChatMode() {
  const [mode, setMode] = useState<ChatMode>("INACTIVE")

  // Enter 키로 모드 토글
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "ACTIVE" ? "INACTIVE" : "ACTIVE"))
  }, [])

  // 활성화
  const activate = useCallback(() => setMode("ACTIVE"), [])

  // 비활성화
  const deactivate = useCallback(() => setMode("INACTIVE"), [])

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
