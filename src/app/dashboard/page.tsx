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

// ============================================
// Types
// ============================================
interface ManagedSpace {
  id: string
  name: string
  template: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  role: "OWNER" | "STAFF"
  members: number
  visitors: number
  events: number
  inviteCode: string
  createdAt: string
}

// ============================================
// Space Card Component
// ============================================
function SpaceCard({
  id,
  name,
  template,
  status,
  role,
  members,
  visitors,
  createdAt,
  loading = false,
}: ManagedSpace & { loading?: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  const roleLabel = role === "OWNER" ? "소유자" : "스태프"
  const roleVariant = role === "OWNER" ? "default" : "secondary"
  const createdAtFormatted = new Date(createdAt).toLocaleDateString("ko-KR")

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <HStack justify="between" align="start">
          <VStack gap="xs">
            <CardTitle>{name}</CardTitle>
            <CardDescription>{template}</CardDescription>
          </VStack>
          <HStack gap="xs">
            <Badge variant={roleVariant}>{roleLabel}</Badge>
            <Badge variant={status === "ACTIVE" ? "outline" : "secondary"}>
              {status === "ACTIVE" ? "활성" : "비활성"}
            </Badge>
          </HStack>
        </HStack>
      </CardHeader>
      <CardContent>
        <Divider className="mb-4" />
        <Grid cols={3} gap="default">
          <VStack gap="xs">
            <Text tone="muted" size="sm">
              멤버
            </Text>
            <Text weight="medium">{members}명</Text>
          </VStack>
          <VStack gap="xs">
            <Text tone="muted" size="sm">
              방문자
            </Text>
            <Text weight="medium">{visitors}명</Text>
          </VStack>
          <VStack gap="xs">
            <Text tone="muted" size="sm">
              생성일
            </Text>
            <Text weight="medium">{createdAtFormatted}</Text>
          </VStack>
        </Grid>
        <HStack gap="sm" className="mt-4">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/spaces/${id}`}>관리</Link>
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
// Dashboard Page
// ============================================
export default function DashboardPage() {
  const [spaces, setSpaces] = useState<ManagedSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch managed spaces
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/spaces")

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
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("데이터를 불러올 수 없습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 역할별 분류
  const ownerSpaces = spaces.filter((s) => s.role === "OWNER")
  const staffSpaces = spaces.filter((s) => s.role === "STAFF")

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-muted/30">
        <nav className="border-b bg-background">
          <Container>
            <HStack justify="between" className="h-16">
              <Link href="/" className="flex items-center gap-2">
                <img
                  src="/FlowSpace_logo_transparent_clean.png"
                  alt="FlowSpace"
                  className="size-8 rounded-lg object-contain"
                />
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
              <img
                src="/FlowSpace_logo_transparent_clean.png"
                alt="FlowSpace"
                className="size-8 rounded-lg object-contain"
              />
              <Text weight="semibold" size="lg">
                FlowSpace
              </Text>
            </Link>
            <HStack gap="default">
              <Button variant="outline" asChild>
                <Link href="/my-spaces">내 공간</Link>
              </Button>
              <Button asChild>
                <Link href="/spaces/new">새 공간 만들기</Link>
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
                  공간 관리
                </Heading>
                <Text tone="muted">
                  내가 소유하거나 관리하는 공간을 확인하세요
                </Text>
              </VStack>
              <Button asChild>
                <Link href="/spaces/new">새 공간 만들기</Link>
              </Button>
            </HStack>

            {/* Loading State */}
            {loading && (
              <Grid cols={3} gap="default">
                {[1, 2, 3].map((i) => (
                  <GridItem key={i}>
                    <SpaceCard
                      id=""
                      name=""
                      template=""
                      status="ACTIVE"
                      role="OWNER"
                      members={0}
                      visitors={0}
                      events={0}
                      inviteCode=""
                      createdAt=""
                      loading
                    />
                  </GridItem>
                ))}
              </Grid>
            )}

            {/* Empty State */}
            {!loading && spaces.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <VStack gap="lg" align="center">
                    <Text tone="muted">관리하는 공간이 없습니다</Text>
                    <HStack gap="default">
                      <Button variant="outline" asChild>
                        <Link href="/my-spaces">참여 중인 공간 보기</Link>
                      </Button>
                      <Button asChild>
                        <Link href="/spaces/new">첫 공간 만들기</Link>
                      </Button>
                    </HStack>
                  </VStack>
                </CardContent>
              </Card>
            )}

            {/* Owner Spaces */}
            {!loading && ownerSpaces.length > 0 && (
              <VStack gap="default">
                <HStack justify="between" align="center">
                  <Heading as="h2" size="xl">
                    내가 소유한 공간
                  </Heading>
                  <Badge variant="outline">{ownerSpaces.length}개</Badge>
                </HStack>
                <Grid cols={3} gap="default">
                  {ownerSpaces.map((space) => (
                    <GridItem key={space.id}>
                      <SpaceCard {...space} />
                    </GridItem>
                  ))}
                </Grid>
              </VStack>
            )}

            {/* Staff Spaces */}
            {!loading && staffSpaces.length > 0 && (
              <VStack gap="default">
                <HStack justify="between" align="center">
                  <Heading as="h2" size="xl">
                    스태프로 참여 중인 공간
                  </Heading>
                  <Badge variant="outline">{staffSpaces.length}개</Badge>
                </HStack>
                <Grid cols={3} gap="default">
                  {staffSpaces.map((space) => (
                    <GridItem key={space.id}>
                      <SpaceCard {...space} />
                    </GridItem>
                  ))}
                </Grid>
              </VStack>
            )}
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
