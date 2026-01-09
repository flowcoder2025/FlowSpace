/**
 * OCI Monitoring API 클라이언트
 *
 * Oracle Cloud Infrastructure Monitoring API를 사용하여
 * 실제 VM 메트릭 (CPU, 메모리, 네트워크, 디스크)을 조회합니다.
 *
 * @see https://docs.oracle.com/en-us/iaas/Content/Monitoring/Concepts/monitoringoverview.htm
 * @see https://docs.oracle.com/en-us/iaas/Content/Compute/References/computemetrics.htm
 */

import * as oci from "oci-sdk"

// ============================================
// 환경변수 설정
// ============================================
const OCI_CONFIG = {
  tenancyId: process.env.OCI_TENANCY_ID || "",
  userId: process.env.OCI_USER_ID || "",
  fingerprint: process.env.OCI_FINGERPRINT || "",
  privateKey: process.env.OCI_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
  region: process.env.OCI_REGION || "ap-chuncheon-1",
  compartmentId: process.env.OCI_COMPARTMENT_ID || "",
  instanceId: process.env.OCI_INSTANCE_ID || "",
}

// ============================================
// 타입 정의
// ============================================
export interface OCIInstanceMetrics {
  timestamp: Date
  cpu: {
    utilizationPercent: number
    loadAverage: number
  }
  memory: {
    utilizationPercent: number
    allocationStalls: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    bytesInGB: number
    bytesOutGB: number
  }
  disk: {
    bytesRead: number
    bytesWritten: number
    iopsRead: number
    iopsWritten: number
  }
}

export interface OCIMonitoringError {
  error: true
  message: string
  code?: string
}

// ============================================
// OCI 클라이언트 초기화
// ============================================
function createOCIProvider(): oci.common.AuthenticationDetailsProvider | null {
  // 환경변수가 설정되지 않으면 null 반환
  if (!OCI_CONFIG.tenancyId || !OCI_CONFIG.userId || !OCI_CONFIG.privateKey) {
    console.warn("[OCI Monitoring] OCI credentials not configured")
    return null
  }

  try {
    // Simple Authentication Provider 생성
    const provider = new oci.common.SimpleAuthenticationDetailsProvider(
      OCI_CONFIG.tenancyId,
      OCI_CONFIG.userId,
      OCI_CONFIG.fingerprint,
      OCI_CONFIG.privateKey,
      null, // passphrase
      oci.common.Region.fromRegionId(OCI_CONFIG.region)
    )
    return provider
  } catch (error) {
    console.error("[OCI Monitoring] Failed to create auth provider:", error)
    return null
  }
}

// ============================================
// 메트릭 조회 함수
// ============================================

/**
 * OCI Monitoring API에서 특정 메트릭 조회
 */
async function queryMetric(
  client: oci.monitoring.MonitoringClient,
  metricName: string,
  namespace: string = "oci_computeagent",
  interval: string = "1m"
): Promise<number | null> {
  try {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const request: oci.monitoring.requests.SummarizeMetricsDataRequest = {
      compartmentId: OCI_CONFIG.compartmentId,
      summarizeMetricsDataDetails: {
        namespace,
        query: `${metricName}[${interval}]{resourceId = "${OCI_CONFIG.instanceId}"}.mean()`,
        startTime: fiveMinutesAgo,
        endTime: now,
      },
    }

    const response = await client.summarizeMetricsData(request)

    if (response.items && response.items.length > 0) {
      const datapoints = response.items[0].aggregatedDatapoints
      if (datapoints && datapoints.length > 0) {
        // 가장 최근 데이터포인트 반환
        const latestValue = datapoints[datapoints.length - 1].value
        return latestValue ?? null
      }
    }
    return null
  } catch (error) {
    console.error(`[OCI Monitoring] Failed to query ${metricName}:`, error)
    return null
  }
}

/**
 * OCI Compute 인스턴스의 모든 메트릭 조회
 */
