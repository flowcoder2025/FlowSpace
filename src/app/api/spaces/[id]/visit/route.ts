/**
 * Space Visit API
 *
 * POST /api/spaces/[id]/visit - 인증 사용자 ENTER 이벤트 기록
 * DELETE /api/spaces/[id]/visit - 인증 사용자 EXIT 이벤트 기록
 *
 * 게스트 사용자는 기존 /api/guest 및 socket-server를 통해 로깅됨
 * 이 API는 인증된 사용자(로그인 사용자)의 방문만 기록
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SpaceEventType } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"

// 중복 ENTER 방지: 같은 사용자가 N분 내에 다시 입장 시 무시
const DUPLICATE_ENTER_THRESHOLD_MINUTES = 5

// 중복 EXIT 방지: 같은 사용자가 N초 내에 다시 퇴장 시 무시
const DUPLICATE_EXIT_THRESHOLD_SECONDS = 10

// ============================================
// Types
// ============================================
interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================
// POST /api/spaces/[id]/visit - ENTER 이벤트 (또는 sendBeacon EXIT)
// ============================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    // sendBeacon EXIT 처리 (_method=DELETE 쿼리 파라미터)
    const url = new URL(request.url)
    if (url.searchParams.get("_method") === "DELETE") {
      return handleExitEvent(request, spaceId)
    }

    // 1. 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Login required" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 2. ID 형식 검증
    if (!spaceId || spaceId.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 3. 공간 존재 확인
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: { id: true, name: true },
    })

    if (!space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      )
    }

    // 4. 중복 ENTER 체크 (N분 내 동일 사용자)
    const recentEnter = await prisma.spaceEventLog.findFirst({
      where: {
        spaceId,
        userId,
        eventType: SpaceEventType.ENTER,
        createdAt: {
          gte: new Date(Date.now() - DUPLICATE_ENTER_THRESHOLD_MINUTES * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (recentEnter) {
      if (IS_DEV) {
        console.log(`[Visit API] Duplicate ENTER skipped for user ${userId} in space ${spaceId}`)
      }
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Recent enter already recorded",
      })
    }

    // 5. 자동 멤버 등록 (이미 멤버가 아니면 PARTICIPANT로 등록)
    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    })

    if (!existingMember) {
      await prisma.spaceMember.create({
        data: {
          spaceId,
          userId,
          role: "PARTICIPANT",
          restriction: "NONE",
        },
      })

      if (IS_DEV) {
        console.log(`[Visit API] Auto-registered as PARTICIPANT: user=${userId}, space=${spaceId}`)
      }
    }

    // 6. ENTER 이벤트 기록
    const eventLog = await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId,
        eventType: SpaceEventType.ENTER,
        payload: {
          source: "auth",
          userName: session.user.name,
          userImage: session.user.image,
          autoRegistered: !existingMember,
        },
      },
    })

    if (IS_DEV) {
      console.log(`[Visit API] ENTER recorded: user=${userId}, space=${spaceId}, log=${eventLog.id}`)
    }

    return NextResponse.json({
      success: true,
      eventLogId: eventLog.id,
    })

  } catch (error) {
    console.error("[Visit API] Failed to record ENTER:", error)
    return NextResponse.json(
      { error: "Failed to record visit" },
      { status: 500 }
    )
  }
}

// ============================================
// EXIT 이벤트 처리 헬퍼 함수
// ============================================
async function handleExitEvent(request: NextRequest, spaceId: string) {
  try {
    // 1. 인증 확인 (헤더 또는 세션)
    // Socket 서버에서 호출 시 x-user-id 헤더 사용 가능
    const xUserId = request.headers.get("x-user-id")
    const session = await auth()
    const userId = xUserId || session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User ID required" },
        { status: 401 }
      )
    }

    // 2. ID 형식 검증
    if (!spaceId || spaceId.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 3. 중복 EXIT 체크 (N초 내 동일 사용자)
    const recentExit = await prisma.spaceEventLog.findFirst({
      where: {
        spaceId,
        userId,
        eventType: SpaceEventType.EXIT,
        createdAt: {
          gte: new Date(Date.now() - DUPLICATE_EXIT_THRESHOLD_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (recentExit) {
      if (IS_DEV) {
        console.log(`[Visit API] Duplicate EXIT skipped for user ${userId} in space ${spaceId}`)
      }
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Recent exit already recorded",
      })
    }

    // 4. 가장 최근 ENTER 이벤트 찾기 (체류시간 계산용)
    const lastEnter = await prisma.spaceEventLog.findFirst({
      where: {
        spaceId,
        userId,
        eventType: SpaceEventType.ENTER,
      },
      orderBy: { createdAt: "desc" },
    })

    // 5. 체류시간 계산
    let durationSeconds: number | null = null
    if (lastEnter) {
      durationSeconds = Math.floor(
        (Date.now() - lastEnter.createdAt.getTime()) / 1000
      )
    }

    // 6. EXIT 이벤트 기록
    const eventLog = await prisma.spaceEventLog.create({
      data: {
        spaceId,
        userId,
        eventType: SpaceEventType.EXIT,
        payload: {
          source: "auth",
          durationSeconds,
          enterEventId: lastEnter?.id,
        },
      },
    })

    if (IS_DEV) {
      console.log(
        `[Visit API] EXIT recorded: user=${userId}, space=${spaceId}, duration=${durationSeconds}s`
      )
    }

    return NextResponse.json({
      success: true,
      eventLogId: eventLog.id,
      durationSeconds,
    })

  } catch (error) {
    console.error("[Visit API] Failed to record EXIT:", error)
    return NextResponse.json(
      { error: "Failed to record exit" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/spaces/[id]/visit - EXIT 이벤트
// ============================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: spaceId } = await params
  return handleExitEvent(request, spaceId)
}
