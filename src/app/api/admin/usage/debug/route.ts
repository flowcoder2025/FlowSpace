/**
 * 사용량 데이터 디버그 API
 *
 * OCI 원본 메트릭과 저장된 데이터를 비교하여 문제를 진단합니다.
 *
 * GET /api/admin/usage/debug
 *
 * SuperAdmin 전용
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"
import { prisma } from "@/lib/prisma"
import {
  getOCIInstanceMetrics,
  getMonthlyNetworkTraffic,
  isOCIConfigured,
} from "@/lib/utils/oci-monitoring"

export async function GET(request: NextRequest) {
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

    // 3. OCI 메트릭 조회
    const ociConfigured = isOCIConfigured()
    let ociMetrics = null
    let monthlyTraffic = null

    if (ociConfigured) {
      [ociMetrics, monthlyTraffic] = await Promise.all([
        getOCIInstanceMetrics(),
        getMonthlyNetworkTraffic(),
      ])
    }

    // 4. 최근 스냅샷 조회
    const recentSnapshots = await prisma.resourceSnapshot.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        id: true,
        timestamp: true,
        trafficGB: true,
        trafficDeltaMB: true,
        concurrentUsers: true,
        cpuPercent: true,
      },
    })

    // 5. 최근 일별 데이터 조회
    const recentDaily = await prisma.usageDaily.findMany({
      where: { spaceId: "__SYSTEM__" },
      orderBy: { date: "desc" },
      take: 7,
      select: {
        date: true,
        peakConcurrent: true,
        trafficGB: true,
        videoMinutes: true,
      },
    })

    // 6. 통계 계산
    const totalSnapshotsCount = await prisma.resourceSnapshot.count()
    const totalDailyCount = await prisma.usageDaily.count()
    const totalHourlyCount = await prisma.usageHourly.count()

    // 7. 비정상 데이터 감지
    const anomalies: string[] = []

    // 스냅샷 델타 이상치 확인
    for (const snap of recentSnapshots) {
      if (snap.trafficDeltaMB > 10240) { // 10GB 초과
        anomalies.push(`Snapshot ${snap.id}: delta ${snap.trafficDeltaMB.toFixed(2)} MB exceeds 10GB`)
      }
    }

    // 일별 트래픽 이상치 확인
    for (const daily of recentDaily) {
      if (daily.trafficGB > 100 && daily.peakConcurrent < 10) {
        anomalies.push(`Daily ${daily.date.toISOString().split("T")[0]}: ${daily.trafficGB.toFixed(2)} GB with only ${daily.peakConcurrent} peak users`)
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ociConfigured,
      ociMetrics: ociMetrics && !("error" in ociMetrics) ? {
        cpu: ociMetrics.cpu.utilizationPercent,
        memory: ociMetrics.memory.utilizationPercent,
        networkBytesOut: ociMetrics.network.bytesOut,
        networkBytesOutGB: ociMetrics.network.bytesOutGB,
      } : ociMetrics,
      monthlyTraffic: monthlyTraffic && !("error" in monthlyTraffic) ? {
        bytesOutGB: monthlyTraffic.bytesOut / (1024 ** 3),
        bytesOutTB: monthlyTraffic.bytesOutTB,
        debug: monthlyTraffic.debug,
      } : monthlyTraffic,
      database: {
        snapshotCount: totalSnapshotsCount,
        hourlyCount: totalHourlyCount,
        dailyCount: totalDailyCount,
      },
      recentSnapshots: recentSnapshots.map(s => ({
        ...s,
        timestamp: s.timestamp.toISOString(),
      })),
      recentDaily: recentDaily.map(d => ({
        ...d,
        date: d.date.toISOString().split("T")[0],
      })),
      anomalies,
      recommendation: anomalies.length > 0
        ? "비정상 데이터가 감지되었습니다. POST /api/admin/usage/reset 으로 데이터를 초기화하세요."
        : "데이터가 정상입니다.",
    })
  } catch (error) {
    console.error("[Usage Debug] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch debug data" },
      { status: 500 }
    )
  }
}
