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
      totalVisitors,
      thisWeekVisitors,
      lastWeekVisitors,
      enterEvents,
      enterLogs,
      exitLogs,
      returnRateData,
    ] = await Promise.all([
      // 1. Total visitors (unique guest sessions)
      prisma.guestSession.count({
        where: { spaceId: { in: spaceIds } },
      }),

      // 2. This week's visitors
      prisma.guestSession.count({
        where: {
          spaceId: { in: spaceIds },
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // 3. Last week's visitors
      prisma.guestSession.count({
        where: {
          spaceId: { in: spaceIds },
          createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),

      // 4. Peak concurrent (ENTER events grouped by date)
      prisma.spaceEventLog.groupBy({
        by: ["createdAt"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          createdAt: { gte: oneWeekAgo },
        },
        _count: true,
      }),

      // 5. Enter logs for duration calculation
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

      // 6. Exit logs for duration calculation
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

      // 7. ⚡ 재방문율 계산: DB 집계 사용 (전체 레코드 로드 대신)
      // spaceId + nickname 조합으로 그룹화하여 2회 이상 방문한 조합 카운트
      prisma.guestSession.groupBy({
        by: ["spaceId", "nickname"],
        where: { spaceId: { in: spaceIds } },
        _count: true,
      }),
    ])

    // Calculate weekly change for visitors
    const visitorChange =
      lastWeekVisitors > 0
        ? Math.round(((thisWeekVisitors - lastWeekVisitors) / lastWeekVisitors) * 100)
        : thisWeekVisitors > 0
          ? 100
          : 0

    // Group by date and find max for peak concurrent
    const dailyEnters = new Map<string, number>()
    enterEvents.forEach((e) => {
      const dateKey = e.createdAt.toISOString().split("T")[0]
      dailyEnters.set(dateKey, (dailyEnters.get(dateKey) || 0) + e._count)
    })
    const peakConcurrent = Math.max(...Array.from(dailyEnters.values()), 0)

    // Calculate durations from ENTER/EXIT pairs
    const durations: number[] = []
    const exitMap = new Map<string, Date>()
    exitLogs.forEach((log) => {
      if (log.guestSessionId) {
        exitMap.set(log.guestSessionId, log.createdAt)
      }
    })

    enterLogs.forEach((enter) => {
      if (enter.guestSessionId) {
        const exitTime = exitMap.get(enter.guestSessionId)
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
    // returnRateData: { spaceId, nickname, _count }[]
    const totalUniqueVisitors = returnRateData.length
    const returningVisitors = returnRateData.filter((r) => r._count > 1).length
    const returnRate =
      totalUniqueVisitors > 0
        ? Math.round((returningVisitors / totalUniqueVisitors) * 100)
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
