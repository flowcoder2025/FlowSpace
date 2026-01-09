"use client"

import { useEffect, useState, useCallback } from "react"
import {
  VStack,
  HStack,
  Grid,
  GridItem,
  Text,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Divider,
} from "@/components/ui"

// ============================================
// Types
// ============================================
interface OCIMetricsData {
  timestamp: number
  serverIP: string
  servers: Array<{
    type: "socket.io" | "livekit"
    url: string
    status: "running" | "stopped" | "unknown"
    uptime: {
      seconds: number
      formatted: string
      startTime: string
    } | null
    memory?: {
      usedMB: number
      heapUsedMB: number
    } | null
  }>
  connections: {
    total: number
    rooms: number
    parties: number
    details: Array<{ spaceId: string; connections: number }>
  }
  resources: {
    cpu: { used: number; limit: number; percent: number; unit: string }
    memory: { usedGB: number; limit: number; percent: number; unit: string }
    storage: { usedGB: number; limit: number; percent: number; unit: string }
    traffic: {
      usedTB: number
      limit: number
      percent: number
      projectedTB: number
      unit: string
      note?: string
    }
  }
  cost: {
    current: { amount: number; formatted: string }
    projected: { amount: number; formatted: string }
    excessTraffic: { currentTB: number; projectedTB: number; formatted: string }
    alertLevel: "none" | "warning" | "critical"
    hasCost: boolean
    priceInfo: { trafficPerGB: string; note: string }
  }
  billing: {
    dayOfMonth: number
    daysInMonth: number
    daysRemaining: number
    monthProgress: number
  }
}

