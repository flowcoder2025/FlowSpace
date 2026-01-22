/**
 * Session Verification Service
 * Verifies guest session tokens with the Next.js API
 */

import { NEXT_API_URL } from "../config"

export interface VerifySessionResult {
  valid: boolean
  participantId?: string
  nickname?: string
  avatar?: string
  error?: string
}

/**
 * Verify guest session token
 * Calls the Next.js API to validate session
 */
export async function verifyGuestSession(
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
