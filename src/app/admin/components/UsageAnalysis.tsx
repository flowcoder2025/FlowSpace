"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Text,
  VStack,
  HStack,
  Grid,
  GridItem,
  Button,
  Badge,
  Input,
  Divider,
} from "@/components/ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

// ============================================
// Types
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
  gbPerVideoMin: number | null
}

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

interface AnalysisData {
  period: string
  dateRange: {
    start: string
    end: string
    days: number
  }
  summary: {
    totalUsers: number
    peakConcurrent: number
    totalVideoMinutes: number
    totalTrafficGB: number
    avgCpuPercent: number
    avgMemoryPercent: number
  }
  correlation: CorrelationResult
  costFormula: CostFormula
  records: AnalysisRecord[]
  metadata: {
    totalRecords: number
    lastUpdated: string
  }
}

// ============================================
// Confidence Badge Component
// ============================================
function ConfidenceBadge({ confidence }: { confidence: "low" | "medium" | "high" }) {
  const variants = {
    low: { variant: "secondary" as const, text: "데이터 부족" },
    medium: { variant: "outline" as const, text: "보통" },
    high: { variant: "default" as const, text: "높음" },
  }
  const { variant, text } = variants[confidence]
  return <Badge variant={variant}>{text}</Badge>
}

// ============================================
// Abnormal Value Warning Badge Component
// ============================================
const NORMAL_RANGE = {
  gbPerUserHour: { min: 0.01, max: 10, unit: "GB/사용자-시간" },
  gbPerVideoMin: { min: 0.0001, max: 0.5, unit: "GB/영상-분" },
}

function AbnormalValueWarning({ value, type }: { value: number; type: keyof typeof NORMAL_RANGE }) {
  const range = NORMAL_RANGE[type]
  const isAbnormal = value < range.min || value > range.max

  if (!isAbnormal || value === 0) return null

  const severity = value > range.max * 10 ? "destructive" : "secondary"
  const message = value > range.max
    ? `비정상: ${range.unit} 정상 범위 초과 (${range.min}~${range.max})`
    : `비정상: ${range.unit} 정상 범위 미달`

  return (
    <Badge variant={severity} className="ml-2" title={message}>
      ⚠️ 비정상
    </Badge>
  )
}