// ============================================
// Progress Bar Component
// ============================================
function ProgressBar({
  percent,
  alertLevel = "none",
}: {
  percent: number
  alertLevel?: "none" | "warning" | "critical"
}) {
  const getBarColor = () => {
    if (alertLevel === "critical" || percent >= 100) return "bg-red-500"
    if (alertLevel === "warning" || percent >= 80) return "bg-yellow-500"
    return "bg-primary"
  }

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full transition-all duration-500 ${getBarColor()}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

// ============================================
// Resource Card Component
// ============================================
function ResourceCard({
  title,
  used,
  limit,
  percent,
  unit,
  alertLevel = "none",
  note,
}: {
  title: string
  used: number
  limit: number
  percent: number
  unit: string
  alertLevel?: "none" | "warning" | "critical"
  note?: string
}) {
  const getStatusBadge = () => {
    if (alertLevel === "critical" || percent >= 100) {
      return <Badge variant="destructive">초과</Badge>
    }
    if (alertLevel === "warning" || percent >= 80) {
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
          주의
        </Badge>
      )
    }
    return <Badge variant="secondary">정상</Badge>
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <VStack gap="sm">
          <HStack justify="between" align="center">
            <Text weight="medium">{title}</Text>
            {getStatusBadge()}
          </HStack>
          <ProgressBar percent={percent} alertLevel={alertLevel} />
          <HStack justify="between">
            <Text size="sm" tone="muted">
              {used} {unit} / {limit} {unit}
            </Text>
            <Text size="sm" weight="medium">
              {percent}%
            </Text>
          </HStack>
          {note && (
            <Text size="xs" tone="muted" className="italic">
              {note}
            </Text>
          )}
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Server Status Card Component
// ============================================
function ServerStatusCard({
  type,
  url,
  status,
  uptime,
  memory,
}: OCIMetricsData["servers"][0]) {
  const getStatusColor = () => {
    if (status === "running") return "bg-green-500"
    if (status === "stopped") return "bg-red-500"
    return "bg-yellow-500"
  }

  const getStatusText = () => {
    if (status === "running") return "실행 중"
    if (status === "stopped") return "중지됨"
    return "알 수 없음"
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <HStack justify="between" align="center">
          <CardTitle className="text-base">
            {type === "socket.io" ? "Socket.io" : "LiveKit"}
          </CardTitle>
          <HStack gap="xs" align="center">
            <div className={`size-2 rounded-full ${getStatusColor()}`} />
            <Text size="sm">{getStatusText()}</Text>
          </HStack>
        </HStack>
        <CardDescription className="text-xs truncate">{url}</CardDescription>
      </CardHeader>
      <CardContent>
        <VStack gap="xs">
          {uptime && (
            <HStack justify="between">
              <Text size="sm" tone="muted">
                업타임
              </Text>
              <Text size="sm" weight="medium">
                {uptime.formatted}
              </Text>
            </HStack>
          )}
          {memory && (
            <HStack justify="between">
              <Text size="sm" tone="muted">
                메모리
              </Text>
              <Text size="sm" weight="medium">
                {memory.usedMB} MB
              </Text>
            </HStack>
          )}
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Cost Summary Card Component
// ============================================
function CostSummaryCard({
  cost,
  billing,
}: {
  cost: OCIMetricsData["cost"]
  billing: OCIMetricsData["billing"]
}) {
  const getAlertBadge = () => {
    if (cost.alertLevel === "critical") {
      return <Badge variant="destructive">비용 발생</Badge>
    }
    if (cost.alertLevel === "warning") {
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
          80% 도달
        </Badge>
      )
    }
    return <Badge variant="secondary">무료 범위</Badge>
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <HStack justify="between" align="center">
          <CardTitle>비용 예측</CardTitle>
          {getAlertBadge()}
        </HStack>
      </CardHeader>
      <CardContent>
        <VStack gap="lg">
          {/* 현재 비용 */}
          <VStack gap="xs">
            <Text size="sm" tone="muted">
              현재 추정 비용
            </Text>
            <Text
              weight="bold"
              className={`text-3xl ${cost.hasCost ? "text-red-500" : "text-green-500"}`}
            >
              {cost.current.formatted}
            </Text>
            {!cost.hasCost && (
              <Text size="sm" tone="muted">
                Always Free 범위 내
              </Text>
            )}
          </VStack>

          <Divider />

          {/* 월말 예측 */}
          <VStack gap="sm">
            <HStack justify="between">
              <Text size="sm" tone="muted">
                월말 예측 비용
              </Text>
              <Text size="sm" weight="medium">
                {cost.projected.formatted}
              </Text>
            </HStack>
            <HStack justify="between">
              <Text size="sm" tone="muted">
                예측 초과 트래픽
              </Text>
              <Text size="sm" weight="medium">
                {cost.excessTraffic.projectedTB.toFixed(2)} TB
              </Text>
            </HStack>
          </VStack>

          <Divider />

          {/* 결제 기간 정보 */}
          <VStack gap="sm">
            <Text size="sm" weight="medium">
              이번 달 진행률
            </Text>
            <ProgressBar percent={billing.monthProgress} />
            <HStack justify="between">
              <Text size="xs" tone="muted">
                {billing.dayOfMonth}일 / {billing.daysInMonth}일
              </Text>
              <Text size="xs" tone="muted">
                {billing.daysRemaining}일 남음
              </Text>
            </HStack>
          </VStack>

          <Divider />

          {/* 가격 정보 */}
          <VStack gap="xs" className="rounded-lg bg-muted/50 p-3">
            <Text size="xs" weight="medium">
              과금 기준
            </Text>
            <Text size="xs" tone="muted">
              {cost.priceInfo.note}
            </Text>
            <Text size="xs" tone="muted">
              초과 시: {cost.priceInfo.trafficPerGB}
            </Text>
          </VStack>
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Main OCI Monitoring Component
// ============================================
export function OCIMonitoring() {
  const [data, setData] = useState<OCIMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/oci-metrics")
      if (!response.ok) {
        throw new Error("Failed to fetch metrics")
      }
      const result = await response.json()
      setData(result)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error("Error fetching OCI metrics:", err)
      setError("메트릭을 불러올 수 없습니다")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()

    // 30초마다 자동 새로고침
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  if (loading) {
    return (
      <VStack gap="lg" className="animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <Grid cols={4} gap="default">
          {[1, 2, 3, 4].map((i) => (
            <GridItem key={i}>
              <div className="h-32 rounded-lg bg-muted" />
            </GridItem>
          ))}
        </Grid>
      </VStack>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12">
          <VStack gap="lg" align="center">
            <Text tone="muted">{error || "데이터를 불러올 수 없습니다"}</Text>
            <Button onClick={fetchMetrics}>다시 시도</Button>
          </VStack>
        </CardContent>
      </Card>
    )
  }

  return (
    <VStack gap="xl">
      {/* Header */}
      <HStack justify="between" align="center">
        <VStack gap="xs">
          <Text weight="semibold" size="lg">
            OCI 통합 서버
          </Text>
          <Text size="sm" tone="muted">
            IP: {data.serverIP}
          </Text>
        </VStack>
        <HStack gap="sm" align="center">
          {lastUpdated && (
            <Text size="xs" tone="muted">
              마지막 업데이트: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
          <Button variant="outline" size="sm" onClick={fetchMetrics}>
            새로고침
          </Button>
        </HStack>
      </HStack>

      {/* Server Status */}
      <Grid cols={2} gap="default">
        {data.servers.map((server) => (
          <GridItem key={server.type}>
            <ServerStatusCard {...server} />
          </GridItem>
        ))}
      </Grid>

      {/* Connection Stats */}
      <Card>
        <CardHeader>
          <CardTitle>연결 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid cols={3} gap="lg">
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl">
                {data.connections.total}
              </Text>
              <Text size="sm" tone="muted">
                총 연결
              </Text>
            </VStack>
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl">
                {data.connections.rooms}
              </Text>
              <Text size="sm" tone="muted">
                활성 공간
              </Text>
            </VStack>
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl">
                {data.connections.parties}
              </Text>
              <Text size="sm" tone="muted">
                파티
              </Text>
            </VStack>
          </Grid>
        </CardContent>
      </Card>

      {/* Resources & Cost */}
      <Grid cols={3} gap="lg">
        {/* Always Free Resources */}
        <GridItem colSpan={2}>
          <Card>
            <CardHeader>
              <CardTitle>Always Free 리소스</CardTitle>
              <CardDescription>
                Oracle Cloud 무료 한도 사용량
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Grid cols={2} gap="default">
                <GridItem>
                  <ResourceCard
                    title="CPU"
                    used={data.resources.cpu.used}
                    limit={data.resources.cpu.limit}
                    percent={data.resources.cpu.percent}
                    unit={data.resources.cpu.unit}
                  />
                </GridItem>
                <GridItem>
                  <ResourceCard
                    title="메모리"
                    used={data.resources.memory.usedGB}
                    limit={data.resources.memory.limit}
                    percent={data.resources.memory.percent}
                    unit={data.resources.memory.unit}
                  />
                </GridItem>
                <GridItem>
                  <ResourceCard
                    title="스토리지"
                    used={data.resources.storage.usedGB}
                    limit={data.resources.storage.limit}
                    percent={data.resources.storage.percent}
                    unit={data.resources.storage.unit}
                  />
                </GridItem>
                <GridItem>
                  <ResourceCard
                    title="트래픽 (이번 달)"
                    used={data.resources.traffic.usedTB}
                    limit={data.resources.traffic.limit}
                    percent={data.resources.traffic.percent}
                    unit={data.resources.traffic.unit}
                    alertLevel={data.cost.alertLevel}
                    note={data.resources.traffic.note}
                  />
                </GridItem>
              </Grid>
            </CardContent>
          </Card>
        </GridItem>

        {/* Cost Summary */}
        <GridItem>
          <CostSummaryCard cost={data.cost} billing={data.billing} />
        </GridItem>
      </Grid>

      {/* Info Note */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <HStack gap="sm">
            <Text size="sm" tone="muted">
              참고: CPU, 스토리지, 정확한 트래픽은 OCI Monitoring API 연동 후
              표시됩니다. 현재 트래픽은 연결 수 기반 추정치입니다.
            </Text>
          </HStack>
        </CardContent>
      </Card>
    </VStack>
  )
}
