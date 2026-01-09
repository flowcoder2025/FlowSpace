/**
 * Standalone Socket.io Server
 * Runs alongside Next.js development server
 *
 * Usage: npx ts-node --esm server/socket-server.ts
 *    or: npm run socket:dev
 */

import { createServer } from "http"
import { createHash } from "crypto"
import { execSync } from "child_process"
import { Server } from "socket.io"
import { PrismaClient, type MapObject } from "@prisma/client"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  PlayerPosition,
  ChatMessageData,
  PlayerJumpData,
  AvatarColor,
  AvatarConfig,
  ProfileUpdateData,
  // Phase 6: 관리 이벤트 타입
  SpaceRole,
  ChatRestriction,
  AdminMuteRequest,
  AdminUnmuteRequest,
  AdminKickRequest,
  AdminDeleteMessageRequest,
  AdminAnnounceRequest,
  MemberMutedData,
  MemberUnmutedData,
  MemberKickedData,
  MessageDeletedData,
  AnnouncementData,
  // 녹화 이벤트 타입 (법적 준수)
  RecordingStatusData,
  // 맵 오브젝트 이벤트 타입 (에디터)
  MapObjectData,
  ObjectPlaceRequest,
  ObjectUpdateRequest,
  ObjectDeleteRequest,
  // 리액션 이벤트 타입
  ReactionAddRequest,
  ReactionData,
  // 스포트라이트 이벤트 타입
  SpotlightGrantedData,
  SpotlightRevokedData,
  SpotlightActivatedData,
  SpotlightStatusData,
} from "../src/features/space/socket/types"

const PORT = parseInt(process.env.PORT || process.env.SOCKET_PORT || "3001", 10)
// 🔧 NEXT_PUBLIC_API_URL 또는 NEXT_PUBLIC_APP_URL 모두 지원 (Railway 호환성)
const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
// 🔒 보안: NODE_ENV === "development"로 명시적 제한
// staging, test, 미설정 환경에서 인증 우회 방지
const IS_DEV = process.env.NODE_ENV === "development"

// 📢 Discord 웹훅 URL (에러 알림용)
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ""

// CORS 허용 origin 설정 (환경 변수 또는 기본값)
const CORS_ORIGINS = (() => {
  const origins: string[] = ["http://localhost:3000", "http://127.0.0.1:3000"]

  // 프로덕션 URL 추가
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL)
  }

  // Railway/Vercel 등 추가 허용 도메인
  if (process.env.CORS_ORIGINS) {
    const additionalOrigins = process.env.CORS_ORIGINS.split(",").map(o => o.trim())
    origins.push(...additionalOrigins)
  }

  return origins
})()

// Prisma 클라이언트 싱글톤
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// ============================================
// 📝 구조화된 로거 (JSON 형식 + 에러 코드)
// ============================================
/**
 * 에러 코드 체계:
 * E1xxx: 인증/세션 (Authentication)
 * E2xxx: 연결/소켓 (Connection)
 * E3xxx: 데이터베이스 (Database)
 * E4xxx: 외부 API (External API)
 * E5xxx: 비즈니스 로직 (Business Logic)
 * E6xxx: 시스템/인프라 (System)
 *
 * I로 시작하면 Info 레벨 로그
 */
const ErrorCodes = {
  // E1xxx: 인증/세션
  E1001: "세션 토큰 없음",
  E1002: "세션 검증 실패",
  E1003: "인증 필요",
  E1004: "권한 없음",

  // E2xxx: 연결/소켓
  E2001: "클라이언트 연결됨",
  E2002: "클라이언트 연결 해제",
  E2003: "중복 세션 감지",
  E2004: "소켓 룸 입장 실패",
  E2005: "소켓 통신 오류",

  // E3xxx: 데이터베이스
  E3001: "채팅 저장 실패",
  E3002: "멤버 제한 로드 실패",
  E3003: "멤버 제한 저장 실패",
  E3004: "오브젝트 저장 실패",
  E3005: "DB 연결 오류",

  // E4xxx: 외부 API
  E4001: "이벤트 로깅 API 실패",
  E4002: "세션 검증 API 실패",
  E4003: "외부 API 타임아웃",

  // E5xxx: 비즈니스 로직
  E5001: "닉네임 스푸핑 감지",
  E5002: "뮤트된 사용자 메시지 차단",
  E5003: "권한 검증 실패",
  E5004: "녹화 상태 오류",
  E5005: "오브젝트 동기화 실패",

  // E6xxx: 시스템
  E6001: "서버 시작",
  E6002: "서버 종료",
  E6003: "서버 오류",
  E6004: "메모리 경고",
} as const

type ErrorCode = keyof typeof ErrorCodes
type LogLevel = "info" | "warn" | "error"

interface LogContext {
  sessionId?: string
  spaceId?: string
  playerId?: string
  socketId?: string
  nickname?: string
  [key: string]: unknown
}

function createLogEntry(level: LogLevel, code: ErrorCode | string, msg: string, ctx?: LogContext) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "socket",
    code,
    msg,
    ...ctx,
  })
}

// 📢 Discord 웹훅 알림 함수
async function sendDiscordAlert(
  code: string,
  msg: string,
  ctx?: LogContext,
  level: "error" | "warn" | "info" = "error"
): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return

  try {
    const hostname = process.env.HOSTNAME || "socket-server"
    const timestamp = new Date().toISOString()

    // 레벨별 색상 (Discord Embed color)
    const colors = {
      error: 16711680,   // 빨강
      warn: 16776960,    // 노랑
      info: 3447003,     // 파랑
    }

    // 컨텍스트 포맷팅
    const contextStr = ctx
      ? Object.entries(ctx)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `**${k}**: ${v}`)
          .join("\n")
      : ""

    const payload = {
      embeds: [{
        title: `[${code}] ${msg}`,
        description: contextStr || "No additional context",
        color: colors[level],
        footer: { text: `${hostname} | Socket.io Server` },
        timestamp,
      }],
    }

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // Discord 알림 실패는 무시 (무한 루프 방지)
  }
}

const logger = {
  info: (code: ErrorCode | string, msg: string, ctx?: LogContext) =>
    console.log(createLogEntry("info", code, msg, ctx)),
  warn: (code: ErrorCode | string, msg: string, ctx?: LogContext) =>
    console.warn(createLogEntry("warn", code, msg, ctx)),
  error: (code: ErrorCode | string, msg: string, ctx?: LogContext) => {
    console.error(createLogEntry("error", code, msg, ctx))
    // 🔔 에러 발생 시 Discord 알림
    sendDiscordAlert(code, msg, ctx, "error")
  },
}

// ============================================
// 📊 이벤트 로깅 함수
// ============================================
async function logGuestEvent(
  sessionToken: string,
  spaceId: string,
  eventType: "EXIT" | "CHAT",
  payload?: Record<string, unknown>
): Promise<boolean> {
  try {
    // dev- 세션은 로깅 스킵
    if (!sessionToken || sessionToken.startsWith("dev-")) {
      return false
    }

    // auth- 세션은 인증 사용자 로깅 API 호출
    if (sessionToken.startsWith("auth-")) {
      // auth-{userId} 형식에서 userId 추출
      const userId = sessionToken.replace("auth-", "")
      return await logAuthUserEvent(userId, spaceId, eventType, payload)
    }

    // 게스트 세션 로깅
    const response = await fetch(`${NEXT_API_URL}/api/guest/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, spaceId, eventType, payload }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn(`[Socket] Event logging failed:`, errorData.error || "Unknown error")
      return false
    }

    const data = await response.json()
    if (IS_DEV) {
      console.log(`[Socket] Event logged: ${eventType} for space ${spaceId}`)
    }
    return data.logged === true
  } catch (error) {
    console.error("[Socket] Event logging error:", error)
    return false
  }
}

// 📊 인증 사용자 이벤트 로깅 함수
async function logAuthUserEvent(
  userId: string,
  spaceId: string,
  eventType: "EXIT" | "CHAT",
  payload?: Record<string, unknown>
): Promise<boolean> {
  try {
    // EXIT 이벤트만 로깅 (CHAT은 별도 처리)
    if (eventType !== "EXIT") {
      return false
    }

    const response = await fetch(`${NEXT_API_URL}/api/spaces/${spaceId}/visit`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId, // 서버 간 통신용 헤더
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn(`[Socket] Auth user event logging failed:`, errorData.error || "Unknown error")
      return false
    }

    if (IS_DEV) {
      console.log(`[Socket] Auth user EXIT logged: user=${userId}, space=${spaceId}`)
    }
    return true
  } catch (error) {
    console.error("[Socket] Auth user event logging error:", error)
    return false
  }
}

// ============================================
// 🔒 세션 검증 함수
// ============================================
interface VerifySessionResult {
  valid: boolean
  participantId?: string
  nickname?: string
  avatar?: string
  error?: string
}

async function verifyGuestSession(
  sessionToken: string,
  spaceId: string
): Promise<VerifySessionResult> {
  try {
    const response = await fetch(`${NEXT_API_URL}/api/guest/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, spaceId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { valid: false, error: errorData.error || "Session verification failed" }
    }

    const data = await response.json()
    return {
      valid: true,
      participantId: data.participantId,
      nickname: data.nickname,
      avatar: data.avatar,
    }
  } catch (error) {
    console.error("[Socket] Session verification error:", error)
    return { valid: false, error: "Failed to verify session" }
  }
}

// ============================================
// 📊 Phase 3.9: 음소거 상태 DB 조회/저장
// ============================================
interface MemberRestrictionResult {
  restriction: ChatRestriction
  memberId: string
}

/**
 * DB에서 멤버의 음소거 상태 불러오기
 * - 인증 사용자: userId로 조회
 * - 게스트 사용자: guestSessionId로 조회
 */
async function loadMemberRestriction(
  spaceId: string,
  playerId: string,
  sessionToken?: string
): Promise<MemberRestrictionResult | null> {
  try {
    // playerId 형식에 따라 조회 조건 결정
    // user-{userId} → userId로 조회
    // guest-{guestSessionId} → guestSessionId로 조회
    let whereCondition: { spaceId: string; userId?: string; guestSessionId?: string }

    if (playerId.startsWith("user-")) {
      const userId = playerId.replace("user-", "")
      whereCondition = { spaceId, userId }
    } else if (playerId.startsWith("guest-")) {
      const guestSessionId = playerId.replace("guest-", "")
      whereCondition = { spaceId, guestSessionId }
    } else {
      // dev 세션 등은 스킵
      return null
    }

    const member = await prisma.spaceMember.findFirst({
      where: whereCondition,
      select: { id: true, restriction: true, restrictedUntil: true },
    })

    if (!member) return null

    // 일시적 음소거인 경우 시간 체크
    if (member.restriction === "MUTED" && member.restrictedUntil) {
      if (new Date() > member.restrictedUntil) {
        // 음소거 기간 만료 → NONE으로 업데이트
        await prisma.spaceMember.update({
          where: { id: member.id },
          data: { restriction: "NONE", restrictedUntil: null },
        })
        return { restriction: "NONE", memberId: member.id }
      }
    }

    return { restriction: member.restriction, memberId: member.id }
  } catch (error) {
    console.error("[Socket] loadMemberRestriction error:", error)
    return null
  }
}

/**
 * DB에 멤버의 음소거 상태 저장
 */
