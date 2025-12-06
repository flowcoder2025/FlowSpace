import { NextRequest, NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"

// LiveKit credentials from environment variables
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey"
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsecret"

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName, participantId } = await request.json()

    if (!roomName || !participantName || !participantId) {
      return NextResponse.json(
        { error: "Missing required fields: roomName, participantName, participantId" },
        { status: 400 }
      )
    }

    // Create access token
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantId,
      name: participantName,
      ttl: 60 * 60 * 4, // 4 hours
    })

    // Grant room permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await token.toJwt()

    return NextResponse.json({ token: jwt })
  } catch (error) {
    console.error("[LiveKit Token] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
