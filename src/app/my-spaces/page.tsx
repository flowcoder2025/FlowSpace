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
interface MySpace {
  id: string
  name: string
  template: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  role: "OWNER" | "STAFF" | "PARTICIPANT"
  inviteCode: string
  members: number
  owner: {
    id: string
    name: string | null
    image: string | null
  }
  isOwner: boolean
  joinedAt: string
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
  owner,
  isOwner,
  inviteCode,
  joinedAt,
  loading = false,
}: MySpace & { loading?: boolean }) {
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

  const roleLabel = {
    OWNER: "소유자",
    STAFF: "스태프",
    PARTICIPANT: "참가자",
  }[role]

  const roleVariant = {
    OWNER: "default" as const,
    STAFF: "secondary" as const,
    PARTICIPANT: "outline" as const,
  }[role]

  const joinedAtFormatted = new Date(joinedAt).toLocaleDateString("ko-KR")

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
            {status !== "ACTIVE" && (
              <Badge variant="secondary">
                {status === "INACTIVE" ? "비활성" : "보관됨"}
              </Badge>
            )}
          </HStack>
        </HStack>
      </CardHeader>
      <CardContent>
        <Divider className="mb-4" />
        <Grid cols={2} gap="default">
          <VStack gap="xs">
            <Text tone="muted" size="sm">
              멤버
            </Text>
            <Text weight="medium">{members}명</Text>
          </VStack>
          <VStack gap="xs">
            <Text tone="muted" size="sm">
              참여일
            </Text>
            <Text weight="medium">{joinedAtFormatted}</Text>
          </VStack>
        </Grid>
        {!isOwner && (
          <HStack gap="xs" className="mt-3">
            <Text tone="muted" size="sm">
              운영:{" "}
            </Text>
            <Text size="sm">{owner.name || "알 수 없음"}</Text>
          </HStack>
        )}
        <HStack gap="sm" className="mt-4">
          {(role === "OWNER" || role === "STAFF") && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/dashboard/spaces/${id}`}>관리</Link>
            </Button>
          )}
          <Button
            size="sm"
            className={role === "PARTICIPANT" ? "w-full" : "flex-1"}
            asChild
          >
            <Link href={`/spaces/${inviteCode}`}>입장</Link>
          </Button>
        </HStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// My Spaces Page
// ============================================
export default function MySpacesPage() {
  const [spaces, setSpaces] = useState<MySpace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch my spaces
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/my-spaces")

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
        console.error("Error fetching my spaces:", err)
        setError("데이터를 불러올 수 없습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 역할별 분류
  const managedSpaces = spaces.filter(
    (s) => s.role === "OWNER" || s.role === "STAFF"
  )
  const participantSpaces = spaces.filter((s) => s.role === "PARTICIPANT")

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
              {managedSpaces.length > 0 && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard">공간 관리</Link>
                </Button>
              )}
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
                  내 공간
                </Heading>
                <Text tone="muted">참여 중인 모든 공간을 확인하세요</Text>
              </VStack>
              <HStack gap="default">
                <Badge variant="outline">{spaces.length}개 공간</Badge>
              </HStack>
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
                      role="PARTICIPANT"
                      inviteCode=""
                      members={0}
                      owner={{ id: "", name: null, image: null }}
                      isOwner={false}
                      joinedAt=""
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
                    <VStack gap="sm" align="center">
                      <Text tone="muted" size="lg">
                        참여 중인 공간이 없습니다
                      </Text>
                      <Text tone="muted" size="sm">
                        새 공간을 만들거나 초대 링크로 공간에 참여해보세요
                      </Text>
                    </VStack>
                    <Button asChild>
                      <Link href="/spaces/new">첫 공간 만들기</Link>
                    </Button>
                  </VStack>
                </CardContent>
              </Card>
            )}

            {/* Managed Spaces (Owner/Staff) */}
            {!loading && managedSpaces.length > 0 && (
              <VStack gap="default">
                <HStack justify="between" align="center">
                  <Heading as="h2" size="xl">
                    관리 중인 공간
                  </Heading>
                  <HStack gap="sm">
                    <Badge variant="outline">{managedSpaces.length}개</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard">대시보드로 이동</Link>
                    </Button>
                  </HStack>
                </HStack>
                <Grid cols={3} gap="default">
                  {managedSpaces.map((space) => (
                    <GridItem key={space.id}>
                      <SpaceCard {...space} />
                    </GridItem>
                  ))}
                </Grid>
              </VStack>
            )}

            {/* Participant Spaces */}
            {!loading && participantSpaces.length > 0 && (
              <VStack gap="default">
                <HStack justify="between" align="center">
                  <Heading as="h2" size="xl">
                    참여 중인 공간
                  </Heading>
                  <Badge variant="outline">{participantSpaces.length}개</Badge>
                </HStack>
                <Grid cols={3} gap="default">
                  {participantSpaces.map((space) => (
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
