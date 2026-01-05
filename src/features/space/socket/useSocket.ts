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
  AvatarConfig,
  ProfileUpdateData,
  ReplyToData,
  // Phase 6: 관리 이벤트 타입
  MemberMutedData,
  MemberUnmutedData,
  MemberKickedData,
  AnnouncementData,
  MessageDeletedData,
  // 녹화 이벤트 타입 (법적 준수)
  RecordingStatusData,
} from "./types"
import { eventBridge, GameEvents } from "../game/events"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
const IS_DEV = process.env.NODE_ENV === "development"

interface UseSocketOptions {
  spaceId: string
  playerId: string
  nickname: string
  avatarColor?: AvatarColor
  avatarConfig?: AvatarConfig  // Phase 1: 커스터마이징
  sessionToken?: string // 🔒 세션 토큰 (서버 검증용)
  onChatMessage?: (message: ChatMessageData) => void
  onSystemMessage?: (message: ChatMessageData) => void
  onChatError?: (error: string) => void  // 🔇 채팅 에러 (음소거 시 등)
  onMessageIdUpdate?: (tempId: string, realId: string) => void  // ⚡ Optimistic ID 업데이트
  onWhisperMessage?: (message: ChatMessageData) => void  // 📬 귓속말 수신 (송신 + 수신 모두)
  onWhisperError?: (error: string) => void  // 📬 귓속말 에러 (대상 못찾음 등)
  onPartyMessage?: (message: ChatMessageData) => void  // 🎉 파티/구역 메시지 수신
  onPartyError?: (error: string) => void  // 🎉 파티 에러
  onPlayerJoined?: (player: PlayerPosition) => void
  onPlayerLeft?: (playerId: string) => void
  // Phase 6: 관리 이벤트 콜백
  onMemberMuted?: (data: MemberMutedData) => void  // 🔇 멤버 음소거
  onMemberUnmuted?: (data: MemberUnmutedData) => void  // 🔊 음소거 해제
  onMemberKicked?: (data: MemberKickedData) => void  // 👢 멤버 강퇴
  onMessageDeleted?: (data: MessageDeletedData) => void  // 🗑️ 메시지 삭제
  onAnnouncement?: (data: AnnouncementData) => void  // 📢 공지사항
  onAdminError?: (action: string, message: string) => void  // ⚠️ 관리 에러
  // 🔴 녹화 이벤트 콜백 (법적 준수)
  onRecordingStarted?: (data: RecordingStatusData) => void  // 녹화 시작됨
  onRecordingStopped?: (data: RecordingStatusData) => void  // 녹화 중지됨
  onRecordingError?: (message: string) => void  // 녹화 에러
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
  recordingStatus: RecordingStatusData | null // 🔴 현재 녹화 상태 (법적 준수)
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null // 📦 Socket 인스턴스 (에디터 동기화용)
  sendMessage: (content: string, replyTo?: ReplyToData) => void  // 답장 지원
  sendWhisper: (targetNickname: string, content: string, replyTo?: ReplyToData) => void  // 📬 귓속말 전송 (답장 지원)
  joinParty: (partyId: string, partyName: string) => void  // 🎉 파티 입장
  leaveParty: () => void  // 🎉 파티 퇴장
  sendPartyMessage: (content: string) => void  // 🎉 파티 메시지 전송
  updateProfile: (data: ProfileUpdateData) => void // 🔄 프로필 핫 업데이트
  disconnect: () => void
  // Phase 6: 관리 명령어 (닉네임 기반)
  sendMuteCommand: (targetNickname: string, duration?: number, reason?: string) => void  // 🔇 음소거
  sendUnmuteCommand: (targetNickname: string) => void  // 🔊 음소거 해제
  sendKickCommand: (targetNickname: string, reason?: string, ban?: boolean) => void  // 👢 강퇴/차단
  sendAnnounce: (content: string) => void  // 📢 공지사항
  deleteMessage: (messageId: string) => void  // 🗑️ 메시지 삭제
  // 🔴 녹화 명령어 (법적 준수)
  startRecording: () => void  // 녹화 시작
  stopRecording: () => void   // 녹화 중지
}

