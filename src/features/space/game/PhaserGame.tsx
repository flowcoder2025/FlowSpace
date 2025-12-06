"use client"

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import Phaser from "phaser"
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

export const PhaserGame = forwardRef<PhaserGameRef, PhaserGameProps>(
  ({ playerId, playerNickname, avatarColor = "default", onPlayerMove, onObjectInteract, onGameReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const gameRef = useRef<Phaser.Game | null>(null)

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

      // Handle resize
      const handleResize = () => {
        if (gameRef.current && containerRef.current) {
          gameRef.current.scale.resize(
            containerRef.current.clientWidth,
            containerRef.current.clientHeight
          )
        }
      }

      window.addEventListener("resize", handleResize)

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize)
        eventBridge.off(GameEvents.PLAYER_MOVED, handlePlayerMove)
        eventBridge.off(GameEvents.GAME_READY, handleGameReady)
        eventBridge.off(GameEvents.OBJECT_INTERACT, handleObjectInteract)

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
        style={{ minHeight: "100%", minWidth: "100%" }}
      />
    )
  }
)

PhaserGame.displayName = "PhaserGame"