export async function getOCIInstanceMetrics(): Promise<OCIInstanceMetrics | OCIMonitoringError> {
  const provider = createOCIProvider()

  if (!provider) {
    return {
      error: true,
      message: "OCI credentials not configured. Set OCI_TENANCY_ID, OCI_USER_ID, OCI_FINGERPRINT, OCI_PRIVATE_KEY, OCI_COMPARTMENT_ID, OCI_INSTANCE_ID environment variables.",
    }
  }

  if (!OCI_CONFIG.compartmentId || !OCI_CONFIG.instanceId) {
    return {
      error: true,
      message: "OCI_COMPARTMENT_ID and OCI_INSTANCE_ID are required",
    }
  }

  try {
    const client = new oci.monitoring.MonitoringClient({
      authenticationDetailsProvider: provider,
    })

    // 병렬로 모든 메트릭 조회
    const [
      cpuUtilization,
      loadAverage,
      memoryUtilization,
      memoryStalls,
      networkBytesIn,
      networkBytesOut,
      diskBytesRead,
      diskBytesWritten,
      diskIopsRead,
      diskIopsWritten,
    ] = await Promise.all([
      queryMetric(client, "CpuUtilization"),
      queryMetric(client, "LoadAverage"),
      queryMetric(client, "MemoryUtilization"),
      queryMetric(client, "MemoryAllocationStalls"),
      queryMetric(client, "NetworksBytesIn"),
      queryMetric(client, "NetworksBytesOut"),
      queryMetric(client, "DiskBytesRead"),
      queryMetric(client, "DiskBytesWritten"),
      queryMetric(client, "DiskIopsRead"),
      queryMetric(client, "DiskIopsWritten"),
    ])

    const bytesToGB = (bytes: number) => bytes / (1024 ** 3)

    return {
      timestamp: new Date(),
      cpu: {
        utilizationPercent: cpuUtilization ?? 0,
        loadAverage: loadAverage ?? 0,
      },
      memory: {
        utilizationPercent: memoryUtilization ?? 0,
        allocationStalls: memoryStalls ?? 0,
      },
      network: {
        bytesIn: networkBytesIn ?? 0,
        bytesOut: networkBytesOut ?? 0,
        bytesInGB: bytesToGB(networkBytesIn ?? 0),
        bytesOutGB: bytesToGB(networkBytesOut ?? 0),
      },
      disk: {
        bytesRead: diskBytesRead ?? 0,
        bytesWritten: diskBytesWritten ?? 0,
        iopsRead: diskIopsRead ?? 0,
        iopsWritten: diskIopsWritten ?? 0,
      },
    }
  } catch (error) {
    const err = error as Error
    console.error("[OCI Monitoring] Error fetching metrics:", err)
    return {
      error: true,
      message: err.message || "Failed to fetch OCI metrics",
      code: (err as { code?: string }).code,
    }
  }
}

/**
 * 월별 누적 네트워크 트래픽 조회 (비용 계산용)
 */
export async function getMonthlyNetworkTraffic(): Promise<{
  bytesOut: number
  bytesOutTB: number
} | OCIMonitoringError> {
  const provider = createOCIProvider()

  if (!provider) {
    return {
      error: true,
      message: "OCI credentials not configured",
    }
  }

  try {
    const client = new oci.monitoring.MonitoringClient({
      authenticationDetailsProvider: provider,
    })

    // 이번 달 시작일
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const request: oci.monitoring.requests.SummarizeMetricsDataRequest = {
      compartmentId: OCI_CONFIG.compartmentId,
      summarizeMetricsDataDetails: {
        namespace: "oci_computeagent",
        query: `NetworksBytesOut[1d]{resourceId = "${OCI_CONFIG.instanceId}"}.sum()`,
        startTime: monthStart,
        endTime: now,
        resolution: "1d",
      },
    }

    const response = await client.summarizeMetricsData(request)

    let totalBytesOut = 0
    if (response.items && response.items.length > 0) {
      const datapoints = response.items[0].aggregatedDatapoints
      if (datapoints) {
        for (const dp of datapoints) {
          totalBytesOut += dp.value ?? 0
        }
      }
    }

    return {
      bytesOut: totalBytesOut,
      bytesOutTB: totalBytesOut / (1024 ** 4),
    }
  } catch (error) {
    const err = error as Error
    console.error("[OCI Monitoring] Error fetching monthly traffic:", err)
    return {
      error: true,
      message: err.message || "Failed to fetch monthly traffic",
    }
  }
}

/**
 * OCI 설정 상태 확인
 */
export function isOCIConfigured(): boolean {
  return !!(
    OCI_CONFIG.tenancyId &&
    OCI_CONFIG.userId &&
    OCI_CONFIG.fingerprint &&
    OCI_CONFIG.privateKey &&
    OCI_CONFIG.compartmentId &&
    OCI_CONFIG.instanceId
  )
}

/**
 * OCI 설정 상태 반환 (디버깅용)
 */
export function getOCIConfigStatus(): Record<string, boolean> {
  return {
    tenancyId: !!OCI_CONFIG.tenancyId,
    userId: !!OCI_CONFIG.userId,
    fingerprint: !!OCI_CONFIG.fingerprint,
    privateKey: !!OCI_CONFIG.privateKey,
    region: !!OCI_CONFIG.region,
    compartmentId: !!OCI_CONFIG.compartmentId,
    instanceId: !!OCI_CONFIG.instanceId,
  }
}