export function useSocket({
  spaceId,
  playerId,
  nickname,
  avatarColor = "default",
  avatarConfig,  // Phase 1: 커스터마이징
  sessionToken,
  onChatMessage,
  onSystemMessage,
  onChatError,
  onMessageIdUpdate,
  onWhisperMessage,
  onWhisperError,
  onPartyMessage,
  onPartyError,
  onPlayerJoined,
  onPlayerLeft,
  // Phase 6: 관리 이벤트 콜백
  onMemberMuted,
  onMemberUnmuted,
  onMemberKicked,
  onMessageDeleted,
  onAnnouncement,
  onAdminError,
  // 🔴 녹화 이벤트 콜백 (법적 준수)
  onRecordingStarted,
  onRecordingStopped,
  onRecordingError,
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
  // 🔴 녹화 상태 (법적 준수 - REC 표시용)
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatusData | null>(null)

  // Use refs to persist state across useEffect re-runs (fixes timing race condition)
  const pendingPlayersRef = useRef<PlayerPosition[]>([])
  const gameReadyRef = useRef(false)

  // Store callbacks in refs to avoid useEffect re-runs on callback changes
  // This prevents socket reconnection when parent component re-renders
  const onChatMessageRef = useRef(onChatMessage)
  const onSystemMessageRef = useRef(onSystemMessage)
  const onChatErrorRef = useRef(onChatError)            // 🔇 채팅 에러 콜백
  const onMessageIdUpdateRef = useRef(onMessageIdUpdate)  // ⚡ Optimistic ID 업데이트 콜백
  const onWhisperMessageRef = useRef(onWhisperMessage)  // 📬 귓속말 콜백
  const onWhisperErrorRef = useRef(onWhisperError)      // 📬 귓속말 에러 콜백
  const onPartyMessageRef = useRef(onPartyMessage)      // 🎉 파티 메시지 콜백
  const onPartyErrorRef = useRef(onPartyError)          // 🎉 파티 에러 콜백
  const onPlayerJoinedRef = useRef(onPlayerJoined)
  const onPlayerLeftRef = useRef(onPlayerLeft)
  // Phase 6: 관리 이벤트 콜백 refs
  const onMemberMutedRef = useRef(onMemberMuted)
  const onMemberUnmutedRef = useRef(onMemberUnmuted)
  const onMemberKickedRef = useRef(onMemberKicked)
  const onMessageDeletedRef = useRef(onMessageDeleted)
  const onAnnouncementRef = useRef(onAnnouncement)
  const onAdminErrorRef = useRef(onAdminError)
  // 🔴 녹화 이벤트 콜백 refs (법적 준수)
  const onRecordingStartedRef = useRef(onRecordingStarted)
  const onRecordingStoppedRef = useRef(onRecordingStopped)
  const onRecordingErrorRef = useRef(onRecordingError)

  // 🔄 Store nickname and avatarColor/avatarConfig in refs to enable hot update without reconnection
  const nicknameRef = useRef(nickname)
  const avatarColorRef = useRef(avatarColor)
  const avatarConfigRef = useRef(avatarConfig)  // Phase 1: 커스터마이징

  // Keep callback refs up to date
  useEffect(() => {
    onChatMessageRef.current = onChatMessage
    onSystemMessageRef.current = onSystemMessage
    onChatErrorRef.current = onChatError            // 🔇 채팅 에러 콜백
    onMessageIdUpdateRef.current = onMessageIdUpdate  // ⚡ Optimistic ID 업데이트 콜백
    onWhisperMessageRef.current = onWhisperMessage  // 📬 귓속말 콜백
    onWhisperErrorRef.current = onWhisperError      // 📬 귓속말 에러 콜백
    onPartyMessageRef.current = onPartyMessage      // 🎉 파티 메시지 콜백
    onPartyErrorRef.current = onPartyError          // 🎉 파티 에러 콜백
    onPlayerJoinedRef.current = onPlayerJoined
    onPlayerLeftRef.current = onPlayerLeft
    // Phase 6: 관리 이벤트 콜백 refs 업데이트
    onMemberMutedRef.current = onMemberMuted
    onMemberUnmutedRef.current = onMemberUnmuted
    onMemberKickedRef.current = onMemberKicked
    onMessageDeletedRef.current = onMessageDeleted
    onAnnouncementRef.current = onAnnouncement
    onAdminErrorRef.current = onAdminError
    // 🔴 녹화 이벤트 콜백 refs 업데이트
    onRecordingStartedRef.current = onRecordingStarted
    onRecordingStoppedRef.current = onRecordingStopped
    onRecordingErrorRef.current = onRecordingError
    // 🔄 Update profile refs (used for movement events)
    nicknameRef.current = nickname
    avatarColorRef.current = avatarColor
    avatarConfigRef.current = avatarConfig  // Phase 1: 커스터마이징
  })

  // Initialize socket connection
  useEffect(() => {
    // Reset refs on new connection (important for React Strict Mode)
    pendingPlayersRef.current = []
    gameReadyRef.current = false

    // Create socket connection
    // 🔧 연결 안정성 최적화: 무한 재연결 + 지수 백오프 + 빠른 재연결
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,     // 무한 재연결 시도 (기존 5회 → 무한)
      reconnectionDelay: 500,             // 첫 재연결 0.5초 후 (기존 1초 → 0.5초, 빠른 복구)
      reconnectionDelayMax: 5000,         // 최대 5초까지 지수 백오프 (기존 10초 → 5초)
      randomizationFactor: 0.5,           // 재연결 시간 랜덤화 (서버 부하 분산)
      timeout: 20000,                     // 연결 타임아웃 20초
      // 🔧 추가 안정성 옵션
      upgrade: true,                      // polling → websocket 업그레이드 허용
      rememberUpgrade: true,              // 성공한 업그레이드 기억 (재연결 시 바로 WebSocket 시도)
      autoConnect: true,                  // 생성 시 자동 연결
    })

    socketRef.current = socket

    // Connection events
    socket.on("connect", () => {
      console.log("[Socket] Connected to server")
      setIsConnected(true)

      // Join the space with avatarColor/avatarConfig and sessionToken (🔒 서버 검증용)
      socket.emit("join:space", { spaceId, playerId, nickname, avatarColor, avatarConfig, sessionToken })
    })

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected from server, reason:", reason)
      setIsConnected(false)
      // 파티 상태 초기화
      setPartyState({ partyId: null, partyName: null })

      // 🔧 연결 끊김 사유 분석
      if (reason === "io server disconnect") {
        // 서버가 강제로 연결을 끊음 (세션 만료, 강퇴 등)
        console.warn("[Socket] Server forced disconnect - may need to rejoin")
      } else if (reason === "ping timeout") {
        // ping 응답 타임아웃 - 네트워크 문제
        console.warn("[Socket] Ping timeout - checking network stability")
      } else if (reason === "transport close") {
        // 전송 계층 닫힘 - 네트워크 전환 또는 일시적 끊김
        console.warn("[Socket] Transport closed - attempting reconnect")
      }
    })

    // 🔧 재연결 상태 모니터링
    socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`[Socket] Reconnect attempt #${attempt}`)
    })

    socket.io.on("reconnect", (attempt) => {
      console.log(`[Socket] Reconnected after ${attempt} attempts`)
      // 재연결 성공 시 공간에 다시 입장
      socket.emit("join:space", { spaceId, playerId, nickname, avatarColor, avatarConfig, sessionToken })
    })

    socket.io.on("reconnect_error", (error) => {
      console.warn("[Socket] Reconnect error:", error.message)
    })

    socket.io.on("reconnect_failed", () => {
      console.error("[Socket] Reconnect failed after all attempts")
      setSocketError({
        type: "connection_failed",
        message: "서버 연결이 끊어졌습니다. 페이지를 새로고침해주세요.",
      })
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

      // 🔄 SSOT: 모든 플레이어를 Map에 추가 (로컬 사용자 포함)
      // 로컬 사용자도 Map에 포함시켜 닉네임 변경 시 일관된 SSOT 유지
      const playersMap = new Map<string, PlayerPosition>()
      data.players.forEach((player) => {
        // 🔄 모든 플레이어를 Map에 추가 (SSOT)
        playersMap.set(player.id, player)

        // 게임 이벤트는 다른 플레이어에게만 전달 (로컬 플레이어는 게임이 자체 관리)
        if (player.id !== serverPlayerId) {
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

    // Movement events (Phase 2.3: 경량화된 payload - avatar 정보 없음)
    socket.on("player:moved", (position: PlayerPosition) => {
      setPlayers((prev) => {
        const next = new Map(prev)
        const existing = prev.get(position.id)
        // 🔄 Phase 2.3: 서버가 경량 payload를 보내므로 기존 avatar 정보 보존
        const mergedPosition: PlayerPosition = {
          ...position,
          avatarColor: position.avatarColor ?? existing?.avatarColor,
          avatarConfig: position.avatarConfig ?? existing?.avatarConfig,
        }
        next.set(position.id, mergedPosition)
        return next
      })

      // Only notify game if it's ready - prevents errors when move events arrive
      // before the scene is fully initialized or before the player has been added
      if (gameReadyRef.current) {
        // 🔄 Game에도 기존 avatar 정보 포함하여 전달
        setPlayers((current) => {
          const player = current.get(position.id)
          if (player) {
            eventBridge.emit(GameEvents.REMOTE_PLAYER_UPDATE, player)
          }
          return current
        })
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

    // 🔇 Chat error (음소거 등)
    socket.on("chat:error", (data: { message: string }) => {
      console.warn("[Socket] Chat error:", data.message)
      onChatErrorRef.current?.(data.message)
    })

    // ⚡ Chat message ID update (Optimistic 브로드캐스팅용)
    socket.on("chat:messageIdUpdate", (data: { tempId: string; realId: string }) => {
      if (IS_DEV) {
        console.log("[Socket] Message ID updated:", data.tempId, "→", data.realId)
      }
      onMessageIdUpdateRef.current?.(data.tempId, data.realId)
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

    // 📝 Whisper ID update (귓속말 DB 저장 후 ID 업데이트)
    socket.on("whisper:messageIdUpdate", (data: { tempId: string; realId: string }) => {
      if (IS_DEV) {
        console.log("[Socket] Whisper ID updated:", data.tempId, "→", data.realId)
      }
      // 기존 onMessageIdUpdate 콜백 재사용 (동일한 ID 교체 로직)
      onMessageIdUpdateRef.current?.(data.tempId, data.realId)
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

    // ============================================
    // Phase 6: 관리 이벤트 리스너
    // ============================================
    socket.on("member:muted", (data: MemberMutedData) => {
      if (IS_DEV) {
        console.log("[Socket] Member muted:", data.nickname, "by", data.mutedByNickname)
      }
      onMemberMutedRef.current?.(data)
    })

    socket.on("member:unmuted", (data: MemberUnmutedData) => {
      if (IS_DEV) {
        console.log("[Socket] Member unmuted:", data.nickname, "by", data.unmutedByNickname)
      }
      onMemberUnmutedRef.current?.(data)
    })

    socket.on("member:kicked", (data: MemberKickedData) => {
      if (IS_DEV) {
        console.log("[Socket] Member kicked:", data.nickname, "by", data.kickedByNickname, data.banned ? "(banned)" : "")
      }
      onMemberKickedRef.current?.(data)
    })

    socket.on("chat:messageDeleted", (data: MessageDeletedData) => {
      if (IS_DEV) {
        console.log("[Socket] Message deleted:", data.messageId, "by", data.deletedByNickname)
      }
      onMessageDeletedRef.current?.(data)
    })

    socket.on("space:announcement", (data: AnnouncementData) => {
      if (IS_DEV) {
        console.log("[Socket] Announcement from", data.senderNickname, ":", data.content)
      }
      onAnnouncementRef.current?.(data)
    })

    socket.on("admin:error", (data: { action: string; message: string }) => {
      console.warn("[Socket] Admin error:", data.action, data.message)
      onAdminErrorRef.current?.(data.action, data.message)
    })

    // ============================================
    // 🔴 녹화 이벤트 리스너 (법적 준수)
    // ============================================
    socket.on("recording:started", (data: RecordingStatusData) => {
      console.log("[Socket] 🔴 Recording started by:", data.recorderNickname)
      setRecordingStatus(data)
      onRecordingStartedRef.current?.(data)
    })

    socket.on("recording:stopped", (data: RecordingStatusData) => {
      console.log("[Socket] ⬛ Recording stopped by:", data.recorderNickname)
      setRecordingStatus(null)
      onRecordingStoppedRef.current?.(data)
    })

    socket.on("recording:status", (data: RecordingStatusData) => {
      if (IS_DEV) {
        console.log("[Socket] Recording status:", data.isRecording ? "recording" : "not recording")
      }
      setRecordingStatus(data.isRecording ? data : null)
    })

    socket.on("recording:error", (data: { message: string }) => {
      console.warn("[Socket] Recording error:", data.message)
      onRecordingErrorRef.current?.(data.message)
    })

    // 🔄 Profile update events (다른 플레이어의 닉네임/아바타 변경)
    socket.on("player:profileUpdated", (data) => {
      if (IS_DEV) {
        console.log("[Socket] Player profile updated:", data.id, data.nickname, data.avatarConfig ? "(with avatarConfig)" : "")
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
            avatarConfig: data.avatarConfig,  // Phase 1: 커스터마이징
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
    // ⚡ Phase 2.3: 이동 패킷 경량화 - avatarColor/avatarConfig 제외
    const handleLocalPlayerMove = (position: unknown) => {
      const pos = position as PlayerPosition
      socket.emit("player:move", {
        id: pos.id,
        x: pos.x,
        y: pos.y,
        direction: pos.direction,
        isMoving: pos.isMoving,
        // avatarColor, avatarConfig 제외 - 이동 패킷 경량화 (CHARACTER.md Phase 2)
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
    if (socketRef.current && isConnected && effectivePlayerId) {
      // Update refs
      nicknameRef.current = data.nickname
      if (data.avatarColor) {
        avatarColorRef.current = data.avatarColor
      }
      if (data.avatarConfig) {
        avatarConfigRef.current = data.avatarConfig  // Phase 1: 커스터마이징
      }

      // 🔄 SSOT: players Map에서 로컬 사용자 정보도 즉시 업데이트
      setPlayers((prev) => {
        const next = new Map(prev)
        const localPlayer = next.get(effectivePlayerId)
        if (localPlayer) {
          next.set(effectivePlayerId, {
            ...localPlayer,
            nickname: data.nickname,
            avatarColor: data.avatarColor,
            avatarConfig: data.avatarConfig,  // Phase 1: 커스터마이징
          })
          if (IS_DEV) {
            console.log("[Socket] SSOT: Local player updated in players Map:", effectivePlayerId, data.nickname, data.avatarConfig ? "(with avatarConfig)" : "")
          }
        }
        return next
      })

      // Send to server
      socketRef.current.emit("player:updateProfile", data)

      // Notify local game for immediate update
      eventBridge.emit(GameEvents.LOCAL_PROFILE_UPDATE, data)

      if (IS_DEV) {
        console.log("[Socket] Profile updated:", data.nickname, data.avatarColor, data.avatarConfig ? "(with avatarConfig)" : "")
      }
    }
  }, [isConnected, effectivePlayerId])

  // ============================================
  // Phase 6: 관리 명령어 (닉네임 기반)
  // ============================================

  // 🔇 음소거 명령어 (닉네임으로 대상 찾기 → 서버에서 멤버 ID 조회)
  const sendMuteCommand = useCallback((targetNickname: string, duration?: number, reason?: string) => {
    if (socketRef.current && isConnected && targetNickname.trim()) {
      // 서버에서 닉네임으로 멤버를 찾아 음소거 처리
      // 기존 admin:mute는 targetMemberId를 받지만, 우리는 닉네임 기반으로 확장
      // 서버에서 닉네임 → memberId 변환 필요
      socketRef.current.emit("admin:mute", {
        targetMemberId: `nickname:${targetNickname.trim()}`, // 서버에서 닉네임 해석
        duration,
        reason,
      })
      if (IS_DEV) {
        console.log("[Socket] Sending mute command for:", targetNickname, duration, reason)
      }
    }
  }, [isConnected])

  // 🔊 음소거 해제 명령어
  const sendUnmuteCommand = useCallback((targetNickname: string) => {
    if (socketRef.current && isConnected && targetNickname.trim()) {
      socketRef.current.emit("admin:unmute", {
        targetMemberId: `nickname:${targetNickname.trim()}`,
      })
      if (IS_DEV) {
        console.log("[Socket] Sending unmute command for:", targetNickname)
      }
    }
  }, [isConnected])

  // 👢 강퇴/차단 명령어
  const sendKickCommand = useCallback((targetNickname: string, reason?: string, ban?: boolean) => {
    if (socketRef.current && isConnected && targetNickname.trim()) {
      socketRef.current.emit("admin:kick", {
        targetMemberId: `nickname:${targetNickname.trim()}`,
        reason,
        ban,
      })
      if (IS_DEV) {
        console.log("[Socket] Sending kick command for:", targetNickname, reason, ban ? "(ban)" : "")
      }
    }
  }, [isConnected])

  // 📢 공지사항 전송
  const sendAnnounce = useCallback((content: string) => {
    if (socketRef.current && isConnected && content.trim()) {
      socketRef.current.emit("admin:announce", { content: content.trim() })
      if (IS_DEV) {
        console.log("[Socket] Sending announcement:", content)
      }
    }
  }, [isConnected])

  // 🗑️ 메시지 삭제
  const deleteMessage = useCallback((messageId: string) => {
    if (socketRef.current && isConnected && messageId) {
      socketRef.current.emit("admin:deleteMessage", { messageId })
      if (IS_DEV) {
        console.log("[Socket] Deleting message:", messageId)
      }
    }
  }, [isConnected])

  // ============================================
  // 🔴 녹화 명령어 (법적 준수)
  // ============================================

  // 녹화 시작
  const startRecording = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("recording:start", {})
      if (IS_DEV) {
        console.log("[Socket] Requesting recording start")
      }
    }
  }, [isConnected])

  // 녹화 중지
  const stopRecording = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("recording:stop", {})
      if (IS_DEV) {
        console.log("[Socket] Requesting recording stop")
      }
    }
  }, [isConnected])

  return {
    isConnected,
    players,
    socketError, // 🔒 세션 검증 실패 시 에러
    effectivePlayerId, // 🔒 서버에서 파생된 실제 플레이어 ID
    partyState, // 🎉 현재 파티 상태
    socket: socketRef.current, // 📦 Socket 인스턴스 (에디터 동기화용)
    sendMessage,
    sendWhisper, // 📬 귓속말 전송
    joinParty, // 🎉 파티 입장
    leaveParty, // 🎉 파티 퇴장
    sendPartyMessage, // 🎉 파티 메시지 전송
    updateProfile, // 🔄 프로필 핫 업데이트
    disconnect,
    // Phase 6: 관리 명령어
    sendMuteCommand, // 🔇 음소거
    sendUnmuteCommand, // 🔊 음소거 해제
    sendKickCommand, // 👢 강퇴/차단
    sendAnnounce, // 📢 공지사항
    deleteMessage, // 🗑️ 메시지 삭제
    // 🔴 녹화 명령어 (법적 준수)
    recordingStatus, // 현재 녹화 상태
    startRecording, // 녹화 시작
    stopRecording, // 녹화 중지
  }
}
