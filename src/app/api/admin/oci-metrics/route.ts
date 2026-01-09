/**
 * OCI 인프라 메트릭 API
 *
 * Oracle Cloud 통합 서버 (Socket.io + LiveKit) 상태 및 비용 조회
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
  bytesToGB,
} from "@/lib/utils/oci-cost"

// OCI 서버 URL (환경변수 또는 기본값)
const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://space-socket.flow-coder.com"
const LIVEKIT_SERVER_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace("wss://", "https://") ||
  "https://space-livekit.flow-coder.com"

// 타입 정의
interface SocketMetrics {
  server: string
  version: string
  timestamp: number
  uptime: {
    seconds: number
    formatted: string
    startTime: string
  }
  cpu: {
    user: number
    system: number
    totalMicroseconds: number
  }
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    rssMB: number
    heapUsedMB: number
  }
  connections: {
    total: number
    rooms: Array<{ spaceId: string; connections: number }>
    roomCount: number
  }
  parties: {
    count: number
  }
}

interface LiveKitHealth {
  status: string
  timestamp?: number
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

    // 3. 서버 메트릭 수집
    const [socketMetrics, livekitHealth] = await Promise.all([
      fetchSocketMetrics(),
      fetchLiveKitHealth(),
    ])

    // 4. 현재 날짜 정보
    const now = new Date()
    const dayOfMonth = getDayOfMonth(now)
    const daysInMonth = getDaysInMonth(now)

    // 5. 트래픽 추정 (실제 OCI API 연동 전 더미 데이터)
    // TODO: OCI Monitoring API 연동 시 실제 데이터로 교체
    const estimatedTrafficTB = calculateEstimatedTraffic(
      socketMetrics?.connections?.total || 0,
      socketMetrics?.uptime?.seconds || 0
    )

    // 6. 비용 계산
    const costEstimate = calculateCostEstimate(
      estimatedTrafficTB,
      dayOfMonth,
      daysInMonth
    )

    // 7. 리소스 사용량 계산
    const memoryUsedGB = socketMetrics?.memory
      ? bytesToGB(socketMetrics.memory.rss)
      : 0

    // 응답 구성
    const response = {
      timestamp: Date.now(),
      serverIP: "144.24.72.143",

      // 서버 상태
      servers: [
        {
          type: "socket.io" as const,
          url: SOCKET_SERVER_URL,
          status: socketMetrics ? ("running" as const) : ("unknown" as const),
          uptime: socketMetrics?.uptime || null,
          memory: socketMetrics?.memory
            ? {
                usedMB: socketMetrics.memory.rssMB,
                heapUsedMB: socketMetrics.memory.heapUsedMB,
              }
            : null,
        },
        {
          type: "livekit" as const,
          url: LIVEKIT_SERVER_URL.replace("https://", "wss://"),
          status: livekitHealth ? ("running" as const) : ("unknown" as const),
          uptime: null, // LiveKit은 별도 메트릭 API 필요
        },
      ],

      // 연결 정보
      connections: {
        total: socketMetrics?.connections?.total || 0,
        rooms: socketMetrics?.connections?.roomCount || 0,
        parties: socketMetrics?.parties?.count || 0,
        details: socketMetrics?.connections?.rooms || [],
      },

      // Always Free 리소스 사용량
      resources: {
        cpu: {
          used: 0, // OCI API 연동 필요
          limit: OCI_ALWAYS_FREE_LIMITS.cpu,
          percent: 0,
          unit: "OCPU",
        },
        memory: {
          usedGB: Math.round(memoryUsedGB * 100) / 100,
          limit: OCI_ALWAYS_FREE_LIMITS.memoryGB,
          percent: calculateResourcePercent(
            memoryUsedGB,
            OCI_ALWAYS_FREE_LIMITS.memoryGB
          ),
          unit: "GB",
        },
        storage: {
          usedGB: 0, // OCI API 연동 필요
          limit: OCI_ALWAYS_FREE_LIMITS.storageGB,
          percent: 0,
          unit: "GB",
        },
        traffic: {
          usedTB: Math.round(estimatedTrafficTB * 100) / 100,
          limit: OCI_ALWAYS_FREE_LIMITS.trafficTB,
          percent: calculateResourcePercent(
            estimatedTrafficTB,
            OCI_ALWAYS_FREE_LIMITS.trafficTB
          ),
          projectedTB: Math.round(costEstimate.projectedExcessTB * 100) / 100 +
            OCI_ALWAYS_FREE_LIMITS.trafficTB,
          unit: "TB",
          note: "예상치 (실제 OCI API 연동 필요)",
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
async function fetchSocketMetrics(): Promise<SocketMetrics | null> {
  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/metrics`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "node-fetch", // Cloudflare 규칙 매칭용
      },
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
async function fetchLiveKitHealth(): Promise<LiveKitHealth | null> {
  try {
    const response = await fetch(LIVEKIT_SERVER_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "node-fetch", // Cloudflare 규칙 매칭용
      },
    })

    // LiveKit은 404를 반환해도 서버가 동작 중인 것
    if (response.ok || response.status === 404) {
      return { status: "ok", timestamp: Date.now() }
    }

    return null
  } catch (error) {
    console.warn("[OCI Metrics] LiveKit health error:", error)
    return null
  }
}

/**
 * 트래픽 추정 (연결 수 * 업타임 기반)
 *
 * 실제 OCI API 연동 전 임시 추정값
 * - 평균 연결당 ~500KB/분 (영상 통화 시)
 * - 텍스트만: ~1KB/분
 */
function calculateEstimatedTraffic(
  connections: number,
  uptimeSeconds: number
): number {
  // 간단한 추정: 연결당 평균 100KB/분 (텍스트 + 가끔 영상)
  const avgBytesPerMinutePerConnection = 100 * 1024 // 100KB
  const uptimeMinutes = uptimeSeconds / 60

  // 평균 동시 연결 수 추정 (현재 연결의 50%)
  const avgConnections = connections * 0.5

  const totalBytes = avgConnections * avgBytesPerMinutePerConnection * uptimeMinutes
  const totalTB = totalBytes / (1024 * 1024 * 1024 * 1024)

  // 최소 0.01TB 반환 (서버 운영 중이면)
  return Math.max(0.01, totalTB)
}
