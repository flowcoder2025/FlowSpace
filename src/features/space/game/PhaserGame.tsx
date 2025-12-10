"use client"

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import * as Phaser from "phaser"
import { createGameConfig } from "./config"
import { MainScene } from "./scenes/MainScene"
import { eventBridge, GameEvents } from "./events"

export interface PhaserGameRef {
  game: Phaser.Game | null
}

// Avatar color type
type AvatarColor = "default" | "red" | "green" | "purple" | "orange" | "pink"

// Object interaction data type
interface ObjectInteractionData {
  id: string
  type: "info" | "portal" | "npc" | "item" | "door"
  label: string
  data: Record<string, unknown>
}

interface PhaserGameProps {
  playerId: string
  playerNickname: string
  avatarColor?: AvatarColor
  onPlayerMove?: (position: { x: number; y: number; direction: string; isMoving: boolean }) => void
  onObjectInteract?: (data: ObjectInteractionData) => void
  onGameReady?: () => void
}

// 🔧 최소 크기 임계값 - 이보다 작으면 리사이즈 무시 (레이아웃 버그 방지)
const MIN_WIDTH = 200
const MIN_HEIGHT = 200

export const PhaserGame = forwardRef<PhaserGameRef, PhaserGameProps>(
  ({ playerId, playerNickname, avatarColor = "default", onPlayerMove, onObjectInteract, onGameReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const gameRef = useRef<Phaser.Game | null>(null)
    // 🔧 마지막 유효 크기 저장 (잘못된 리사이즈 복구용)
    const lastValidSizeRef = useRef<{ width: number; height: number } | null>(null)
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useImperativeHandle(ref, () => ({
      game: gameRef.current,
    }))

    useEffect(() => {
      if (!containerRef.current) return

      // Create game instance
      const config = createGameConfig(containerRef.current, [MainScene])
      gameRef.current = new Phaser.Game(config)

      // Pass data to scene
      gameRef.current.scene.start("MainScene", {
        playerId,
        nickname: playerNickname,
        avatarColor,
      })

      // Setup event listeners
      const handlePlayerMove = (position: unknown) => {
        if (onPlayerMove) {
          onPlayerMove(position as { x: number; y: number; direction: string; isMoving: boolean })
        }
      }

      const handleGameReady = () => {
        if (onGameReady) {
          onGameReady()
        }
      }

      const handleObjectInteract = (data: unknown) => {
        if (onObjectInteract) {
          // Extract object data from the event payload
          const payload = data as { playerId: string; object: ObjectInteractionData }
          onObjectInteract(payload.object)
        }
      }

      eventBridge.on(GameEvents.PLAYER_MOVED, handlePlayerMove)
      eventBridge.on(GameEvents.GAME_READY, handleGameReady)
      eventBridge.on(GameEvents.OBJECT_INTERACT, handleObjectInteract)

      // 🔧 개선된 리사이즈 핸들러 - 최소 크기 검증 포함
      const handleResize = (forceValid = false) => {
        if (!gameRef.current || !containerRef.current) return

        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight

        // 🔧 유효한 크기인지 검증
        if (width >= MIN_WIDTH && height >= MIN_HEIGHT) {
          // 유효한 크기 저장
          lastValidSizeRef.current = { width, height }
          gameRef.current.scale.resize(width, height)
        } else if (forceValid && lastValidSizeRef.current) {
          // 강제 복구: 마지막 유효 크기로 리사이즈
          gameRef.current.scale.resize(
            lastValidSizeRef.current.width,
            lastValidSizeRef.current.height
          )
        }
        // 그 외 (최소 크기 미달 + 저장된 크기 없음): 리사이즈 무시
      }

      window.addEventListener("resize", () => handleResize(false))

      // 🔧 ResizeObserver로 컨테이너 크기 변경 감지 (디바운스 적용)
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === containerRef.current && gameRef.current) {
            const { width, height } = entry.contentRect

            // 🔧 디바운스: 빠른 연속 리사이즈 방지
            if (resizeTimeoutRef.current) {
              clearTimeout(resizeTimeoutRef.current)
            }

            // 유효한 크기인 경우 즉시 적용
            if (width >= MIN_WIDTH && height >= MIN_HEIGHT) {
              lastValidSizeRef.current = { width, height }
              gameRef.current.scale.resize(width, height)
            } else {
              // 🔧 유효하지 않은 크기: 100ms 후 복구 시도
              resizeTimeoutRef.current = setTimeout(() => {
                handleResize(true)
              }, 100)
            }
          }
        }
      })
      resizeObserver.observe(containerRef.current)

      // 🔧 마운트 직후 + 주기적 크기 검증
      const rafId = requestAnimationFrame(() => {
        setTimeout(() => handleResize(false), 50)
        // 🔧 추가 검증: 200ms 후 다시 한번 확인 (레이아웃 안정화 후)
        setTimeout(() => handleResize(true), 200)
      })

      // 🔧 채팅 포커스 변경 시 크기 복구 (CHAT_FOCUS_CHANGED 이벤트 감지)
      const handleChatFocusResize = () => {
        // 채팅 모드 변경 후 레이아웃이 안정화될 시간을 두고 리사이즈
        setTimeout(() => handleResize(true), 50)
        setTimeout(() => handleResize(true), 150)
      }
      eventBridge.on(GameEvents.CHAT_FOCUS_CHANGED, handleChatFocusResize)

      // Cleanup
      return () => {
        cancelAnimationFrame(rafId)
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current)
        }
        resizeObserver.disconnect()
        window.removeEventListener("resize", () => handleResize(false))
        eventBridge.off(GameEvents.PLAYER_MOVED, handlePlayerMove)
        eventBridge.off(GameEvents.GAME_READY, handleGameReady)
        eventBridge.off(GameEvents.OBJECT_INTERACT, handleObjectInteract)
        eventBridge.off(GameEvents.CHAT_FOCUS_CHANGED, handleChatFocusResize)

        if (gameRef.current) {
          gameRef.current.destroy(true)
          gameRef.current = null
        }
      }
    }, [playerId, playerNickname, avatarColor, onPlayerMove, onObjectInteract, onGameReady])

    return (
      <div
        ref={containerRef}
        className="size-full"
        style={{
          minHeight: "100%",
          minWidth: "100%",
          // 🔧 Phaser 캔버스가 컨테이너를 채우도록 보장
          display: "block",
          position: "relative",
        }}
      />
    )
  }
)

PhaserGame.displayName = "PhaserGame"
