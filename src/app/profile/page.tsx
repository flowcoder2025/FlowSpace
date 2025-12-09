"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
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
interface SpaceData {
  id: string
  name: string
  template: string
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  visitors: number
  inviteCode: string
  createdAtFormatted: string
}

interface UserStats {
  totalSpaces: number
  totalVisitors: number
  totalEvents: number
}

// ============================================
// Space Card Component
// ============================================
function SpaceCard({ space }: { space: SpaceData }) {
  const statusLabel = {
    ACTIVE: "활성",
    INACTIVE: "비활성",
    ARCHIVED: "보관됨",
  }[space.status]

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <HStack justify="between" align="start">
          <VStack gap="xs">
            <CardTitle className="text-lg">{space.name}</CardTitle>
            <CardDescription>{space.template} 템플릿</CardDescription>
          </VStack>
          <Badge variant={space.status === "ACTIVE" ? "default" : "secondary"}>
            {statusLabel}
          </Badge>
        </HStack>
      </CardHeader>
      <CardContent>
        <HStack justify="between" className="mb-4">
          <VStack gap="xs">
            <Text size="sm" tone="muted">
              총 방문자
            </Text>
            <Text weight="semibold">{space.visitors}명</Text>
          </VStack>
          <VStack gap="xs" align="end">
            <Text size="sm" tone="muted">
              생성일
            </Text>
            <Text weight="semibold">{space.createdAtFormatted}</Text>
          </VStack>
        </HStack>
        <HStack gap="sm">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/admin/spaces/${space.id}`}>관리</Link>
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/spaces/${space.inviteCode}`}>입장</Link>
          </Button>
        </HStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Stat Card Component
// ============================================
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <VStack gap="xs" align="center">
          <Text tone="muted" size="sm">
            {title}
          </Text>
          <Text weight="bold" className="text-3xl">
            {value}
          </Text>
        </VStack>
      </CardContent>
    </Card>
  )
}

// ============================================
// Profile Page
// ============================================
export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [spaces, setSpaces] = useState<SpaceData[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/profile")
    }
  }, [status, router])

  // Fetch user data
  useEffect(() => {
    if (status !== "authenticated") return

    async function fetchData() {
      try {
        const [spacesRes, statsRes] = await Promise.all([
          fetch("/api/admin/spaces"),
          fetch("/api/admin/stats"),
        ])

        if (spacesRes.ok) {
          const spacesData = await spacesRes.json()
          setSpaces(spacesData.spaces || [])
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats({
            totalSpaces: spacesData?.spaces?.length || 0,
            totalVisitors: statsData.totalVisitors || 0,
            totalEvents: statsData.peakConcurrent || 0,
          })
        }
      } catch (err) {
        console.error("Error fetching profile data:", err)
      } finally {
        setLoading(false)
      }
    }

    // Declare spacesData outside to use in stats
    let spacesData: { spaces?: SpaceData[] } | null = null

    async function fetchAll() {
      try {
        const [spacesRes, statsRes] = await Promise.all([
          fetch("/api/admin/spaces"),
          fetch("/api/admin/stats"),
        ])

        if (spacesRes.ok) {
          spacesData = await spacesRes.json()
          setSpaces(spacesData?.spaces || [])
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats({
            totalSpaces: spacesData?.spaces?.length || 0,
            totalVisitors: statsData.totalVisitors || 0,
            totalEvents: statsData.peakConcurrent || 0,
          })
        }
      } catch (err) {
        console.error("Error fetching profile data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [status])

  // Handle logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  // Loading state
  if (status === "loading" || loading) {
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
              <Text tone="muted">{getText("LID.STATUS.LOADING")}</Text>
            </VStack>
          </Container>
        </Section>
      </main>
    )
  }

  // Not authenticated state
  if (!session?.user) {
    return null
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
                <Link href="/admin">대시보드</Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                로그아웃
              </Button>
            </HStack>
          </HStack>
        </Container>
      </nav>

      <Section spacing="lg">
        <Container>
          <VStack gap="xl">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <HStack gap="lg" align="start">
                  {/* Avatar */}
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "프로필"}
                      className="size-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                    </div>
                  )}

                  {/* User Info */}
                  <VStack gap="sm" className="flex-1">
                    <Heading as="h1" size="2xl">
                      {session.user.name || "사용자"}
                    </Heading>
                    <Text tone="muted">{session.user.email}</Text>
                    <HStack gap="sm" className="mt-2">
                      <Badge variant="secondary">회원</Badge>
                    </HStack>
                  </VStack>

                  {/* Actions */}
                  <VStack gap="sm">
                    <Button asChild>
                      <Link href="/spaces/new">새 공간 만들기</Link>
                    </Button>
                  </VStack>
                </HStack>
              </CardContent>
            </Card>

            {/* Stats */}
            <Grid cols={3} gap="default">
              <GridItem>
                <StatCard
                  title="내 공간"
                  value={stats?.totalSpaces || spaces.length}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title="총 방문자"
                  value={stats?.totalVisitors?.toLocaleString() || "0"}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title="최대 동시 접속"
                  value={stats?.totalEvents || "0"}
                />
              </GridItem>
            </Grid>

            {/* My Spaces */}
            <VStack gap="default">
              <HStack justify="between" align="center">
                <Heading as="h2" size="xl">
                  내 공간
                </Heading>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/spaces">전체 보기</Link>
                </Button>
              </HStack>

              {spaces.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <VStack gap="lg" align="center">
                      <Text tone="muted">아직 생성한 공간이 없습니다</Text>
                      <Button asChild>
                        <Link href="/spaces/new">첫 공간 만들기</Link>
                      </Button>
                    </VStack>
                  </CardContent>
                </Card>
              ) : (
                <Grid cols={2} gap="default">
                  {spaces.slice(0, 4).map((space) => (
                    <GridItem key={space.id}>
                      <SpaceCard space={space} />
                    </GridItem>
                  ))}
                </Grid>
              )}
            </VStack>

            {/* Account Section */}
            <VStack gap="default">
              <Heading as="h2" size="xl">
                계정 설정
              </Heading>
              <Card>
                <CardContent className="pt-6">
                  <VStack gap="lg">
                    <HStack justify="between" align="center">
                      <VStack gap="xs">
                        <Text weight="medium">로그인 방식</Text>
                        <Text size="sm" tone="muted">
                          소셜 로그인으로 연결되어 있습니다
                        </Text>
                      </VStack>
                      <Badge variant="outline">OAuth</Badge>
                    </HStack>

                    <Divider />

                    <HStack justify="between" align="center">
                      <VStack gap="xs">
                        <Text weight="medium">로그아웃</Text>
                        <Text size="sm" tone="muted">
                          현재 세션에서 로그아웃합니다
                        </Text>
                      </VStack>
                      <Button variant="outline" onClick={handleLogout}>
                        로그아웃
                      </Button>
                    </HStack>
                  </VStack>
                </CardContent>
              </Card>
            </VStack>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
