"use client"

/**
 * LiveKitRoomProvider
 *
 * @livekit/components-react의 LiveKitRoom을 래핑하여
 * 토큰 페칭, 연결 상태 관리, 에러 처리를 통합 제공
 *
 * 핵심 개선:
 * - 🔑 토큰 유무와 관계없이 동일한 컴포넌트 트리 유지 (언마운트/리마운트 방지)
 * - connect prop으로 연결 여부만 제어하여 소켓/트랙 상태 안정성 확보
 * - React Hooks 규칙 준수 (조건부 훅 호출 방지)
 */

import { useState, useEffect, useCallback, useMemo, ReactNode } from "react"
import { LiveKitRoom } from "@livekit/components-react"
import { RoomOptions } from "livekit-client"
import { LiveKitMediaInternalProvider } from "./LiveKitMediaContext"

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"
const IS_DEV = process.env.NODE_ENV === "development"

// 토큰 응답 타입
interface TokenResponse {
  token: string
  participantId: string
  participantName: string
}

// Provider Props
interface LiveKitRoomProviderProps {
  spaceId: string
  participantId: string
  participantName: string
  sessionToken?: string
  children: ReactNode
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
  onParticipantIdResolved?: (resolvedId: string) => void
}

// Provider State
interface LiveKitProviderState {
  isConnecting: boolean
  isConnected: boolean
  connectionError: string | null
  effectiveParticipantId: string | null
}

export function LiveKitRoomProvider({
  spaceId,
  participantId,
  participantName,
  sessionToken,
  children,
  onConnected,
  onDisconnected,
  onError,
  onParticipantIdResolved,
}: LiveKitRoomProviderProps) {
  const [token, setToken] = useState<string | null>(null)
  const [state, setState] = useState<LiveKitProviderState>({
    isConnecting: true,
    isConnected: false,
    connectionError: null,
    effectiveParticipantId: null,
  })

  // Fetch token from API
  const fetchToken = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, connectionError: null }))

      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: `space-${spaceId}`,
          participantName,
          participantId,
          sessionToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to get LiveKit token")
      }

      const data: TokenResponse = await response.json()
      setToken(data.token)
      setState(prev => ({
        ...prev,
        effectiveParticipantId: data.participantId,
        isConnecting: false,
      }))

      // Notify parent about resolved participant ID
      if (onParticipantIdResolved && data.participantId !== participantId) {
        onParticipantIdResolved(data.participantId)
      }

      if (IS_DEV) {
        console.log("[LiveKitProvider] Token fetched, participantId:", data.participantId)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Connection failed"
      setState(prev => ({
        ...prev,
        isConnecting: false,
        connectionError: errorMessage,
      }))

      if (IS_DEV) {
        console.warn("[LiveKitProvider] Token fetch failed:", errorMessage)
      }

      if (onError && error instanceof Error) {
        onError(error)
      }
    }
  }, [spaceId, participantId, participantName, sessionToken, onParticipantIdResolved, onError])

  // Check if LiveKit server is available (dev mode only)
  const checkServerAvailability = useCallback(async (): Promise<boolean> => {
    if (!IS_DEV || LIVEKIT_URL !== "ws://localhost:7880") {
      return true
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)
      await fetch("http://localhost:7880", {
        signal: controller.signal,
        mode: "no-cors"
      })
      clearTimeout(timeoutId)
      return true
    } catch {
      console.info("[LiveKitProvider] 개발 모드: 서버 미실행 상태, 비디오/오디오 기능 비활성화")
      setState(prev => ({
        ...prev,
        isConnecting: false,
        connectionError: "LiveKit server not running",
      }))
      return false
    }
  }, [])

  // Initialize connection
  useEffect(() => {
    let mounted = true

    const init = async () => {
      const isAvailable = await checkServerAvailability()
      if (mounted && isAvailable) {
        await fetchToken()
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [checkServerAvailability, fetchToken])

  // Room options
  const roomOptions = useMemo((): RoomOptions => ({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: { width: 640, height: 480, frameRate: 24 },
    },
  }), [])

  // Connection handlers
  const handleConnected = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: true }))
    if (IS_DEV) {
      console.log("[LiveKitProvider] Connected to room")
    }
    onConnected?.()
  }, [onConnected])

  const handleDisconnected = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: false }))
    if (IS_DEV) {
      console.log("[LiveKitProvider] Disconnected from room")
    }
    onDisconnected?.()
  }, [onDisconnected])

  const handleError = useCallback((error: Error) => {
    console.error("[LiveKitProvider] Room error:", error)
    setState(prev => ({ ...prev, connectionError: error.message }))
    onError?.(error)
  }, [onError])

  // 🔑 핵심: 토큰 유무와 관계없이 동일한 컴포넌트 트리 유지
  // connect prop으로 연결 여부만 제어하여 언마운트/리마운트 방지
  // → 소켓/트랙 상태가 끊기지 않고 안정적으로 유지됨
  if (IS_DEV && !token && state.connectionError) {
    console.log("[LiveKitProvider] Waiting for token:", state.connectionError)
  }

  return (
    <LiveKitRoom
      token={token || ""}
      serverUrl={LIVEKIT_URL}
      connect={!!token}
      options={roomOptions}
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      onError={handleError}
    >
      <LiveKitMediaInternalProvider>
        {children}
      </LiveKitMediaInternalProvider>
    </LiveKitRoom>
  )
}
