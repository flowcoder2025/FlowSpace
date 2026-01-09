/**
 * OCI 인프라 메트릭 API
 *
 * Oracle Cloud Infrastructure Monitoring API를 사용하여
 * 실제 VM 메트릭 및 비용 정보를 조회합니다.
 *
 * SuperAdmin 전용
 *
 * GET /api/admin/oci-metrics
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"
import {
  OCI_ALWAYS_FREE_LIMITS,
  calculateCostEstimate,
  calculateResourcePercent,
  getDayOfMonth,
  getDaysInMonth,
  formatUSD,
  formatTB,
} from "@/lib/utils/oci-cost"
import {
  getOCIInstanceMetrics,
  getMonthlyNetworkTraffic,
  isOCIConfigured,
  getOCIConfigStatus,
} from "@/lib/utils/oci-monitoring"

// OCI 서버 URL (클라이언트용)
const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://space-socket.flow-coder.com"
const LIVEKIT_SERVER_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace("wss://", "https://") ||
  "https://space-livekit.flow-coder.com"

// OCI 서버 내부 URL (서버 사이드 전용)
const OCI_INTERNAL_IP = process.env.OCI_INTERNAL_IP || "144.24.72.143"
const SOCKET_INTERNAL_URL = `http://${OCI_INTERNAL_IP}:3001`
const LIVEKIT_INTERNAL_URL = `http://${OCI_INTERNAL_IP}:7880`

// ============================================
// 타입 정의
// ============================================
interface SocketServerMetrics {
  server: string
  version: string
  timestamp: number
  uptime: {
    seconds: number
    formatted: string
    startTime: string
  }
  connections: {
    total: number
    rooms: Array<{ spaceId: string; connections: number }>
    roomCount: number
  }
  parties: {
    count: number
  }
  process?: {
    memory?: {
      rssMB: number
      heapUsedMB: number
    }
  }
  // v1 호환
  memory?: {
    rssMB: number
    heapUsedMB: number
  }
}

export async function GET() {
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

    // 3. 데이터 수집 (병렬 실행)
    const [socketMetrics, livekitStatus, ociMetrics, monthlyTraffic] = await Promise.all([
      fetchSocketMetrics(),
      fetchLiveKitHealth(),
      isOCIConfigured() ? getOCIInstanceMetrics() : Promise.resolve(null),
      isOCIConfigured() ? getMonthlyNetworkTraffic() : Promise.resolve(null),
    ])

    // 4. 현재 날짜 정보
    const now = new Date()
    const dayOfMonth = getDayOfMonth(now)
    const daysInMonth = getDaysInMonth(now)

    // 5. OCI 메트릭 처리
    const hasOCIMetrics = ociMetrics && !("error" in ociMetrics)
    const hasMonthlyTraffic = monthlyTraffic && !("error" in monthlyTraffic)

    // CPU, 메모리 사용량 (OCI API 또는 기본값)
    let cpuPercent = 0
    let memoryPercent = 0
    let loadAverage = 0

    if (hasOCIMetrics) {
      cpuPercent = ociMetrics.cpu.utilizationPercent
      memoryPercent = ociMetrics.memory.utilizationPercent
      loadAverage = ociMetrics.cpu.loadAverage
    }

    // 트래픽 (OCI API 월별 누적)
    let trafficTB = 0
    let trafficGB = 0
    if (hasMonthlyTraffic) {
      trafficTB = monthlyTraffic.bytesOutTB
      trafficGB = monthlyTraffic.bytesOut / (1024 ** 3)
    }

    // 6. 비용 계산 (실제 트래픽 기반)
    const costEstimate = calculateCostEstimate(trafficTB, dayOfMonth, daysInMonth)

    // 7. 연결 정보 추출
    const socketConnections = socketMetrics?.connections?.total || 0
    const socketRooms = socketMetrics?.connections?.roomCount || 0
    const parties = socketMetrics?.parties?.count || 0

    // 프로세스 메모리 (v1/v2 호환)
    const processMemory = socketMetrics?.process?.memory || socketMetrics?.memory

    // 응답 구성
    const response = {
      timestamp: Date.now(),
      serverIP: OCI_INTERNAL_IP,

      // OCI API 연동 상태
      ociStatus: {
        configured: isOCIConfigured(),
        configStatus: getOCIConfigStatus(),
        metricsAvailable: hasOCIMetrics,
        trafficAvailable: hasMonthlyTraffic,
        error: ociMetrics && "error" in ociMetrics ? ociMetrics.message : null,
      },

      // 서버 상태
      servers: [
        {
          type: "socket.io" as const,
          url: SOCKET_SERVER_URL,
          status: socketMetrics ? ("running" as const) : ("unknown" as const),
          uptime: socketMetrics?.uptime || null,
          memory: processMemory
            ? {
                usedMB: processMemory.rssMB,
                heapUsedMB: processMemory.heapUsedMB,
              }
            : null,
        },
        {
          type: "livekit" as const,
          url: LIVEKIT_SERVER_URL.replace("https://", "wss://"),
          status: livekitStatus ? ("running" as const) : ("unknown" as const),
          uptime: null,
        },
      ],

      // 연결 정보
      connections: {
        socket: {
          total: socketConnections,
          rooms: socketRooms,
          parties: parties,
        },
        livekit: {
          rooms: 0, // LiveKit API 연동 필요
          participants: 0,
        },
        total: socketConnections,
        details: socketMetrics?.connections?.rooms || [],
      },

      // 리소스 사용량 (OCI Monitoring API 데이터)
      resources: {
        cpu: {
          percent: Math.round(cpuPercent * 100) / 100,
          loadAverage: Math.round(loadAverage * 100) / 100,
          limit: OCI_ALWAYS_FREE_LIMITS.cpu,
          unit: "%",
          source: hasOCIMetrics ? "oci-api" : "unavailable",
        },
        memory: {
          percent: Math.round(memoryPercent * 100) / 100,
          limit: OCI_ALWAYS_FREE_LIMITS.memoryGB,
          usedGB: Math.round((memoryPercent / 100) * OCI_ALWAYS_FREE_LIMITS.memoryGB * 100) / 100,
          totalGB: OCI_ALWAYS_FREE_LIMITS.memoryGB,
          unit: "GB",
          source: hasOCIMetrics ? "oci-api" : "unavailable",
        },
        storage: {
          usedGB: 0, // Block Volume API 필요
          totalGB: OCI_ALWAYS_FREE_LIMITS.storageGB,
          limit: OCI_ALWAYS_FREE_LIMITS.storageGB,
          percent: 0,
          unit: "GB",
          source: "unavailable",
        },
        traffic: {
          usedTB: Math.round(trafficTB * 1000) / 1000,
          usedGB: Math.round(trafficGB * 100) / 100,
          limit: OCI_ALWAYS_FREE_LIMITS.trafficTB,
          percent: calculateResourcePercent(trafficTB, OCI_ALWAYS_FREE_LIMITS.trafficTB),
          projectedTB:
            Math.round((costEstimate.projectedExcessTB + OCI_ALWAYS_FREE_LIMITS.trafficTB) * 100) / 100,
          unit: "TB",
          source: hasMonthlyTraffic ? "oci-api" : "unavailable",
          // 디버그 정보 (트래픽 계산 검증용)
          debug: hasMonthlyTraffic && "debug" in monthlyTraffic ? monthlyTraffic.debug : null,
        },
      },

      // 비용 정보
      cost: {
        current: {
          amount: costEstimate.currentCost,
          formatted: formatUSD(costEstimate.currentCost),
        },
        projected: {
          amount: costEstimate.projectedCost,
          formatted: formatUSD(costEstimate.projectedCost),
        },
        excessTraffic: {
          currentTB: costEstimate.excessTrafficTB,
          projectedTB: costEstimate.projectedExcessTB,
          formatted: formatTB(costEstimate.excessTrafficTB),
        },
        alertLevel: costEstimate.alertLevel,
        hasCost: costEstimate.hasCost,
        priceInfo: {
          trafficPerGB: "$0.0085/GB",
          note: "첫 10TB/월 무료, 초과 시 과금",
        },
      },

      // 월간 정보
      billing: {
        dayOfMonth,
        daysInMonth,
        daysRemaining: daysInMonth - dayOfMonth,
        monthProgress: Math.round((dayOfMonth / daysInMonth) * 100),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[OCI Metrics API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch OCI metrics" },
      { status: 500 }
    )
  }
}

/**
 * Socket.io 서버 메트릭 조회
 */
async function fetchSocketMetrics(): Promise<SocketServerMetrics | null> {
  try {
    const response = await fetch(`${SOCKET_INTERNAL_URL}/metrics`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`[OCI Metrics] Socket.io metrics failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn("[OCI Metrics] Socket.io metrics error:", error)
    return null
  }
}

/**
 * LiveKit 서버 상태 조회
 */
async function fetchLiveKitHealth(): Promise<{ status: string } | null> {
  try {
    const response = await fetch(LIVEKIT_INTERNAL_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    // LiveKit은 404를 반환해도 서버가 동작 중
    if (response.ok || response.status === 404) {
      return { status: "ok" }
    }

    return null
  } catch (error) {
    console.warn("[OCI Metrics] LiveKit health error:", error)
    return null
  }
}
