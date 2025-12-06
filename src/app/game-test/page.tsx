"use client"

import dynamic from "next/dynamic"
import { useState, useCallback } from "react"

// Dynamic import for Phaser (client-side only)
const PhaserGame = dynamic(
  () => import("@/features/space/game").then((mod) => mod.PhaserGame),
  { ssr: false }
)

export default function GameTestPage() {
  const [events, setEvents] = useState<string[]>([])
  const [gameReady, setGameReady] = useState(false)

  const addEvent = useCallback((event: string, data: unknown) => {
    const timestamp = new Date().toLocaleTimeString()
    setEvents((prev) => [`[${timestamp}] ${event}: ${JSON.stringify(data)}`, ...prev.slice(0, 19)])
  }, [])

  const handlePlayerMove = useCallback((position: { x: number; y: number; direction: string; isMoving: boolean }) => {
    // Only log when moving starts/stops to reduce spam
    if (position.isMoving) {
      addEvent("PLAYER_MOVE", { x: Math.round(position.x), y: Math.round(position.y), direction: position.direction })
    }
  }, [addEvent])

  const handleObjectInteract = useCallback((data: { id: string; type: string; label: string; data: Record<string, unknown> }) => {
    addEvent("OBJECT_INTERACT", data)
  }, [addEvent])

  const handleGameReady = useCallback(() => {
    setGameReady(true)
    addEvent("GAME_READY", { status: "initialized" })
  }, [addEvent])

  return (
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
        <h1 className="text-lg font-bold text-white">Phase 2 Game Test</h1>
        <div className="flex items-center gap-4 text-sm text-gray-300">
          {gameReady ? (
            <span className="text-green-400">Ready</span>
          ) : (
            <span className="text-yellow-400">Loading...</span>
          )}
          <span>WASD/Arrows: Move</span>
          <span>Space: Jump</span>
          <span>E: Interact</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game Container */}
        <div className="flex-1 p-4">
          <div className="mx-auto h-full max-w-4xl overflow-hidden rounded-lg border border-gray-700">
            <PhaserGame
              playerId="test-player"
              playerNickname="Tester"
              avatarColor="default"
              onPlayerMove={handlePlayerMove}
              onObjectInteract={handleObjectInteract}
              onGameReady={handleGameReady}
            />
          </div>
        </div>

        {/* Event Log Panel */}
        <div className="flex w-80 flex-col border-l border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 p-3">
            <h2 className="font-semibold text-white">Event Log</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">No events yet. Move around or press E near objects.</p>
            ) : (
              <ul className="space-y-1">
                {events.map((event, i) => (
                  <li key={i} className="break-all text-xs text-gray-400">
                    {event}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Objects Legend */}
      <footer className="border-t border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-6 text-sm text-gray-300">
          <span className="font-semibold text-white">Objects:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded bg-blue-500"></span> Info (blue)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-full bg-purple-500"></span> Portal (purple)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded bg-orange-500"></span> NPC (orange)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rotate-45 bg-green-500"></span> Item (green)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded bg-gray-500"></span> Door (gray)
          </span>
        </div>
      </footer>
    </div>
  )
}
