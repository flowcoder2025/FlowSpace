/**
 * 리소스 스냅샷 수집 Cron API
 *
 * 5분마다 실행되어 OCI 리소스 사용량을 수집하고
 * ResourceSnapshot 테이블에 저장합니다.
 *
 * POST /api/cron/collect-metrics
 *
 * 트리거: Vercel Cron 또는 수동 호출
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getOCIInstanceMetrics,
  getMonthlyNetworkTraffic,
  isOCIConfigured,
} from "@/lib/utils/oci-monitoring"

// OCI 서버 내부 URL (서버 사이드 전용 - Cloudflare 우회)
// Vercel Cron에서 OCI 서버로 직접 연결
const OCI_INTERNAL_IP = process.env.OCI_INTERNAL_IP
const SOCKET_INTERNAL_URL = OCI_INTERNAL_IP ? `http://${OCI_INTERNAL_IP}:3001` : null

// OCI_INTERNAL_IP 미설정 시 경고
if (!OCI_INTERNAL_IP) {
  console.warn("[Config] OCI_INTERNAL_IP not set - Socket metrics collection disabled")
}

// Cron secret for verification (Vercel Cron)
const CRON_SECRET = process.env.CRON_SECRET
// 명시적 우회 플래그 (개발 환경에서만 CRON_AUTH_BYPASS=true로 설정)
const BYPASS_CRON_AUTH = process.env.CRON_AUTH_BYPASS === "true"

// ============================================
// POST /api/cron/collect-metrics
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Cron 인증 검증 (Vercel Cron 또는 수동 호출)
    const authHeader = request.headers.get("authorization")

    if (!BYPASS_CRON_AUTH && (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. 메트릭 수집 (병렬 실행)
    const [socketMetrics, ociMetrics, monthlyTraffic] = await Promise.all([
      fetchSocketMetrics(),
      isOCIConfigured() ? getOCIInstanceMetrics() : Promise.resolve(null),
      isOCIConfigured() ? getMonthlyNetworkTraffic() : Promise.resolve(null),
    ])

    // 3. 메트릭 추출
    const hasOCIMetrics = ociMetrics && !("error" in ociMetrics)
    const hasMonthlyTraffic = monthlyTraffic && !("error" in monthlyTraffic)

    // CPU, 메모리 사용량
    const cpuPercent = hasOCIMetrics ? ociMetrics.cpu.utilizationPercent : 0
    const memoryPercent = hasOCIMetrics ? ociMetrics.memory.utilizationPercent : 0
    const memoryMB = memoryPercent > 0 ? (memoryPercent / 100) * 24 * 1024 : 0 // 24GB to MB

    // 트래픽 (월간 누적)
    const trafficGB = hasMonthlyTraffic
      ? monthlyTraffic.bytesOut / (1024 ** 3)
      : 0

    // 연결 정보
    const concurrentUsers = socketMetrics?.connections?.total || 0
    const activeRooms = socketMetrics?.connections?.roomCount || 0

    // 4. 이전 스냅샷 조회 (델타 계산용)
    const lastSnapshot = await prisma.resourceSnapshot.findFirst({
      orderBy: { timestamp: "desc" },
      select: { trafficGB: true, timestamp: true },
    })

    // 델타 계산 (MB 단위)
    // 5분 간격 기준 최대 합리적 트래픽: 10GB (= 약 267 Mbps 지속)
    const MAX_DELTA_MB = 10 * 1024 // 10GB in MB

    let trafficDeltaMB = 0
    let deltaNote = "no_previous"

    if (lastSnapshot) {
      const rawDelta = (trafficGB - lastSnapshot.trafficGB) * 1024

      if (rawDelta < 0) {
        // 월초 리셋: 새 달의 누적값만 사용
        trafficDeltaMB = Math.min(trafficGB * 1024, MAX_DELTA_MB)
        deltaNote = "month_reset"
      } else if (rawDelta > MAX_DELTA_MB) {
        // 비정상적으로 큰 델타: 캡 적용 + 경고
        console.warn(`[Collect Metrics] Unusually large delta: ${rawDelta.toFixed(2)} MB, capping to ${MAX_DELTA_MB} MB`)
        trafficDeltaMB = MAX_DELTA_MB
        deltaNote = "capped"
      } else {
        trafficDeltaMB = rawDelta
        deltaNote = "normal"
      }
    }

    const adjustedDeltaMB = trafficDeltaMB

    // 5. 스냅샷 저장
    const snapshot = await prisma.resourceSnapshot.create({
      data: {
        cpuPercent,
        memoryPercent,
        memoryMB,
        trafficGB,
        trafficDeltaMB: adjustedDeltaMB,
        concurrentUsers,
        activeRooms,
      },
    })

    console.log(`[Collect Metrics] Snapshot saved: ${snapshot.id}`)
    console.log(`  CPU: ${cpuPercent.toFixed(2)}%, Memory: ${memoryPercent.toFixed(2)}%`)
    console.log(`  Traffic: ${trafficGB.toFixed(3)} GB (cumulative), Delta: ${adjustedDeltaMB.toFixed(2)} MB (${deltaNote})`)
    console.log(`  Users: ${concurrentUsers}, Rooms: ${activeRooms}`)

    return NextResponse.json({
      success: true,
      snapshotId: snapshot.id,
      metrics: {
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryPercent: Math.round(memoryPercent * 100) / 100,
        trafficGB: Math.round(trafficGB * 1000) / 1000,
        trafficDeltaMB: Math.round(adjustedDeltaMB * 100) / 100,
        concurrentUsers,
        activeRooms,
      },
    })
  } catch (error) {
    console.error("[Collect Metrics] Error:", error)
    return NextResponse.json(
      { error: "Failed to collect metrics" },
      { status: 500 }
    )
  }
}

// GET 메서드도 지원 (Vercel Cron 호환)
export async function GET(request: NextRequest) {
  // Vercel Cron은 GET 요청을 보냄
  return POST(request)
}

// ============================================
// Helper: Socket.io 서버 메트릭 조회
// ============================================
interface SocketServerMetrics {
  connections?: {
    total: number
    rooms?: Array<{ spaceId: string; connections: number }>
    roomCount: number
  }
}

async function fetchSocketMetrics(): Promise<SocketServerMetrics | null> {
  if (!SOCKET_INTERNAL_URL) {
    console.warn("[Collect Metrics] Socket metrics skipped - OCI_INTERNAL_IP not configured")
    return null
  }

  const url = `${SOCKET_INTERNAL_URL}/metrics`
  try {
    console.log(`[Collect Metrics] Fetching socket metrics from: ${url}`)
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`[Collect Metrics] Socket.io metrics failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn("[Collect Metrics] Socket.io metrics error:", error)
    return null
  }
}