async function saveMemberRestriction(
  spaceId: string,
  playerId: string,
  restriction: ChatRestriction,
  restrictedBy?: string,
  durationMinutes?: number,
  reason?: string
): Promise<boolean> {
  try {
    let whereCondition: { spaceId: string; userId?: string; guestSessionId?: string }

    if (playerId.startsWith("user-")) {
      const userId = playerId.replace("user-", "")
      whereCondition = { spaceId, userId }
    } else if (playerId.startsWith("guest-")) {
      const guestSessionId = playerId.replace("guest-", "")
      whereCondition = { spaceId, guestSessionId }
    } else {
      return false
    }

    const restrictedUntil = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60000)
      : null

    await prisma.spaceMember.updateMany({
      where: whereCondition,
      data: {
        restriction,
        restrictedBy: restriction === "NONE" ? null : restrictedBy,
        restrictedUntil: restriction === "NONE" ? null : restrictedUntil,
        restrictedReason: restriction === "NONE" ? null : reason,
      },
    })

    return true
  } catch (error) {
    console.error("[Socket] saveMemberRestriction error:", error)
    return false
  }
}

// ============================================
// 🚦 Rate Limiting (채팅 도배 방지)
// ============================================
const RATE_LIMIT = {
  MAX_MESSAGES: 5,           // 최대 메시지 수
  WINDOW_MS: 5000,           // 시간 윈도우 (5초)
  MAX_DUPLICATES: 3,         // 동일 메시지 연속 허용 횟수
  MAX_MESSAGE_LENGTH: 2000,  // 최대 메시지 길이 (자)
}

interface RateLimitState {
  timestamps: number[]       // 메시지 전송 시각 배열
  lastMessageHash: string    // 마지막 메시지 해시 (중복 체크용)
  duplicateCount: number     // 동일 메시지 연속 횟수
}

// 📊 Phase 3.11: playerId → RateLimitState (socketId 대신 playerId 기반)
// 이렇게 하면 여러 탭/소켓으로 Rate Limit 우회 불가
const rateLimitMap = new Map<string, RateLimitState>()

/**
 * 📊 Phase 4.6: SHA256 기반 해시 함수 (중복 메시지 비교용)
 * 기존 32bit 해시 → SHA256으로 변경 (충돌 가능성 제거)
 * 성능: 짧은 채팅 메시지에 대해 무시할 수준 (~0.01ms)
 */
function messageHash(str: string): string {
  return createHash("sha256").update(str).digest("hex").slice(0, 16)
}

/**
 * Rate Limit 체크 및 업데이트
 * 📊 Phase 3.11: playerId 기반으로 변경 (socketId → playerId)
 * @returns { allowed: boolean, reason?: string }
 */
function checkRateLimit(
  playerId: string,
  content: string
): { allowed: boolean; reason?: string } {
  const now = Date.now()
  // 📊 Phase 4.5: trim을 먼저 적용하여 길이 체크와 해시 계산 일관성 유지
  const trimmedContent = content.trim()
  const contentHash = messageHash(trimmedContent.toLowerCase())

  // 1. 메시지 길이 체크 (trim된 길이 기준)
  if (trimmedContent.length > RATE_LIMIT.MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      reason: `메시지가 너무 깁니다. (최대 ${RATE_LIMIT.MAX_MESSAGE_LENGTH}자)`,
    }
  }

  // 빈 메시지 체크
  if (trimmedContent.length === 0) {
    return {
      allowed: false,
      reason: "메시지 내용이 없습니다.",
    }
  }

  // 2. Rate Limit 상태 가져오기 또는 생성 (playerId 기반)
  let state = rateLimitMap.get(playerId)
  if (!state) {
    state = {
      timestamps: [],
      lastMessageHash: "",
      duplicateCount: 0,
    }
    rateLimitMap.set(playerId, state)
  }

  // 3. 시간 윈도우 밖의 오래된 타임스탬프 제거
  state.timestamps = state.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT.WINDOW_MS
  )

  // 4. 빈도 제한 체크 (5msg/5sec)
  if (state.timestamps.length >= RATE_LIMIT.MAX_MESSAGES) {
    const oldestTs = state.timestamps[0]
    const waitTime = Math.ceil((RATE_LIMIT.WINDOW_MS - (now - oldestTs)) / 1000)
    return {
      allowed: false,
      reason: `메시지를 너무 빨리 보내고 있습니다. ${waitTime}초 후에 다시 시도해주세요.`,
    }
  }

  // 5. 동일 메시지 반복 체크
  if (contentHash === state.lastMessageHash) {
    state.duplicateCount++
    if (state.duplicateCount >= RATE_LIMIT.MAX_DUPLICATES) {
      return {
        allowed: false,
        reason: "동일한 메시지를 연속으로 보낼 수 없습니다.",
      }
    }
  } else {
    state.duplicateCount = 1
    state.lastMessageHash = contentHash
  }

  // 6. 타임스탬프 추가 (허용된 경우)
  state.timestamps.push(now)

  return { allowed: true }
}

/**
 * 연결 해제 시 Rate Limit 상태 정리
 * 📊 Phase 3.11: playerId 기반으로 변경
 * 주의: playerId 기반이므로 같은 사용자가 다른 탭에서 접속 중일 수 있음
 * 따라서 해당 spaceId에 같은 playerId가 없을 때만 정리
 */
function cleanupRateLimitState(playerId: string, spaceId: string): void {
  // 같은 playerId로 다른 소켓이 아직 접속 중인지 확인
  const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
  if (socketsInRoom) {
    for (const socketId of socketsInRoom) {
      const s = io.sockets.sockets.get(socketId)
      if (s && s.data.playerId === playerId) {
        // 아직 같은 playerId로 접속 중인 소켓이 있으면 정리하지 않음
        return
      }
    }
  }
  rateLimitMap.delete(playerId)
}

// ============================================
// 📊 유틸리티 함수
// ============================================

/**
 * 업타임을 읽기 쉬운 형식으로 변환
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(" ")
}

/**
 * 디스크 스토리지 사용량 조회
 * df 명령어로 루트 파티션 정보를 파싱
 */
interface StorageMetrics {
  totalGB: number
  usedGB: number
  availableGB: number
  usedPercent: number
  mountPoint: string
}

function getStorageMetrics(): StorageMetrics | null {
  try {
    // df -B1 /: 루트 파티션 정보를 바이트 단위로 조회
    const output = execSync("df -B1 / 2>/dev/null | tail -1", { encoding: "utf-8" })
    const parts = output.trim().split(/\s+/)

    if (parts.length >= 6) {
      const totalBytes = parseInt(parts[1], 10)
      const usedBytes = parseInt(parts[2], 10)
      const availableBytes = parseInt(parts[3], 10)
      const usedPercent = parseInt(parts[4].replace("%", ""), 10)
      const mountPoint = parts[5]

      return {
        totalGB: Math.round((totalBytes / (1024 ** 3)) * 100) / 100,
        usedGB: Math.round((usedBytes / (1024 ** 3)) * 100) / 100,
        availableGB: Math.round((availableBytes / (1024 ** 3)) * 100) / 100,
        usedPercent,
        mountPoint,
      }
    }
    return null
  } catch (error) {
    console.error("[Socket] Failed to get storage metrics:", error)
    return null
  }
}

// Create HTTP server for health checks (Railway requirement)
const httpServer = createServer((req, res) => {
  const url = req.url || ""
  const method = req.method || "GET"

  // Health check 요청 로깅 (디버깅용)
  console.log(`[Socket] HTTP ${method} ${url} from ${req.socket.remoteAddress}`)

  // CORS 헤더 설정
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  if (url === "/health" || url === "/") {
    const response = { status: "ok", timestamp: Date.now(), uptime: process.uptime() }
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders })
    res.end(JSON.stringify(response))
    console.log(`[Socket] Health check responded: 200 OK`)
  }
  // 🆕 Metrics API: GET /metrics (OCI 모니터링용)
  else if (url === "/metrics" && method === "GET") {
    // CPU 사용량 계산
    const cpuUsage = process.cpuUsage()
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) // 마이크로초 → 초

    // 메모리 사용량
    const memUsage = process.memoryUsage()

    // 연결 통계
    const totalConnections = io.sockets.sockets.size
    const roomStats: Array<{ spaceId: string; connections: number }> = []

    for (const [spaceId, players] of rooms.entries()) {
      roomStats.push({ spaceId, connections: players.size })
    }

    // 서버 시작 시간 (트래픽 추정용)
    const uptimeSeconds = process.uptime()
    const startTime = Date.now() - (uptimeSeconds * 1000)

    // 스토리지 사용량 조회
    const storage = getStorageMetrics()

    const response = {
      server: "socket.io",
      version: "2.0.0", // 스토리지 메트릭 추가
      timestamp: Date.now(),
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: formatUptime(uptimeSeconds),
        startTime: new Date(startTime).toISOString(),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        totalMicroseconds: cpuUsage.user + cpuUsage.system,
      },
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      },
      // 🆕 스토리지 메트릭 (v2.0.0)
      storage: storage ? {
        totalGB: storage.totalGB,
        usedGB: storage.usedGB,
        availableGB: storage.availableGB,
        usedPercent: storage.usedPercent,
        mountPoint: storage.mountPoint,
      } : null,
      connections: {
        total: totalConnections,
        rooms: roomStats,
        roomCount: rooms.size,
      },
      parties: {
        count: partyRooms.size,
      },
    }

    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders })
    res.end(JSON.stringify(response, null, 2))
    console.log(`[Socket] Metrics API responded: ${totalConnections} connections`)
  }
  // 🆕 Presence API: GET /presence/:spaceId
  else if (url.startsWith("/presence/") && method === "GET") {
    const spaceId = url.replace("/presence/", "")
    
    if (!spaceId) {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders })
      res.end(JSON.stringify({ error: "spaceId is required" }))
      return
    }

    // 해당 공간에 접속한 소켓들 조회
    const roomSocketIds = io.sockets.adapter.rooms.get(spaceId)
    const onlineUsers: Array<{
      id: string
      nickname: string
      avatarColor?: string
      userId?: string
      memberId?: string
      role?: string
    }> = []

    if (roomSocketIds) {
      for (const socketId of roomSocketIds) {
        const socket = io.sockets.sockets.get(socketId)
        if (socket && socket.data) {
          onlineUsers.push({
            id: socket.data.playerId,
            nickname: socket.data.nickname,
            avatarColor: socket.data.avatarColor,
            userId: socket.data.userId,
            memberId: socket.data.memberId,
            role: socket.data.role,
          })
        }
      }
    }

    const response = {
      spaceId,
      onlineUsers,
      count: onlineUsers.length,
      timestamp: Date.now(),
    }

    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders })
    res.end(JSON.stringify(response))
    console.log(`[Socket] Presence API: ${spaceId} has ${onlineUsers.length} online users`)
  } else {
    res.writeHead(404, corsHeaders)
    res.end()
  }
})

// Create Socket.io server attached to HTTP server
// 🔧 연결 안정성 최적화: ping 간격/타임아웃 증가 (장시간 세션 지원)
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  // 🔧 연결 안정성 설정 (로드 밸런서/프록시 호환)
  // - Vercel/Railway 등 대부분의 호스팅은 30-60초 idle timeout 적용
  // - 더 짧은 ping 간격으로 연결 유지 신호를 자주 보내 idle disconnect 방지
  pingInterval: 25000,   // 25초마다 ping (로드 밸런서 idle timeout 대비)
  pingTimeout: 10000,    // 10초 내 응답 대기 (빠른 장애 감지)
})

// Room state: spaceId -> Map<playerId, PlayerPosition>
const rooms = new Map<string, Map<string, PlayerPosition>>()

// 🎉 Party/Zone state: partyRoomId -> Set<socketId>
// partyRoomId format: "{spaceId}:party:{partyId}"
const partyRooms = new Map<string, Set<string>>()

