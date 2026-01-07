/**
 * Admin Dashboard Stats API
 *
 * GET /api/admin/stats
 * Returns aggregated statistics for admin dashboard
 *
 * 🔒 SuperAdmin 전용 API (Phase 2)
 *
 * ⚡ Performance Optimized (2025-12-09):
 * - Promise.all()로 독립 쿼리 병렬 실행
 * - 재방문율 계산 DB 집계 사용 (메모리 로드 최소화)
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // 🔒 SuperAdmin 권한 확인
    const isAdmin = await isSuperAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: SuperAdmin only" }, { status: 403 })
    }

    // 🔓 SuperAdmin은 모든 공간의 통계를 볼 수 있음
    const spaces = await prisma.space.findMany({
      where: { deletedAt: null },
      select: { id: true },
    })
    const spaceIds = spaces.map((s) => s.id)

    // If no spaces, return zeros
    if (spaceIds.length === 0) {
      return NextResponse.json({
        totalVisitors: 0,
        peakConcurrent: 0,
        avgDuration: 0,
        returnRate: 0,
        weeklyChange: {
          visitors: 0,
          duration: 0,
          returnRate: 0,
        },
      })
    }

    // Date ranges
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // ⚡ 병렬 실행: 독립적인 쿼리들을 Promise.all()로 동시 실행
    const [
      guestVisitors,
      authVisitors,
      thisWeekGuestVisitors,
      thisWeekAuthVisitors,
      lastWeekGuestVisitors,
      lastWeekAuthVisitors,
      enterEventsForPeak,
      exitEventsForPeak,
      guestEnterLogs,
      guestExitLogs,
      authEnterLogs,
      authExitLogs,
      guestReturnRateData,
      authReturnRateData,
    ] = await Promise.all([
      // 1. Total guest visitors (unique guest sessions)
      prisma.guestSession.count({
        where: { spaceId: { in: spaceIds } },
      }),

      // 1b. Total auth visitors (unique userIds with ENTER events)
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          userId: { not: null },
        },
      }),

      // 2. This week's guest visitors
      prisma.guestSession.count({
        where: {
          spaceId: { in: spaceIds },
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // 2b. This week's auth visitors
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          userId: { not: null },
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // 3. Last week's guest visitors
      prisma.guestSession.count({
        where: {
          spaceId: { in: spaceIds },
          createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),

      // 3b. Last week's auth visitors
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          userId: { not: null },
          createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),

      // 4. Peak concurrent: ENTER/EXIT 이벤트로 실제 동시접속자 계산
      // 이번 주 ENTER 이벤트
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          createdAt: { gte: oneWeekAgo },
        },
        select: { createdAt: true, guestSessionId: true, userId: true },
        orderBy: { createdAt: "asc" },
      }),

      // 4b. Peak concurrent: EXIT 이벤트
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "EXIT",
          createdAt: { gte: oneWeekAgo },
        },
        select: { createdAt: true, guestSessionId: true, userId: true },
        orderBy: { createdAt: "asc" },
      }),

      // 5. Guest enter logs for duration calculation
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          guestSessionId: { not: null },
          createdAt: { gte: oneWeekAgo },
        },
        select: { guestSessionId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // 6. Guest exit logs for duration calculation
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "EXIT",
          guestSessionId: { not: null },
          createdAt: { gte: oneWeekAgo },
        },
        select: { guestSessionId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // 5b. Auth enter logs for duration calculation
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          userId: { not: null },
          createdAt: { gte: oneWeekAgo },
        },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // 6b. Auth exit logs for duration calculation
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "EXIT",
          userId: { not: null },
          createdAt: { gte: oneWeekAgo },
        },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // 7. Guest 재방문율 계산: DB 집계 사용
      prisma.guestSession.groupBy({
        by: ["spaceId", "nickname"],
        where: { spaceId: { in: spaceIds } },
        _count: true,
      }),

      // 7b. Auth 재방문율 계산: userId로 그룹화
      prisma.spaceEventLog.groupBy({
        by: ["userId", "spaceId"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          userId: { not: null },
        },
        _count: true,
      }),
    ])

    // 📊 합산: 게스트 + 인증 사용자
    const totalVisitors = guestVisitors + authVisitors.length
    const thisWeekVisitors = thisWeekGuestVisitors + thisWeekAuthVisitors.length
    const lastWeekVisitors = lastWeekGuestVisitors + lastWeekAuthVisitors.length

    // Calculate weekly change for visitors
    const visitorChange =
      lastWeekVisitors > 0
        ? Math.round(((thisWeekVisitors - lastWeekVisitors) / lastWeekVisitors) * 100)
        : thisWeekVisitors > 0
          ? 100
          : 0

    // 📊 피크 동접 계산: ENTER/EXIT 이벤트로 실제 동시접속자 추적
    // 1. 모든 이벤트를 시간순으로 정렬 (ENTER: +1, EXIT: -1)
    interface ConcurrencyEvent {
      time: Date
      delta: number  // +1 for ENTER, -1 for EXIT
      participantKey: string  // guestSessionId 또는 userId
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

    // 시간순 정렬
    concurrencyEvents.sort((a, b) => a.time.getTime() - b.time.getTime())

    // 2. 피크 동접 계산 (참가자 Set으로 중복 제거)
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

    // Calculate durations from ENTER/EXIT pairs (게스트)
    const durations: number[] = []
    const guestExitMap = new Map<string, Date>()
    guestExitLogs.forEach((log) => {
      if (log.guestSessionId) {
        guestExitMap.set(log.guestSessionId, log.createdAt)
      }
    })

    guestEnterLogs.forEach((enter) => {
      if (enter.guestSessionId) {
        const exitTime = guestExitMap.get(enter.guestSessionId)
        if (exitTime) {
          const durationMs = exitTime.getTime() - enter.createdAt.getTime()
          if (durationMs > 0 && durationMs < 24 * 60 * 60 * 1000) {
            // Less than 24h
            durations.push(durationMs)
          }
        }
      }
    })

    // Calculate durations from ENTER/EXIT pairs (인증 사용자)
    const authExitMap = new Map<string, Date>()
    authExitLogs.forEach((log) => {
      if (log.userId) {
        authExitMap.set(log.userId, log.createdAt)
      }
    })

    authEnterLogs.forEach((enter) => {
      if (enter.userId) {
        const exitTime = authExitMap.get(enter.userId)
        if (exitTime) {
          const durationMs = exitTime.getTime() - enter.createdAt.getTime()
          if (durationMs > 0 && durationMs < 24 * 60 * 60 * 1000) {
            // Less than 24h
            durations.push(durationMs)
          }
        }
      }
    })

    // Average in minutes
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000)
        : 0

    // ⚡ 재방문율 계산 (DB 집계 결과 사용)
    // 게스트: spaceId + nickname 조합
    const guestUniqueVisitors = guestReturnRateData.length
    const guestReturning = guestReturnRateData.filter((r) => r._count > 1).length

    // 인증 사용자: userId + spaceId 조합
    const authUniqueVisitors = authReturnRateData.length
    const authReturning = authReturnRateData.filter((r) => r._count > 1).length

    const totalUniqueVisitors = guestUniqueVisitors + authUniqueVisitors
    const totalReturning = guestReturning + authReturning
    const returnRate =
      totalUniqueVisitors > 0
        ? Math.round((totalReturning / totalUniqueVisitors) * 100)
        : 0

    return NextResponse.json({
      totalVisitors,
      peakConcurrent,
      avgDuration,
      returnRate,
      weeklyChange: {
        visitors: visitorChange,
        duration: 0, // Would need historical data
        returnRate: 0, // Would need historical data
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
