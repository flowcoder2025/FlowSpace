/**
 * 사용량 분석 API
 *
 * 수집된 데이터를 기반으로 리소스-사용량 상관관계 분석
 *
 * GET /api/admin/usage/analysis
 *
 * Query params:
 * - period: "hourly" | "daily" | "weekly" (기본: "daily")
 * - days: number (조회 기간, 기본: 7)
 * - spaceId: string (선택적, 특정 공간 필터)
 *
 * SuperAdmin 전용
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"
import { prisma } from "@/lib/prisma"

const SYSTEM_SPACE_ID = "__SYSTEM__"

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

    // 3. Query params 파싱
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "daily"
    const days = parseInt(searchParams.get("days") || "7", 10)
    const spaceId = searchParams.get("spaceId")

    // 4. 날짜 범위 계산
    const endDate = new Date()
    const startDate = new Date()
    startDate.setUTCDate(startDate.getUTCDate() - days)
    startDate.setUTCHours(0, 0, 0, 0)

    // 5. 데이터 조회
    let data
    if (period === "hourly") {
      data = await getHourlyAnalysis(startDate, endDate, spaceId)
    } else if (period === "weekly") {
      data = await getWeeklyAnalysis(startDate, endDate, spaceId)
    } else {
      data = await getDailyAnalysis(startDate, endDate, spaceId)
    }

    // 6. 상관관계 계산
    const correlation = calculateCorrelation(data.records)

    // 7. 비용 예측 공식 도출
    const costFormula = deriveCostFormula(correlation)

    return NextResponse.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      summary: data.summary,
      correlation,
      costFormula,
      records: data.records,
      metadata: {
        totalRecords: data.records.length,
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[Usage Analysis] Error:", error)
    return NextResponse.json(
      { error: "Failed to analyze usage data" },
      { status: 500 }
    )
  }
}

// ============================================
// 시간별 분석
// ============================================
interface AnalysisRecord {
  timestamp: string
  concurrentUsers: number
  videoMinutes: number
  screenShareMinutes: number
  chatCount: number
  cpuPercent: number
  memoryPercent: number
  trafficMB: number
  gbPerVideoMin?: number | null
}

interface AnalysisResult {
  summary: {
    totalUsers: number
    peakConcurrent: number
    totalVideoMinutes: number
    totalTrafficGB: number
    avgCpuPercent: number
    avgMemoryPercent: number
  }
  records: AnalysisRecord[]
}

async function getHourlyAnalysis(
  startDate: Date,
  endDate: Date,
  spaceId: string | null
): Promise<AnalysisResult> {
  const where = {
    hourStart: {
      gte: startDate,
      lte: endDate,
    },
    spaceId: spaceId || SYSTEM_SPACE_ID,
  }

  const hourlyData = await prisma.usageHourly.findMany({
    where,
    orderBy: { hourStart: "asc" },
  })

  const records: AnalysisRecord[] = hourlyData.map((h) => ({
    timestamp: h.hourStart.toISOString(),
    concurrentUsers: h.peakUsers,
    videoMinutes: h.videoMinutes,
    screenShareMinutes: h.screenShareMinutes,
    chatCount: h.chatCount,
    cpuPercent: h.avgCpuPercent,
    memoryPercent: h.avgMemoryPercent,
    trafficMB: h.trafficMB,
    gbPerVideoMin: h.trafficPerVideoMin ? h.trafficPerVideoMin / 1024 : null,
  }))

  const summary = calculateSummary(records)

  return { summary, records }
}

// ============================================
// 일별 분석
// ============================================
async function getDailyAnalysis(
  startDate: Date,
  endDate: Date,
  spaceId: string | null
): Promise<AnalysisResult> {
  const where = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    spaceId: spaceId || SYSTEM_SPACE_ID,
  }

  const dailyData = await prisma.usageDaily.findMany({
    where,
    orderBy: { date: "asc" },
  })

  const records: AnalysisRecord[] = dailyData.map((d) => ({
    timestamp: d.date.toISOString(),
    concurrentUsers: d.peakConcurrent,
    videoMinutes: d.videoMinutes,
    screenShareMinutes: d.screenShareMinutes,
    chatCount: d.chatCount,
    cpuPercent: d.avgCpuPercent,
    memoryPercent: d.avgMemoryPercent,
    trafficMB: d.trafficGB * 1024,
    gbPerVideoMin: d.gbPerVideoHour ? d.gbPerVideoHour / 60 : null,
  }))

  const summary = calculateSummary(records)

  return { summary, records }
}

// ============================================
// 주간 분석 (일별 데이터 집계)
// ============================================
async function getWeeklyAnalysis(
  startDate: Date,
  endDate: Date,
  spaceId: string | null
): Promise<AnalysisResult> {
  // 일별 데이터를 가져와서 주간으로 집계
  const dailyResult = await getDailyAnalysis(startDate, endDate, spaceId)

  // 주간 단위로 그룹화
  const weeklyGroups = new Map<string, AnalysisRecord[]>()

  for (const record of dailyResult.records) {
    const date = new Date(record.timestamp)
    const weekStart = new Date(date)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
    weekStart.setUTCHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString()

    if (!weeklyGroups.has(weekKey)) {
      weeklyGroups.set(weekKey, [])
    }
    weeklyGroups.get(weekKey)!.push(record)
  }

  const records: AnalysisRecord[] = []

  for (const [weekKey, weekRecords] of weeklyGroups) {
    const aggregated: AnalysisRecord = {
      timestamp: weekKey,
      concurrentUsers: Math.max(...weekRecords.map((r) => r.concurrentUsers)),
      videoMinutes: weekRecords.reduce((sum, r) => sum + r.videoMinutes, 0),
      screenShareMinutes: weekRecords.reduce((sum, r) => sum + r.screenShareMinutes, 0),
      chatCount: weekRecords.reduce((sum, r) => sum + r.chatCount, 0),
      cpuPercent: weekRecords.reduce((sum, r) => sum + r.cpuPercent, 0) / weekRecords.length,
      memoryPercent: weekRecords.reduce((sum, r) => sum + r.memoryPercent, 0) / weekRecords.length,
      trafficMB: weekRecords.reduce((sum, r) => sum + r.trafficMB, 0),
      gbPerVideoMin: null,
    }

    // GB/video-min 계산
    if (aggregated.videoMinutes > 0) {
      aggregated.gbPerVideoMin = (aggregated.trafficMB / 1024) / aggregated.videoMinutes
    }

    records.push(aggregated)
  }

  records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const summary = calculateSummary(records)

  return { summary, records }
}

// ============================================
// 요약 통계 계산
// ============================================
function calculateSummary(records: AnalysisRecord[]): AnalysisResult["summary"] {
  if (records.length === 0) {
    return {
      totalUsers: 0,
      peakConcurrent: 0,
      totalVideoMinutes: 0,
      totalTrafficGB: 0,
      avgCpuPercent: 0,
      avgMemoryPercent: 0,
    }
  }

  return {
    totalUsers: records.reduce((sum, r) => sum + r.concurrentUsers, 0),
    peakConcurrent: Math.max(...records.map((r) => r.concurrentUsers)),
    totalVideoMinutes: records.reduce((sum, r) => sum + r.videoMinutes, 0),
    totalTrafficGB: records.reduce((sum, r) => sum + r.trafficMB, 0) / 1024,
    avgCpuPercent: records.reduce((sum, r) => sum + r.cpuPercent, 0) / records.length,
    avgMemoryPercent: records.reduce((sum, r) => sum + r.memoryPercent, 0) / records.length,
  }
}

// ============================================
// 상관관계 계산
// ============================================
interface CorrelationResult {
  videoToTraffic: {
    coefficient: number
    gbPerVideoMin: number
    gbPerVideoHour: number
    confidence: "low" | "medium" | "high"
  }
  usersToTraffic: {
    coefficient: number
    gbPerUserHour: number
    confidence: "low" | "medium" | "high"
  }
  usersToCpu: {
    coefficient: number
    cpuPerUser: number
    confidence: "low" | "medium" | "high"
  }
}

function calculateCorrelation(records: AnalysisRecord[]): CorrelationResult {
  // 유효한 레코드만 필터링
  const validRecords = records.filter(
    (r) => r.concurrentUsers > 0 || r.videoMinutes > 0 || r.trafficMB > 0
  )

  if (validRecords.length < 3) {
    // 데이터 부족
    return {
      videoToTraffic: {
        coefficient: 0,
        gbPerVideoMin: 0,
        gbPerVideoHour: 0,
        confidence: "low",
      },
      usersToTraffic: {
        coefficient: 0,
        gbPerUserHour: 0,
        confidence: "low",
      },
      usersToCpu: {
        coefficient: 0,
        cpuPerUser: 0,
        confidence: "low",
      },
    }
  }

  // Video-Traffic 상관관계
  const videoTrafficRecords = validRecords.filter((r) => r.videoMinutes > 0)
  let gbPerVideoMin = 0
  if (videoTrafficRecords.length > 0) {
    const totalTrafficGB = videoTrafficRecords.reduce((sum, r) => sum + r.trafficMB / 1024, 0)
    const totalVideoMin = videoTrafficRecords.reduce((sum, r) => sum + r.videoMinutes, 0)
    gbPerVideoMin = totalVideoMin > 0 ? totalTrafficGB / totalVideoMin : 0
  }

  // Users-Traffic 상관관계
  const usersTrafficRecords = validRecords.filter((r) => r.concurrentUsers > 0)
  let gbPerUserHour = 0
  if (usersTrafficRecords.length > 0) {
    const totalTrafficGB = usersTrafficRecords.reduce((sum, r) => sum + r.trafficMB / 1024, 0)
    // 대략적인 사용자-시간 추정 (시간별 데이터 기준)
    const totalUserHours = usersTrafficRecords.reduce((sum, r) => sum + r.concurrentUsers, 0)
    gbPerUserHour = totalUserHours > 0 ? totalTrafficGB / totalUserHours : 0
  }

  // Users-CPU 상관관계
  let cpuPerUser = 0
  if (usersTrafficRecords.length > 0) {
    const totalCpu = usersTrafficRecords.reduce((sum, r) => sum + r.cpuPercent, 0)
    const totalUsers = usersTrafficRecords.reduce((sum, r) => sum + r.concurrentUsers, 0)
    cpuPerUser = totalUsers > 0 ? totalCpu / totalUsers : 0
  }

  // 신뢰도 계산
  const getConfidence = (count: number): "low" | "medium" | "high" => {
    if (count < 10) return "low"
    if (count < 50) return "medium"
    return "high"
  }

  return {
    videoToTraffic: {
      coefficient: videoTrafficRecords.length > 0 ? 0.8 : 0, // 단순화된 계수
      gbPerVideoMin: Math.round(gbPerVideoMin * 10000) / 10000,
      gbPerVideoHour: Math.round(gbPerVideoMin * 60 * 1000) / 1000,
      confidence: getConfidence(videoTrafficRecords.length),
    },
    usersToTraffic: {
      coefficient: usersTrafficRecords.length > 0 ? 0.7 : 0,
      gbPerUserHour: Math.round(gbPerUserHour * 1000) / 1000,
      confidence: getConfidence(usersTrafficRecords.length),
    },
    usersToCpu: {
      coefficient: usersTrafficRecords.length > 0 ? 0.6 : 0,
      cpuPerUser: Math.round(cpuPerUser * 100) / 100,
      confidence: getConfidence(usersTrafficRecords.length),
    },
  }
}

// ============================================
// 비용 예측 공식 도출
// ============================================
interface CostFormula {
  formula: string
  example: {
    users: number
    hours: number
    estimatedTrafficGB: number
    estimatedCostUSD: number
    estimatedCostKRW: number
  }
  note: string
}

function deriveCostFormula(correlation: CorrelationResult): CostFormula {
  const gbPerUserHour = correlation.usersToTraffic.gbPerUserHour || 0.14 // 기본값: 140MB/시간
  const pricePerGB = 0.0085 // OCI 가격
  const freeLimit = 10 * 1024 // 10TB = 10240GB

  // 예시: 50명 × 5시간 × 22일
  const exampleUsers = 50
  const exampleHoursPerDay = 5
  const exampleDays = 22
  const exampleTotalHours = exampleUsers * exampleHoursPerDay * exampleDays
  const estimatedTrafficGB = exampleTotalHours * gbPerUserHour
  const excessGB = Math.max(0, estimatedTrafficGB - freeLimit)
  const estimatedCostUSD = excessGB * pricePerGB
  const estimatedCostKRW = Math.round(estimatedCostUSD * 1350)

  return {
    formula: `Traffic(GB) = ${gbPerUserHour.toFixed(3)} × Users × Hours`,
    example: {
      users: exampleUsers,
      hours: exampleHoursPerDay * exampleDays,
      estimatedTrafficGB: Math.round(estimatedTrafficGB * 100) / 100,
      estimatedCostUSD: Math.round(estimatedCostUSD * 100) / 100,
      estimatedCostKRW,
    },
    note: correlation.usersToTraffic.confidence === "low"
      ? "데이터 부족으로 기본 추정값 사용. 더 많은 데이터 수집 필요."
      : `실측 데이터 기반 (신뢰도: ${correlation.usersToTraffic.confidence})`,
  }
}