// 🔴 Recording state: spaceId -> RecordingStatusData
// 각 공간별 녹화 상태 추적 (법적 준수)
const recordingStates = new Map<string, RecordingStatusData>()

// 🔦 Spotlight state: spaceId -> Map<participantId, { nickname: string }>
// 각 공간별 활성화된 스포트라이트 추적
interface ActiveSpotlight {
  participantId: string
  nickname: string
}
const spotlightStates = new Map<string, Map<string, ActiveSpotlight>>()

function getOrCreateSpotlightState(spaceId: string): Map<string, ActiveSpotlight> {
  if (!spotlightStates.has(spaceId)) {
    spotlightStates.set(spaceId, new Map())
  }
  return spotlightStates.get(spaceId)!
}

// 📡 Proximity state: spaceId -> boolean (enabled/disabled)
// 각 공간별 근접 통신 설정 (기본값: false = 전역 모드)
const proximityStates = new Map<string, boolean>()

function getProximityState(spaceId: string): boolean {
  return proximityStates.get(spaceId) ?? false
}

function setProximityState(spaceId: string, enabled: boolean): void {
  proximityStates.set(spaceId, enabled)
}

function getOrCreateRoom(spaceId: string): Map<string, PlayerPosition> {
  if (!rooms.has(spaceId)) {
    rooms.set(spaceId, new Map())
  }
  return rooms.get(spaceId)!
}

function removePlayerFromRoom(spaceId: string, playerId: string): void {
  const room = rooms.get(spaceId)
  if (room) {
    room.delete(playerId)
    if (room.size === 0) {
      rooms.delete(spaceId)
    }
  }
}

// 🎉 Party room helper functions
function getPartyRoomId(spaceId: string, partyId: string): string {
  return `${spaceId}:party:${partyId}`
}

function getOrCreatePartyRoom(spaceId: string, partyId: string): Set<string> {
  const partyRoomId = getPartyRoomId(spaceId, partyId)
  if (!partyRooms.has(partyRoomId)) {
    partyRooms.set(partyRoomId, new Set())
  }
  return partyRooms.get(partyRoomId)!
}

function removeFromPartyRoom(spaceId: string, partyId: string, socketId: string): void {
  const partyRoomId = getPartyRoomId(spaceId, partyId)
  const partyRoom = partyRooms.get(partyRoomId)
  if (partyRoom) {
    partyRoom.delete(socketId)
    if (partyRoom.size === 0) {
      partyRooms.delete(partyRoomId)
    }
  }
}

