/**
 * Admin Permission Verification Service
 * Verifies if a user has admin permissions (STAFF or OWNER)
 */

import { prisma } from "../prisma"
import type { SpaceRole } from "../../src/features/space/socket/types"

export interface AdminVerifyResult {
  valid: boolean
  error?: string
  userId?: string
  role?: SpaceRole
}

/**
 * Verify admin permission for a given action
 * Requires STAFF or OWNER role, or SuperAdmin status
 */
export async function verifyAdminPermission(
  spaceId: string,
  sessionToken: string,
  action: string
): Promise<AdminVerifyResult> {
  try {
    console.log(`[Socket] verifyAdminPermission called: action=${action}, sessionToken=${sessionToken?.substring(0, 15)}...`)

    // Extract userId from auth- session
    if (!sessionToken?.startsWith("auth-")) {
      console.warn(`[Socket] verifyAdminPermission: sessionToken does not start with 'auth-'`)
      return { valid: false, error: "Authentication required for admin actions" }
    }

    const userId = sessionToken.replace("auth-", "")
    console.log(`[Socket] verifyAdminPermission: extracted userId=${userId}`)

    // Check SuperAdmin status (full access to all spaces)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    })
    console.log(`[Socket] verifyAdminPermission: user found=${!!user}, isSuperAdmin=${user?.isSuperAdmin}`)

    if (user?.isSuperAdmin) {
      console.log(`[Socket] SuperAdmin ${userId} granted ${action} permission`)
      return { valid: true, userId, role: "OWNER" } // SuperAdmin treated as OWNER
    }

    // Query SpaceMember directly
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: { spaceId, userId },
      },
      select: { role: true },
    })

    if (!member) {
      // Check if user is space owner (might not have SpaceMember entry)
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

    // Only STAFF or higher can perform admin actions
    if (role !== "OWNER" && role !== "STAFF") {
      return { valid: false, error: "Insufficient permissions" }
    }

    return { valid: true, userId, role }
  } catch (error) {
    console.error(`[Socket] Admin permission verification error for ${action}:`, error)
    return { valid: false, error: "Permission verification error" }
  }
}
