/**
 * Dashboard Space Stats API
 *
 * GET /api/dashboard/spaces/[id]/stats
 * Returns statistics for a specific space (OWNER/STAFF only)
 *
 * 🔒 공간 OWNER 또는 STAFF만 접근 가능
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageSpace } from "@/lib/space-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: spaceId } = await params
    const userId = session.user.id

    // 권한 확인: OWNER 또는 STAFF만
    const canManage = await canManageSpace(userId, spaceId)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: OWNER or STAFF only" },
        { status: 403 }
      )
    }

    // 날짜 범위
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    // 📊 동접 계산용 확장 범위 (장기 체류 사용자 포함)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // ⚡ 병렬 쿼리 실행: 게스트 + 인증 사용자 분리 조회
    const [
      totalMembers,
      guestVisitors,
      authVisitors,
      thisWeekGuestVisitors,
      thisWeekAuthVisitors,
      lastWeekGuestVisitors,
      lastWeekAuthVisitors,
      totalEvents,
      enterEventsForPeak,
      exitEventsForPeak,
    ] = await Promise.all([
      // 총 멤버 수
      prisma.spaceMember.count({
        where: { spaceId },
      }),

      // 총 방문자 수 (게스트 세션)
      prisma.guestSession.count({
        where: { spaceId },
      }),

      // 총 방문자 수 (인증 사용자 - unique userId)
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId,
          eventType: "ENTER",
          userId: { not: null },
        },
      }),

      // 이번 주 게스트 방문자
      prisma.guestSession.count({
        where: {
          spaceId,
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // 이번 주 인증 사용자 방문자
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId,
          eventType: "ENTER",
          userId: { not: null },
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // 지난 주 게스트 방문자
      prisma.guestSession.count({
        where: {
          spaceId,
          createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),

      // 지난 주 인증 사용자 방문자
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId,
          eventType: "ENTER",
          userId: { not: null },
          createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),

      // 총 이벤트 수
      prisma.spaceEventLog.count({
        where: { spaceId },
      }),

      // 피크 동접 계산용: ENTER 이벤트 (📊 1개월 범위 - 장기 체류자 포함)
      prisma.spaceEventLog.findMany({
        where: {
          spaceId,
          eventType: "ENTER",
          createdAt: { gte: oneMonthAgo },
        },
        select: { createdAt: true, guestSessionId: true, userId: true },
        orderBy: { createdAt: "asc" },
      }),

      // 피크 동접 계산용: EXIT 이벤트
      prisma.spaceEventLog.findMany({
        where: {
          spaceId,
          eventType: "EXIT",
          createdAt: { gte: oneWeekAgo },
        },
        select: { createdAt: true, guestSessionId: true, userId: true },
        orderBy: { createdAt: "asc" },
      }),
    ])

    // 📊 합산: 게스트 + 인증 사용자
    const totalVisitors = guestVisitors + authVisitors.length
    const thisWeekVisitors = thisWeekGuestVisitors + thisWeekAuthVisitors.length
    const lastWeekVisitors = lastWeekGuestVisitors + lastWeekAuthVisitors.length

    // 주간 변화율 계산
    const visitorChange =
      lastWeekVisitors > 0
        ? Math.round(((thisWeekVisitors - lastWeekVisitors) / lastWeekVisitors) * 100)
        : thisWeekVisitors > 0
          ? 100
          : 0

    // 📊 피크 동접 계산: ENTER/EXIT 이벤트로 실제 동시접속자 추적
    interface ConcurrencyEvent {
      time: Date
      delta: number // +1 for ENTER, -1 for EXIT
      participantKey: string
    }

    const concurrencyEvents: ConcurrencyEvent[] = []

    // ENTER 이벤트 추가
    enterEventsForPeak.forEach((e) => {
      const key = e.guestSessionId || e.userId || ""
      if (key) {
        concurrencyEvents.push({ time: e.createdAt, delta: 1, participantKey: key })
      }
    })

    // EXIT 이벤트 추가
    exitEventsForPeak.forEach((e) => {
      const key = e.guestSessionId || e.userId || ""
      if (key) {
        concurrencyEvents.push({ time: e.createdAt, delta: -1, participantKey: key })
      }
    })

    // 시간순 정렬 (동일 시각일 경우 EXIT 우선 처리)
    concurrencyEvents.sort((a, b) => {
      const timeDiff = a.time.getTime() - b.time.getTime()
      if (timeDiff !== 0) return timeDiff
      return a.delta - b.delta // EXIT (-1) 먼저
    })

    // 피크 동접 계산 (참가자 Set으로 중복 제거)
    const activeParticipants = new Set<string>()
    let peakConcurrent = 0

    concurrencyEvents.forEach((event) => {
      if (event.delta > 0) {
        activeParticipants.add(event.participantKey)
      } else {
        activeParticipants.delete(event.participantKey)
      }
      peakConcurrent = Math.max(peakConcurrent, activeParticipants.size)
    })

    return NextResponse.json({
      totalMembers,
      totalVisitors,
      totalEvents,
      peakConcurrent,
      weeklyChange: {
        visitors: visitorChange,
      },
    })
  } catch (error) {
    console.error("Error fetching space stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
