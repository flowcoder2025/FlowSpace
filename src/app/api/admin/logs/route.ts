/**
 * Admin Event Logs API
 *
 * GET /api/admin/logs
 * Returns recent event logs for admin dashboard
 *
 * Query params:
 * - limit: number of logs to return (default 10, max 100)
 * - spaceId: filter by space ID
 * - startDate: filter logs from this date (ISO string)
 * - endDate: filter logs until this date (ISO string)
 * - format: "json" (default) or "csv" for export
 *
 * ⚡ Performance Optimized (2025-12-09):
 * - count와 findMany를 Promise.all()로 병렬 실행
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100)
    const spaceId = searchParams.get("spaceId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const format = searchParams.get("format") || "json"

    // Get user's spaces
    const spaces = await prisma.space.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true, name: true },
    })
    const spaceIds = spaces.map((s) => s.id)
    const spaceNameMap = new Map(spaces.map((s) => [s.id, s.name]))

    // If no spaces, return empty
    if (spaceIds.length === 0) {
      if (format === "csv") {
        return new NextResponse("이벤트 유형,사용자,사용자 유형,공간,시간\n", {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=event-logs.csv",
          },
        })
      }
      return NextResponse.json({ logs: [], total: 0 })
    }

    // Build where clause
    interface WhereClause {
      spaceId: { in: string[] } | string
      createdAt?: { gte?: Date; lte?: Date }
    }

    const whereClause: WhereClause = spaceId && spaceIds.includes(spaceId)
      ? { spaceId }
      : { spaceId: { in: spaceIds } }

    // Add date filters
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        // Include the entire end date (until 23:59:59)
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = endDateTime
      }
    }

    // ⚡ 병렬 실행: count와 findMany를 동시에 실행
    const [total, logs] = await Promise.all([
      // Get total count
      prisma.spaceEventLog.count({ where: whereClause }),

      // Get logs with related data
      prisma.spaceEventLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
          guestSession: {
            select: { id: true, nickname: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ])

    // Transform logs
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      spaceId: log.spaceId,
      spaceName: spaceNameMap.get(log.spaceId) || "Unknown",
      eventType: log.eventType,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            image: log.user.image,
            type: "user" as const,
          }
        : log.guestSession
          ? {
              id: log.guestSession.id,
              name: log.guestSession.nickname,
              avatar: log.guestSession.avatar,
              type: "guest" as const,
            }
          : null,
      payload: log.payload,
      createdAt: log.createdAt.toISOString(),
      relativeTime: getRelativeTime(log.createdAt),
    }))

    // CSV export
    if (format === "csv") {
      const eventTypeLabels: Record<string, string> = {
        ENTER: "입장",
        EXIT: "퇴장",
        INTERACTION: "상호작용",
        CHAT: "채팅",
        VOICE_START: "음성 시작",
        VOICE_END: "음성 종료",
      }

      const csvHeader = "이벤트 유형,사용자,사용자 유형,공간,시간\n"
      const csvRows = transformedLogs.map((log) => {
        const eventLabel = eventTypeLabels[log.eventType] || log.eventType
        const userName = log.user?.name || "알 수 없음"
        const userType = log.user?.type === "guest" ? "게스트" : "회원"
        const timestamp = new Date(log.createdAt).toLocaleString("ko-KR")
        return `"${eventLabel}","${userName}","${userType}","${log.spaceName}","${timestamp}"`
      }).join("\n")

      const csvContent = csvHeader + csvRows

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=event-logs-${new Date().toISOString().split("T")[0]}.csv`,
        },
      })
    }

    return NextResponse.json({
      logs: transformedLogs,
      total,
    })
  } catch (error) {
    console.error("Error fetching event logs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString("ko-KR")
}
