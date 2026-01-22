/**
 * OCI (Oracle Cloud Infrastructure) 비용 계산 유틸리티
 *
 * Always Free 한도 및 초과 시 비용 계산
 * @see /docs/infrastructure/OCI.md
 */

// ============================================
// Always Free 한도 상수
// ============================================
export const OCI_ALWAYS_FREE_LIMITS = {
  /** CPU (OCPU) */
  cpu: 4,
  /** 메모리 (GB) */
  memoryGB: 24,
  /** 스토리지 (GB) */
  storageGB: 200,
  /** 아웃바운드 트래픽 (TB/월) */
  trafficTB: 10,
} as const

// ============================================
// OCI 가격 상수 (USD)
// ============================================
export const OCI_PRICING = {
  /** 아웃바운드 트래픽 초과 시 GB당 가격 */
  trafficPerGB: 0.0085,
  /** Compute 추가 OCPU당 시간당 가격 (참고용) */
  computePerOCPUHour: 0.025,
} as const

// ============================================
// 타입 정의
// ============================================
export interface OCIResourceUsage {
  cpu: {
    used: number
    limit: number
    percent: number
  }
  memory: {
    usedGB: number
    limit: number
    percent: number
  }
  storage: {
    usedGB: number
    limit: number
    percent: number
  }
  traffic: {
    usedTB: number
    limit: number
    percent: number
    /** 이번 달 남은 일수 기준 예측 */
    projectedTB: number
  }
}

export interface OCICostEstimate {
  /** 현재 추정 비용 (USD) */
  currentCost: number
  /** 월말 예측 비용 (USD) */
  projectedCost: number
  /** 초과 트래픽 (TB) */
  excessTrafficTB: number
  /** 예측 초과 트래픽 (TB) */
  projectedExcessTB: number
  /** 비용 발생 여부 */
  hasCost: boolean
  /** 경고 수준: none, warning (80%), critical (100%) */
  alertLevel: "none" | "warning" | "critical"
}

export interface OCIMetrics {
  timestamp: number
  server: {
    type: "socket.io" | "livekit"
    uptime: {
      seconds: number
      formatted: string
      startTime: string
    }
    status: "running" | "stopped" | "unknown"
  }[]
  resources: OCIResourceUsage
  cost: OCICostEstimate
  connections: {
    total: number
    rooms: number
  }
}

// ============================================
// 비용 계산 함수
// ============================================

/**
 * 트래픽 초과 비용 계산
 */
export function calculateTrafficCost(usedTB: number): number {
  const excessTB = Math.max(0, usedTB - OCI_ALWAYS_FREE_LIMITS.trafficTB)
  const excessGB = excessTB * 1024
  return excessGB * OCI_PRICING.trafficPerGB
}

/**
 * 월말 트래픽 예측 (현재 사용량 기반)
 */
export function projectMonthlyTraffic(
  usedTB: number,
  dayOfMonth: number,
  totalDaysInMonth: number
): number {
  if (dayOfMonth <= 0) return usedTB
  const dailyRate = usedTB / dayOfMonth
  return dailyRate * totalDaysInMonth
}

/**
 * 비용 예측 계산
 */
export function calculateCostEstimate(
  usedTrafficTB: number,
  dayOfMonth: number,
  totalDaysInMonth: number
): OCICostEstimate {
  const projectedTB = projectMonthlyTraffic(usedTrafficTB, dayOfMonth, totalDaysInMonth)
  const currentCost = calculateTrafficCost(usedTrafficTB)
  const projectedCost = calculateTrafficCost(projectedTB)
  const excessTrafficTB = Math.max(0, usedTrafficTB - OCI_ALWAYS_FREE_LIMITS.trafficTB)
  const projectedExcessTB = Math.max(0, projectedTB - OCI_ALWAYS_FREE_LIMITS.trafficTB)

  // 트래픽 사용률 기준 경고 수준
  const usagePercent = (usedTrafficTB / OCI_ALWAYS_FREE_LIMITS.trafficTB) * 100
  let alertLevel: "none" | "warning" | "critical" = "none"
  if (usagePercent >= 100) {
    alertLevel = "critical"
  } else if (usagePercent >= 80) {
    alertLevel = "warning"
  }

  return {
    currentCost,
    projectedCost,
    excessTrafficTB,
    projectedExcessTB,
    hasCost: currentCost > 0,
    alertLevel,
  }
}

/**
 * 리소스 사용량 퍼센트 계산
 * 소수점 1자리까지 반환 (예: 0.2%)
 */
export function calculateResourcePercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.round((used / limit) * 1000) / 10  // 소수점 1자리
}

/**
 * 바이트를 GB로 변환
 */
export function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024)
}

/**
 * 바이트를 TB로 변환
 */
export function bytesToTB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024 * 1024)
}

/**
 * 현재 월의 일수 계산
 */
export function getDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * 현재 월의 몇 번째 날인지 계산
 */
export function getDayOfMonth(date: Date = new Date()): number {
  return date.getDate()
}

/**
 * 숫자를 USD 통화 형식으로 포맷
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * TB를 읽기 쉬운 형식으로 포맷
 */
export function formatTB(tb: number): string {
  if (tb < 1) {
    return `${(tb * 1024).toFixed(1)} GB`
  }
  return `${tb.toFixed(2)} TB`
}
