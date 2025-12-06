"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, Socket } from "socket.io-client"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerPosition,
  ChatMessageData,
  RoomData,
} from "./types"
import { eventBridge, GameEvents } from "../game/events"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"

interface UseSocketOptions {
  spaceId: string
  playerId: string
  nickname: string
  onChatMessage?: (message: ChatMessageData) => void
  onSystemMessage?: (message: ChatMessageData) => void
  onPlayerJoined?: (player: PlayerPosition) => void
  onPlayerLeft?: (playerId: string) => void
}

interface UseSocketReturn {
  isConnected: boolean
  players: Map<string, PlayerPosition>
  sendMessage: (content: string) => void
  disconnect: () => void
}

export function useSocket({
  spaceId,
  playerId,
  nickname,
  onChatMessage,
  onSystemMessage,
  onPlayerJoined,
  onPlayerLeft,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [players, setPlayers] = useState<Map<string, PlayerPosition>>(new Map())

  // Initialize socket connection
  useEffect(() => {
    // Create socket connection
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    // Connection events
    socket.on("connect", () => {
      console.log("[Socket] Connected to server")
      setIsConnected(true)

      // Join the space
      socket.emit("join:space", { spaceId, playerId, nickname })
    })

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected from server")
      setIsConnected(false)
    })

    // Room events
    socket.on("room:joined", (data: RoomData) => {
      console.log("[Socket] Joined room:", data.spaceId, "Players:", data.players.length)

      // Initialize players map
      const playersMap = new Map<string, PlayerPosition>()
      data.players.forEach((player) => {
        if (player.id !== playerId) {
          playersMap.set(player.id, player)
          // Notify game about remote player
          eventBridge.emit(GameEvents.REMOTE_PLAYER_JOIN, player)
        }
      })
      setPlayers(playersMap)
    })

    socket.on("player:joined", (player: PlayerPosition) => {
      console.log("[Socket] Player joined:", player.nickname)

      setPlayers((prev) => {
        const next = new Map(prev)
        next.set(player.id, player)
        return next
      })

      // Notify game about remote player
      eventBridge.emit(GameEvents.REMOTE_PLAYER_JOIN, player)
      onPlayerJoined?.(player)
    })

    socket.on("player:left", ({ id }) => {
      console.log("[Socket] Player left:", id)

      setPlayers((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })

      // Notify game about remote player leaving
      eventBridge.emit(GameEvents.REMOTE_PLAYER_LEAVE, { id })
      onPlayerLeft?.(id)
    })

    // Movement events
    socket.on("player:moved", (position: PlayerPosition) => {
      setPlayers((prev) => {
        const next = new Map(prev)
        next.set(position.id, position)
        return next
      })

      // Notify game about remote player movement
      eventBridge.emit(GameEvents.REMOTE_PLAYER_UPDATE, position)
    })

    // Chat events
    socket.on("chat:message", (message: ChatMessageData) => {
      onChatMessage?.(message)
    })

    socket.on("chat:system", (message: ChatMessageData) => {
      onSystemMessage?.(message)
    })

    // Listen for local player movement from game
    const handleLocalPlayerMove = (position: unknown) => {
      const pos = position as PlayerPosition
      socket.emit("player:move", {
        id: pos.id,
        x: pos.x,
        y: pos.y,
        direction: pos.direction,
        isMoving: pos.isMoving,
      })
    }

    eventBridge.on(GameEvents.PLAYER_MOVED, handleLocalPlayerMove)

    // Cleanup
    return () => {
      eventBridge.off(GameEvents.PLAYER_MOVED, handleLocalPlayerMove)
      socket.emit("leave:space")
      socket.disconnect()
      socketRef.current = null
    }
  }, [spaceId, playerId, nickname, onChatMessage, onSystemMessage, onPlayerJoined, onPlayerLeft])

  // Send chat message
  const sendMessage = useCallback((content: string) => {
    if (socketRef.current && isConnected && content.trim()) {
      socketRef.current.emit("chat:message", { content })
    }
  }, [isConnected])

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("leave:space")
      socketRef.current.disconnect()
    }
  }, [])

  return {
    isConnected,
    players,
    sendMessage,
    disconnect,
  }
}
