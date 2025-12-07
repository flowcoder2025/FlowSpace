"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Container,
  Section,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
  Input,
  Divider,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Types
// ============================================
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

interface SpaceOption {
  id: string
  name: string
}

// ============================================
// Event Type Config
// ============================================
const eventTypeConfig: Record<
  EventLog["eventType"],
  { label: string; color: string; bgColor: string }
> = {
  ENTER: { label: "입장", color: "text-green-700", bgColor: "bg-green-100" },
  EXIT: { label: "퇴장", color: "text-red-700", bgColor: "bg-red-100" },
  INTERACTION: { label: "상호작용", color: "text-blue-700", bgColor: "bg-blue-100" },
  CHAT: { label: "채팅", color: "text-purple-700", bgColor: "bg-purple-100" },
  VOICE_START: { label: "음성 시작", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  VOICE_END: { label: "음성 종료", color: "text-gray-700", bgColor: "bg-gray-100" },
}

// ============================================
// Log Row Component
// ============================================
function LogRow({ log }: { log: EventLog }) {
  const config = eventTypeConfig[log.eventType]
  const userName = log.user?.name || "알 수 없음"
  const userType = log.user?.type === "guest" ? "게스트" : "회원"

  return (
    <div className="flex items-center gap-4 py-4 border-b last:border-b-0">
      {/* Event Type Badge */}
      <div className="w-24 flex-shrink-0">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
        >
          {config.label}
        </span>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <HStack gap="sm" align="center">
          <Text weight="medium" className="truncate">
            {userName}
          </Text>
          <Badge variant="outline" className="text-xs">
            {userType}
          </Badge>
        </HStack>
        <Text size="sm" tone="muted" className="truncate">
          {log.spaceName}
        </Text>
      </div>

      {/* Timestamp */}
      <div className="w-32 text-right flex-shrink-0">
        <Text size="sm" tone="muted">
          {log.relativeTime}
        </Text>
      </div>
    </div>
  )
}

// ============================================
// Loading Skeleton
// ============================================
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b">
          <div className="w-24 h-6 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="w-32 h-4 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

// ============================================
// Empty State
// ============================================
function EmptyState() {
  return (
    <VStack gap="lg" align="center" className="py-12">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <svg
          className="size-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <VStack gap="sm" align="center">
        <Text weight="semibold" size="lg">
          {getText("LID.ADMIN.LOGS.EMPTY")}
        </Text>
        <Text tone="muted" className="text-center">
          아직 기록된 이벤트가 없습니다
        </Text>
      </VStack>
    </VStack>
  )
}

// ============================================
// Admin Logs Page
// ============================================
export default function AdminLogsPage() {
  const [logs, setLogs] = useState<EventLog[]>([])
  const [spaces, setSpaces] = useState<SpaceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<string>("")
  const [selectedType, setSelectedType] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [total, setTotal] = useState(0)
  const [limit] = useState(50)
  const [exporting, setExporting] = useState(false)

  // Fetch spaces for filter
  useEffect(() => {
    async function fetchSpaces() {
      try {
        const res = await fetch("/api/admin/spaces")
        if (res.ok) {
          const data = await res.json()
          setSpaces(
            (data.spaces || []).map((s: { id: string; name: string }) => ({
              id: s.id,
              name: s.name,
            }))
          )
        }
      } catch (err) {
        console.error("Error fetching spaces:", err)
      }
    }
    fetchSpaces()
  }, [])

  // Fetch logs
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("limit", limit.toString())
        if (selectedSpace) {
          params.set("spaceId", selectedSpace)
        }
        if (startDate) {
          params.set("startDate", startDate)
        }
        if (endDate) {
          params.set("endDate", endDate)
        }

        const res = await fetch(`/api/admin/logs?${params.toString()}`)
        if (!res.ok) {
          if (res.status === 401) {
            setError("로그인이 필요합니다")
          } else {
            setError("데이터를 불러올 수 없습니다")
          }
          return
        }
        const data = await res.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      } catch (err) {
        console.error("Error fetching logs:", err)
        setError("데이터를 불러올 수 없습니다")
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [selectedSpace, startDate, endDate, limit])

  // Export CSV
  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set("limit", "1000") // Export up to 1000 records
      params.set("format", "csv")
      if (selectedSpace) {
        params.set("spaceId", selectedSpace)
      }
      if (startDate) {
        params.set("startDate", startDate)
      }
      if (endDate) {
        params.set("endDate", endDate)
      }

      const res = await fetch(`/api/admin/logs?${params.toString()}`)
      if (!res.ok) {
        console.error("Failed to export CSV")
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `event-logs-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Error exporting CSV:", err)
    } finally {
      setExporting(false)
    }
  }

  // Filter logs by type (client-side)
  const filteredLogs = selectedType
    ? logs.filter((log) => log.eventType === selectedType)
    : logs

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
              <img src="/logo.jpg" alt="Flow Metaverse" className="size-8 rounded-lg object-contain" />
              <Text weight="semibold" size="lg">
                Flow Metaverse
              </Text>
            </Link>
            <HStack gap="default">
              <Button variant="outline" asChild>
                <Link href="/admin">대시보드</Link>
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
                  {getText("LID.ADMIN.LOGS.TITLE")}
                </Heading>
                <Text tone="muted">
                  총 {total.toLocaleString()}개의 이벤트가 기록되었습니다
                </Text>
              </VStack>
            </HStack>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <VStack gap="default">
                  <HStack gap="default" className="flex-wrap">
                    {/* Space Filter */}
                    <div className="w-64">
                      <label className="block text-sm font-medium mb-2">
                        공간 필터
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={selectedSpace}
                        onChange={(e) => setSelectedSpace(e.target.value)}
                      >
                        <option value="">전체 공간</option>
                        {spaces.map((space) => (
                          <option key={space.id} value={space.id}>
                            {space.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Event Type Filter */}
                    <div className="w-48">
                      <label className="block text-sm font-medium mb-2">
                        이벤트 유형
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                      >
                        <option value="">전체 유형</option>
                        {Object.entries(eventTypeConfig).map(([type, config]) => (
                          <option key={type} value={type}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Date Filter */}
                    <div className="w-44">
                      <label className="block text-sm font-medium mb-2">
                        시작일
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    {/* End Date Filter */}
                    <div className="w-44">
                      <label className="block text-sm font-medium mb-2">
                        종료일
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </HStack>

                  <HStack justify="between">
                    {/* Reset Button */}
                    <div>
                      {(selectedSpace || selectedType || startDate || endDate) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSpace("")
                            setSelectedType("")
                            setStartDate("")
                            setEndDate("")
                          }}
                        >
                          필터 초기화
                        </Button>
                      )}
                    </div>

                    {/* CSV Export Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={exporting || filteredLogs.length === 0}
                    >
                      {exporting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          내보내는 중...
                        </>
                      ) : (
                        <>
                          <svg
                            className="size-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          CSV 내보내기
                        </>
                      )}
                    </Button>
                  </HStack>
                </VStack>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader>
                <HStack justify="between">
                  <CardTitle>이벤트 로그</CardTitle>
                  <Text size="sm" tone="muted">
                    {filteredLogs.length}개 표시 중
                  </Text>
                </HStack>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSkeleton />
                ) : filteredLogs.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div>
                    {/* Table Header */}
                    <div className="flex items-center gap-4 py-2 border-b text-sm font-medium text-muted-foreground">
                      <div className="w-24 flex-shrink-0">유형</div>
                      <div className="flex-1">사용자 / 공간</div>
                      <div className="w-32 text-right flex-shrink-0">시간</div>
                    </div>

                    {/* Table Body */}
                    {filteredLogs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Load More Info */}
            {!loading && filteredLogs.length > 0 && filteredLogs.length < total && (
              <Text size="sm" tone="muted" className="text-center">
                최근 {limit}개의 로그를 표시하고 있습니다. 전체 {total}개
              </Text>
            )}
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
