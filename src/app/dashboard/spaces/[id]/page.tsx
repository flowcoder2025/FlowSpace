"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
  Label,
  Divider,
} from "@/components/ui"
import { getText } from "@/lib/text-config"
import { StaffManagement } from "@/components/space/StaffManagement"

// ============================================
// Types
// ============================================
interface Space {
  id: string
  name: string
  description: string | null
  accessType: "PUBLIC" | "PRIVATE" | "PASSWORD"
  accessSecret: string | null
  inviteCode: string
  logoUrl: string | null
  primaryColor: string | null
  loadingMessage: string | null
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  maxUsers: number
  createdAt: string
  updatedAt: string
  template: {
    id: string
    key: string
    name: string
    description: string | null
  }
  owner: {
    id: string
    name: string | null
    image: string | null
  }
  _count: {
    eventLogs: number
    guestSessions: number
    members: number
  }
}

interface SpaceStats {
  totalMembers: number
  totalVisitors: number
  totalEvents: number
  peakConcurrent: number
  weeklyChange: {
    visitors: number
  }
}

// ============================================
// Stat Card Component
// ============================================
function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
}: {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
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
          <Text weight="bold" className="text-3xl">
            {value}
          </Text>
          {change && (
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
// Space Management Page (Owner/Staff)
// ============================================
export default function DashboardSpaceManagePage() {
  const params = useParams()
  const router = useRouter()
  const spaceId = params.id as string

  const [space, setSpace] = useState<Space | null>(null)
  const [stats, setStats] = useState<SpaceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    accessType: "PUBLIC" as "PUBLIC" | "PRIVATE" | "PASSWORD",
    accessSecret: "",
    maxUsers: 50,
    loadingMessage: "",
    primaryColor: "",
  })

  // Fetch space data
  useEffect(() => {
    async function fetchData() {
      try {
        const [spaceRes, statsRes] = await Promise.all([
          fetch(`/api/spaces/${spaceId}`),
          fetch(`/api/dashboard/spaces/${spaceId}/stats`),
        ])

        if (spaceRes.status === 403 || statsRes.status === 403) {
          setError("이 공간을 관리할 권한이 없습니다")
          return
        }

        if (!spaceRes.ok) {
          throw new Error("Failed to fetch space")
        }

        const spaceData = await spaceRes.json()
        setSpace(spaceData)

        // Owner인지 확인 (공간의 ownerId와 현재 사용자 비교는 서버에서)
        // 여기서는 stats API가 403이 아닌 경우 권한이 있다고 판단

        setFormData({
          name: spaceData.name || "",
          description: spaceData.description || "",
          accessType: spaceData.accessType,
          accessSecret: spaceData.accessSecret || "",
          maxUsers: spaceData.maxUsers,
          loadingMessage: spaceData.loadingMessage || "",
          primaryColor: spaceData.primaryColor || "",
        })

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch (err) {
        setError("공간을 불러올 수 없습니다")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [spaceId])

  // Copy invite link
  const copyInviteLink = async () => {
    if (!space) return
    const link = `${window.location.origin}/spaces/${space.inviteCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Save changes
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Failed to update space")
      }

      const updated = await res.json()
      setSpace((prev) => (prev ? { ...prev, ...updated } : null))
      alert("저장되었습니다")
    } catch (err) {
      alert("저장에 실패했습니다")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <Section spacing="lg">
            <VStack gap="default" align="center">
              <Text>{getText("LID.STATUS.LOADING")}</Text>
            </VStack>
          </Section>
        </Container>
      </main>
    )
  }

  // Error state
  if (error || !space) {
    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <Section spacing="lg">
            <VStack gap="default" align="center">
              <Text tone="muted">{error || "공간을 찾을 수 없습니다"}</Text>
              <Button variant="outline" asChild>
                <Link href="/dashboard">대시보드로 돌아가기</Link>
              </Button>
            </VStack>
          </Section>
        </Container>
      </main>
    )
  }

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/spaces/${space.inviteCode}`

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

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <Container>
          <HStack justify="between" className="h-16">
            <HStack gap="default">
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
              <Text tone="muted">/</Text>
              <Link href="/dashboard">
                <Text tone="muted" className="hover:text-foreground">
                  공간 관리
                </Text>
              </Link>
              <Text tone="muted">/</Text>
              <Text>{space.name}</Text>
            </HStack>
            <HStack gap="default">
              <Button variant="outline" asChild>
                <Link href="/dashboard">뒤로</Link>
              </Button>
              <Button asChild>
                <Link href={`/spaces/${space.inviteCode}`}>
                  {getText("BTN.SPACE.ENTER")}
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
            <HStack justify="between" align="start">
              <VStack gap="sm">
                <HStack gap="default" align="center">
                  <Heading as="h1" size="3xl">
                    {space.name}
                  </Heading>
                  <Badge
                    variant={space.status === "ACTIVE" ? "default" : "secondary"}
                  >
                    {space.status === "ACTIVE"
                      ? "활성"
                      : space.status === "INACTIVE"
                        ? "비활성"
                        : "보관됨"}
                  </Badge>
                </HStack>
                <Text tone="muted">
                  {space.template.name} 템플릿 · 생성일{" "}
                  {new Date(space.createdAt).toLocaleDateString("ko-KR")}
                </Text>
              </VStack>
            </HStack>

            {/* Stats */}
            <Grid cols={4} gap="default">
              <GridItem>
                <StatCard
                  title="총 멤버"
                  value={stats?.totalMembers ?? space._count.members}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title="총 방문자"
                  value={stats?.totalVisitors ?? space._count.guestSessions}
                  change={visitorChangeText}
                  changeType={visitorChangeType}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title="피크 동시접속"
                  value={stats?.peakConcurrent ?? 0}
                />
              </GridItem>
              <GridItem>
                <StatCard
                  title="총 이벤트"
                  value={stats?.totalEvents ?? space._count.eventLogs}
                />
              </GridItem>
            </Grid>

            {/* Invite Link */}
            <Card>
              <CardHeader>
                <CardTitle>{getText("LID.SPACE.INVITE.TITLE")}</CardTitle>
                <CardDescription>
                  이 링크를 공유하여 사용자를 공간에 초대하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HStack gap="default">
                  <Input value={inviteLink} readOnly className="flex-1 bg-muted" />
                  <Button
                    onClick={copyInviteLink}
                    variant={copied ? "default" : "outline"}
                  >
                    {copied
                      ? getText("LID.SPACE.INVITE.COPY")
                      : getText("BTN.SPACE.COPY_LINK")}
                  </Button>
                </HStack>
              </CardContent>
            </Card>

            <Grid cols={2} gap="lg">
              {/* Settings */}
              <GridItem>
                <Card>
                  <CardHeader>
                    <CardTitle>{getText("LID.SPACE.SETTINGS.TITLE")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VStack gap="lg">
                      <VStack gap="sm">
                        <Text size="sm" weight="medium">
                          {getText("LID.SPACE.NAME.LABEL")}
                        </Text>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder={getText("LID.SPACE.NAME.PLACEHOLDER")}
                        />
                      </VStack>

                      <VStack gap="sm">
                        <Text size="sm" weight="medium">
                          {getText("LID.SPACE.DESCRIPTION.LABEL")}
                        </Text>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder={getText(
                            "LID.SPACE.DESCRIPTION.PLACEHOLDER"
                          )}
                        />
                      </VStack>

                      <VStack gap="sm">
                        <Text size="sm" weight="medium">
                          {getText("LID.SPACE.ACCESS.LABEL")}
                        </Text>
                        <HStack gap="sm">
                          {(["PUBLIC", "PRIVATE", "PASSWORD"] as const).map(
                            (type) => (
                              <Button
                                key={type}
                                variant={
                                  formData.accessType === type
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  setFormData({ ...formData, accessType: type })
                                }
                              >
                                {type === "PUBLIC"
                                  ? getText("LID.SPACE.ACCESS.PUBLIC")
                                  : type === "PRIVATE"
                                    ? getText("LID.SPACE.ACCESS.PRIVATE")
                                    : getText("LID.SPACE.ACCESS.PASSWORD")}
                              </Button>
                            )
                          )}
                        </HStack>
                      </VStack>

                      {formData.accessType === "PASSWORD" && (
                        <VStack gap="sm">
                          <Label htmlFor="accessSecret">
                            {getText("LID.SPACE.ACCESS.PASSWORD")}
                          </Label>
                          <Input
                            id="accessSecret"
                            type="password"
                            value={formData.accessSecret}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                accessSecret: e.target.value,
                              })
                            }
                            placeholder="입장 암호 입력"
                          />
                        </VStack>
                      )}

                      <VStack gap="sm">
                        <Label htmlFor="maxUsers">
                          {getText("LID.SPACE.MAX_USERS.LABEL")}
                        </Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          value={formData.maxUsers}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxUsers: parseInt(e.target.value) || 50,
                            })
                          }
                          min={1}
                          max={200}
                        />
                      </VStack>
                    </VStack>
                  </CardContent>
                </Card>
              </GridItem>

              {/* Branding */}
              <GridItem>
                <Card>
                  <CardHeader>
                    <CardTitle>{getText("LID.SPACE.BRANDING.TITLE")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VStack gap="lg">
                      <VStack gap="sm">
                        <Label htmlFor="loadingMessage">
                          {getText("LID.SPACE.LOADING_MESSAGE.LABEL")}
                        </Label>
                        <Input
                          id="loadingMessage"
                          value={formData.loadingMessage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              loadingMessage: e.target.value,
                            })
                          }
                          placeholder={getText(
                            "LID.SPACE.LOADING_MESSAGE.PLACEHOLDER"
                          )}
                        />
                      </VStack>

                      <VStack gap="sm">
                        <Label htmlFor="primaryColor">
                          {getText("LID.SPACE.PRIMARY_COLOR.LABEL")}
                        </Label>
                        <HStack gap="sm">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={formData.primaryColor || "#14b8a6"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                primaryColor: e.target.value,
                              })
                            }
                            className="h-10 w-20 cursor-pointer p-1"
                          />
                          <Input
                            value={formData.primaryColor || "#14b8a6"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                primaryColor: e.target.value,
                              })
                            }
                            placeholder="#14b8a6"
                            className="flex-1"
                          />
                        </HStack>
                      </VStack>

                      <Divider className="my-4" />

                      <VStack gap="sm">
                        <Text tone="muted" size="sm">
                          템플릿: {space.template.name}
                        </Text>
                        <Text tone="muted" size="sm">
                          {space.template.description}
                        </Text>
                      </VStack>
                    </VStack>
                  </CardContent>
                </Card>
              </GridItem>
            </Grid>

            {/* Staff Management */}
            <Card>
              <CardHeader>
                <CardTitle>스태프 관리</CardTitle>
                <CardDescription>
                  스태프에게 채팅 관리 권한을 부여할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaffManagement spaceId={spaceId} />
              </CardContent>
            </Card>

            {/* Actions */}
            <HStack justify="end">
              <HStack gap="default">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">{getText("BTN.SECONDARY.CANCEL")}</Link>
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? getText("LID.STATUS.SAVING") : getText("BTN.SPACE.SAVE")}
                </Button>
              </HStack>
            </HStack>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