// ============================================
// Stat Card Component
// ============================================
function MetricCard({
  title,
  value,
  unit,
  subtitle,
  loading = false,
}: {
  title: string
  value: string | number
  unit?: string
  subtitle?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <VStack gap="xs">
          <Text tone="muted" size="sm">
            {title}
          </Text>
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <HStack gap="xs" align="baseline">
              <Text weight="bold" className="text-2xl">
                {value}
              </Text>
              {unit && <Text tone="muted">{unit}</Text>}
            </HStack>
          )}
          {subtitle && (
            <Text size="xs" tone="muted">
              {subtitle}
            </Text>
          )}
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Cost Calculator Component
// ============================================
function CostCalculator({
  gbPerUserHour,
}: {
  gbPerUserHour: number
}) {
  const [users, setUsers] = useState(50)
  const [hoursPerDay, setHoursPerDay] = useState(5)
  const [days, setDays] = useState(22)

  // 비정상 값 감지 시 기본값 사용
  const isAbnormalRate = gbPerUserHour > 10 || gbPerUserHour < 0.01
  const effectiveRate = isAbnormalRate ? 0.14 : gbPerUserHour // 기본값: 140MB/시간

  const calculation = useMemo(() => {
    const totalHours = users * hoursPerDay * days
    const trafficGB = totalHours * effectiveRate
    const freeLimit = 10 * 1024 // 10TB = 10240GB
    const excessGB = Math.max(0, trafficGB - freeLimit)
    const costUSD = excessGB * 0.0085
    const costKRW = Math.round(costUSD * 1350)

    return {
      totalHours,
      trafficGB: Math.round(trafficGB * 100) / 100,
      trafficTB: Math.round((trafficGB / 1024) * 100) / 100,
      excessGB: Math.round(excessGB * 100) / 100,
      costUSD: Math.round(costUSD * 100) / 100,
      costKRW,
    }
  }, [users, hoursPerDay, days, effectiveRate])

  return (
    <Card>
      <CardHeader>
        <CardTitle>비용 예측 계산기</CardTitle>
        <CardDescription>
          예상 사용량을 입력하여 비용을 계산하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VStack gap="lg">
          <Grid cols={3} gap="default">
            <GridItem>
              <VStack gap="xs">
                <Text size="sm" weight="medium">동시 접속자</Text>
                <Input
                  type="number"
                  value={users}
                  onChange={(e) => setUsers(Number(e.target.value))}
                  min={1}
                />
              </VStack>
            </GridItem>
            <GridItem>
              <VStack gap="xs">
                <Text size="sm" weight="medium">일일 사용 시간</Text>
                <Input
                  type="number"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  min={1}
                  max={24}
                />
              </VStack>
            </GridItem>
            <GridItem>
              <VStack gap="xs">
                <Text size="sm" weight="medium">운영 일수</Text>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  min={1}
                />
              </VStack>
            </GridItem>
          </Grid>

          <Divider />

          <Grid cols={2} gap="default">
            <GridItem>
              <VStack gap="xs">
                <Text tone="muted" size="sm">예상 트래픽</Text>
                <Text weight="bold" className="text-xl">
                  {calculation.trafficTB} TB
                </Text>
                <Text size="xs" tone="muted">
                  ({calculation.trafficGB.toLocaleString()} GB)
                </Text>
              </VStack>
            </GridItem>
            <GridItem>
              <VStack gap="xs">
                <Text tone="muted" size="sm">무료 초과분</Text>
                <Text weight="bold" className="text-xl">
                  {calculation.excessGB.toLocaleString()} GB
                </Text>
                <Text size="xs" tone="muted">
                  (10TB 무료)
                </Text>
              </VStack>
            </GridItem>
            <GridItem>
              <VStack gap="xs">
                <Text tone="muted" size="sm">예상 비용 (USD)</Text>
                <Text weight="bold" className="text-xl">
                  ${calculation.costUSD.toLocaleString()}
                </Text>
              </VStack>
            </GridItem>
            <GridItem>
              <VStack gap="xs">
                <Text tone="muted" size="sm">예상 비용 (KRW)</Text>
                <Text weight="bold" className="text-xl text-primary">
                  ₩{calculation.costKRW.toLocaleString()}
                </Text>
              </VStack>
            </GridItem>
          </Grid>

          <Text size="xs" tone="muted" className="text-center">
            * OCI 아웃바운드 트래픽 기준 ($0.0085/GB, 월 10TB 무료)
          </Text>
          {isAbnormalRate && (
            <Text size="xs" className="text-center text-yellow-600">
              ⚠️ 측정 데이터가 비정상입니다. 기본 추정값(0.14 GB/사용자-시간)을 사용합니다.
            </Text>
          )}
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Usage Analysis Component
// ============================================
export function UsageAnalysis() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<"hourly" | "daily" | "weekly">("daily")
  const [days, setDays] = useState(7)
  const [resetting, setResetting] = useState(false)

  // Fetch data
  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/usage/analysis?period=${period}&days=${days}`)
      if (!res.ok) {
        throw new Error("Failed to fetch analysis data")
      }
      const result = await res.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error("Error fetching analysis:", err)
      setError("데이터를 불러올 수 없습니다")
    } finally {
      setLoading(false)
    }
  }, [period, days])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  // Reset usage data
  const handleReset = async () => {
    if (!confirm("모든 사용량 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.")) {
      return
    }

    setResetting(true)
    try {
      const res = await fetch("/api/admin/usage/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all", confirm: true }),
      })

      if (!res.ok) {
        throw new Error("Failed to reset data")
      }

      const result = await res.json()
      alert(`초기화 완료!\n\n삭제된 데이터:\n- 일별: ${result.results?.dailyDeleted || 0}개\n- 시간별: ${result.results?.hourlyDeleted || 0}개\n- 스냅샷: ${result.results?.snapshotsDeleted || 0}개`)

      // Refresh data
      fetchAnalysis()
    } catch (err) {
      console.error("Error resetting data:", err)
      alert("초기화 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"))
    } finally {
      setResetting(false)
    }
  }

  // Format chart data
  const chartData = useMemo(() => {
    if (!data?.records) return []
    return data.records.map((r) => ({
      ...r,
      date: new Date(r.timestamp).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      }),
      trafficGB: Math.round((r.trafficMB / 1024) * 100) / 100,
    }))
  }, [data])

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <VStack gap="lg" align="center">
            <Text tone="muted">{error}</Text>
            <Button onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </VStack>
        </CardContent>
      </Card>
    )
  }

  return (
    <VStack gap="xl">
      {/* Controls */}
      <HStack justify="between" align="center">
        <VStack gap="xs">
          <Text weight="semibold" size="lg">사용량 분석</Text>
          <Text tone="muted" size="sm">
            리소스 사용량과 비용 상관관계를 분석합니다
          </Text>
        </VStack>
        <HStack gap="sm">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">시간별</SelectItem>
              <SelectItem value="daily">일별</SelectItem>
              <SelectItem value="weekly">주별</SelectItem>
            </SelectContent>
          </Select>
          <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7일</SelectItem>
              <SelectItem value="14">14일</SelectItem>
              <SelectItem value="30">30일</SelectItem>
              <SelectItem value="90">90일</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetting}
            className="text-red-600 hover:text-red-700 hover:border-red-300"
          >
            {resetting ? "초기화 중..." : "데이터 초기화"}
          </Button>
        </HStack>
      </HStack>

      {/* Summary Stats */}
      <Grid cols={4} gap="default">
        <GridItem>
          <MetricCard
            title="총 트래픽"
            value={data?.summary.totalTrafficGB.toFixed(2) || "0"}
            unit="GB"
            loading={loading}
          />
        </GridItem>
        <GridItem>
          <MetricCard
            title="피크 동접"
            value={data?.summary.peakConcurrent || 0}
            unit="명"
            loading={loading}
          />
        </GridItem>
        <GridItem>
          <MetricCard
            title="평균 CPU"
            value={data?.summary.avgCpuPercent.toFixed(1) || "0"}
            unit="%"
            loading={loading}
          />
        </GridItem>
        <GridItem>
          <MetricCard
            title="영상 사용"
            value={data?.summary.totalVideoMinutes || 0}
            unit="분"
            loading={loading}
          />
        </GridItem>
      </Grid>

      {/* Charts */}
      <Grid cols={2} gap="lg">
        {/* Traffic Chart */}
        <GridItem>
          <Card>
            <CardHeader>
              <CardTitle>트래픽 추이</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] animate-pulse rounded bg-muted" />
              ) : chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center">
                  <Text tone="muted">데이터가 없습니다</Text>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="trafficGB"
                      name="트래픽 (GB)"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </GridItem>

        {/* Users & CPU Chart */}
        <GridItem>
          <Card>
            <CardHeader>
              <CardTitle>사용자 & CPU</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] animate-pulse rounded bg-muted" />
              ) : chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center">
                  <Text tone="muted">데이터가 없습니다</Text>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="concurrentUsers"
                      name="사용자"
                      stroke="#8884d8"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cpuPercent"
                      name="CPU %"
                      stroke="#82ca9d"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </GridItem>
      </Grid>

      {/* Correlation Analysis */}
      <Grid cols={3} gap="lg">
        <GridItem>
          <Card>
            <CardHeader>
              <HStack justify="between" align="start">
                <VStack gap="xs">
                  <CardTitle>영상 → 트래픽</CardTitle>
                  <CardDescription>영상 사용량과 트래픽 상관관계</CardDescription>
                </VStack>
                <ConfidenceBadge confidence={data?.correlation.videoToTraffic.confidence || "low"} />
              </HStack>
            </CardHeader>
            <CardContent>
              <VStack gap="sm">
                <HStack justify="between">
                  <Text tone="muted" size="sm">GB/영상-분</Text>
                  <Text weight="bold">
                    {data?.correlation.videoToTraffic.gbPerVideoMin.toFixed(4) || "0"}
                  </Text>
                </HStack>
                <HStack justify="between">
                  <Text tone="muted" size="sm">GB/영상-시간</Text>
                  <Text weight="bold">
                    {data?.correlation.videoToTraffic.gbPerVideoHour.toFixed(3) || "0"}
                  </Text>
                </HStack>
              </VStack>
            </CardContent>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardHeader>
              <HStack justify="between" align="start">
                <VStack gap="xs">
                  <CardTitle>사용자 → 트래픽</CardTitle>
                  <CardDescription>사용자 수와 트래픽 상관관계</CardDescription>
                </VStack>
                <HStack gap="xs">
                  <ConfidenceBadge confidence={data?.correlation.usersToTraffic.confidence || "low"} />
                  {data && (
                    <AbnormalValueWarning
                      value={data.correlation.usersToTraffic.gbPerUserHour}
                      type="gbPerUserHour"
                    />
                  )}
                </HStack>
              </HStack>
            </CardHeader>
            <CardContent>
              <VStack gap="sm">
                <HStack justify="between">
                  <Text tone="muted" size="sm" title="일별 데이터 기준: 운영시간 8시간 가정">
                    GB/사용자-시간
                  </Text>
                  <HStack gap="xs">
                    <Text weight="bold">
                      {data?.correlation.usersToTraffic.gbPerUserHour.toFixed(3) || "0"}
                    </Text>
                  </HStack>
                </HStack>
                <HStack justify="between">
                  <Text tone="muted" size="sm">상관계수</Text>
                  <Text weight="bold">
                    {data?.correlation.usersToTraffic.coefficient.toFixed(2) || "0"}
                  </Text>
                </HStack>
                {data && data.correlation.usersToTraffic.gbPerUserHour > 10 && (
                  <Text size="xs" className="text-yellow-600">
                    ⚠️ 정상 범위 (0.1~5.0 GB) 초과 - 데이터 수집 오류 가능성
                  </Text>
                )}
              </VStack>
            </CardContent>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardHeader>
              <HStack justify="between" align="start">
                <VStack gap="xs">
                  <CardTitle>사용자 → CPU</CardTitle>
                  <CardDescription>사용자 수와 CPU 상관관계</CardDescription>
                </VStack>
                <ConfidenceBadge confidence={data?.correlation.usersToCpu.confidence || "low"} />
              </HStack>
            </CardHeader>
            <CardContent>
              <VStack gap="sm">
                <HStack justify="between">
                  <Text tone="muted" size="sm">CPU%/사용자</Text>
                  <Text weight="bold">
                    {data?.correlation.usersToCpu.cpuPerUser.toFixed(2) || "0"}
                  </Text>
                </HStack>
                <HStack justify="between">
                  <Text tone="muted" size="sm">상관계수</Text>
                  <Text weight="bold">
                    {data?.correlation.usersToCpu.coefficient.toFixed(2) || "0"}
                  </Text>
                </HStack>
              </VStack>
            </CardContent>
          </Card>
        </GridItem>
      </Grid>

      {/* Cost Calculator */}
      <CostCalculator
        gbPerUserHour={data?.correlation.usersToTraffic.gbPerUserHour || 0.14}
      />

      {/* Formula & Notes */}
      {data?.costFormula && (
        <Card>
          <CardHeader>
            <CardTitle>비용 예측 공식</CardTitle>
          </CardHeader>
          <CardContent>
            <VStack gap="md">
              <code className="rounded bg-muted px-3 py-2 text-sm">
                {data.costFormula.formula}
              </code>
              <Text size="sm" tone="muted">
                {data.costFormula.note}
              </Text>
              {data.metadata && (
                <Text size="xs" tone="muted">
                  마지막 업데이트: {new Date(data.metadata.lastUpdated).toLocaleString("ko-KR")}
                  {" "}| 총 레코드: {data.metadata.totalRecords}개
                </Text>
              )}
            </VStack>
          </CardContent>
        </Card>
      )}
    </VStack>
  )
}
