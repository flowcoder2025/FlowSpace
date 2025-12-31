"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Container,
  Section,
  HStack,
  VStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Types
// ============================================
interface SpaceInfo {
  id: string
  name: string
  description: string | null
  template: {
    id: string
    key: string
    name: string
    previewUrl: string | null
  }
  owner: {
    id: string
    name: string | null
    image: string | null
  }
  accessType: "PUBLIC" | "PRIVATE" | "PASSWORD"
  requiresPassword: boolean
  logoUrl: string | null
  primaryColor: string | null
  loadingMessage: string | null
  maxUsers: number
  currentUsers: number
}

// ============================================
// Space Entry Page (로그인 필수)
// ============================================
export default function SpaceEntryPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string
  const { data: session, status } = useSession()

  const [space, setSpace] = useState<SpaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)

  // 🔒 로그인 체크 - 미로그인 시 자동 리다이렉트
  useEffect(() => {
    if (status === "loading") return

    if (!session?.user) {
      // 로그인 후 이 페이지로 돌아오도록 callbackUrl 설정
      const callbackUrl = encodeURIComponent(`/spaces/${inviteCode}`)
      router.push(`/login?callbackUrl=${callbackUrl}`)
    }
  }, [session, status, inviteCode, router])

  // Fetch space info
  useEffect(() => {
    // 세션 로딩 중이거나 미로그인 상태면 API 호출 안함
    if (status === "loading" || !session?.user) return

    async function fetchSpace() {
      try {
        const res = await fetch(`/api/spaces/invite/${inviteCode}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError("존재하지 않는 공간입니다")
          } else {
            setError("공간을 불러올 수 없습니다")
          }
          return
        }
        const data = await res.json()
        setSpace(data)
      } catch (err) {
        setError("공간을 불러올 수 없습니다")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSpace()
  }, [inviteCode, session, status])

  // Handle entry - 로그인 사용자용
  const handleEntry = async () => {
    if (!space) return

    setEntering(true)

    // 로그인 사용자는 바로 공간으로 이동
    // /space/[id]에서 ParticipantEntryModal이 닉네임/아바타 입력 처리
    router.push(`/space/${space.id}`)
  }

  // 세션 로딩 중이거나 미로그인 상태 (리다이렉트 진행 중)
  if (status === "loading" || !session?.user) {
    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <Section spacing="lg">
            <VStack gap="default" align="center">
              <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
              <Text>{getText("LID.STATUS.LOADING")}</Text>
            </VStack>
          </Section>
        </Container>
      </main>
    )
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <Section spacing="lg">
            <VStack gap="default" align="center">
              <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
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
              <div className="rounded-full bg-destructive/10 p-4">
                <svg
                  className="size-12 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <Text tone="muted">{error || "공간을 찾을 수 없습니다"}</Text>
              <Button variant="outline" asChild>
                <Link href="/">홈으로 돌아가기</Link>
              </Button>
            </VStack>
          </Section>
        </Container>
      </main>
    )
  }

  // Private space
  if (space.accessType === "PRIVATE") {
    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <Section spacing="lg">
            <VStack gap="default" align="center">
              <div className="rounded-full bg-muted p-4">
                <svg
                  className="size-12 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <Text tone="muted">비공개 공간입니다</Text>
              <Button variant="outline" asChild>
                <Link href="/">홈으로 돌아가기</Link>
              </Button>
            </VStack>
          </Section>
        </Container>
      </main>
    )
  }

  // Entry confirmation page (로그인 완료 상태)
  return (
    <main className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <Container>
          <HStack justify="between" className="h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/FlowSpace_logo_transparent_clean.png" alt="FlowSpace" className="size-8 rounded-lg object-contain" />
              <Text weight="semibold" size="lg">
                FlowSpace
              </Text>
            </Link>
            <HStack gap="sm" align="center">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="size-8 rounded-full"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <Text size="sm" weight="medium">
                {session.user.name || session.user.email?.split("@")[0]}
              </Text>
            </HStack>
          </HStack>
        </Container>
      </nav>

      <Section spacing="lg">
        <Container size="md">
          <VStack gap="xl" align="center">
            {/* Space Info Card */}
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <HStack gap="default" align="start">
                  {space.logoUrl ? (
                    <img
                      src={space.logoUrl}
                      alt={space.name}
                      className="size-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className="size-16 rounded-xl"
                      style={{ backgroundColor: space.primaryColor || "hsl(var(--primary))" }}
                    />
                  )}
                  <VStack gap="xs" className="flex-1">
                    <CardTitle className="text-2xl">{space.name}</CardTitle>
                    <HStack gap="sm">
                      <Badge variant="secondary">{space.template.name}</Badge>
                      <Badge variant="outline">
                        {space.currentUsers}/{space.maxUsers}명
                      </Badge>
                    </HStack>
                  </VStack>
                </HStack>
              </CardHeader>
              <CardContent>
                <VStack gap="lg">
                  {space.description && (
                    <Text tone="muted">{space.description}</Text>
                  )}

                  {/* Template Preview */}
                  <div className="overflow-hidden rounded-lg bg-muted">
                    {space.template.previewUrl ? (
                      <img
                        src={space.template.previewUrl}
                        alt={space.template.name}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-video w-full bg-muted" />
                    )}
                  </div>

                  {/* Space Owner */}
                  <HStack gap="sm" className="border-t pt-4">
                    {space.owner.image ? (
                      <img
                        src={space.owner.image}
                        alt={space.owner.name || ""}
                        className="size-8 rounded-full"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-muted" />
                    )}
                    <Text size="sm" tone="muted">
                      {space.owner.name || "익명"}님의 공간
                    </Text>
                  </HStack>
                </VStack>
              </CardContent>
            </Card>

            {/* Entry Button */}
            <VStack gap="md" align="center" className="w-full max-w-sm">
              <Button
                size="lg"
                className="w-full py-6"
                onClick={handleEntry}
                disabled={entering || space.currentUsers >= space.maxUsers}
              >
                {entering ? "입장 중..." : space.currentUsers >= space.maxUsers ? "공간이 가득 찼습니다" : getText("BTN.GUEST.ENTER")}
              </Button>

              <Text size="sm" tone="muted" className="text-center">
                {session.user.name || session.user.email?.split("@")[0]}님으로 입장합니다
              </Text>
            </VStack>

            {/* Back to Home */}
            <Button variant="outline" asChild>
              <Link href="/">{getText("BTN.SECONDARY.BACK")}</Link>
            </Button>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
