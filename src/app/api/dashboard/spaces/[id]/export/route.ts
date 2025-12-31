/**
 * Dashboard Space Export API
 *
 * GET /api/dashboard/spaces/[id]/export
 * Returns event logs as CSV file download
 *
 * Query params:
 * - limit: 최대 행 수 (기본 1000, 최대 10000)
 *
 * 권한: OWNER/STAFF/SuperAdmin
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageSpace } from "@/lib/space-auth"
import {
  arrayToCsv,
  EVENT_LOG_COLUMNS,
  transformEventLogForCsv,
  type EventLogCsvRow,
} from "@/lib/utils/csv-export"

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

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const limit = Math.min(
      Math.max(parseInt(limitParam || "1000", 10) || 1000, 1),
      10000
    )

    // 공간 정보 조회 (파일명용)
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 이벤트 로그 조회
    const eventLogs = await prisma.spaceEventLog.findMany({
      where: { spaceId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        guestSession: {
          select: { nickname: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    // CSV로 변환
    const csvRows: EventLogCsvRow[] = eventLogs.map(transformEventLogForCsv)
    const csv = arrayToCsv(csvRows, EVENT_LOG_COLUMNS)

    // 파일명 생성 (공간명_날짜)
    const date = new Date().toISOString().split("T")[0]
    const safeName = space.name.replace(/[^a-zA-Z0-9가-힣]/g, "_")
    const filename = `${safeName}_events_${date}.csv`

    // CSV 응답 반환
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting space events:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
