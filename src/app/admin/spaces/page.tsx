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
  Input,
  Divider,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Types
// ============================================
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

// ============================================
// Space List Item
// ============================================
function SpaceListItem({
  space,
  onCopyLink,
}: {
  space: SpaceData
  onCopyLink: (inviteCode: string) => void
}) {
  const statusLabel = {
    ACTIVE: "활성",
    INACTIVE: "비활성",
    ARCHIVED: "보관됨",
  }[space.status]

  const statusVariant = space.status === "ACTIVE" ? "default" : "secondary"

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <HStack justify="between" align="start" className="mb-4">
          <VStack gap="xs" className="flex-1">
            <HStack gap="sm" align="center">
              <CardTitle className="text-lg">{space.name}</CardTitle>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </HStack>
            <CardDescription>{space.template} 템플릿</CardDescription>
          </VStack>
          <VStack gap="xs" align="end">
            <Text size="sm" tone="muted">
              {space.createdAtFormatted}
            </Text>
          </VStack>
        </HStack>

        <Divider className="my-4" />

        <HStack justify="between" className="mb-4">
          <VStack gap="xs">
            <Text size="sm" tone="muted">
              총 방문자
            </Text>
            <Text weight="semibold">{space.visitors}명</Text>
          </VStack>
          <VStack gap="xs" align="center">
            <Text size="sm" tone="muted">
              이벤트
            </Text>
            <Text weight="semibold">{space.events}회</Text>
          </VStack>
          <VStack gap="xs" align="end">
            <Text size="sm" tone="muted">
              초대 코드
            </Text>
            <Text weight="semibold" className="font-mono text-xs">
              {space.inviteCode.slice(0, 8)}...
            </Text>
          </VStack>
        </HStack>

        <HStack gap="sm">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onCopyLink(space.inviteCode)}
          >
            링크 복사
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/admin/spaces/${space.id}`}>관리</Link>
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/spaces/${space.inviteCode}`} target="_blank">
              입장
            </Link>
          </Button>
        </HStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Empty State
// ============================================
function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12">
        <VStack gap="lg" align="center">
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
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
          <VStack gap="sm" align="center">
            <Text weight="semibold" size="lg">
              아직 공간이 없습니다
            </Text>
            <Text tone="muted" className="text-center">
              첫 번째 메타버스 공간을 만들어보세요
            </Text>
          </VStack>
          <Button asChild>
            <Link href="/spaces/new">
              {getText("BTN.LANDING.CREATE_SPACE")}
            </Link>
          </Button>
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Loading Skeleton
// ============================================
function LoadingSkeleton() {
  return (
    <Grid cols={2} gap="default">
      {[1, 2, 3, 4].map((i) => (
        <GridItem key={i}>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <Divider />
                <div className="h-16 animate-pulse rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        </GridItem>
      ))}
    </Grid>
  )
}

// ============================================
// Admin Spaces Page
// ============================================
export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState<SpaceData[]>([])
  const [filteredSpaces, setFilteredSpaces] = useState<SpaceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch spaces
  useEffect(() => {
    async function fetchSpaces() {
      try {
        const res = await fetch("/api/admin/spaces")
        if (!res.ok) {
          if (res.status === 401) {
            setError("로그인이 필요합니다")
          } else {
            setError("데이터를 불러올 수 없습니다")
          }
          return
        }
        const data = await res.json()
        setSpaces(data.spaces || [])
        setFilteredSpaces(data.spaces || [])
      } catch (err) {
        console.error("Error fetching spaces:", err)
        setError("데이터를 불러올 수 없습니다")
      } finally {
        setLoading(false)
      }
    }
    fetchSpaces()
  }, [])

  // Filter spaces by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSpaces(spaces)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredSpaces(
        spaces.filter(
          (space) =>
            space.name.toLowerCase().includes(query) ||
            space.template.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, spaces])

  // Copy invite link
  const handleCopyLink = async (inviteCode: string) => {
    const link = `${window.location.origin}/spaces/${inviteCode}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(inviteCode)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-muted/30">
        <nav className="border-b bg-background">
          <Container>
            <HStack justify="between" className="h-16">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.jpg" alt="Flow Metaverse" className="size-8 rounded-lg object-contain" />
                <Text weight="semibold" size="lg">
                  Flow Metaverse
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
                  {getText("LID.ADMIN.SPACES.TITLE")}
                </Heading>
                <Text tone="muted">
                  총 {spaces.length}개의 공간을 관리하고 있습니다
                </Text>
              </VStack>
              <Button asChild>
                <Link href="/spaces/new">새 공간 만들기</Link>
              </Button>
            </HStack>

            {/* Search */}
            <HStack gap="default">
              <div className="relative flex-1 max-w-md">
                <Input
                  type="text"
                  placeholder="공간 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <svg
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
            </HStack>

            {/* Copied Toast */}
            {copiedId && (
              <div className="fixed bottom-4 right-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-lg">
                <Text size="sm">{getText("LID.SPACE.INVITE.COPY")}</Text>
              </div>
            )}

            {/* Spaces Grid */}
            {loading ? (
              <LoadingSkeleton />
            ) : filteredSpaces.length === 0 ? (
              searchQuery ? (
                <Card>
                  <CardContent className="py-12">
                    <VStack gap="lg" align="center">
                      <Text tone="muted">
                        "{searchQuery}"에 대한 검색 결과가 없습니다
                      </Text>
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery("")}
                      >
                        검색 초기화
                      </Button>
                    </VStack>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState />
              )
            ) : (
              <Grid cols={2} gap="default">
                {filteredSpaces.map((space) => (
                  <GridItem key={space.id}>
                    <SpaceListItem space={space} onCopyLink={handleCopyLink} />
                  </GridItem>
                ))}
              </Grid>
            )}
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
