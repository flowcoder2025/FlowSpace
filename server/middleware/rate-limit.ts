/**
 * Rate Limiting Middleware
 * Prevents chat spam with frequency and duplicate detection
 */

import { createHash } from "crypto"
import type { TypedServer } from "../utils/helpers"

// Rate limit configuration
export const RATE_LIMIT = {
  MAX_MESSAGES: 5,           // Max messages in window
  WINDOW_MS: 5000,           // Time window (5 seconds)
  MAX_DUPLICATES: 3,         // Max consecutive identical messages
  MAX_MESSAGE_LENGTH: 2000,  // Max message length (characters)
}

interface RateLimitState {
  timestamps: number[]       // Message send timestamps
  lastMessageHash: string    // Last message hash (for duplicate check)
  duplicateCount: number     // Consecutive duplicate count
}

// Rate limit state map (playerId-based to prevent multi-tab bypass)
const rateLimitMap = new Map<string, RateLimitState>()

/**
 * SHA256-based hash for duplicate message comparison
 * Performance: ~0.01ms for short chat messages
 */
function messageHash(str: string): string {
  return createHash("sha256").update(str).digest("hex").slice(0, 16)
}

export interface RateLimitResult {
  allowed: boolean
  reason?: string
}

/**
 * Check and update rate limit for a player
 * Returns { allowed: boolean, reason?: string }
 */
export function checkRateLimit(
  playerId: string,
  content: string
): RateLimitResult {
  const now = Date.now()
  // Apply trim first for consistent length check and hash calculation
  const trimmedContent = content.trim()
  const contentHash = messageHash(trimmedContent.toLowerCase())

  // 1. Message length check (based on trimmed length)
  if (trimmedContent.length > RATE_LIMIT.MAX_MESSAGE_LENGTH) {
    return {
      allowed: false,
      reason: `메시지가 너무 깁니다. (최대 ${RATE_LIMIT.MAX_MESSAGE_LENGTH}자)`,
    }
  }

  // Empty message check
  if (trimmedContent.length === 0) {
    return {
      allowed: false,
      reason: "메시지 내용이 없습니다.",
    }
  }

  // 2. Get or create rate limit state (playerId-based)
  let state = rateLimitMap.get(playerId)
  if (!state) {
    state = {
      timestamps: [],
      lastMessageHash: "",
      duplicateCount: 0,
    }
    rateLimitMap.set(playerId, state)
  }

  // 3. Remove timestamps outside the time window
  state.timestamps = state.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT.WINDOW_MS
  )

  // 4. Frequency limit check (5msg/5sec)
  if (state.timestamps.length >= RATE_LIMIT.MAX_MESSAGES) {
    const oldestTs = state.timestamps[0]
    const waitTime = Math.ceil((RATE_LIMIT.WINDOW_MS - (now - oldestTs)) / 1000)
    return {
      allowed: false,
      reason: `메시지를 너무 빨리 보내고 있습니다. ${waitTime}초 후에 다시 시도해주세요.`,
    }
  }

  // 5. Duplicate message check
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

  // 6. Add timestamp (allowed)
  state.timestamps.push(now)

  return { allowed: true }
}

/**
 * Cleanup rate limit state on disconnect
 * Note: playerId-based, so only cleanup if no other sockets with same playerId exist
 */
export function cleanupRateLimitState(
  io: TypedServer,
  playerId: string,
  spaceId: string
): void {
  // Check if another socket with same playerId is still connected
  const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
  if (socketsInRoom) {
    for (const socketId of socketsInRoom) {
      const s = io.sockets.sockets.get(socketId)
      if (s && s.data.playerId === playerId) {
        // Another socket with same playerId still connected, don't cleanup
        return
      }
    }
  }
  rateLimitMap.delete(playerId)
}
