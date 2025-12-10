"use client"

import { useCallback } from "react"
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
  const handleGameReady = useCallback(() => {
    // 게임 준비 완료 - 추가 로직 필요시 여기에 구현
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
    </div>
  )
}
