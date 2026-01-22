/**
 * Event Logger Service
 * Logs ENTER/EXIT events for guest and authenticated users
 */

import { NEXT_API_URL, IS_DEV } from "../config"

/**
 * Log event for guest sessions
 * - dev-* sessions: skip logging
 * - guest-* sessions: call guest event API
 * - auth-* sessions: call auth user event API
 */
export async function logGuestEvent(
  sessionToken: string,
  spaceId: string,
  eventType: "EXIT" | "CHAT",
  payload?: Record<string, unknown>
): Promise<boolean> {
  try {
    // Skip dev sessions
    if (!sessionToken || sessionToken.startsWith("dev-")) {
      return false
    }

    // Auth sessions use auth user logging API
    if (sessionToken.startsWith("auth-")) {
      const userId = sessionToken.replace("auth-", "")
      return await logAuthUserEvent(userId, spaceId, eventType, payload)
    }

    // Guest session logging
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

/**
 * Log event for authenticated users
 * Currently only EXIT events are logged (CHAT handled separately)
 */
export async function logAuthUserEvent(
  userId: string,
  spaceId: string,
  eventType: "EXIT" | "CHAT",
  payload?: Record<string, unknown>
): Promise<boolean> {
  try {
    // Only log EXIT events (CHAT handled separately)
    if (eventType !== "EXIT") {
      return false
    }

    const response = await fetch(`${NEXT_API_URL}/api/spaces/${spaceId}/visit`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId, // Server-to-server header
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
