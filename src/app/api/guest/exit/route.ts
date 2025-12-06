/**
 * Guest Exit API
 *
 * POST /api/guest/exit - Record guest exit event
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceEventType } from "@prisma/client"

// ============================================
// Types
// ============================================
interface ExitRequestBody {
  sessionToken: string
  spaceId: string
}

// ============================================
// POST /api/guest/exit - Record exit event
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body: ExitRequestBody = await request.json()

    if (!body.sessionToken || !body.spaceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Find guest session
    const guestSession = await prisma.guestSession.findFirst({
      where: {
        sessionToken: body.sessionToken,
        spaceId: body.spaceId,
      },
    })

    if (!guestSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    // Record exit event
    await prisma.spaceEventLog.create({
      data: {
        spaceId: body.spaceId,
        guestSessionId: guestSession.id,
        eventType: SpaceEventType.EXIT,
        payload: {
          nickname: guestSession.nickname,
          avatar: guestSession.avatar,
        },
      },
    })

    // Expire the session immediately
    await prisma.guestSession.update({
      where: { id: guestSession.id },
      data: { expiresAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to record exit:", error)
    return NextResponse.json(
      { error: "Failed to record exit" },
      { status: 500 }
    )
  }
}
