"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, Socket } from "socket.io-client"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerPosition,
  ChatMessageData,
  RoomData,
  PlayerJumpData,
  AvatarColor,
} from "./types"
import { eventBridge, GameEvents } from "../game/events"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
const IS_DEV = process.env.NODE_ENV === "development"

interface UseSocketOptions {
  spaceId: string
  playerId: string
  nickname: string
  avatarColor?: AvatarColor
  sessionToken?: string // 🔒 세션 토큰 (서버 검증용)
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
  avatarColor = "default",
  sessionToken,
  onChatMessage,
  onSystemMessage,
  onPlayerJoined,
  onPlayerLeft,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [players, setPlayers] = useState<Map<string, PlayerPosition>>(new Map())

  // Use refs to persist state across useEffect re-runs (fixes timing race condition)
  const pendingPlayersRef = useRef<PlayerPosition[]>([])
  const gameReadyRef = useRef(false)

  // Store callbacks in refs to avoid useEffect re-runs on callback changes
  // This prevents socket reconnection when parent component re-renders
  const onChatMessageRef = useRef(onChatMessage)
  const onSystemMessageRef = useRef(onSystemMessage)
  const onPlayerJoinedRef = useRef(onPlayerJoined)
  const onPlayerLeftRef = useRef(onPlayerLeft)

  // Keep callback refs up to date
  useEffect(() => {
    onChatMessageRef.current = onChatMessage
    onSystemMessageRef.current = onSystemMessage
    onPlayerJoinedRef.current = onPlayerJoined
    onPlayerLeftRef.current = onPlayerLeft
  })

  // Initialize socket connection
  useEffect(() => {
    // Reset refs on new connection (important for React Strict Mode)
    pendingPlayersRef.current = []
    gameReadyRef.current = false

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

      // Join the space with avatarColor and sessionToken (🔒 서버 검증용)
      socket.emit("join:space", { spaceId, playerId, nickname, avatarColor, sessionToken })
    })

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected from server")
      setIsConnected(false)
    })

    // Handle GAME_READY event - sync all pending players
    const handleGameReady = () => {
      gameReadyRef.current = true
      const pendingCount = pendingPlayersRef.current.length
      if (IS_DEV) {
        console.log("[Socket] Game ready, syncing", pendingCount, "pending players")
      }
      // Emit all pending players to game
      pendingPlayersRef.current.forEach((player) => {
        if (player.id !== playerId) {
          if (IS_DEV) {
            console.log("[Socket] Emitting REMOTE_PLAYER_JOIN for:", player.id, player.nickname)
          }
          eventBridge.emit(GameEvents.REMOTE_PLAYER_JOIN, player)
        }
      })
      pendingPlayersRef.current = [] // Clear after sync
    }
    eventBridge.on(GameEvents.GAME_READY, handleGameReady)

    // Room events - handles existing players when joining
    socket.on("room:joined", (data: RoomData) => {
      console.log("[Socket] Joined room:", data.spaceId, "Players:", data.players.length, "GameReady:", gameReadyRef.current)

      // Initialize players map
      const playersMap = new Map<string, PlayerPosition>()
      data.players.forEach((player) => {
        if (player.id !== playerId) {
          playersMap.set(player.id, player)

          // If game is ready, emit immediately; otherwise queue for later
          if (gameReadyRef.current) {
            if (IS_DEV) {
              console.log("[Socket] Game ready, emitting REMOTE_PLAYER_JOIN immediately:", player.id, player.nickname)
            }
            eventBridge.emit(GameEvents.REMOTE_PLAYER_JOIN, player)
          } else {
            pendingPlayersRef.current.push(player)
            if (IS_DEV) {
              console.log("[Socket] Queued player for later sync:", player.id, player.nickname, "Queue size:", pendingPlayersRef.current.length)
            }
          }
        }
      })
      setPlayers(playersMap)
    })

    socket.on("player:joined", (player: PlayerPosition) => {
      console.log("[Socket] Player joined:", player.nickname, "GameReady:", gameReadyRef.current)

      setPlayers((prev) => {
        const next = new Map(prev)
        next.set(player.id, player)
        return next
      })

      // If game is ready, emit immediately; otherwise queue for later
      if (gameReadyRef.current) {
        if (IS_DEV) {
          console.log("[Socket] Game ready, emitting REMOTE_PLAYER_JOIN for new player:", player.id, player.nickname)
        }
        eventBridge.emit(GameEvents.REMOTE_PLAYER_JOIN, player)
      } else {
        pendingPlayersRef.current.push(player)
        if (IS_DEV) {
          console.log("[Socket] Queued new player for later sync:", player.id, player.nickname, "Queue size:", pendingPlayersRef.current.length)
        }
      }
      onPlayerJoinedRef.current?.(player)
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
      onPlayerLeftRef.current?.(id)
    })

    // Movement events
    socket.on("player:moved", (position: PlayerPosition) => {
      setPlayers((prev) => {
        const next = new Map(prev)
        next.set(position.id, position)
        return next
      })

      // Only notify game if it's ready - prevents errors when move events arrive
      // before the scene is fully initialized or before the player has been added
      if (gameReadyRef.current) {
        eventBridge.emit(GameEvents.REMOTE_PLAYER_UPDATE, position)
      }
      // If game isn't ready, position is still stored in players map
      // and will be used when the player is eventually added via REMOTE_PLAYER_JOIN
    })

    // Jump events from server
    socket.on("player:jumped", (data: PlayerJumpData) => {
      // Only notify game if it's ready - prevents errors when jump events arrive
      // before the scene is fully initialized
      if (gameReadyRef.current) {
        if (IS_DEV) {
          console.log("[Socket] Remote player jumped:", data.id)
        }
        eventBridge.emit(GameEvents.REMOTE_PLAYER_JUMPED, data)
      }
    })

    // Chat events
    socket.on("chat:message", (message: ChatMessageData) => {
      onChatMessageRef.current?.(message)
    })

    socket.on("chat:system", (message: ChatMessageData) => {
      onSystemMessageRef.current?.(message)
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
        avatarColor,
      })
    }

    // Listen for local player jump from game
    const handleLocalPlayerJump = (data: unknown) => {
      const jumpData = data as PlayerJumpData
      socket.emit("player:jump", jumpData)
      console.log("[Socket] Sending jump event:", jumpData.id)
    }

    eventBridge.on(GameEvents.PLAYER_MOVED, handleLocalPlayerMove)
    eventBridge.on(GameEvents.PLAYER_JUMPED, handleLocalPlayerJump)

    // Cleanup
    return () => {
      eventBridge.off(GameEvents.GAME_READY, handleGameReady)
      eventBridge.off(GameEvents.PLAYER_MOVED, handleLocalPlayerMove)
      eventBridge.off(GameEvents.PLAYER_JUMPED, handleLocalPlayerJump)
      socket.emit("leave:space")
      socket.disconnect()
      socketRef.current = null
    }
  // Only reconnect when essential connection params change (not on callback changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, playerId, nickname, avatarColor, sessionToken])

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
