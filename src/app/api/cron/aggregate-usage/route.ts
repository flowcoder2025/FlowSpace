/**
 * 사용량 집계 Cron API
 *
 * - 매시간: Raw 데이터 → UsageHourly 집계
 * - 자정: UsageHourly → UsageDaily 집계
 * - 정리: 7일 지난 Raw, 90일 지난 Hourly 삭제
 *
 * POST /api/cron/aggregate-usage
 *
 * 트리거: Vercel Cron (매시간)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceEventType } from "@prisma/client"

// Cron secret for verification
const CRON_SECRET = process.env.CRON_SECRET

// ============================================
// POST /api/cron/aggregate-usage
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Cron 인증 검증
    const authHeader = request.headers.get("authorization")

    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const now = new Date()
    const currentHour = now.getUTCHours()
    const results: Record<string, unknown> = {}

    // 2. 시간별 집계 (항상 실행)
    const hourlyResult = await aggregateHourly(now)
    results.hourly = hourlyResult

    // 3. 일별 집계 (UTC 0시에만 실행)
    if (currentHour === 0) {
      const dailyResult = await aggregateDaily(now)
      results.daily = dailyResult
    }

    // 4. 데이터 정리 (UTC 1시에만 실행)
    if (currentHour === 1) {
      const cleanupResult = await cleanupOldData(now)
      results.cleanup = cleanupResult
    }

    console.log("[Aggregate Usage] Completed:", results)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error("[Aggregate Usage] Error:", error)
    return NextResponse.json(
      { error: "Failed to aggregate usage" },
      { status: 500 }
    )
  }
}

// GET 메서드 지원 (Vercel Cron 호환)
export async function GET(request: NextRequest) {
  return POST(request)
}

// ============================================
// 시간별 집계
// ============================================
async function aggregateHourly(now: Date): Promise<{ count: number; spaces: string[] }> {
  // 이전 시간의 시작/종료 계산
  const hourStart = new Date(now)
  hourStart.setUTCMinutes(0, 0, 0)
  hourStart.setUTCHours(hourStart.getUTCHours() - 1)

  const hourEnd = new Date(hourStart)
  hourEnd.setUTCHours(hourEnd.getUTCHours() + 1)

  console.log(`[Aggregate Hourly] Processing ${hourStart.toISOString()} to ${hourEnd.toISOString()}`)

  // 해당 시간대의 이벤트 조회 (공간별 그룹화)
  const spaceEvents = await prisma.spaceEventLog.groupBy({
    by: ["spaceId"],
    where: {
      createdAt: {
        gte: hourStart,
        lt: hourEnd,
      },
    },
    _count: true,
  })

  // 리소스 스냅샷 집계
  const snapshots = await prisma.resourceSnapshot.findMany({
    where: {
      timestamp: {
        gte: hourStart,
        lt: hourEnd,
      },
    },
  })

  // 스냅샷 평균 계산
  const avgCpu = snapshots.length > 0
    ? snapshots.reduce((sum, s) => sum + s.cpuPercent, 0) / snapshots.length
    : 0
  const avgMemory = snapshots.length > 0
    ? snapshots.reduce((sum, s) => sum + s.memoryPercent, 0) / snapshots.length
    : 0
  const totalTrafficMB = snapshots.reduce((sum, s) => sum + s.trafficDeltaMB, 0)
  const peakUsers = snapshots.length > 0
    ? Math.max(...snapshots.map((s) => s.concurrentUsers))
    : 0
  const avgUsers = snapshots.length > 0
    ? snapshots.reduce((sum, s) => sum + s.concurrentUsers, 0) / snapshots.length
    : 0

  const aggregatedSpaces: string[] = []

  // 공간별 집계
  for (const spaceGroup of spaceEvents) {
    const spaceId = spaceGroup.spaceId

    // 해당 공간의 세부 이벤트 조회
    const events = await prisma.spaceEventLog.findMany({
      where: {
        spaceId,
        createdAt: {
          gte: hourStart,
          lt: hourEnd,
        },
      },
      select: {
        eventType: true,
        createdAt: true,
        participantId: true,
      },
    })

    // 세션 및 미디어 사용량 계산
    const sessions = new Set(events.map((e) => e.participantId).filter(Boolean))
    const videoEvents = events.filter((e) =>
      e.eventType === SpaceEventType.VIDEO_START || e.eventType === SpaceEventType.VIDEO_END
    )
    const screenShareEvents = events.filter((e) =>
      e.eventType === SpaceEventType.SCREEN_SHARE_START || e.eventType === SpaceEventType.SCREEN_SHARE_END
    )

    // 영상 분 계산 (START/END 쌍 기반, 대략적 추정)
    const videoMinutes = calculateMediaMinutes(videoEvents, hourStart, hourEnd)
    const screenShareMinutes = calculateMediaMinutes(screenShareEvents, hourStart, hourEnd)

    // 채팅 카운트
    const chatCount = events.filter((e) => e.eventType === SpaceEventType.INTERACTION).length

    // Upsert (중복 방지)
    await prisma.usageHourly.upsert({
      where: {
        hourStart_spaceId: {
          hourStart,
          spaceId,
        },
      },
      create: {
        hourStart,
        spaceId,
        peakUsers: sessions.size,
        avgUsers: sessions.size, // 시간별로는 세션 수로 대체
        totalSessions: sessions.size,
        videoMinutes,
        audioMinutes: 0, // 오디오는 별도 추적 안함
        screenShareMinutes,
        chatCount,
        avgCpuPercent: avgCpu,
        avgMemoryPercent: avgMemory,
        trafficMB: totalTrafficMB / Math.max(spaceEvents.length, 1), // 공간별 분배
        trafficPerVideoMin: videoMinutes > 0 ? (totalTrafficMB / spaceEvents.length) / videoMinutes : null,
      },
      update: {
        peakUsers: sessions.size,
        avgUsers: sessions.size,
        totalSessions: sessions.size,
        videoMinutes,
        screenShareMinutes,
        chatCount,
        avgCpuPercent: avgCpu,
        avgMemoryPercent: avgMemory,
        trafficMB: totalTrafficMB / Math.max(spaceEvents.length, 1),
        trafficPerVideoMin: videoMinutes > 0 ? (totalTrafficMB / spaceEvents.length) / videoMinutes : null,
      },
    })

    aggregatedSpaces.push(spaceId)
  }

  // 전체 시스템 집계 (spaceId = "__SYSTEM__" - 특수 값)
  const SYSTEM_SPACE_ID = "__SYSTEM__"
  await prisma.usageHourly.upsert({
    where: {
      hourStart_spaceId: {
        hourStart,
        spaceId: SYSTEM_SPACE_ID,
      },
    },
    create: {
      hourStart,
      spaceId: SYSTEM_SPACE_ID,
      peakUsers,
      avgUsers,
      totalSessions: spaceEvents.reduce((sum, s) => sum + s._count, 0),
      videoMinutes: 0, // 전체 집계에서는 미디어 분 제외
      audioMinutes: 0,
      screenShareMinutes: 0,
      chatCount: 0,
      avgCpuPercent: avgCpu,
      avgMemoryPercent: avgMemory,
      trafficMB: totalTrafficMB,
      trafficPerVideoMin: null,
    },
    update: {
      peakUsers,
      avgUsers,
      totalSessions: spaceEvents.reduce((sum, s) => sum + s._count, 0),
      avgCpuPercent: avgCpu,
      avgMemoryPercent: avgMemory,
      trafficMB: totalTrafficMB,
    },
  })

  return {
    count: aggregatedSpaces.length + 1, // +1 for system aggregate
    spaces: aggregatedSpaces,
  }
}

// ============================================
// 일별 집계
// ============================================
async function aggregateDaily(now: Date): Promise<{ count: number; date: string }> {
  // 어제 날짜 계산
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  yesterday.setUTCHours(0, 0, 0, 0)

  const dateStart = new Date(yesterday)
  const dateEnd = new Date(yesterday)
  dateEnd.setUTCDate(dateEnd.getUTCDate() + 1)

  console.log(`[Aggregate Daily] Processing ${dateStart.toISOString()} to ${dateEnd.toISOString()}`)

  // 해당 날짜의 시간별 데이터 조회
  const hourlyData = await prisma.usageHourly.findMany({
    where: {
      hourStart: {
        gte: dateStart,
        lt: dateEnd,
      },
    },
  })

  // 공간별 그룹화
  const spaceGroups = new Map<string | null, typeof hourlyData>()
  for (const h of hourlyData) {
    const key = h.spaceId
    if (!spaceGroups.has(key)) {
      spaceGroups.set(key, [])
    }
    spaceGroups.get(key)!.push(h)
  }

  let count = 0
  const SYSTEM_SPACE_ID = "__SYSTEM__"

  for (const [rawSpaceId, hourlyRecords] of spaceGroups) {
    // null spaceId는 시스템 전체 집계용 특수 값으로 변환
    const spaceId = rawSpaceId ?? SYSTEM_SPACE_ID

    // 유니크 사용자 수 추정 (시간별 총 세션의 최대값으로 근사)
    const uniqueUsers = Math.max(...hourlyRecords.map((h) => h.totalSessions))
    const peakConcurrent = Math.max(...hourlyRecords.map((h) => h.peakUsers))
    const totalMinutes = hourlyRecords.reduce((sum, h) => sum + h.avgUsers * 60, 0)
    const avgSessionMinutes = uniqueUsers > 0 ? totalMinutes / uniqueUsers : 0
    const videoMinutes = hourlyRecords.reduce((sum, h) => sum + h.videoMinutes, 0)
    const audioMinutes = hourlyRecords.reduce((sum, h) => sum + h.audioMinutes, 0)
    const screenShareMinutes = hourlyRecords.reduce((sum, h) => sum + h.screenShareMinutes, 0)
    const chatCount = hourlyRecords.reduce((sum, h) => sum + h.chatCount, 0)
    const avgCpuPercent = hourlyRecords.reduce((sum, h) => sum + h.avgCpuPercent, 0) / hourlyRecords.length
    const avgMemoryPercent = hourlyRecords.reduce((sum, h) => sum + h.avgMemoryPercent, 0) / hourlyRecords.length
    const trafficGB = hourlyRecords.reduce((sum, h) => sum + h.trafficMB, 0) / 1024

    // GB/영상시간 계산
    const videoHours = videoMinutes / 60
    const gbPerVideoHour = videoHours > 0 ? trafficGB / videoHours : null
    const gbPerUserHour = totalMinutes > 0 ? trafficGB / (totalMinutes / 60) : null

    await prisma.usageDaily.upsert({
      where: {
        date_spaceId: {
          date: dateStart,
          spaceId,
        },
      },
      create: {
        date: dateStart,
        spaceId,
        uniqueUsers,
        peakConcurrent,
        totalMinutes,
        avgSessionMinutes,
        videoMinutes,
        audioMinutes,
        screenShareMinutes,
        chatCount,
        avgCpuPercent,
        avgMemoryPercent,
        trafficGB,
        gbPerVideoHour,
        gbPerUserHour,
      },
      update: {
        uniqueUsers,
        peakConcurrent,
        totalMinutes,
        avgSessionMinutes,
        videoMinutes,
        audioMinutes,
        screenShareMinutes,
        chatCount,
        avgCpuPercent,
        avgMemoryPercent,
        trafficGB,
        gbPerVideoHour,
        gbPerUserHour,
      },
    })

    count++
  }

  return {
    count,
    date: dateStart.toISOString().split("T")[0],
  }
}

// ============================================
// 데이터 정리
// ============================================
async function cleanupOldData(now: Date): Promise<{ rawDeleted: number; hourlyDeleted: number }> {
  // 7일 전 Raw 데이터 삭제
  const rawCutoff = new Date(now)
  rawCutoff.setUTCDate(rawCutoff.getUTCDate() - 7)

  const rawDeleteResult = await prisma.resourceSnapshot.deleteMany({
    where: {
      timestamp: {
        lt: rawCutoff,
      },
    },
  })

  // 90일 전 시간별 데이터 삭제
  const hourlyCutoff = new Date(now)
  hourlyCutoff.setUTCDate(hourlyCutoff.getUTCDate() - 90)

  const hourlyDeleteResult = await prisma.usageHourly.deleteMany({
    where: {
      hourStart: {
        lt: hourlyCutoff,
      },
    },
  })

  console.log(`[Cleanup] Deleted ${rawDeleteResult.count} raw snapshots, ${hourlyDeleteResult.count} hourly records`)

  return {
    rawDeleted: rawDeleteResult.count,
    hourlyDeleted: hourlyDeleteResult.count,
  }
}

// ============================================
// Helper: 미디어 사용 분 계산
// ============================================
interface MediaEvent {
  eventType: SpaceEventType
  createdAt: Date
  participantId: string | null
}

function calculateMediaMinutes(
  events: MediaEvent[],
  hourStart: Date,
  hourEnd: Date
): number {
  // START/END 쌍을 매칭하여 분 계산
  const participants = new Map<string, Date>()
  let totalMinutes = 0

  // 시간순 정렬
  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  for (const event of sorted) {
    const pid = event.participantId || "unknown"
    const isStart = event.eventType.includes("START")

    if (isStart) {
      participants.set(pid, event.createdAt)
    } else {
      const startTime = participants.get(pid)
      if (startTime) {
        const endTime = event.createdAt
        const minutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
        totalMinutes += Math.min(minutes, 60) // 최대 60분으로 제한
        participants.delete(pid)
      }
    }
  }

  // 종료되지 않은 세션은 시간 끝까지 계산
  for (const [, startTime] of participants) {
    const minutes = (hourEnd.getTime() - startTime.getTime()) / (1000 * 60)
    totalMinutes += Math.min(Math.max(minutes, 0), 60)
  }

  return Math.round(totalMinutes * 100) / 100
}
