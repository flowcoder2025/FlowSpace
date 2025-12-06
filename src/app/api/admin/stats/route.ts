/**
 * Admin Dashboard Stats API
 *
 * GET /api/admin/stats
 * Returns aggregated statistics for admin dashboard
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's spaces
    const spaces = await prisma.space.findMany({
      where: { ownerId: userId, deletedAt: null },
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

    // 1. Total visitors (unique guest sessions)
    const totalVisitors = await prisma.guestSession.count({
      where: { spaceId: { in: spaceIds } },
    })

    // This week's visitors
    const thisWeekVisitors = await prisma.guestSession.count({
      where: {
        spaceId: { in: spaceIds },
        createdAt: { gte: oneWeekAgo },
      },
    })

    // Last week's visitors
    const lastWeekVisitors = await prisma.guestSession.count({
      where: {
        spaceId: { in: spaceIds },
        createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    })

    // Calculate weekly change for visitors
    const visitorChange =
      lastWeekVisitors > 0
        ? Math.round(((thisWeekVisitors - lastWeekVisitors) / lastWeekVisitors) * 100)
        : thisWeekVisitors > 0
          ? 100
          : 0

    // 2. Peak concurrent (estimate from ENTER events in hourly buckets)
    // For now, use max daily ENTER events as a proxy
    const enterEvents = await prisma.spaceEventLog.groupBy({
      by: ["createdAt"],
      where: {
        spaceId: { in: spaceIds },
        eventType: "ENTER",
        createdAt: { gte: oneWeekAgo },
      },
      _count: true,
    })

    // Group by date and find max
    const dailyEnters = new Map<string, number>()
    enterEvents.forEach((e) => {
      const dateKey = e.createdAt.toISOString().split("T")[0]
      dailyEnters.set(dateKey, (dailyEnters.get(dateKey) || 0) + e._count)
    })
    const peakConcurrent = Math.max(...Array.from(dailyEnters.values()), 0)

    // 3. Average duration (from ENTER to EXIT events)
    // Get matching ENTER/EXIT pairs
    const enterLogs = await prisma.spaceEventLog.findMany({
      where: {
        spaceId: { in: spaceIds },
        eventType: "ENTER",
        guestSessionId: { not: null },
        createdAt: { gte: oneWeekAgo },
      },
      select: { guestSessionId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    const exitLogs = await prisma.spaceEventLog.findMany({
      where: {
        spaceId: { in: spaceIds },
        eventType: "EXIT",
        guestSessionId: { not: null },
        createdAt: { gte: oneWeekAgo },
      },
      select: { guestSessionId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    // Calculate durations
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

    // 4. Return rate (sessions with same nickname in same space)
    const guestSessions = await prisma.guestSession.findMany({
      where: { spaceId: { in: spaceIds } },
      select: { spaceId: true, nickname: true },
    })

    // Count unique visitors and returning visitors
    const visitorKey = new Set<string>()
    const returningVisitors = new Set<string>()

    guestSessions.forEach((session) => {
      const key = `${session.spaceId}-${session.nickname}`
      if (visitorKey.has(key)) {
        returningVisitors.add(key)
      } else {
        visitorKey.add(key)
      }
    })

    const returnRate =
      visitorKey.size > 0
        ? Math.round((returningVisitors.size / visitorKey.size) * 100)
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
