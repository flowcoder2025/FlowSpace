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

    // 병렬 쿼리 실행
    const [
      totalMembers,
      totalVisitors,
      thisWeekVisitors,
      lastWeekVisitors,
      totalEvents,
      recentEnters,
    ] = await Promise.all([
      // 총 멤버 수
      prisma.spaceMember.count({
        where: { spaceId },
      }),

      // 총 방문자 수 (게스트 세션)
      prisma.guestSession.count({
        where: { spaceId },
      }),

      // 이번 주 방문자
      prisma.guestSession.count({
        where: {
          spaceId,
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // 지난 주 방문자
      prisma.guestSession.count({
        where: {
          spaceId,
          createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),

      // 총 이벤트 수
      prisma.spaceEventLog.count({
        where: { spaceId },
      }),

      // 최근 입장 이벤트 (일별 집계용)
      prisma.spaceEventLog.groupBy({
        by: ["createdAt"],
        where: {
          spaceId,
          eventType: "ENTER",
          createdAt: { gte: oneWeekAgo },
        },
        _count: true,
      }),
    ])

    // 주간 변화율 계산
    const visitorChange =
      lastWeekVisitors > 0
        ? Math.round(((thisWeekVisitors - lastWeekVisitors) / lastWeekVisitors) * 100)
        : thisWeekVisitors > 0
          ? 100
          : 0

    // 일별 최대 동시접속 추정
    const dailyEnters = new Map<string, number>()
    recentEnters.forEach((e) => {
      const dateKey = e.createdAt.toISOString().split("T")[0]
      dailyEnters.set(dateKey, (dailyEnters.get(dateKey) || 0) + e._count)
    })
    const peakConcurrent = Math.max(...Array.from(dailyEnters.values()), 0)

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
