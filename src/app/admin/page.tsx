"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Container,
  Section,
  HStack,
  VStack,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Badge,
  Divider,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Types
// ============================================
interface DashboardStats {
  totalVisitors: number
  peakConcurrent: number
  avgDuration: number
  returnRate: number
  weeklyChange: {
    visitors: number
    duration: number
    returnRate: number
  }
}

interface SpaceData {
  id: string
  name: string
  template: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  visitors: number
  events: number
  inviteCode: string
  createdAt: string
  createdAtFormatted: string
}

interface EventLog {
  id: string
  spaceId: string
  spaceName: string
  eventType: "ENTER" | "EXIT" | "INTERACTION" | "CHAT" | "VOICE_START" | "VOICE_END"
  user: {
    id: string
    name: string | null
    image?: string | null
    avatar?: string
    type: "user" | "guest"
  } | null
  payload: unknown
  createdAt: string
  relativeTime: string
}

// ============================================
// Stat Card Component
// ============================================
function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  loading = false,
}: {
  title: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  loading?: boolean
}) {
  const changeColor = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-muted-foreground",
  }[changeType]

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
            <Text weight="bold" className="text-3xl">
              {value}
            </Text>
          )}
          {change && !loading && (
            <Text size="sm" className={changeColor}>
              {change}
            </Text>
          )}
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Space Card Component
// ============================================
function SpaceCard({
  id,
  name,
  template,
  status,
  visitors,
  createdAtFormatted,
  loading = false,
}: SpaceData & { loading?: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <HStack justify="between" align="start">
          <VStack gap="xs">
            <CardTitle>{name}</CardTitle>
            <CardDescription>{template}</CardDescription>
          </VStack>
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status === "ACTIVE" ? "활성" : "비활성"}
          </Badge>
        </HStack>
      </CardHeader>
      <CardContent>
        <Divider className="mb-4" />
        <HStack justify="between">
          <VStack gap="xs">
            <Text tone="muted" size="sm">
              총 방문자
            </Text>
            <Text weight="medium">{visitors}명</Text>
          </VStack>
          <VStack gap="xs" align="end">
            <Text tone="muted" size="sm">
              생성일
            </Text>
            <Text weight="medium">{createdAtFormatted}</Text>
          </VStack>
        </HStack>
        <HStack gap="sm" className="mt-4">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/admin/spaces/${id}`}>관리</Link>
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/space/${id}`}>입장</Link>
          </Button>
        </HStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Activity Item
// ============================================
function ActivityItem({
  eventType,
  user,
  spaceName,
  relativeTime,
  loading = false,
}: {
  eventType: EventLog["eventType"]
  user: EventLog["user"]
  spaceName: string
  relativeTime: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <HStack gap="default" className="py-3">
        <div className="size-2 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
        </div>
      </HStack>
    )
  }

  const typeLabel = {
    ENTER: "입장",
    EXIT: "퇴장",
    INTERACTION: "상호작용",
    CHAT: "채팅",
    VOICE_START: "음성 시작",
    VOICE_END: "음성 종료",
  }[eventType]

  const typeColor = {
    ENTER: "bg-green-500",
    EXIT: "bg-red-500",
    INTERACTION: "bg-blue-500",
    CHAT: "bg-purple-500",
    VOICE_START: "bg-yellow-500",
    VOICE_END: "bg-gray-500",
  }[eventType]

  const userName = user?.name || "알 수 없음"

  return (
    <HStack gap="default" className="py-3">
      <div className={`size-2 rounded-full ${typeColor}`} />
      <VStack gap="xs" className="flex-1">
        <Text size="sm">
          <span className="font-medium">{userName}</span>님이{" "}
          <span className="font-medium">{spaceName}</span>에서 {typeLabel}
        </Text>
        <Text tone="muted" size="xs">
          {relativeTime}
        </Text>
      </VStack>
    </HStack>
  )
}