io.on("connection", (socket) => {
  logger.info("E2001", "Client connected", { socketId: socket.id })

  // Join space - 🔒 세션 토큰 검증 추가
  socket.on("join:space", async ({ spaceId, playerId, nickname, avatarColor, avatarConfig, sessionToken }) => {
    // 🔒 보안: 세션 토큰 검증 (운영환경에서는 필수)
    let verifiedPlayerId = playerId
    let verifiedNickname = nickname
    let verifiedAvatarColor = avatarColor || "default"
    let verifiedAvatarConfig: AvatarConfig | undefined = avatarConfig

    // 개발 모드에서 dev- 세션은 검증 스킵 (테스트 편의)
    const isDevSession = IS_DEV && sessionToken?.startsWith("dev-")
    // 🔐 인증 사용자 세션 (NextAuth 로그인 사용자)
    const isAuthSession = sessionToken?.startsWith("auth-")

    if (isAuthSession) {
      // 🔐 NextAuth 인증 사용자는 게스트 세션 검증 스킵
      // playerId는 이미 page.tsx에서 `user-{userId}` 형태로 설정됨
      verifiedPlayerId = playerId // user-{userId}
      verifiedNickname = nickname
      verifiedAvatarColor = avatarColor || "default"
      logger.info("I1001", "Auth session detected", { playerId: verifiedPlayerId, socketId: socket.id })
    } else if (sessionToken && !isDevSession) {
      const verification = await verifyGuestSession(sessionToken, spaceId)

      if (!verification.valid) {
        logger.warn("E1002", "Session verification failed", { socketId: socket.id, error: verification.error })
        // 운영환경에서는 연결 거부
        if (!IS_DEV) {
          socket.emit("error", { message: "Invalid session" })
          socket.disconnect(true)
          return
        }
        // 개발환경에서는 경고만 출력하고 진행
        logger.warn("E1002", "DEV MODE: Allowing connection despite invalid session", { socketId: socket.id })
      } else {
        // 🔒 서버에서 검증된 값으로 덮어쓰기 (클라이언트 입력 무시)
        verifiedPlayerId = verification.participantId!
        verifiedNickname = verification.nickname!
        verifiedAvatarColor = (verification.avatar as AvatarColor) || "default"

        if (IS_DEV) {
          logger.info("I1002", "Session verified", { playerId: verifiedPlayerId, nickname: verifiedNickname })
        }
      }
    } else if (!IS_DEV && !sessionToken) {
      // 운영환경에서 세션 토큰 없이 접근 시 거부
      logger.warn("E1001", "No session token provided", { socketId: socket.id })
      socket.emit("error", { message: "Session token required" })
      socket.disconnect(true)
      return
    } else if (IS_DEV) {
      // 개발환경에서 세션 없이 접근 시 임시 ID 생성
      if (!sessionToken) {
        verifiedPlayerId = `dev-anon-${Date.now()}`
        logger.info("I1003", "DEV MODE: No session, using temp ID", { playerId: verifiedPlayerId })
      } else {
        // dev- 세션의 경우 클라이언트가 보낸 ID 그대로 사용 (page.tsx에서 이미 생성됨)
        // verifiedPlayerId는 이미 playerId로 초기화되어 있음
        logger.info("I1003", "DEV MODE: Using client ID", { playerId: verifiedPlayerId })
      }
    }

    // Store player data on socket (🔒 검증된 값 사용)
    socket.data.spaceId = spaceId
    socket.data.playerId = verifiedPlayerId
    socket.data.nickname = verifiedNickname
    socket.data.avatarColor = verifiedAvatarColor
    socket.data.avatarConfig = verifiedAvatarConfig  // Phase 1: 커스터마이징
    socket.data.sessionToken = sessionToken // 중복 접속 방지용

    // 📊 Phase 3.9: DB에서 음소거 상태 불러오기 (서버 재시작 후에도 유지)
    try {
      const memberRestriction = await loadMemberRestriction(spaceId, verifiedPlayerId, sessionToken)
      if (memberRestriction) {
        socket.data.restriction = memberRestriction.restriction
        socket.data.memberId = memberRestriction.memberId
        if (IS_DEV) {
          logger.info("I3001", "Loaded member restriction", { playerId: verifiedPlayerId, restriction: memberRestriction.restriction })
        }
      }
    } catch (error) {
      logger.error("E3002", "Failed to load member restriction", { playerId: verifiedPlayerId, error: (error as Error).message })
    }

    // Join socket room
    socket.join(spaceId)

    // Get or create room state
    const room = getOrCreateRoom(spaceId)

    // 📊 Phase 3.10: 중복 접속 시 기존 소켓 강제 종료 (같은 playerId로 재연결 허용)
    const existingEntry = Array.from(room.entries()).find(([, p]) => p.id === verifiedPlayerId)
    if (existingEntry) {
      logger.warn("E2003", "Duplicate session detected", { playerId: verifiedPlayerId, spaceId })

      // 기존 소켓 찾아서 종료
      const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
      if (socketsInRoom) {
        for (const oldSocketId of socketsInRoom) {
          if (oldSocketId === socket.id) continue // 현재 소켓은 제외
          const oldSocket = io.sockets.sockets.get(oldSocketId)
          if (oldSocket && oldSocket.data.playerId === verifiedPlayerId) {
            logger.info("E2003", "Disconnecting old socket", { oldSocketId, playerId: verifiedPlayerId })
            oldSocket.emit("error", { message: "다른 기기에서 접속하여 연결이 종료되었습니다." })
            oldSocket.disconnect(true)
            break // 첫 번째만 종료 (일반적으로 1개만 있음)
          }
        }
      }
    }

    // Create initial player position
    const playerPosition: PlayerPosition = {
      id: verifiedPlayerId,
      nickname: verifiedNickname,
      x: existingEntry ? existingEntry[1].x : 480, // 기존 위치 또는 중앙
      y: existingEntry ? existingEntry[1].y : 320,
      direction: existingEntry ? existingEntry[1].direction : "down",
      isMoving: false,
      avatarColor: verifiedAvatarColor,
      avatarConfig: verifiedAvatarConfig,  // Phase 1: 커스터마이징
    }

    // Add player to room
    room.set(verifiedPlayerId, playerPosition)

    // Send current room state to joining player (🔒 yourPlayerId 포함 - 클라이언트가 서버 파생 ID 인지)
    socket.emit("room:joined", {
      spaceId,
      players: Array.from(room.values()),
      yourPlayerId: verifiedPlayerId,
    })

    // 🗺️ 맵 오브젝트 동기화 (에디터 - 입장 시 기존 오브젝트 전달)
    try {
      const mapObjects = await prisma.mapObject.findMany({
        where: { spaceId },
        orderBy: { createdAt: "asc" },
      })

      if (mapObjects.length > 0) {
        const objectsData: MapObjectData[] = mapObjects.map((obj: MapObject) => ({
          id: obj.id,
          assetId: obj.assetId,
          position: { x: obj.positionX, y: obj.positionY },
          rotation: obj.rotation as 0 | 90 | 180 | 270,
          linkedObjectId: obj.linkedObjectId || undefined,
          customData: obj.customData as Record<string, unknown> | undefined,
          placedBy: obj.placedBy,
          placedAt: obj.createdAt.toISOString(),
        }))

        socket.emit("objects:sync", { objects: objectsData })

        if (IS_DEV) {
          console.log(`[Socket] 🗺️ Synced ${mapObjects.length} objects for ${nickname}`)
        }
      }
    } catch (error) {
      console.error("[Socket] Objects sync error:", error)
    }

    // 🔴 현재 녹화 상태 전달 (법적 준수 - REC 표시를 위해)
    const currentRecordingState = recordingStates.get(spaceId)
    if (currentRecordingState?.isRecording) {
      socket.emit("recording:status", currentRecordingState)
    }

    // 🔦 현재 스포트라이트 상태 전달
    try {
      const spotlightState = spotlightStates.get(spaceId)
      const activeSpotlights = spotlightState
        ? Array.from(spotlightState.values())
        : []

      // 본인의 스포트라이트 권한 확인
      let hasGrant = false
      let grantId: string | undefined
      let expiresAt: string | undefined

      if (sessionToken) {
        // userId 또는 guestSessionId로 스포트라이트 권한 조회
        let spotlightGrant = null

        // 인증 사용자인 경우 userId로 조회
        if (socket.data.userId) {
          spotlightGrant = await prisma.spotlightGrant.findFirst({
            where: {
              spaceId,
              userId: socket.data.userId,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          })
        } else if (sessionToken.startsWith("guest-")) {
          // 게스트 세션에서 guestSessionId 조회
          const guestSession = await prisma.guestSession.findUnique({
            where: { sessionToken },
            select: { id: true },
          })
          if (guestSession) {
            spotlightGrant = await prisma.spotlightGrant.findFirst({
              where: {
                spaceId,
                guestSessionId: guestSession.id,
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } },
                ],
              },
            })
          }
        }
        if (spotlightGrant) {
          hasGrant = true
          grantId = spotlightGrant.id
          expiresAt = spotlightGrant.expiresAt?.toISOString()
          // SocketData에 스포트라이트 정보 저장
          socket.data.hasSpotlightGrant = true
          socket.data.spotlightGrantId = spotlightGrant.id
          socket.data.isSpotlightActive = spotlightGrant.isActive
        }
      }

      const spotlightStatus: SpotlightStatusData = {
        activeSpotlights,
        hasGrant,
        grantId,
        expiresAt,
      }
      socket.emit("spotlight:status", spotlightStatus)
    } catch (error) {
      console.error("[Socket] Spotlight status error:", error)
    }

    // 📡 현재 근접 통신 상태 전달
    const proximityEnabled = getProximityState(spaceId)
    socket.emit("proximity:status", { enabled: proximityEnabled })

    // Notify other players in room
    socket.to(spaceId).emit("player:joined", playerPosition)

    // Send system message
    const systemMessage: ChatMessageData = {
      id: `sys-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `${verifiedNickname}님이 입장했습니다.`,
      timestamp: Date.now(),
      type: "system",
    }
    io.to(spaceId).emit("chat:system", systemMessage)

    console.log(`[Socket] Player ${verifiedPlayerId} (${verifiedNickname}) joined space ${spaceId}`)
  })

  // Leave space
  socket.on("leave:space", async () => {
    const { spaceId, playerId, nickname } = socket.data

    if (spaceId && playerId) {
      socket.leave(spaceId)
      removePlayerFromRoom(spaceId, playerId)

      // ⚠️ SSOT: EXIT 로깅은 disconnect에서만 처리 (중복 방지)
      // leave:space 후 disconnect가 항상 호출되므로 여기서는 생략

      // Notify other players
      socket.to(spaceId).emit("player:left", { id: playerId })

      // Send system message
      if (nickname) {
        const systemMessage: ChatMessageData = {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderNickname: "시스템",
          content: `${nickname}님이 퇴장했습니다.`,
          timestamp: Date.now(),
          type: "system",
        }
        io.to(spaceId).emit("chat:system", systemMessage)
      }

      console.log(`[Socket] Player ${playerId} left space ${spaceId}`)
    }
  })

  // Player movement
  // 🔒 보안: 클라이언트가 보낸 position.id를 신뢰하지 않고 socket.data.playerId 사용
  // ⚡ Phase 2: 이동 패킷 경량화 - avatarColor/avatarConfig 제외 (입장/프로필 변경 시만 전송)
  socket.on("player:move", (position) => {
    const { spaceId, playerId, nickname, avatarColor, avatarConfig } = socket.data

    // 🔒 playerId가 없으면 아직 join:space 완료 전이므로 무시
    if (!spaceId || !playerId) return

    const room = rooms.get(spaceId)
    if (room) {
      // 서버 내부 상태는 full position 유지 (player:joined 등에서 필요)
      const fullPosition: PlayerPosition = {
        ...position,
        id: playerId,
        nickname: nickname || "Unknown",
        avatarColor: avatarColor || "default",
        avatarConfig,
      }
      room.set(playerId, fullPosition)

      // ⚡ Broadcast: avatar 정보 제외 (경량화) - 클라이언트에서 기존 값 유지
      const movePosition: PlayerPosition = {
        id: playerId,
        nickname: nickname || "Unknown",
        x: position.x,
        y: position.y,
        direction: position.direction,
        isMoving: position.isMoving,
        // avatarColor, avatarConfig 생략 - 이동 패킷 경량화
      }
      socket.to(spaceId).emit("player:moved", movePosition)
    }
  })

  // Player jump
  // 🔒 보안: 클라이언트가 보낸 data.id를 신뢰하지 않고 socket.data.playerId 사용
  socket.on("player:jump", (data: PlayerJumpData) => {
    const { spaceId, playerId } = socket.data

    // 🔒 playerId가 없으면 아직 join:space 완료 전이므로 무시
    if (!spaceId || !playerId) return

    // 🔒 클라이언트 ID 무시, 서버에서 검증된 playerId로 덮어쓰기
    const verifiedJumpData: PlayerJumpData = {
      ...data,
      id: playerId, // 🔒 서버 검증 ID 강제 사용
    }

    // Broadcast jump event to other players in room
    socket.to(spaceId).emit("player:jumped", verifiedJumpData)
    console.log(`[Socket] Player ${playerId} jumped at (${verifiedJumpData.x}, ${verifiedJumpData.y})`)
  })

  // Chat message (답장 지원) - Optimistic Broadcasting + 비동기 DB 저장
  socket.on("chat:message", ({ content, replyTo }) => {
    const { spaceId, playerId, nickname, restriction, sessionToken } = socket.data

    // 🔇 음소거 상태 확인
    if (restriction === "MUTED") {
      socket.emit("chat:error", { message: "음소거 상태입니다. 채팅을 보낼 수 없습니다." })
      return
    }

    // 🚦 Rate Limit 체크 (📊 Phase 3.11: playerId 기반)
    const rateCheck = checkRateLimit(playerId, content)
    if (!rateCheck.allowed) {
      socket.emit("chat:error", { message: rateCheck.reason || "메시지 전송이 제한되었습니다." })
      return
    }

    if (spaceId && playerId && content.trim()) {
      const now = Date.now()
      const tempId = `msg-${now}-${playerId}`

      // ⚡ 1. 즉시 브로드캐스트 (지연 없음)
      const message: ChatMessageData = {
        id: tempId,
        senderId: playerId,
        senderNickname: nickname || "Unknown",
        content: content.trim(),
        timestamp: now,
        type: "message",
        ...(replyTo && { replyTo }),
      }
      io.to(spaceId).emit("chat:message", message)

      // 📝 2. 백그라운드 DB 저장 (비동기, 블로킹 없음)
      const senderType = sessionToken?.startsWith("auth-") ? "USER" : "GUEST"
      const senderId = sessionToken?.replace("auth-", "").replace("guest-", "") || playerId

      prisma.chatMessage.create({
        data: {
          spaceId,
          senderId,
          senderType,
          senderName: nickname || "Unknown",
          content: content.trim(),
          type: "MESSAGE",
        },
      }).then((savedMessage) => {
        // 🔄 3. ID 업데이트 전송 (삭제 기능용)
        io.to(spaceId).emit("chat:messageIdUpdate", {
          tempId,
          realId: savedMessage.id,
        })
      }).catch((error) => {
        logger.error("E3001", "Failed to save chat message", { spaceId, playerId, error: (error as Error).message })
        // ❌ DB 저장 실패 시 클라이언트에 롤백 이벤트 전송
        io.to(spaceId).emit("chat:messageFailed", {
          tempId,
          reason: "메시지 저장에 실패했습니다. 다시 시도해주세요.",
        })
      })
    }
  })

  // 👍 Reaction (메시지 리액션) - 실시간 동기화
  socket.on("reaction:toggle", ({ messageId, type }: ReactionAddRequest) => {
    const { spaceId, playerId, nickname } = socket.data

    if (!spaceId || !playerId || !messageId || !type) {
      if (IS_DEV) {
        console.warn(`[Socket] 👍 Reaction rejected: missing data`, { spaceId: !!spaceId, playerId: !!playerId, messageId: !!messageId, type: !!type })
      }
      return
    }

    // 닉네임이 없으면 경고 로그 (디버깅용)
    if (!nickname) {
      console.warn(`[Socket] 👍 Reaction by user without nickname: playerId=${playerId}`)
    }

    // 📢 리액션 데이터 구성
    const reactionData: ReactionData = {
      messageId,
      type,
      userId: playerId,
      userNickname: nickname || "익명",
      action: "add", // 클라이언트에서 toggle 처리
    }

    // 📢 발신자 제외하고 다른 사용자들에게 브로드캐스트
    // (발신자는 Optimistic Update로 이미 UI 반영함)
    socket.to(spaceId).emit("reaction:updated", reactionData)

    if (IS_DEV) {
      console.log(`[Socket] 👍 Reaction ${type} on message ${messageId.substring(0, 10)}... by ${nickname || playerId}`)
    }
  })

  // 📬 Whisper (귓속말) - 특정 닉네임의 사용자에게만 전송 (답장 지원) + DB 저장
  socket.on("whisper:send", ({ targetNickname, content, replyTo }) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (!spaceId || !playerId || !content.trim()) return

    // 🚦 Rate Limit 체크 (📊 Phase 3.11: playerId 기반)
    const rateCheck = checkRateLimit(playerId, content)
    if (!rateCheck.allowed) {
      socket.emit("whisper:error", { message: rateCheck.reason || "메시지 전송이 제한되었습니다." })
      return
    }

    // 🔒 자기 자신에게 귓속말 보내기 방지
    if (targetNickname === nickname) {
      socket.emit("whisper:error", { message: "자기 자신에게는 귓속말을 보낼 수 없습니다." })
      return
    }

    // 💬 같은 공간의 소켓들 중에서 targetNickname과 일치하는 모든 소켓 찾기
    const targetSockets = findAllSocketsByNickname(spaceId, targetNickname)
      .filter(s => s.data.playerId !== playerId) // 본인 소켓 제외

    // 대상 사용자가 없으면 에러 반환
    if (targetSockets.length === 0) {
      socket.emit("whisper:error", { message: `"${targetNickname}" 님을 찾을 수 없습니다.` })
      return
    }

    // 🔒 Phase 2.8: 닉네임 스푸핑 방지 - 동일 닉네임이 다른 playerId를 가지면 에러
    const uniquePlayerIds = new Set(targetSockets.map(s => s.data.playerId))
    if (uniquePlayerIds.size > 1) {
      logger.warn("E5001", "Nickname spoofing detected", { targetNickname, uniqueCount: uniquePlayerIds.size, spaceId })
      socket.emit("whisper:error", { message: `"${targetNickname}" 닉네임이 중복되어 귓속말을 보낼 수 없습니다. 상대방에게 닉네임 변경을 요청하세요.` })
      return
    }

    // 첫 번째 소켓에서 playerId 가져오기 (메시지 데이터용)
    const targetPlayerId = targetSockets[0].data.playerId

    // 🔄 1. Optimistic Broadcasting: 임시 ID로 즉시 전송
    const tempId = `whisper-${Date.now()}-${playerId}`
    const whisperMessage: ChatMessageData = {
      id: tempId,
      senderId: playerId,
      senderNickname: nickname || "Unknown",
      content: content.trim(),
      timestamp: Date.now(),
      type: "whisper",
      targetId: targetPlayerId,
      targetNickname: targetNickname,
      // 답장 정보 포함 (있는 경우에만)
      ...(replyTo && { replyTo }),
    }

    // 💬 모든 수신자 소켓에 전송
    for (const targetSocket of targetSockets) {
      targetSocket.emit("whisper:receive", whisperMessage)
    }

    // 송신자에게 확인 전송 (내가 보낸 귓속말도 화면에 표시하기 위함)
    socket.emit("whisper:sent", whisperMessage)

    if (IS_DEV) {
      console.log(`[Socket] Whisper from ${nickname} to ${targetNickname}: ${content.trim().substring(0, 30)}...`)
    }

    // 📝 2. 백그라운드 DB 저장 (비동기, 블로킹 없음) - Cron과 일관성 유지 (90일 보관)
    const senderType = sessionToken?.startsWith("auth-") ? "USER" : "GUEST"
    const senderId = sessionToken?.replace("auth-", "").replace("guest-", "") || playerId

    prisma.chatMessage.create({
      data: {
        spaceId,
        senderId,
        senderType,
        senderName: nickname || "Unknown",
        content: content.trim(),
        type: "WHISPER",
        targetId: targetPlayerId,  // 귓속말 대상 ID (targetName은 클라이언트에서 관리)
      },
    }).then((savedMessage) => {
      // 🔄 3. ID 업데이트 전송 (발신자 + 수신자에게만)
      const idUpdateData = { tempId, realId: savedMessage.id }

      // 송신자에게 전송
      socket.emit("whisper:messageIdUpdate", idUpdateData)

      // 모든 수신자 소켓에 전송
      for (const targetSocket of targetSockets) {
        targetSocket.emit("whisper:messageIdUpdate", idUpdateData)
      }

      if (IS_DEV) {
        logger.info("I3002", "Whisper saved to DB", { tempId, realId: savedMessage.id })
      }
    }).catch((error) => {
      logger.error("E3001", "Failed to save whisper message", { spaceId, playerId, error: (error as Error).message })
      // ❌ DB 저장 실패 시 발신자와 수신자 모두에게 롤백 이벤트 전송
      const failedData = { tempId, reason: "귓속말 저장에 실패했습니다." }
      socket.emit("whisper:messageFailed", failedData)
      for (const targetSocket of targetSockets) {
        targetSocket.emit("whisper:messageFailed", failedData)
      }
    })
  })

  // 🎉 Party join (파티/구역 입장) - 단순히 구역 내 메시지를 받기 위한 룸 참가
  socket.on("party:join", ({ partyId, partyName }) => {
    const { spaceId, playerId, nickname } = socket.data

    if (!spaceId || !playerId) return

    // 이전 파티에서 나가기 (한 번에 하나의 파티만 참가 가능)
    if (socket.data.partyId) {
      const oldPartyId = socket.data.partyId
      const oldPartyRoomId = getPartyRoomId(spaceId, oldPartyId)

      removeFromPartyRoom(spaceId, oldPartyId, socket.id)
      socket.leave(oldPartyRoomId)

      if (IS_DEV) {
        console.log(`[Socket] ${nickname} left party zone ${oldPartyId}`)
      }
    }

    // 새 파티 룸에 참가
    const partyRoom = getOrCreatePartyRoom(spaceId, partyId)
    const partyRoomId = getPartyRoomId(spaceId, partyId)

    partyRoom.add(socket.id)
    socket.join(partyRoomId)

    // 소켓 데이터에 파티 정보 저장
    socket.data.partyId = partyId
    socket.data.partyName = partyName

    // 입장 확인 전송 (멤버 목록 없음 - 단순 확인)
    socket.emit("party:joined", { partyId, partyName })

    if (IS_DEV) {
      console.log(`[Socket] ${nickname} entered party zone ${partyName} (${partyId})`)
    }
  })

  // 🎉 Party leave (파티/구역 퇴장) - 구역에서 나가면 더 이상 파티 메시지 수신 안 함
  socket.on("party:leave", () => {
    const { spaceId, playerId, nickname, partyId, partyName } = socket.data

    if (!spaceId || !playerId || !partyId) return

    const partyRoomId = getPartyRoomId(spaceId, partyId)

    // 파티 룸에서 제거
    removeFromPartyRoom(spaceId, partyId, socket.id)
    socket.leave(partyRoomId)

    // 소켓 데이터에서 파티 정보 제거
    socket.data.partyId = undefined
    socket.data.partyName = undefined

    // 퇴장 확인 전송
    socket.emit("party:left", { partyId })

    if (IS_DEV) {
      console.log(`[Socket] ${nickname} left party zone ${partyName} (${partyId})`)
    }
  })

  // 🎉 Party message (파티/구역 채팅) - 📊 Phase 3.5: DB 저장 추가
  socket.on("party:message", ({ content }) => {
    const { spaceId, playerId, nickname, partyId, partyName, sessionToken } = socket.data

    if (!spaceId || !playerId || !partyId || !content.trim()) {
      if (!partyId) {
        socket.emit("party:error", { message: "파티에 참가하지 않았습니다." })
      }
      return
    }

    // 🚦 Rate Limit 체크 (📊 Phase 3.11: playerId 기반)
    const rateCheck = checkRateLimit(playerId, content)
    if (!rateCheck.allowed) {
      socket.emit("party:error", { message: rateCheck.reason || "메시지 전송이 제한되었습니다." })
      return
    }

    const partyRoomId = getPartyRoomId(spaceId, partyId)
    const now = Date.now()
    const tempId = `party-${now}-${playerId}`

    // 파티 메시지 생성
    const partyMessage: ChatMessageData = {
      id: tempId,
      senderId: playerId,
      senderNickname: nickname || "Unknown",
      content: content.trim(),
      timestamp: now,
      type: "party",
      partyId,
      partyName,
    }

    // 파티 룸에 있는 모든 멤버에게 전송 (송신자 포함)
    io.to(partyRoomId).emit("party:message", partyMessage)

    // 📊 Phase 3.5: 백그라운드 DB 저장 (비동기, 블로킹 없음)
    const senderType = sessionToken?.startsWith("auth-") ? "USER" : "GUEST"
    const senderId = sessionToken?.replace("auth-", "").replace("guest-", "") || playerId

    prisma.chatMessage.create({
      data: {
        spaceId,
        senderId,
        senderType,
        senderName: nickname || "Unknown",
        content: content.trim(),
        type: "PARTY",
        targetId: partyId, // 파티 ID를 targetId로 저장
      },
    }).then((savedMessage) => {
      // ID 업데이트 (삭제 기능용) - 파티 룸에만 전송
      io.to(partyRoomId).emit("chat:messageIdUpdate", {
        tempId,
        realId: savedMessage.id,
      })
    }).catch((error) => {
      logger.error("E3001", "Failed to save party message", { spaceId, partyId, playerId, error: (error as Error).message })
      // 파티 메시지는 롤백하지 않음 (이미 전송됨, 저장 실패는 로깅만)
    })

    if (IS_DEV) {
      logger.info("I3003", "Party message", { partyName, nickname, contentPreview: content.trim().substring(0, 30) })
    }
  })

  // 🔄 Profile update (닉네임/아바타 핫 업데이트)
  socket.on("player:updateProfile", (data: ProfileUpdateData) => {
    const { spaceId, playerId } = socket.data

    if (!spaceId || !playerId) return

    // Update socket data
    socket.data.nickname = data.nickname
    if (data.avatarColor) {
      socket.data.avatarColor = data.avatarColor
    }
    if (data.avatarConfig) {
      socket.data.avatarConfig = data.avatarConfig  // Phase 1: 커스터마이징
    }

    // Update room state
    const room = rooms.get(spaceId)
    if (room) {
      const player = room.get(playerId)
      if (player) {
        room.set(playerId, {
          ...player,
          nickname: data.nickname,
          ...(data.avatarColor && { avatarColor: data.avatarColor }),
          ...(data.avatarConfig && { avatarConfig: data.avatarConfig }),
        })
      }
    }

    // Broadcast to other players in room
    socket.to(spaceId).emit("player:profileUpdated", {
      id: playerId,
      nickname: data.nickname,
      ...(data.avatarColor && { avatarColor: data.avatarColor }),
      ...(data.avatarConfig && { avatarConfig: data.avatarConfig }),
    })

    if (IS_DEV) {
      console.log(`[Socket] Profile updated for ${playerId}: ${data.nickname} (color: ${data.avatarColor}, config: ${data.avatarConfig ? 'yes' : 'no'})`)
    }
  })

  // ============================================
  // Phase 6: 관리 액션 핸들러
  // ============================================

  // 🔒 관리 권한 검증 헬퍼 (Prisma 직접 쿼리)
  async function verifyAdminPermission(
    spaceId: string,
    sessionToken: string,
    action: string
  ): Promise<{ valid: boolean; error?: string; userId?: string; role?: SpaceRole }> {
    try {
      // auth- 세션에서 userId 추출
      if (!sessionToken?.startsWith("auth-")) {
        return { valid: false, error: "Authentication required for admin actions" }
      }

      const userId = sessionToken.replace("auth-", "")

      // 🌟 SuperAdmin 체크 (모든 공간에서 관리 권한)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true },
      })

      if (user?.isSuperAdmin) {
        console.log(`[Socket] SuperAdmin ${userId} granted ${action} permission`)
        return { valid: true, userId, role: "OWNER" } // SuperAdmin은 OWNER 권한으로 처리
      }

      // Prisma로 직접 SpaceMember 조회
      const member = await prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: { spaceId, userId },
        },
        select: { role: true },
      })

      if (!member) {
        // 공간 소유자인지 직접 확인 (SpaceMember 없어도 Space.ownerId면 OWNER)
        const space = await prisma.space.findUnique({
          where: { id: spaceId },
          select: { ownerId: true },
        })

        if (space?.ownerId === userId) {
          return { valid: true, userId, role: "OWNER" }
        }

        return { valid: false, error: "Not a member of this space" }
      }

      const role = member.role as SpaceRole

      // STAFF 이상만 관리 액션 허용
      if (role !== "OWNER" && role !== "STAFF") {
        return { valid: false, error: "Insufficient permissions" }
      }

      return { valid: true, userId, role }
    } catch (error) {
      console.error(`[Socket] Admin permission verification error for ${action}:`, error)
      return { valid: false, error: "Permission verification error" }
    }
  }

  // 음소거 (admin:mute) - Phase 6: 닉네임 기반 처리 지원
  socket.on("admin:mute", async (data: AdminMuteRequest) => {
    const { spaceId, sessionToken, nickname } = socket.data
    if (!spaceId) {
      socket.emit("admin:error", { action: "mute", message: "공간에 연결되지 않았습니다." })
      return
    }

    // Phase 6: 닉네임 기반 처리 (nickname: 프리픽스)
    const targetNicknameFromPrefix = extractNickname(data.targetMemberId)

    if (targetNicknameFromPrefix) {
      // 🔒 권한 검증 (STAFF 이상만 허용)
      if (sessionToken) {
        const verification = await verifyAdminPermission(spaceId, sessionToken, "mute")
        if (!verification.valid) {
          socket.emit("admin:error", { action: "mute", message: verification.error || "권한이 없습니다." })
          return
        }
      } else if (!IS_DEV) {
        // 운영 환경에서 세션 없으면 거부
        socket.emit("admin:error", { action: "mute", message: "인증이 필요합니다." })
        return
      }

      // 🔇 닉네임으로 모든 대상 소켓 찾기 (같은 닉네임으로 여러 연결 가능)
      const targetSockets = findAllSocketsByNickname(spaceId, targetNicknameFromPrefix)

      if (targetSockets.length === 0) {
        socket.emit("admin:error", { action: "mute", message: `'${targetNicknameFromPrefix}' 사용자를 찾을 수 없습니다.` })
        return
      }

      // 🔇 모든 대상 소켓에 음소거 상태 설정
      for (const targetSocket of targetSockets) {
        targetSocket.data.restriction = "MUTED"
      }
      console.log(`[Socket] 🔇 Applied MUTED restriction to ${targetSockets.length} socket(s) for "${targetNicknameFromPrefix}"`)

      // 첫 번째 소켓에서 playerId 가져오기 (이벤트 데이터용)
      const firstTargetSocket = targetSockets[0]

      // 📊 Phase 3.9: DB에 음소거 상태 저장 (서버 재시작 후에도 유지)
      const targetPlayerId = firstTargetSocket.data.playerId
      if (targetPlayerId) {
        const saved = await saveMemberRestriction(
          spaceId,
          targetPlayerId,
          "MUTED",
          socket.data.playerId,
          data.duration,
          data.reason
        )
        if (saved) {
          console.log(`[Socket] 💾 Saved MUTED restriction to DB for ${targetPlayerId}`)
        }
      }

      // 시스템 메시지로 음소거 알림
      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔇 ${targetNicknameFromPrefix}님이 ${nickname}님에 의해 음소거되었습니다.${data.duration ? ` (${data.duration}분)` : ""}${data.reason ? ` 사유: ${data.reason}` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      // 공간 전체에 음소거 이벤트 알림
      const mutedData: MemberMutedData = {
        memberId: firstTargetSocket.data.playerId || "",
        nickname: targetNicknameFromPrefix,
        mutedBy: socket.data.playerId || "",
        mutedByNickname: nickname || "",
        duration: data.duration,
        reason: data.reason,
        mutedUntil: data.duration ? new Date(Date.now() + data.duration * 60000).toISOString() : undefined,
      }
      io.to(spaceId).emit("member:muted", mutedData)

      console.log(`[Socket] ${targetNicknameFromPrefix} muted by ${nickname} in space ${spaceId} (nickname-based)`)
      return
    }

    // 기존 로직: memberId 기반 API 호출 (관리자 대시보드용)
    if (!sessionToken) {
      socket.emit("admin:error", { action: "mute", message: "인증이 필요합니다." })
      return
    }

    try {
      const response = await fetch(
        `${NEXT_API_URL}/api/spaces/${spaceId}/members/${data.targetMemberId}/mute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `next-auth.session-token=${sessionToken.replace("auth-", "")}`,
          },
          body: JSON.stringify({
            duration: data.duration,
            reason: data.reason,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        socket.emit("admin:error", { action: "mute", message: errorData.error || "음소거 실패" })
        return
      }

      const result = await response.json()
      const targetSocket = findSocketByMemberId(spaceId, data.targetMemberId)
      const targetNickname = targetSocket?.data.nickname || "Unknown"

      const mutedData: MemberMutedData = {
        memberId: data.targetMemberId,
        nickname: targetNickname,
        mutedBy: socket.data.playerId || "",
        mutedByNickname: nickname || "",
        duration: data.duration,
        reason: data.reason,
        mutedUntil: result.mutedUntil,
      }
      io.to(spaceId).emit("member:muted", mutedData)

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔇 ${targetNickname}님이 ${nickname}님에 의해 음소거되었습니다.${data.reason ? ` (사유: ${data.reason})` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      console.log(`[Socket] Member ${data.targetMemberId} muted by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Mute error:", error)
      socket.emit("admin:error", { action: "mute", message: "내부 오류가 발생했습니다." })
    }
  })

  // 음소거 해제 (admin:unmute) - Phase 6: 닉네임 기반 처리 지원
  socket.on("admin:unmute", async (data: AdminUnmuteRequest) => {
    const { spaceId, sessionToken, nickname } = socket.data
    if (!spaceId) {
      socket.emit("admin:error", { action: "unmute", message: "공간에 연결되지 않았습니다." })
      return
    }

    // Phase 6: 닉네임 기반 처리
    const targetNicknameFromPrefix = extractNickname(data.targetMemberId)

    if (targetNicknameFromPrefix) {
      // 🔒 권한 검증 (STAFF 이상만 허용)
      if (sessionToken) {
        const verification = await verifyAdminPermission(spaceId, sessionToken, "unmute")
        if (!verification.valid) {
          socket.emit("admin:error", { action: "unmute", message: verification.error || "권한이 없습니다." })
          return
        }
      } else if (!IS_DEV) {
        // 운영 환경에서 세션 없으면 거부
        socket.emit("admin:error", { action: "unmute", message: "인증이 필요합니다." })
        return
      }

      // 🔊 닉네임으로 모든 대상 소켓 찾기 (같은 닉네임으로 여러 연결 가능)
      const targetSockets = findAllSocketsByNickname(spaceId, targetNicknameFromPrefix)

      if (targetSockets.length === 0) {
        socket.emit("admin:error", { action: "unmute", message: `'${targetNicknameFromPrefix}' 사용자를 찾을 수 없습니다.` })
        return
      }

      // 🔊 모든 대상 소켓에 음소거 해제 상태 설정
      for (const targetSocket of targetSockets) {
        targetSocket.data.restriction = "NONE"
      }
      console.log(`[Socket] 🔊 Removed MUTED restriction from ${targetSockets.length} socket(s) for "${targetNicknameFromPrefix}"`)

      // 첫 번째 소켓에서 playerId 가져오기 (이벤트 데이터용)
      const firstTargetSocket = targetSockets[0]

      // 📊 Phase 3.9: DB에서 음소거 상태 해제 (서버 재시작 후에도 유지)
      const targetPlayerId = firstTargetSocket.data.playerId
      if (targetPlayerId) {
        const saved = await saveMemberRestriction(spaceId, targetPlayerId, "NONE")
        if (saved) {
          console.log(`[Socket] 💾 Saved NONE restriction to DB for ${targetPlayerId}`)
        }
      }

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔊 ${targetNicknameFromPrefix}님의 음소거가 ${nickname}님에 의해 해제되었습니다.`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      const unmutedData: MemberUnmutedData = {
        memberId: firstTargetSocket.data.playerId || "",
        nickname: targetNicknameFromPrefix,
        unmutedBy: socket.data.playerId || "",
        unmutedByNickname: nickname || "",
      }
      io.to(spaceId).emit("member:unmuted", unmutedData)

      console.log(`[Socket] ${targetNicknameFromPrefix} unmuted by ${nickname} in space ${spaceId} (nickname-based)`)
      return
    }

    // 기존 로직: memberId 기반 API 호출
    if (!sessionToken) {
      socket.emit("admin:error", { action: "unmute", message: "인증이 필요합니다." })
      return
    }

    try {
      const response = await fetch(
        `${NEXT_API_URL}/api/spaces/${spaceId}/members/${data.targetMemberId}/mute`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `next-auth.session-token=${sessionToken.replace("auth-", "")}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        socket.emit("admin:error", { action: "unmute", message: errorData.error || "음소거 해제 실패" })
        return
      }

      const targetSocket = findSocketByMemberId(spaceId, data.targetMemberId)
      const targetNickname = targetSocket?.data.nickname || "Unknown"

      const unmutedData: MemberUnmutedData = {
        memberId: data.targetMemberId,
        nickname: targetNickname,
        unmutedBy: socket.data.playerId || "",
        unmutedByNickname: nickname || "",
      }
      io.to(spaceId).emit("member:unmuted", unmutedData)

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🔊 ${targetNickname}님의 음소거가 해제되었습니다.`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      console.log(`[Socket] Member ${data.targetMemberId} unmuted by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Unmute error:", error)
      socket.emit("admin:error", { action: "unmute", message: "내부 오류가 발생했습니다." })
    }
  })

  // 강퇴/차단 (admin:kick) - Phase 6: 닉네임 기반 처리 지원
  socket.on("admin:kick", async (data: AdminKickRequest) => {
    const { spaceId, sessionToken, nickname } = socket.data
    if (!spaceId) {
      socket.emit("admin:error", { action: "kick", message: "공간에 연결되지 않았습니다." })
      return
    }

    // Phase 6: 닉네임 기반 처리 (nickname: 프리픽스)
    const targetNicknameFromPrefix = extractNickname(data.targetMemberId)

    if (targetNicknameFromPrefix) {
      // 🔒 권한 검증 (STAFF 이상만 허용)
      if (sessionToken) {
        const verification = await verifyAdminPermission(spaceId, sessionToken, "kick")
        if (!verification.valid) {
          socket.emit("admin:error", { action: "kick", message: verification.error || "권한이 없습니다." })
          return
        }
      } else if (!IS_DEV) {
        // 운영 환경에서 세션 없으면 거부
        socket.emit("admin:error", { action: "kick", message: "인증이 필요합니다." })
        return
      }

      // 🚫 닉네임으로 모든 대상 소켓 찾기 (같은 닉네임으로 여러 연결 가능)
      const targetSockets = findAllSocketsByNickname(spaceId, targetNicknameFromPrefix)

      if (targetSockets.length === 0) {
        socket.emit("admin:error", { action: "kick", message: `'${targetNicknameFromPrefix}' 사용자를 찾을 수 없습니다.` })
        return
      }

      // 첫 번째 소켓에서 playerId 가져오기 (이벤트 데이터용)
      const firstTargetSocket = targetSockets[0]

      // 시스템 메시지로 강퇴 알림
      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🚫 ${targetNicknameFromPrefix}님이 ${nickname}님에 의해 ${data.ban ? "차단" : "강퇴"}되었습니다.${data.reason ? ` (사유: ${data.reason})` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      // 공간 전체에 강퇴 이벤트 알림
      const kickedData: MemberKickedData = {
        memberId: firstTargetSocket.data.playerId || "",
        nickname: targetNicknameFromPrefix,
        kickedBy: socket.data.playerId || "",
        kickedByNickname: nickname || "",
        reason: data.reason,
        banned: data.ban || false,
      }
      io.to(spaceId).emit("member:kicked", kickedData)

      // 🚫 모든 대상 소켓 연결 종료
      for (const targetSocket of targetSockets) {
        targetSocket.emit("error", { message: data.ban ? "이 공간에서 차단되었습니다." : "이 공간에서 강퇴되었습니다." })
        targetSocket.disconnect(true)
      }

      console.log(`[Socket] 🚫 Kicked ${targetSockets.length} socket(s) for "${targetNicknameFromPrefix}" by ${nickname} in space ${spaceId}`)
      return
    }

    // 기존 로직: memberId 기반 API 호출 (관리자 대시보드용)
    if (!sessionToken) {
      socket.emit("admin:error", { action: "kick", message: "세션 토큰이 없습니다." })
      return
    }

    try {
      const response = await fetch(
        `${NEXT_API_URL}/api/spaces/${spaceId}/members/${data.targetMemberId}/kick`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `next-auth.session-token=${sessionToken.replace("auth-", "")}`,
          },
          body: JSON.stringify({
            reason: data.reason,
            ban: data.ban,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        socket.emit("admin:error", { action: "kick", message: errorData.error || "강퇴 처리에 실패했습니다." })
        return
      }

      const targetSocket = findSocketByMemberId(spaceId, data.targetMemberId)
      const targetNickname = targetSocket?.data.nickname || "Unknown"

      const kickedData: MemberKickedData = {
        memberId: data.targetMemberId,
        nickname: targetNickname,
        kickedBy: socket.data.playerId || "",
        kickedByNickname: nickname || "",
        reason: data.reason,
        banned: data.ban || false,
      }

      io.to(spaceId).emit("member:kicked", kickedData)

      // 강퇴된 사용자의 소켓 연결 종료
      if (targetSocket) {
        targetSocket.emit("error", { message: data.ban ? "이 공간에서 차단되었습니다." : "이 공간에서 강퇴되었습니다." })
        targetSocket.disconnect(true)
      }

      const systemMessage: ChatMessageData = {
        id: `sys-${Date.now()}`,
        senderId: "system",
        senderNickname: "시스템",
        content: `🚫 ${targetNickname}님이 ${nickname}님에 의해 ${data.ban ? "차단" : "강퇴"}되었습니다.${data.reason ? ` (사유: ${data.reason})` : ""}`,
        timestamp: Date.now(),
        type: "system",
      }
      io.to(spaceId).emit("chat:system", systemMessage)

      console.log(`[Socket] Member ${data.targetMemberId} ${data.ban ? "banned" : "kicked"} by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Kick error:", error)
      socket.emit("admin:error", { action: "kick", message: "내부 오류가 발생했습니다." })
    }
  })

  // 메시지 삭제 (admin:deleteMessage)
  socket.on("admin:deleteMessage", async (data: AdminDeleteMessageRequest) => {
    const { spaceId, sessionToken, nickname, playerId } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("admin:error", { action: "deleteMessage", message: "공간에 연결되지 않았습니다." })
      return
    }

    // 🔒 권한 검증 (STAFF 이상만 허용)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "deleteMessage")
    if (!verification.valid) {
      socket.emit("admin:error", { action: "deleteMessage", message: verification.error || "권한이 없습니다." })
      return
    }

    try {
      // 메시지 조회
      const message = await prisma.chatMessage.findUnique({
        where: { id: data.messageId },
      })

      if (!message) {
        socket.emit("admin:error", { action: "deleteMessage", message: "메시지를 찾을 수 없습니다." })
        return
      }

      if (message.spaceId !== spaceId) {
        socket.emit("admin:error", { action: "deleteMessage", message: "이 공간의 메시지가 아닙니다." })
        return
      }

      // 소프트 삭제
      await prisma.chatMessage.update({
        where: { id: data.messageId },
        data: {
          isDeleted: true,
          deletedBy: verification.userId,
          deletedAt: new Date(),
        },
      })

      // 이벤트 로그 기록
      await prisma.spaceEventLog.create({
        data: {
          spaceId,
          userId: verification.userId,
          eventType: "MESSAGE_DELETED",
          payload: {
            messageId: data.messageId,
            deletedBy: verification.userId,
            originalSenderId: message.senderId,
          },
        },
      })

      const deletedData: MessageDeletedData = {
        messageId: data.messageId,
        deletedBy: playerId || "",
        deletedByNickname: nickname || "",
      }

      io.to(spaceId).emit("chat:messageDeleted", deletedData)

      console.log(`[Socket] Message ${data.messageId} deleted by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Delete message error:", error)
      socket.emit("admin:error", { action: "deleteMessage", message: "내부 오류가 발생했습니다." })
    }
  })

  // 공지사항 (admin:announce)
  socket.on("admin:announce", async (data: AdminAnnounceRequest) => {
    const { spaceId, sessionToken, nickname, playerId } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("admin:error", { action: "announce", message: "Not connected to space" })
      return
    }

    // 권한 검증 (STAFF 이상)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "announce")
    if (!verification.valid) {
      socket.emit("admin:error", { action: "announce", message: verification.error || "Permission denied" })
      return
    }

    const announcement: AnnouncementData = {
      id: `announce-${Date.now()}`,
      content: data.content.trim(),
      senderId: playerId || "",
      senderNickname: nickname || "",
      timestamp: Date.now(),
    }

    // 📢 공지는 space:announcement 이벤트만 전송 (중복 방지)
    // 클라이언트에서 handleAnnouncement가 처리함
    io.to(spaceId).emit("space:announcement", announcement)

    console.log(`[Socket] Announcement by ${nickname} in space ${spaceId}: ${data.content.substring(0, 50)}...`)
  })

  // ============================================
  // 🔴 녹화 이벤트 핸들러 (법적 준수)
  // Staff, Owner, SuperAdmin만 녹화 가능
  // 녹화 시작/중지 시 공간 내 모든 참가자에게 REC 상태 브로드캐스트
  // ============================================

  // 녹화 시작
  socket.on("recording:start", async () => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("recording:error", { message: "공간 정보가 없습니다." })
      return
    }

    // 🔒 권한 검증: STAFF 이상만 녹화 가능
    if (sessionToken) {
      const verification = await verifyAdminPermission(spaceId, sessionToken, "recording")
      if (!verification.valid) {
        socket.emit("recording:error", { message: verification.error || "녹화 권한이 없습니다. STAFF 이상만 녹화할 수 있습니다." })
        return
      }
    } else if (!IS_DEV) {
      // 운영 환경에서 세션 없으면 거부
      socket.emit("recording:error", { message: "인증이 필요합니다." })
      return
    }

    // 이미 녹화 중인지 확인
    const existingRecording = recordingStates.get(spaceId)
    if (existingRecording?.isRecording) {
      socket.emit("recording:error", { message: `이미 ${existingRecording.recorderNickname}님이 녹화 중입니다.` })
      return
    }

    // 녹화 상태 저장
    const recordingStatus: RecordingStatusData = {
      isRecording: true,
      recorderId: playerId,
      recorderNickname: nickname || "Unknown",
      startedAt: Date.now(),
    }
    recordingStates.set(spaceId, recordingStatus)

    // 📢 공간 내 모든 참가자에게 브로드캐스트 (REC 표시)
    io.to(spaceId).emit("recording:started", recordingStatus)

    console.log(`[Socket] 🔴 Recording STARTED by ${nickname} in space ${spaceId}`)
  })

  // 녹화 중지
  socket.on("recording:stop", async () => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("recording:error", { message: "공간 정보가 없습니다." })
      return
    }

    const existingRecording = recordingStates.get(spaceId)

    // 녹화 중이 아닌 경우
    if (!existingRecording?.isRecording) {
      socket.emit("recording:error", { message: "현재 녹화 중이 아닙니다." })
      return
    }

    // 🔒 권한 검증: 녹화 시작한 사람 또는 STAFF 이상만 중지 가능
    const isRecorder = existingRecording.recorderId === playerId
    if (!isRecorder && sessionToken) {
      const verification = await verifyAdminPermission(spaceId, sessionToken, "recording")
      if (!verification.valid) {
        socket.emit("recording:error", { message: "녹화 중지 권한이 없습니다." })
        return
      }
    } else if (!isRecorder && !IS_DEV) {
      socket.emit("recording:error", { message: "녹화 중지 권한이 없습니다." })
      return
    }

    // 녹화 상태 업데이트
    const stoppedStatus: RecordingStatusData = {
      isRecording: false,
      recorderId: existingRecording.recorderId,
      recorderNickname: existingRecording.recorderNickname,
      startedAt: existingRecording.startedAt,
    }
    recordingStates.delete(spaceId)

    // 📢 공간 내 모든 참가자에게 브로드캐스트 (REC 해제)
    io.to(spaceId).emit("recording:stopped", stoppedStatus)

    console.log(`[Socket] ⬛ Recording STOPPED by ${nickname} in space ${spaceId}`)
  })

  // ============================================
  // 🔦 스포트라이트 이벤트 (공간 기반 커뮤니케이션)
  // ============================================

  // 스포트라이트 활성화
  socket.on("spotlight:activate", async () => {
    const { spaceId, playerId, nickname, sessionToken, hasSpotlightGrant, spotlightGrantId } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("spotlight:error", { message: "공간 정보가 없습니다." })
      return
    }

    // 🔒 권한 검증: 스포트라이트 권한이 있어야 활성화 가능
    if (!hasSpotlightGrant || !spotlightGrantId) {
      socket.emit("spotlight:error", { message: "스포트라이트 권한이 없습니다." })
      return
    }

    try {
      // DB에서 권한 유효성 재확인
      const grant = await prisma.spotlightGrant.findFirst({
        where: {
          id: spotlightGrantId,
          spaceId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      })

      if (!grant) {
        socket.data.hasSpotlightGrant = false
        socket.data.spotlightGrantId = undefined
        socket.emit("spotlight:error", { message: "스포트라이트 권한이 만료되었습니다." })
        return
      }

      // 활성화 상태로 업데이트
      await prisma.spotlightGrant.update({
        where: { id: spotlightGrantId },
        data: { isActive: true },
      })

      socket.data.isSpotlightActive = true

      // 메모리 상태 업데이트
      const spotlightState = getOrCreateSpotlightState(spaceId)
      spotlightState.set(playerId, {
        participantId: playerId,
        nickname: nickname || "Unknown",
      })

      // 📢 공간 내 모든 참가자에게 브로드캐스트
      const activatedData: SpotlightActivatedData = {
        participantId: playerId,
        nickname: nickname || "Unknown",
        isActive: true,
      }
      io.to(spaceId).emit("spotlight:activated", activatedData)

      console.log(`[Socket] 🔦 Spotlight ACTIVATED by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Spotlight activate error:", error)
      socket.emit("spotlight:error", { message: "스포트라이트 활성화에 실패했습니다." })
    }
  })

  // 스포트라이트 비활성화
  socket.on("spotlight:deactivate", async () => {
    const { spaceId, playerId, nickname, spotlightGrantId, isSpotlightActive } = socket.data

    if (!spaceId || !playerId) {
      socket.emit("spotlight:error", { message: "공간 정보가 없습니다." })
      return
    }

    // 이미 비활성화 상태인 경우
    if (!isSpotlightActive) {
      socket.emit("spotlight:error", { message: "스포트라이트가 이미 비활성화 상태입니다." })
      return
    }

    try {
      // DB 업데이트
      if (spotlightGrantId) {
        await prisma.spotlightGrant.update({
          where: { id: spotlightGrantId },
          data: { isActive: false },
        })
      }

      socket.data.isSpotlightActive = false

      // 메모리 상태 업데이트
      const spotlightState = spotlightStates.get(spaceId)
      if (spotlightState) {
        spotlightState.delete(playerId)
      }

      // 📢 공간 내 모든 참가자에게 브로드캐스트
      const deactivatedData: SpotlightActivatedData = {
        participantId: playerId,
        nickname: nickname || "Unknown",
        isActive: false,
      }
      io.to(spaceId).emit("spotlight:deactivated", deactivatedData)

      console.log(`[Socket] ⬛ Spotlight DEACTIVATED by ${nickname} in space ${spaceId}`)
    } catch (error) {
      console.error("[Socket] Spotlight deactivate error:", error)
      socket.emit("spotlight:error", { message: "스포트라이트 비활성화에 실패했습니다." })
    }
  })

  // ============================================
  // 📡 근접 통신 설정
  // ============================================

  // 근접 통신 ON/OFF 설정 (관리자 전용)
  socket.on("proximity:set", async (data: { enabled: boolean }) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data

    console.log(`[Socket] 📡 proximity:set received:`, { enabled: data.enabled, spaceId, playerId, nickname, sessionToken: sessionToken?.substring(0, 10) + '...' })

    if (!spaceId || !playerId) {
      console.warn(`[Socket] 📡 proximity:set failed: not in space`)
      socket.emit("proximity:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // 🔒 권한 검증 (STAFF 이상만 허용)
    if (sessionToken) {
      console.log(`[Socket] 📡 Verifying admin permission for proximity...`)
      const verification = await verifyAdminPermission(spaceId, sessionToken, "proximity")
      console.log(`[Socket] 📡 Verification result:`, verification)
      if (!verification.valid) {
        console.warn(`[Socket] 📡 proximity:set denied:`, verification.error)
        socket.emit("proximity:error", { message: verification.error || "근접 통신 설정 권한이 없습니다. STAFF 이상만 가능합니다." })
        return
      }
    } else if (!IS_DEV) {
      console.warn(`[Socket] 📡 proximity:set denied: no sessionToken in production`)
      socket.emit("proximity:error", { message: "권한이 없습니다." })
      return
    }

    // 상태 변경
    setProximityState(spaceId, data.enabled)

    // 📢 공간 내 모든 참가자에게 브로드캐스트
    io.to(spaceId).emit("proximity:changed", {
      enabled: data.enabled,
      changedBy: nickname || "Unknown",
    })

    // 시스템 메시지 전송
    const modeText = data.enabled ? "근접 모드" : "전역 모드"
    const systemMessage: ChatMessageData = {
      id: `sys-proximity-${Date.now()}`,
      senderId: "system",
      senderNickname: "시스템",
      content: `📡 음성/영상 통신이 ${modeText}로 변경되었습니다. (by ${nickname})`,
      timestamp: Date.now(),
      type: "system",
    }
    io.to(spaceId).emit("chat:system", systemMessage)

    console.log(`[Socket] 📡 Proximity ${data.enabled ? "ENABLED" : "DISABLED"} by ${nickname} in space ${spaceId}`)
  })

  // ============================================
  // 🗺️ 맵 오브젝트 이벤트 (에디터)
  // ============================================

  // 오브젝트 배치
  socket.on("object:place", async (data: ObjectPlaceRequest) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("object:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // 🔒 권한 검증 (STAFF 이상만 허용)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "placeObject")
    if (!verification.valid) {
      socket.emit("object:error", { message: verification.error || "오브젝트 배치 권한이 없습니다." })
      return
    }

    try {
      // DB에 오브젝트 저장
      const mapObject = await prisma.mapObject.create({
        data: {
          spaceId,
          assetId: data.assetId,
          positionX: data.position.x,
          positionY: data.position.y,
          rotation: data.rotation || 0,
          linkedObjectId: data.linkedObjectId,
          customData: data.customData as object | undefined,
          placedBy: playerId,
          placedByType: sessionToken.startsWith("auth-") ? "USER" : "GUEST",
        },
      })

      // MapObjectData로 변환
      const objectData: MapObjectData = {
        id: mapObject.id,
        assetId: mapObject.assetId,
        position: { x: mapObject.positionX, y: mapObject.positionY },
        rotation: mapObject.rotation as 0 | 90 | 180 | 270,
        linkedObjectId: mapObject.linkedObjectId || undefined,
        customData: mapObject.customData as Record<string, unknown> | undefined,
        placedBy: mapObject.placedBy,
        placedAt: mapObject.createdAt.toISOString(),
      }

      // 공간 내 모든 클라이언트에게 브로드캐스트
      io.to(spaceId).emit("object:placed", {
        object: objectData,
        placedByNickname: nickname,
      })

      if (IS_DEV) {
        console.log(`[Socket] 📦 Object placed by ${nickname}: ${data.assetId} at (${data.position.x}, ${data.position.y})`)
      }
    } catch (error) {
      console.error("[Socket] Object place error:", error)
      socket.emit("object:error", { message: "오브젝트 배치에 실패했습니다." })
    }
  })

  // 오브젝트 업데이트
  socket.on("object:update", async (data: ObjectUpdateRequest) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("object:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // 🔒 권한 검증 (STAFF 이상만 허용)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "updateObject")
    if (!verification.valid) {
      socket.emit("object:error", { message: verification.error || "오브젝트 수정 권한이 없습니다." })
      return
    }

    try {
      // 기존 오브젝트 확인
      const existing = await prisma.mapObject.findFirst({
        where: { id: data.objectId, spaceId },
      })

      if (!existing) {
        socket.emit("object:error", { message: "오브젝트를 찾을 수 없습니다." })
        return
      }

      // 업데이트 데이터 준비 (Prisma 타입 호환)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {}

      if (data.position) {
        updateData.positionX = data.position.x
        updateData.positionY = data.position.y
      }
      if (data.rotation !== undefined) {
        updateData.rotation = data.rotation
      }
      if (data.linkedObjectId !== undefined) {
        updateData.linkedObjectId = data.linkedObjectId || null
      }
      if (data.customData !== undefined) {
        updateData.customData = data.customData || undefined
      }

      // DB 업데이트
      const mapObject = await prisma.mapObject.update({
        where: { id: data.objectId },
        data: updateData as Parameters<typeof prisma.mapObject.update>[0]["data"],
      })

      // MapObjectData로 변환
      const objectData: MapObjectData = {
        id: mapObject.id,
        assetId: mapObject.assetId,
        position: { x: mapObject.positionX, y: mapObject.positionY },
        rotation: mapObject.rotation as 0 | 90 | 180 | 270,
        linkedObjectId: mapObject.linkedObjectId || undefined,
        customData: mapObject.customData as Record<string, unknown> | undefined,
        placedBy: mapObject.placedBy,
        placedAt: mapObject.createdAt.toISOString(),
      }

      // 공간 내 모든 클라이언트에게 브로드캐스트
      io.to(spaceId).emit("object:updated", {
        object: objectData,
        updatedByNickname: nickname,
      })

      if (IS_DEV) {
        console.log(`[Socket] 📦 Object updated by ${nickname}: ${data.objectId}`)
      }
    } catch (error) {
      console.error("[Socket] Object update error:", error)
      socket.emit("object:error", { message: "오브젝트 수정에 실패했습니다." })
    }
  })

  // 오브젝트 삭제
  socket.on("object:delete", async (data: ObjectDeleteRequest) => {
    const { spaceId, playerId, nickname, sessionToken } = socket.data
    if (!spaceId || !sessionToken) {
      socket.emit("object:error", { message: "공간에 먼저 입장해야 합니다." })
      return
    }

    // 🔒 권한 검증 (STAFF 이상만 허용)
    const verification = await verifyAdminPermission(spaceId, sessionToken, "deleteObject")
    if (!verification.valid) {
      socket.emit("object:error", { message: verification.error || "오브젝트 삭제 권한이 없습니다." })
      return
    }

    try {
      // 기존 오브젝트 확인
      const existing = await prisma.mapObject.findFirst({
        where: { id: data.objectId, spaceId },
      })

      if (!existing) {
        socket.emit("object:error", { message: "오브젝트를 찾을 수 없습니다." })
        return
      }

      // 연결된 오브젝트가 있으면 링크 해제
      if (existing.linkedObjectId) {
        await prisma.mapObject.updateMany({
          where: { linkedObjectId: existing.id },
          data: { linkedObjectId: null },
        })
      }

      // DB에서 삭제
      await prisma.mapObject.delete({
        where: { id: data.objectId },
      })

      // 공간 내 모든 클라이언트에게 브로드캐스트
      io.to(spaceId).emit("object:deleted", {
        objectId: data.objectId,
        deletedBy: playerId,
        deletedByNickname: nickname,
      })

      if (IS_DEV) {
        console.log(`[Socket] 🗑️ Object deleted by ${nickname}: ${data.objectId}`)
      }
    } catch (error) {
      console.error("[Socket] Object delete error:", error)
      socket.emit("object:error", { message: "오브젝트 삭제에 실패했습니다." })
    }
  })

  // 멤버 ID로 소켓 찾기 헬퍼
  function findSocketByMemberId(spaceId: string, memberId: string) {
    const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
    if (!socketsInRoom) return null

    for (const socketId of socketsInRoom) {
      const s = io.sockets.sockets.get(socketId)
      if (s && s.data.memberId === memberId) {
        return s
      }
    }
    return null
  }

  // 닉네임으로 소켓 찾기 헬퍼 (Phase 6: @ 명령어용)
  function findSocketByNickname(spaceId: string, targetNickname: string) {
    const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
    if (!socketsInRoom) return null

    for (const socketId of socketsInRoom) {
      const s = io.sockets.sockets.get(socketId)
      if (s && s.data.nickname === targetNickname) {
        return s
      }
    }
    return null
  }

  // 🔇 닉네임으로 모든 소켓 찾기 (같은 닉네임으로 여러 연결 가능)
  function findAllSocketsByNickname(spaceId: string, targetNickname: string) {
    const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
    if (!socketsInRoom) return []

    const matchedSockets: typeof socket[] = []
    for (const socketId of socketsInRoom) {
      const s = io.sockets.sockets.get(socketId)
      if (s && s.data.nickname === targetNickname) {
        matchedSockets.push(s)
      }
    }
    return matchedSockets
  }

  // nickname: 프리픽스에서 닉네임 추출
  function extractNickname(targetMemberId: string): string | null {
    if (targetMemberId.startsWith("nickname:")) {
      return targetMemberId.replace("nickname:", "")
    }
    return null
  }

  // Disconnect
  socket.on("disconnect", (reason) => {
    const { spaceId, playerId, nickname, sessionToken, partyId, partyName } = socket.data

    // 🚦 Rate Limit 상태 정리 (📊 Phase 3.11: playerId 기반)
    if (playerId && spaceId) {
      cleanupRateLimitState(playerId, spaceId)
    }

    if (spaceId && playerId) {
      removePlayerFromRoom(spaceId, playerId)

      // 🔴 녹화 정리: 녹화자가 연결 종료하면 녹화 중지
      const existingRecording = recordingStates.get(spaceId)
      if (existingRecording?.isRecording && existingRecording.recorderId === playerId) {
        const stoppedStatus: RecordingStatusData = {
          isRecording: false,
          recorderId: existingRecording.recorderId,
          recorderNickname: existingRecording.recorderNickname,
          startedAt: existingRecording.startedAt,
        }
        recordingStates.delete(spaceId)
        io.to(spaceId).emit("recording:stopped", stoppedStatus)
        console.log(`[Socket] ⬛ Recording auto-stopped (${nickname} disconnected) in space ${spaceId}`)
      }

      // 🔦 스포트라이트 정리: 스포트라이트 활성화 중이었다면 비활성화
      const spotlightState = spotlightStates.get(spaceId)
      if (spotlightState?.has(playerId)) {
        spotlightState.delete(playerId)

        // DB 업데이트 (비동기, 실패해도 disconnect 처리는 계속)
        if (socket.data.spotlightGrantId) {
          prisma.spotlightGrant.update({
            where: { id: socket.data.spotlightGrantId },
            data: { isActive: false },
          }).catch(() => {})
        }

        // 다른 참가자에게 알림
        const deactivatedData: SpotlightActivatedData = {
          participantId: playerId,
          nickname: nickname || "Unknown",
          isActive: false,
        }
        io.to(spaceId).emit("spotlight:deactivated", deactivatedData)
        console.log(`[Socket] ⬛ Spotlight auto-deactivated (${nickname} disconnected) in space ${spaceId}`)
      }

      // 🎉 파티 정리: 파티에 참가 중이었다면 룸에서 제거
      if (partyId) {
        removeFromPartyRoom(spaceId, partyId, socket.id)

        if (IS_DEV) {
          console.log(`[Socket] ${nickname} disconnected from party zone ${partyName} (${partyId})`)
        }
      }

      // 📊 EXIT 이벤트 로깅 (비동기, 실패해도 disconnect 처리는 계속)
      if (sessionToken) {
        logGuestEvent(sessionToken, spaceId, "EXIT", { reason: `disconnect:${reason}` }).catch(() => {})
      }

      // Notify other players
      socket.to(spaceId).emit("player:left", { id: playerId })

      // Send system message
      if (nickname) {
        const systemMessage: ChatMessageData = {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderNickname: "시스템",
          content: `${nickname}님이 연결이 끊어졌습니다.`,
          timestamp: Date.now(),
          type: "system",
        }
        io.to(spaceId).emit("chat:system", systemMessage)
      }
    }

    logger.info("E2002", "Client disconnected", { socketId: socket.id, reason })
  })
})

// Immediate startup log (before listen completes)
logger.info("E6001", "Starting server", { port: PORT, env: process.env.NODE_ENV, cors: CORS_ORIGINS })

// Graceful shutdown handler
process.on("SIGTERM", () => {
  logger.info("E6002", "Received SIGTERM, shutting down gracefully")
  httpServer.close(() => {
    logger.info("E6002", "Server closed")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  logger.info("E6002", "Received SIGINT, shutting down gracefully")
  httpServer.close(() => {
    logger.info("E6002", "Server closed")
    process.exit(0)
  })
})

// Start HTTP server (Socket.io attaches automatically)
// Railway requires binding to 0.0.0.0 for external access
httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info("E6001", "Server successfully running", { port: PORT, healthCheck: `http://0.0.0.0:${PORT}/health` })
})

httpServer.on("error", (err) => {
  logger.error("E6003", "Server error", { error: err.message })
  process.exit(1)
})
