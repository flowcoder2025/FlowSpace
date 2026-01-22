/**
 * Socket Server Configuration
 * Environment variables, constants, and error codes
 */

// Server port
export const PORT = parseInt(process.env.PORT || process.env.SOCKET_PORT || "3001", 10)

// API URL for server-to-server communication
export const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Development mode flag (strict: only NODE_ENV === "development")
export const IS_DEV = process.env.NODE_ENV === "development"

// Discord webhook URL for error alerts
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ""

// CORS origins configuration
export const CORS_ORIGINS = (() => {
  const origins: string[] = ["http://localhost:3000", "http://127.0.0.1:3000"]

  // Production URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL)
  }

  // Additional allowed domains (Railway/Vercel etc.)
  if (process.env.CORS_ORIGINS) {
    const additionalOrigins = process.env.CORS_ORIGINS.split(",").map(o => o.trim())
    origins.push(...additionalOrigins)
  }

  return origins
})()

/**
 * Error Code System:
 * E1xxx: Authentication/Session
 * E2xxx: Connection/Socket
 * E3xxx: Database
 * E4xxx: External API
 * E5xxx: Business Logic
 * E6xxx: System/Infrastructure
 *
 * I prefix: Info level logs
 */
export const ErrorCodes = {
  // E1xxx: Authentication/Session
  E1001: "세션 토큰 없음",
  E1002: "세션 검증 실패",
  E1003: "인증 필요",
  E1004: "권한 없음",

  // E2xxx: Connection/Socket
  E2001: "클라이언트 연결됨",
  E2002: "클라이언트 연결 해제",
  E2003: "중복 세션 감지",
  E2004: "소켓 룸 입장 실패",
  E2005: "소켓 통신 오류",

  // E3xxx: Database
  E3001: "채팅 저장 실패",
  E3002: "멤버 제한 로드 실패",
  E3003: "멤버 제한 저장 실패",
  E3004: "오브젝트 저장 실패",
  E3005: "DB 연결 오류",

  // E4xxx: External API
  E4001: "이벤트 로깅 API 실패",
  E4002: "세션 검증 API 실패",
  E4003: "외부 API 타임아웃",

  // E5xxx: Business Logic
  E5001: "닉네임 스푸핑 감지",
  E5002: "뮤트된 사용자 메시지 차단",
  E5003: "권한 검증 실패",
  E5004: "녹화 상태 오류",
  E5005: "오브젝트 동기화 실패",

  // E6xxx: System
  E6001: "서버 시작",
  E6002: "서버 종료",
  E6003: "서버 오류",
  E6004: "메모리 경고",
} as const

export type ErrorCode = keyof typeof ErrorCodes
export type LogLevel = "info" | "warn" | "error"

export interface LogContext {
  sessionId?: string
  spaceId?: string
  playerId?: string
  socketId?: string
  nickname?: string
  [key: string]: unknown
}
