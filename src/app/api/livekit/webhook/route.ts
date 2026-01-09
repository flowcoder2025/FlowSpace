import { NextRequest, NextResponse } from "next/server"
import { WebhookReceiver } from "livekit-server-sdk"
import { prisma } from "@/lib/prisma"
import { SpaceEventType, Prisma } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ""
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ""

// ============================================
// Webhook Receiver
// ============================================
let webhookReceiver: WebhookReceiver | null = null

function getWebhookReceiver(): WebhookReceiver | null {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    if (IS_DEV) {
      console.warn("[LiveKit Webhook] No API credentials - webhook verification disabled in dev mode")
      return null
    }
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required")
  }

  if (!webhookReceiver) {
    webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  }
  return webhookReceiver
}

// ============================================
// Helper: Extract spaceId from roomName
// ============================================
function extractSpaceId(roomName: string): string | null {
  // roomName format: "space-{uuid}"
  const match = roomName.match(/^space-(.+)$/)
  return match ? match[1] : null
}

// ============================================
// Helper: Determine event type from track
// ============================================
interface TrackInfo {
  type?: string
  source?: string
}

function getEventTypeFromTrack(
  track: TrackInfo,
  isPublished: boolean
): SpaceEventType | null {
  // track.type: "AUDIO" | "VIDEO"
  // track.source: "CAMERA" | "MICROPHONE" | "SCREEN_SHARE" | "SCREEN_SHARE_AUDIO"
  const trackType = track.type?.toUpperCase()
  const trackSource = track.source?.toUpperCase()

  if (trackType === "VIDEO") {
    if (trackSource === "SCREEN_SHARE") {
      return isPublished ? SpaceEventType.SCREEN_SHARE_START : SpaceEventType.SCREEN_SHARE_END
    }
    return isPublished ? SpaceEventType.VIDEO_START : SpaceEventType.VIDEO_END
  }

  // AUDIO tracks are not logged for now (too frequent)
  // Can be enabled later if needed for more detailed analysis

  return null
}

// ============================================
// POST /api/livekit/webhook - Handle LiveKit webhooks
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text()
    const authHeader = request.headers.get("authorization")

    // 2. Verify webhook signature
    const receiver = getWebhookReceiver()
    let event

    if (receiver && authHeader) {
      try {
        event = await receiver.receive(rawBody, authHeader)
      } catch (verifyError) {
        console.error("[LiveKit Webhook] Signature verification failed:", verifyError)
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        )
      }
    } else if (IS_DEV) {
      // Dev mode: parse without verification
      try {
        event = JSON.parse(rawBody)
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Webhook authentication required" },
        { status: 401 }
      )
    }

    if (IS_DEV) {
      console.log("[LiveKit Webhook] Received event:", event.event)
    }

    // 3. Extract common fields
    const eventType = event.event
    const room = event.room
    const participant = event.participant
    const track = event.track

    if (!room?.name) {
      // Ignore events without room info
      return NextResponse.json({ received: true })
    }

    const spaceId = extractSpaceId(room.name)
    if (!spaceId) {
      // Not a space room, ignore
      return NextResponse.json({ received: true })
    }

    // 4. Handle specific events
    switch (eventType) {
      case "track_published": {
        if (!track || !participant) break

        const logEventType = getEventTypeFromTrack(track, true)
        if (logEventType) {
          await logSpaceEvent({
            spaceId,
            eventType: logEventType,
            participantId: participant.identity,
            payload: {
              trackSid: track.sid,
              trackType: track.type,
              trackSource: track.source,
              participantName: participant.name,
            },
          })

          if (IS_DEV) {
            console.log(`[LiveKit Webhook] Logged ${logEventType} for ${participant.identity}`)
          }
        }
        break
      }

      case "track_unpublished": {
        if (!track || !participant) break

        const logEventType = getEventTypeFromTrack(track, false)
        if (logEventType) {
          await logSpaceEvent({
            spaceId,
            eventType: logEventType,
            participantId: participant.identity,
            payload: {
              trackSid: track.sid,
              trackType: track.type,
              trackSource: track.source,
              participantName: participant.name,
            },
          })

          if (IS_DEV) {
            console.log(`[LiveKit Webhook] Logged ${logEventType} for ${participant.identity}`)
          }
        }
        break
      }

      case "participant_joined": {
        // Optional: Log participant join events
        // For now, we rely on existing ENTER events from guest/visit API
        if (IS_DEV && participant) {
          console.log(`[LiveKit Webhook] Participant joined: ${participant.identity} (${participant.name})`)
        }
        break
      }

      case "participant_left": {
        // Optional: Log participant leave events
        // For now, we rely on existing EXIT events from socket server
        if (IS_DEV && participant) {
          console.log(`[LiveKit Webhook] Participant left: ${participant.identity}`)
        }
        break
      }

      default:
        // Ignore other events (room_started, room_finished, etc.)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[LiveKit Webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// ============================================
// Helper: Log space event to database
// ============================================
interface LogEventParams {
  spaceId: string
  eventType: SpaceEventType
  participantId: string
  payload?: Prisma.InputJsonValue
}

async function logSpaceEvent(params: LogEventParams): Promise<void> {
  const { spaceId, eventType, participantId, payload } = params

  try {
    // Extract userId from participantId if it's a user (user-{userId})
    let userId: string | undefined
    let guestSessionId: string | undefined

    if (participantId.startsWith("user-")) {
      userId = participantId.replace("user-", "")
    } else if (participantId.startsWith("guest-")) {
      guestSessionId = participantId.replace("guest-", "")
    }

    await prisma.spaceEventLog.create({
      data: {
        spaceId,
        eventType,
        participantId,
        userId,
        guestSessionId,
        payload,
      },
    })
  } catch (error) {
    // Log but don't fail - event logging is best-effort
    console.error("[LiveKit Webhook] Failed to log event:", error)
  }
}
