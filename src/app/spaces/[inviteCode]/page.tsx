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
// Avatar Options
// ============================================
const AVATAR_OPTIONS = [
  { id: "default", name: "Default", color: "bg-blue-500" },
  { id: "red", name: "Red", color: "bg-red-500" },
  { id: "green", name: "Green", color: "bg-green-500" },
  { id: "purple", name: "Purple", color: "bg-purple-500" },
  { id: "orange", name: "Orange", color: "bg-orange-500" },
  { id: "pink", name: "Pink", color: "bg-pink-500" },
]

// ============================================
// Space Entry Page
// ============================================
export default function SpaceEntryPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string

  const [space, setSpace] = useState<SpaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [nickname, setNickname] = useState("")
  const [avatar, setAvatar] = useState("default")
  const [password, setPassword] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  // Loading screen state
  const [showLoading, setShowLoading] = useState(false)

  // Fetch space info
  useEffect(() => {
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
  }, [inviteCode])

  // Handle entry
  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!nickname.trim()) {
      setFormError("닉네임을 입력해주세요")
      return
    }

    if (nickname.length < 2 || nickname.length > 20) {
      setFormError("닉네임은 2~20자 사이로 입력해주세요")
      return
    }

    if (space?.requiresPassword && !password) {
      setFormError("입장 암호를 입력해주세요")
      return
    }

    setEntering(true)

    try {
      const res = await fetch("/api/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: space?.id,
          nickname: nickname.trim(),
          avatar,
          password: password || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 401) {
          setFormError("암호가 일치하지 않습니다")
        } else if (res.status === 403) {
          if (data.error === "Space is full") {
            setFormError("공간이 가득 찼습니다")
          } else {
            setFormError("입장이 제한된 공간입니다")
          }
        } else {
          setFormError("입장에 실패했습니다")
        }
        setEntering(false)
        return
      }

      const session = await res.json()

      // Store session in localStorage
      localStorage.setItem("guestSession", JSON.stringify(session))

      // Show loading screen
      setShowLoading(true)

      // Redirect to space page with WorkAdventure iframe
      setTimeout(() => {
        router.push(`/space/${space?.id}`)
      }, 1500)
    } catch (err) {
      setFormError("입장에 실패했습니다")
      setEntering(false)
      console.error(err)
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

  // Loading screen
  if (showLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{
          backgroundColor: space.primaryColor || undefined,
        }}
      >
        <VStack gap="lg" align="center" className="text-center">
          {space.logoUrl && (
            <img
              src={space.logoUrl}
              alt={space.name}
              className="size-24 rounded-xl object-cover"
            />
          )}
          <Heading as="h1" size="xl" className={space.primaryColor ? "text-white" : ""}>
            {space.name}
          </Heading>
          <Text
            size="lg"
            className={space.primaryColor ? "text-white/80" : "text-muted-foreground"}
          >
            {space.loadingMessage || "입장 준비 중..."}
          </Text>
          <div className="mt-4 size-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </VStack>
      </main>
    )
  }

  // Entry form
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
          </HStack>
        </Container>
      </nav>

      <Section spacing="lg">
        <Container>
          <Grid cols={2} gap="xl">
            {/* Space Info */}
            <GridItem>
              <Card className="h-full">
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
                    <VStack gap="xs">
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
            </GridItem>

            {/* Entry Form */}
            <GridItem>
              <Card>
                <CardHeader>
                  <CardTitle>{getText("LID.GUEST.ENTRY.TITLE")}</CardTitle>
                  <CardDescription>
                    닉네임과 아바타를 선택하고 입장하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEntry}>
                    <VStack gap="lg">
                      {/* Nickname */}
                      <VStack gap="sm">
                        <Label htmlFor="nickname">
                          {getText("LID.GUEST.NICKNAME.LABEL")}
                        </Label>
                        <Input
                          id="nickname"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder={getText("LID.GUEST.NICKNAME.PLACEHOLDER")}
                          maxLength={20}
                        />
                      </VStack>

                      {/* Avatar Selection */}
                      <VStack gap="sm">
                        <Label>{getText("LID.GUEST.AVATAR.LABEL")}</Label>
                        <HStack gap="sm" className="flex-wrap">
                          {AVATAR_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAvatar(opt.id)}
                              className={`size-12 rounded-full transition-all ${opt.color} ${
                                avatar === opt.id
                                  ? "ring-2 ring-primary ring-offset-2"
                                  : "opacity-60 hover:opacity-100"
                              }`}
                              title={opt.name}
                            />
                          ))}
                        </HStack>
                      </VStack>

                      {/* Password (if required) */}
                      {space.requiresPassword && (
                        <VStack gap="sm">
                          <Label htmlFor="password">입장 암호</Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="입장 암호 입력"
                          />
                        </VStack>
                      )}

                      {/* Error Message */}
                      {formError && (
                        <Text size="sm" className="text-destructive">
                          {formError}
                        </Text>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={entering}
                      >
                        {entering ? "입장 중..." : getText("BTN.GUEST.ENTER")}
                      </Button>

                      {/* Login Option */}
                      <div className="text-center">
                        <Button variant="ghost" asChild>
                          <Link href="/login">
                            {getText("BTN.GUEST.LOGIN")}
                          </Link>
                        </Button>
                      </div>
                    </VStack>
                  </form>
                </CardContent>
              </Card>
            </GridItem>
          </Grid>
        </Container>
      </Section>
    </main>
  )
}