// ============================================
// Admin Dashboard Page
// ============================================
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [spaces, setSpaces] = useState<SpaceData[]>([])
  const [logs, setLogs] = useState<EventLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, spacesRes, logsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/spaces"),
          fetch("/api/admin/logs?limit=5"),
        ])

        if (!statsRes.ok || !spacesRes.ok || !logsRes.ok) {
          if (statsRes.status === 401 || spacesRes.status === 401 || logsRes.status === 401) {
            setError("로그인이 필요합니다")
          } else {
            setError("데이터를 불러올 수 없습니다")
          }
          return
        }

        const [statsData, spacesData, logsData] = await Promise.all([
          statsRes.json(),
          spacesRes.json(),
          logsRes.json(),
        ])

        setStats(statsData)
        setSpaces(spacesData.spaces || [])
        setLogs(logsData.logs || [])
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("데이터를 불러올 수 없습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Format stats for display
  const formattedStats = {
    totalVisitors: stats?.totalVisitors?.toLocaleString() || "0",
    peakConcurrent: stats?.peakConcurrent?.toString() || "0",
    avgDuration: stats?.avgDuration ? `${stats.avgDuration}분` : "0분",
    returnRate: stats?.returnRate ? `${stats.returnRate}%` : "0%",
  }

  const visitorChangeText = stats?.weeklyChange?.visitors
    ? stats.weeklyChange.visitors > 0
      ? `+${stats.weeklyChange.visitors}% 지난주 대비`
      : `${stats.weeklyChange.visitors}% 지난주 대비`
    : undefined

  const visitorChangeType: "positive" | "negative" | "neutral" =
    stats?.weeklyChange?.visitors && stats.weeklyChange.visitors > 0
      ? "positive"
      : stats?.weeklyChange?.visitors && stats.weeklyChange.visitors < 0
        ? "negative"
        : "neutral"

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-muted/30">
        <nav className="border-b bg-background">
          <Container>
            <HStack justify="between" className="h-16">
              <Link href="/" className="flex items-center gap-2">
                <img src="/FlowSpace_logo_transparent_clean.png" alt="FlowSpace" className="size-8 rounded-lg object-contain" />
                <Text weight="semibold" size="lg">
                  FlowSpace
                </Text>
              </Link>
            </HStack>
          </Container>
        </nav>
        <Section spacing="lg">
          <Container>
            <VStack gap="lg" align="center" className="py-12">
              <Text tone="muted">{error}</Text>
              <Button asChild>
                <Link href="/login">로그인하기</Link>
              </Button>
            </VStack>
          </Container>
        </Section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <Container>
          <HStack justify="between" className="h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/FlowSpace_logo_transparent_clean.png" alt="FlowSpace" className="size-8 rounded-lg object-contain" />
              <Text weight="semibold" size="lg">
                Flow Metaverse
              </Text>
            </Link>
            <HStack gap="default">
              <Button variant="outline" asChild>
                <Link href="/">홈</Link>
              </Button>
              <Button asChild>
                <Link href="/spaces/new">
                  {getText("BTN.LANDING.CREATE_SPACE")}
                </Link>
              </Button>
            </HStack>
          </HStack>
        </Container>
      </nav>

      <Section spacing="lg">
        <Container>
          <VStack gap="xl">
            {/* Header */}
            <HStack justify="between" align="end">
              <VStack gap="xs">
                <Heading as="h1" size="3xl">
                  {getText("LID.ADMIN.DASHBOARD.TITLE")}
                </Heading>
                <Text tone="muted">공간 운영 현황을 한눈에 확인하세요</Text>
              </VStack>
              <Button asChild>
                <Link href="/spaces/new">새 공간 만들기</Link>
              </Button>
            </HStack>

            {/* Stats */}
            <Grid cols={4} gap="default">
              <GridItem>
                <StatCard
                  title={getText("LID.ADMIN.STATS.VISITORS")}
                  value={formattedStats.totalVisitors}
                  change={visitorChangeText}
                  changeType={visitorChangeType}
                  loading={loading}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title={getText("LID.ADMIN.STATS.PEAK")}
                  value={formattedStats.peakConcurrent}
                  change="이번 주"
                  loading={loading}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title={getText("LID.ADMIN.STATS.AVG_DURATION")}
                  value={formattedStats.avgDuration}
                  loading={loading}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title={getText("LID.ADMIN.STATS.RETURN_RATE")}
                  value={formattedStats.returnRate}
                  loading={loading}
                />
              </GridItem>
            </Grid>

            {/* Main Content */}
            <Grid cols={3} gap="lg">
              {/* Spaces List */}
              <GridItem colSpan={2}>
                <Card>
                  <CardHeader>
                    <HStack justify="between">
                      <CardTitle>{getText("LID.ADMIN.SPACES.TITLE")}</CardTitle>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/spaces">전체 보기</Link>
                      </Button>
                    </HStack>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Grid cols={2} gap="default">
                        {[1, 2, 3, 4].map((i) => (
                          <GridItem key={i}>
                            <SpaceCard
                              id=""
                              name=""
                              template=""
                              status="ACTIVE"
                              visitors={0}
                              events={0}
                              inviteCode=""
                              createdAt=""
                              createdAtFormatted=""
                              loading
                            />
                          </GridItem>
                        ))}
                      </Grid>
                    ) : spaces.length === 0 ? (
                      <VStack gap="lg" align="center" className="py-8">
                        <Text tone="muted">아직 생성된 공간이 없습니다</Text>
                        <Button asChild>
                          <Link href="/spaces/new">첫 공간 만들기</Link>
                        </Button>
                      </VStack>
                    ) : (
                      <Grid cols={2} gap="default">
                        {spaces.slice(0, 4).map((space) => (
                          <GridItem key={space.id}>
                            <SpaceCard {...space} />
                          </GridItem>
                        ))}
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </GridItem>

              {/* Recent Activity */}
              <GridItem>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{getText("LID.ADMIN.LOGS.TITLE")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <VStack gap="none" className="divide-y">
                        {[1, 2, 3, 4].map((i) => (
                          <ActivityItem
                            key={i}
                            eventType="ENTER"
                            user={null}
                            spaceName=""
                            relativeTime=""
                            loading
                          />
                        ))}
                      </VStack>
                    ) : logs.length === 0 ? (
                      <VStack gap="default" align="center" className="py-8">
                        <Text tone="muted" size="sm">
                          {getText("LID.ADMIN.LOGS.EMPTY")}
                        </Text>
                      </VStack>
                    ) : (
                      <VStack gap="none" className="divide-y">
                        {logs.map((log) => (
                          <ActivityItem
                            key={log.id}
                            eventType={log.eventType}
                            user={log.user}
                            spaceName={log.spaceName}
                            relativeTime={log.relativeTime}
                          />
                        ))}
                      </VStack>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      asChild
                    >
                      <Link href="/admin/logs">전체 로그 보기</Link>
                    </Button>
                  </CardContent>
                </Card>
              </GridItem>
            </Grid>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
