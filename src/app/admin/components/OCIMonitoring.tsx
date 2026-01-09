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
  ociStatus: {
    configured: boolean
    configStatus: Record<string, boolean>
    metricsAvailable: boolean
    trafficAvailable: boolean
    error: string | null
  }
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
    socket: { total: number; rooms: number; parties: number }
    livekit: { rooms: number; participants: number }
    total: number
    details: Array<{ spaceId: string; connections: number }>
  }
  resources: {
    cpu: {
      percent: number
      loadAverage: number
      limit: number
      unit: string
      source: string
    }
    memory: {
      percent: number
      usedGB: number
      totalGB: number
      limit: number
      unit: string
      source: string
    }
    storage: {
      allocatedGB: number
      usedGB: number
      availableGB: number
      percent: number
      limit: number
      unit: string
      sources: {
        allocation: string
        usage: string
      }
      bootVolume?: {
        id: string
        name: string
        sizeGB: number
      } | null
      mountPoint?: string | null
    }
    traffic: {
      usedTB: number
      usedGB: number
      limit: number
      percent: number
      projectedTB: number
      unit: string
      source: string
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
  total,
  percent,
  unit,
  alertLevel = "none",
  subtitle,
  source,
  extra,
}: {
  title: string
  used: number | string
  total: number | string
  percent: number
  unit: string
  alertLevel?: "none" | "warning" | "critical"
  subtitle?: string
  source?: string
  extra?: React.ReactNode
}) {
  const getStatusBadge = () => {
    if (source === "unavailable") {
      return <Badge variant="outline">미연동</Badge>
    }
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
            <VStack gap="xs">
              <Text weight="medium">{title}</Text>
              {subtitle && (
                <Text size="xs" tone="muted" className="truncate max-w-[150px]">
                  {subtitle}
                </Text>
              )}
            </VStack>
            {getStatusBadge()}
          </HStack>
          <ProgressBar
            percent={source === "unavailable" ? 0 : percent}
            alertLevel={alertLevel}
          />
          <HStack justify="between">
            <Text size="sm" tone="muted">
              {source === "unavailable" ? "-" : used} {unit} / {total} {unit}
            </Text>
            <Text size="sm" weight="medium">
              {source === "unavailable" ? "-" : `${percent}%`}
            </Text>
          </HStack>
          {source && (
            <HStack gap="xs" align="center" className="mt-1">
              <div className="size-1.5 rounded-full bg-muted-foreground/50" />
              <Text size="xs" tone="muted">
                {source === "oci-api" ? "OCI Monitoring API" :
                 source === "socket-server-df" ? "서버 df" :
                 source === "block-volume-api" ? "Block Volume API" :
                 source === "unavailable" ? "환경변수 설정 필요" : source}
              </Text>
            </HStack>
          )}
          {extra}
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
              <Text size="sm" tone="muted">업타임</Text>
              <Text size="sm" weight="medium">{uptime.formatted}</Text>
            </HStack>
          )}
          {memory && (
            <HStack justify="between">
              <Text size="sm" tone="muted">메모리</Text>
              <Text size="sm" weight="medium">{memory.usedMB} MB</Text>
            </HStack>
          )}
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// OCI Status Banner
// ============================================
function OCIStatusBanner({ ociStatus }: { ociStatus: OCIMetricsData["ociStatus"] }) {
  if (ociStatus.configured && ociStatus.metricsAvailable) {
    return null // 정상 작동 시 배너 표시 안함
  }

  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="py-4">
        <VStack gap="sm">
          <HStack gap="sm" align="center">
            <Badge className="bg-yellow-500 text-white">설정 필요</Badge>
            <Text size="sm" weight="medium">
              OCI Monitoring API 미연동
            </Text>
          </HStack>
          {ociStatus.error && (
            <Text size="xs" tone="muted">
              에러: {ociStatus.error}
            </Text>
          )}
          <Text size="xs" tone="muted">
            정확한 CPU, 메모리, 트래픽 데이터를 위해 Vercel 환경변수를 설정하세요:
          </Text>
          <div className="rounded bg-muted p-2 font-mono text-xs">
            OCI_TENANCY_ID, OCI_USER_ID, OCI_FINGERPRINT, OCI_PRIVATE_KEY,
            OCI_REGION, OCI_COMPARTMENT_ID, OCI_INSTANCE_ID
          </div>
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
  trafficSource,
}: {
  cost: OCIMetricsData["cost"]
  billing: OCIMetricsData["billing"]
  trafficSource: string
}) {
  const getAlertBadge = () => {
    if (trafficSource === "unavailable") {
      return <Badge variant="outline">데이터 없음</Badge>
    }
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
          <VStack gap="xs">
            <HStack gap="xs" align="center">
              <Text size="sm" tone="muted">현재 추정 비용</Text>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                추정치
              </Badge>
            </HStack>
            <Text
              weight="bold"
              className={`text-3xl ${
                trafficSource === "unavailable"
                  ? "text-muted-foreground"
                  : cost.hasCost
                    ? "text-red-500"
                    : "text-green-500"
              }`}
            >
              {trafficSource === "unavailable" ? "-" : cost.current.formatted}
            </Text>
            {trafficSource !== "unavailable" && !cost.hasCost && (
              <Text size="sm" tone="muted">Always Free 범위 내</Text>
            )}
            {trafficSource === "unavailable" && (
              <Text size="xs" tone="muted">OCI API 연동 필요</Text>
            )}
            <HStack gap="xs" align="center" className="mt-1">
              <div className="size-1.5 rounded-full bg-muted-foreground/50" />
              <Text size="xs" tone="muted">한도 기반 계산 (Monitoring API)</Text>
            </HStack>
          </VStack>

          <Divider />

          <VStack gap="sm">
            <HStack justify="between">
              <Text size="sm" tone="muted">월말 예측 비용</Text>
              <Text size="sm" weight="medium">
                {trafficSource === "unavailable" ? "-" : cost.projected.formatted}
              </Text>
            </HStack>
            <HStack justify="between">
              <Text size="sm" tone="muted">예측 초과 트래픽</Text>
              <Text size="sm" weight="medium">
                {trafficSource === "unavailable"
                  ? "-"
                  : `${cost.excessTraffic.projectedTB.toFixed(2)} TB`}
              </Text>
            </HStack>
          </VStack>

          <Divider />

          <VStack gap="sm">
            <Text size="sm" weight="medium">이번 달 진행률</Text>
            <ProgressBar percent={billing.monthProgress} />
            <HStack justify="between">
              <Text size="xs" tone="muted">
                {billing.dayOfMonth}일 / {billing.daysInMonth}일
              </Text>
              <Text size="xs" tone="muted">{billing.daysRemaining}일 남음</Text>
            </HStack>
          </VStack>

          <Divider />

          <VStack gap="xs" className="rounded-lg bg-muted/50 p-3">
            <Text size="xs" weight="medium">과금 기준</Text>
            <Text size="xs" tone="muted">{cost.priceInfo.note}</Text>
            <Text size="xs" tone="muted">초과 시: {cost.priceInfo.trafficPerGB}</Text>
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
          <Text weight="semibold" size="lg">OCI 통합 서버</Text>
          <Text size="sm" tone="muted">IP: {data.serverIP}</Text>
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

      {/* OCI Status Banner */}
      <OCIStatusBanner ociStatus={data.ociStatus} />

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
          <CardDescription>Socket.io + LiveKit 통합</CardDescription>
        </CardHeader>
        <CardContent>
          <Grid cols={5} gap="lg">
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl text-primary">
                {data.connections.total}
              </Text>
              <Text size="sm" tone="muted">총 연결</Text>
            </VStack>
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl">
                {data.connections.socket.total}
              </Text>
              <Text size="sm" tone="muted">Socket 연결</Text>
            </VStack>
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl">
                {data.connections.socket.rooms}
              </Text>
              <Text size="sm" tone="muted">활성 공간</Text>
            </VStack>
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl">
                {data.connections.livekit.participants}
              </Text>
              <Text size="sm" tone="muted">LiveKit 참가자</Text>
            </VStack>
            <VStack gap="xs" align="center">
              <Text weight="bold" className="text-2xl">
                {data.connections.socket.parties}
              </Text>
              <Text size="sm" tone="muted">파티</Text>
            </VStack>
          </Grid>
        </CardContent>
      </Card>

      {/* Resources & Cost */}
      <Grid cols={3} gap="lg">
        <GridItem colSpan={2}>
          <Card>
            <CardHeader>
              <CardTitle>시스템 리소스</CardTitle>
              <CardDescription>
                OCI VM 실시간 사용량 (Always Free: 4 OCPU, 24GB RAM, 10TB/월)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Grid cols={2} gap="default">
                <GridItem>
                  <ResourceCard
                    title="CPU"
                    used={data.resources.cpu.percent}
                    total={100}
                    percent={data.resources.cpu.percent}
                    unit="%"
                    subtitle={`Load: ${data.resources.cpu.loadAverage.toFixed(2)}`}
                    source={data.resources.cpu.source}
                  />
                </GridItem>
                <GridItem>
                  <ResourceCard
                    title="메모리"
                    used={data.resources.memory.usedGB}
                    total={data.resources.memory.totalGB}
                    percent={data.resources.memory.percent}
                    unit="GB"
                    source={data.resources.memory.source}
                  />
                </GridItem>
                <GridItem>
                  <ResourceCard
                    title="스토리지"
                    used={data.resources.storage.usedGB}
                    total={data.resources.storage.allocatedGB || data.resources.storage.limit}
                    percent={data.resources.storage.percent}
                    unit="GB"
                    subtitle={data.resources.storage.bootVolume?.name}
                    source={data.resources.storage.sources.usage}
                    extra={
                      <VStack gap="xs" className="mt-2 pt-2 border-t border-muted">
                        <HStack justify="between">
                          <Text size="xs" tone="muted">할당량</Text>
                          <Text size="xs">{data.resources.storage.allocatedGB || '-'} GB</Text>
                        </HStack>
                        <HStack gap="xs" align="center">
                          <div className="size-1.5 rounded-full bg-muted-foreground/50" />
                          <Text size="xs" tone="muted">
                            {data.resources.storage.sources.allocation === "block-volume-api"
                              ? "Block Volume API"
                              : "미연동"}
                          </Text>
                        </HStack>
                      </VStack>
                    }
                  />
                </GridItem>
                <GridItem>
                  <ResourceCard
                    title="트래픽 (이번 달)"
                    used={data.resources.traffic.usedGB}
                    total={data.resources.traffic.limit * 1024}
                    percent={data.resources.traffic.percent}
                    unit="GB"
                    alertLevel={data.cost.alertLevel}
                    source={data.resources.traffic.source}
                  />
                </GridItem>
              </Grid>
            </CardContent>
          </Card>
        </GridItem>

        <GridItem>
          <CostSummaryCard
            cost={data.cost}
            billing={data.billing}
            trafficSource={data.resources.traffic.source}
          />
        </GridItem>
      </Grid>
    </VStack>
  )
}
