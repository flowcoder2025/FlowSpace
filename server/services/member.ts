/**
 * Member Restriction Service
 * Load and save mute/ban status from database
 */

import { prisma } from "../prisma"
import type { ChatRestriction } from "../../src/features/space/socket/types"

export interface MemberRestrictionResult {
  restriction: ChatRestriction
  memberId: string
}

/**
 * Load member restriction status from DB
 * - Authenticated users: query by userId
 * - Guest users: query by guestSessionId
 */
export async function loadMemberRestriction(
  spaceId: string,
  playerId: string,
  sessionToken?: string
): Promise<MemberRestrictionResult | null> {
  try {
    // Determine query condition based on playerId format
    // user-{userId} → query by userId
    // guest-{guestSessionId} → query by guestSessionId
    let whereCondition: { spaceId: string; userId?: string; guestSessionId?: string }

    if (playerId.startsWith("user-")) {
      const userId = playerId.replace("user-", "")
      whereCondition = { spaceId, userId }
    } else if (playerId.startsWith("guest-")) {
      const guestSessionId = playerId.replace("guest-", "")
      whereCondition = { spaceId, guestSessionId }
    } else {
      // dev sessions etc. are skipped
      return null
    }

    const member = await prisma.spaceMember.findFirst({
      where: whereCondition,
      select: { id: true, restriction: true, restrictedUntil: true },
    })

    if (!member) return null

    // Check if temporary mute has expired
    if (member.restriction === "MUTED" && member.restrictedUntil) {
      if (new Date() > member.restrictedUntil) {
        // Mute expired → update to NONE
        await prisma.spaceMember.update({
          where: { id: member.id },
          data: { restriction: "NONE", restrictedUntil: null },
        })
        return { restriction: "NONE", memberId: member.id }
      }
    }

    return { restriction: member.restriction as ChatRestriction, memberId: member.id }
  } catch (error) {
    console.error("[Socket] loadMemberRestriction error:", error)
    return null
  }
}

/**
 * Save member restriction status to DB
 */
export async function saveMemberRestriction(
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
