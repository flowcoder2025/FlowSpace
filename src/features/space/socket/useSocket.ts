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
  ProfileUpdateData,
  ReplyToData,
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
  onWhisperMessage?: (message: ChatMessageData) => void  // 📬 귓속말 수신 (송신 + 수신 모두)
  onWhisperError?: (error: string) => void  // 📬 귓속말 에러 (대상 못찾음 등)
  onPartyMessage?: (message: ChatMessageData) => void  // 🎉 파티/구역 메시지 수신
  onPartyError?: (error: string) => void  // 🎉 파티 에러
  onPlayerJoined?: (player: PlayerPosition) => void
  onPlayerLeft?: (playerId: string) => void
}

// 🔒 Socket 에러 타입 (세션 검증 실패 등)
export type SocketError = {
  type: "session_invalid" | "connection_failed" | "unknown"
  message: string
}

// 🎉 파티 상태 타입 (단순히 현재 참가 중인 파티 정보만)
export interface PartyState {
  partyId: string | null
  partyName: string | null
}

interface UseSocketReturn {
  isConnected: boolean
  players: Map<string, PlayerPosition>
  socketError: SocketError | null // 🔒 세션 검증 실패 시 에러
  effectivePlayerId: string | null // 🔒 서버에서 파생된 실제 플레이어 ID
  partyState: PartyState // 🎉 현재 파티 상태
  sendMessage: (content: string, replyTo?: ReplyToData) => void  // 답장 지원
  sendWhisper: (targetNickname: string, content: string, replyTo?: ReplyToData) => void  // 📬 귓속말 전송 (답장 지원)
  joinParty: (partyId: string, partyName: string) => void  // 🎉 파티 입장
  leaveParty: () => void  // 🎉 파티 퇴장
  sendPartyMessage: (content: string) => void  // 🎉 파티 메시지 전송
  updateProfile: (data: ProfileUpdateData) => void // 🔄 프로필 핫 업데이트
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
  onWhisperMessage,
  onWhisperError,
  onPartyMessage,
  onPartyError,
  onPlayerJoined,
  onPlayerLeft,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [players, setPlayers] = useState<Map<string, PlayerPosition>>(new Map())
  // 🔒 세션 검증 실패 등 서버 에러 상태
  const [socketError, setSocketError] = useState<SocketError | null>(null)
  // 🔒 서버에서 파생된 실제 플레이어 ID (room:joined에서 수신)
  const [effectivePlayerId, setEffectivePlayerId] = useState<string | null>(null)
  // 🎉 파티 상태 (현재 참가 중인 파티)
  const [partyState, setPartyState] = useState<PartyState>({ partyId: null, partyName: null })

  // Use refs to persist state across useEffect re-runs (fixes timing race condition)
  const pendingPlayersRef = useRef<PlayerPosition[]>([])
  const gameReadyRef = useRef(false)

  // Store callbacks in refs to avoid useEffect re-runs on callback changes
  // This prevents socket reconnection when parent component re-renders
  const onChatMessageRef = useRef(onChatMessage)
  const onSystemMessageRef = useRef(onSystemMessage)
  const onWhisperMessageRef = useRef(onWhisperMessage)  // 📬 귓속말 콜백
  const onWhisperErrorRef = useRef(onWhisperError)      // 📬 귓속말 에러 콜백
  const onPartyMessageRef = useRef(onPartyMessage)      // 🎉 파티 메시지 콜백
  const onPartyErrorRef = useRef(onPartyError)          // 🎉 파티 에러 콜백
  const onPlayerJoinedRef = useRef(onPlayerJoined)
  const onPlayerLeftRef = useRef(onPlayerLeft)

  // 🔄 Store nickname and avatarColor in refs to enable hot update without reconnection
  const nicknameRef = useRef(nickname)
  const avatarColorRef = useRef(avatarColor)

