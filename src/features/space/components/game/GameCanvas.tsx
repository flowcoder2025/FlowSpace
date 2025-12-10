"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { VStack, Text } from "@/components/ui"

// Dynamic import for Phaser (browser-only)
const PhaserGame = dynamic(
  () => import("../../game/PhaserGame").then((mod) => mod.PhaserGame),
  {
    ssr: false,
    loading: () => <GameLoadingState />,
  }
)

// ============================================
// Loading State Component
// ============================================
function GameLoadingState() {
  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
      <VStack gap="lg" align="center" className="text-center p-8">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
        <VStack gap="xs" align="center">
          <Text size="lg" weight="semibold">게임 로딩 중...</Text>
          <Text tone="muted" size="sm">
            잠시만 기다려주세요
          </Text>
        </VStack>
      </VStack>
    </div>
  )
}

// Avatar color type
type AvatarColor = "default" | "red" | "green" | "purple" | "orange" | "pink"

// ============================================
// GameCanvas Props
// ============================================
interface GameCanvasProps {
  playerId: string
  playerNickname: string
  avatarColor?: AvatarColor
  onPlayerMove?: (position: { x: number; y: number; direction: string; isMoving: boolean }) => void
  className?: string
}

// ============================================
// GameCanvas Component
// ============================================
export function GameCanvas({
  playerId,
  playerNickname,
  avatarColor = "default",
  onPlayerMove,
  className,
}: GameCanvasProps) {
  const [isReady, setIsReady] = useState(false)

  const handleGameReady = useCallback(() => {
    setIsReady(true)
  }, [])

  return (
    <div className={cn("absolute inset-0", className)}>
      <PhaserGame
        playerId={playerId}
        playerNickname={playerNickname}
        avatarColor={avatarColor}
        onPlayerMove={onPlayerMove}
        onGameReady={handleGameReady}
      />

      {/* Overlay instructions (shown briefly after game is ready) */}
      {isReady && (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2 text-white backdrop-blur-sm">
          <Text size="xs">WASD 또는 방향키로 이동 · Space로 점프</Text>
        </div>
      )}
    </div>
  )
}
