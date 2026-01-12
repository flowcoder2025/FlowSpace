/**
 * 사용량 데이터 초기화 API
 *
 * 비정상적인 트래픽 데이터를 초기화하고 재수집할 수 있도록 합니다.
 *
 * POST /api/admin/usage/reset
 * Body: { type: "all" | "daily" | "hourly" | "snapshots", confirm: true }
 *
 * SuperAdmin 전용
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. SuperAdmin 권한 확인
    const isAdmin = await isSuperAdmin(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Body 파싱
    const body = await request.json()
    const { type, confirm } = body as { type: string; confirm: boolean }

    if (!confirm) {
      return NextResponse.json(
        { error: "Confirmation required. Set confirm: true to proceed." },
        { status: 400 }
      )
    }

    const validTypes = ["all", "daily", "hourly", "snapshots"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid types: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const results: Record<string, number> = {}

    // 4. 데이터 삭제
    if (type === "all" || type === "daily") {
      const daily = await prisma.usageDaily.deleteMany({})
      results.dailyDeleted = daily.count
    }

    if (type === "all" || type === "hourly") {
      const hourly = await prisma.usageHourly.deleteMany({})
      results.hourlyDeleted = hourly.count
    }

    if (type === "all" || type === "snapshots") {
      const snapshots = await prisma.resourceSnapshot.deleteMany({})
      results.snapshotsDeleted = snapshots.count
    }

    console.log(`[Usage Reset] Data cleared by ${session.user.email}:`, results)

    return NextResponse.json({
      success: true,
      message: `Usage data (${type}) has been reset.`,
      results,
      note: "New data will be collected from the next cron cycle.",
    })
  } catch (error) {
    console.error("[Usage Reset] Error:", error)
    return NextResponse.json(
      { error: "Failed to reset usage data" },
      { status: 500 }
    )
  }
}