  // Keep callback refs up to date
  useEffect(() => {
    onChatMessageRef.current = onChatMessage
    onSystemMessageRef.current = onSystemMessage
    onWhisperMessageRef.current = onWhisperMessage  // 📬 귓속말 콜백
    onWhisperErrorRef.current = onWhisperError      // 📬 귓속말 에러 콜백
    onPartyMessageRef.current = onPartyMessage      // 🎉 파티 메시지 콜백
    onPartyErrorRef.current = onPartyError          // 🎉 파티 에러 콜백
    onPlayerJoinedRef.current = onPlayerJoined
    onPlayerLeftRef.current = onPlayerLeft
    // 🔄 Update profile refs (used for movement events)
    nicknameRef.current = nickname
    avatarColorRef.current = avatarColor
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
      // 파티 상태 초기화
      setPartyState({ partyId: null, partyName: null })
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
      // 🔒 서버에서 파생된 실제 플레이어 ID 저장
      const serverPlayerId = data.yourPlayerId
      setEffectivePlayerId(serverPlayerId)
      console.log("[Socket] Joined room:", data.spaceId, "Players:", data.players.length, "YourPlayerId:", serverPlayerId, "GameReady:", gameReadyRef.current)

      // Initialize players map (🔒 서버 파생 ID로 자신 필터링)
      const playersMap = new Map<string, PlayerPosition>()
      data.players.forEach((player) => {
        if (player.id !== serverPlayerId) {
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

    // 📬 Whisper events (귓속말)
    socket.on("whisper:receive", (message: ChatMessageData) => {
      if (IS_DEV) {
        console.log("[Socket] Whisper received from:", message.senderNickname)
      }
      onWhisperMessageRef.current?.(message)
    })

    socket.on("whisper:sent", (message: ChatMessageData) => {
      if (IS_DEV) {
        console.log("[Socket] Whisper sent to:", message.targetNickname)
      }
      onWhisperMessageRef.current?.(message)
    })

    socket.on("whisper:error", (data: { message: string }) => {
      console.warn("[Socket] Whisper error:", data.message)
      onWhisperErrorRef.current?.(data.message)
    })

    // 🎉 Party events (파티/구역 채팅) - 단순히 메시지만 처리
    socket.on("party:joined", (data) => {
      if (IS_DEV) {
        console.log("[Socket] Joined party zone:", data.partyName)
      }
      setPartyState({ partyId: data.partyId, partyName: data.partyName })
    })

    socket.on("party:left", (data) => {
      if (IS_DEV) {
        console.log("[Socket] Left party zone:", data.partyId)
      }
      setPartyState({ partyId: null, partyName: null })
    })

    socket.on("party:message", (message: ChatMessageData) => {
      if (IS_DEV) {
        console.log("[Socket] Party message from:", message.senderNickname, "in", message.partyName)
      }
      onPartyMessageRef.current?.(message)
    })

    socket.on("party:error", (data: { message: string }) => {
      console.warn("[Socket] Party error:", data.message)
      onPartyErrorRef.current?.(data.message)
    })

    // 🔄 Profile update events (다른 플레이어의 닉네임/아바타 변경)
    socket.on("player:profileUpdated", (data) => {
      if (IS_DEV) {
        console.log("[Socket] Player profile updated:", data.id, data.nickname)
      }

      // Update players map with new profile
      setPlayers((prev) => {
        const next = new Map(prev)
        const player = next.get(data.id)
        if (player) {
          next.set(data.id, {
            ...player,
            nickname: data.nickname,
            avatarColor: data.avatarColor,
          })
        }
        return next
      })

      // Notify game if ready
      if (gameReadyRef.current) {
        eventBridge.emit(GameEvents.REMOTE_PROFILE_UPDATE, data)
      }
    })

    // 🔒 Error events (세션 검증 실패 등)
    socket.on("error", (data: { message: string }) => {
      console.error("[Socket] Server error:", data.message)

      // 에러 메시지에 따라 타입 분류
      const errorType: SocketError["type"] = data.message.includes("session") || data.message.includes("expired")
        ? "session_invalid"
        : data.message.includes("connection")
        ? "connection_failed"
        : "unknown"

      setSocketError({
        type: errorType,
        message: data.message,
      })
    })

    // 연결 에러 (connect_error 이벤트)
    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message)
      setSocketError({
        type: "connection_failed",
        message: "서버에 연결할 수 없습니다.",
      })
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
        avatarColor: avatarColorRef.current, // 🔄 ref 사용으로 재연결 없이 업데이트 반영
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
  // 🔄 nickname/avatarColor는 ref로 관리하여 재연결 없이 업데이트 가능
  // Only reconnect when essential connection params change (not on callback/profile changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, playerId, sessionToken])

  // Send chat message (답장 지원)
  const sendMessage = useCallback((content: string, replyTo?: ReplyToData) => {
    if (socketRef.current && isConnected && content.trim()) {
      socketRef.current.emit("chat:message", { content, ...(replyTo && { replyTo }) })
    }
  }, [isConnected])

  // 📬 Send whisper (귓속말, 답장 지원)
  const sendWhisper = useCallback((targetNickname: string, content: string, replyTo?: ReplyToData) => {
    if (socketRef.current && isConnected && content.trim() && targetNickname.trim()) {
      socketRef.current.emit("whisper:send", {
        targetNickname: targetNickname.trim(),
        content: content.trim(),
        ...(replyTo && { replyTo }),
      })
    }
  }, [isConnected])

  // 🎉 Join party (파티/구역 입장)
  const joinParty = useCallback((partyId: string, partyName: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("party:join", { partyId, partyName })
    }
  }, [isConnected])

  // 🎉 Leave party (파티/구역 퇴장)
  const leaveParty = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("party:leave")
    }
  }, [isConnected])

  // 🎉 Send party message (파티/구역 메시지 전송)
  const sendPartyMessage = useCallback((content: string) => {
    if (socketRef.current && isConnected && content.trim()) {
      socketRef.current.emit("party:message", { content })
    }
  }, [isConnected])

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("leave:space")
      socketRef.current.disconnect()
    }
  }, [])

  // 🔄 Update profile (nickname/avatar) without reconnection
  const updateProfile = useCallback((data: ProfileUpdateData) => {
    if (socketRef.current && isConnected) {
      // Update refs
      nicknameRef.current = data.nickname
      avatarColorRef.current = data.avatarColor

      // Send to server
      socketRef.current.emit("player:updateProfile", data)

      // Notify local game for immediate update
      eventBridge.emit(GameEvents.LOCAL_PROFILE_UPDATE, data)

      if (IS_DEV) {
        console.log("[Socket] Profile updated:", data.nickname, data.avatarColor)
      }
    }
  }, [isConnected])

  return {
    isConnected,
    players,
    socketError, // 🔒 세션 검증 실패 시 에러
    effectivePlayerId, // 🔒 서버에서 파생된 실제 플레이어 ID
    partyState, // 🎉 현재 파티 상태
    sendMessage,
    sendWhisper, // 📬 귓속말 전송
    joinParty, // 🎉 파티 입장
    leaveParty, // 🎉 파티 퇴장
    sendPartyMessage, // 🎉 파티 메시지 전송
    updateProfile, // 🔄 프로필 핫 업데이트
    disconnect,
  }
}
