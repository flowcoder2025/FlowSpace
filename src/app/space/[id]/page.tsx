"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Container,
  VStack,
  Text,
  Button,
} from "@/components/ui"
import { SpaceLayout } from "@/features/space"

// ============================================
// Types
// ============================================
interface SpaceData {
  id: string
  name: string
  template: {
    key: string
    name: string
    assetsPath: string
  }
  logoUrl: string | null
  primaryColor: string | null
  loadingMessage: string | null
}

interface GuestSession {
  sessionToken: string
  nickname: string
  avatar: string
  spaceId: string
}

// ============================================
// Dev Mode Check
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// Space Page Component
// ============================================
export default function SpacePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const spaceId = params.id as string

  // Dev mode: ?dev=true 쿼리 파라미터로 세션 체크 우회
  const devMode = IS_DEV && searchParams.get("dev") === "true"

  const [space, setSpace] = useState<SpaceData | null>(null)
  const [session, setSession] = useState<GuestSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load session from localStorage (or use dev session)
  useEffect(() => {
    // Dev mode: 테스트용 가상 세션 생성
    if (devMode) {
      const devSession: GuestSession = {
        sessionToken: `dev-${Date.now()}`,
        nickname: "Developer",
        avatar: "default",
        spaceId,
      }
      setSession(devSession)
      return
    }

    const storedSession = localStorage.getItem("guestSession")
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as GuestSession
        if (parsed.spaceId === spaceId) {
          setSession(parsed)
        } else {
          // Session is for different space
          setError("다른 공간의 세션입니다. 다시 입장해주세요.")
          setLoading(false)
        }
      } catch {
        setError("세션 정보가 올바르지 않습니다.")
        setLoading(false)
      }
    } else {
      setError("입장 세션이 없습니다. 초대 링크를 통해 다시 입장해주세요.")
      setLoading(false)
    }
  }, [spaceId, devMode])

  // Fetch space data
  useEffect(() => {
    if (!session) return

    async function fetchSpace() {
      try {
        const res = await fetch(`/api/spaces/${spaceId}`)
        if (!res.ok) {
          // Dev mode: API 실패 시 목업 데이터 사용
          if (devMode) {
            setSpace({
              id: spaceId,
              name: "Dev Test Space",
              template: {
                key: "office",
                name: "Office",
                assetsPath: "/assets/templates/office",
              },
              logoUrl: null,
              primaryColor: null,
              loadingMessage: null,
            })
            setLoading(false)
            return
          }
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
        // Dev mode: 네트워크 에러 시에도 목업 데이터 사용
        if (devMode) {
          setSpace({
            id: spaceId,
            name: "Dev Test Space",
            template: {
              key: "office",
              name: "Office",
              assetsPath: "/assets/templates/office",
            },
            logoUrl: null,
            primaryColor: null,
            loadingMessage: null,
          })
          setLoading(false)
          return
        }
        setError("공간을 불러올 수 없습니다")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSpace()
  }, [spaceId, session, devMode])

  // Handle exit
  const handleExit = useCallback(async () => {
    if (session) {
      try {
        // Record exit event
        await fetch("/api/guest/exit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: session.sessionToken,
            spaceId: session.spaceId,
          }),
        })
      } catch (err) {
        console.error("Failed to record exit:", err)
      }

      // Clear session
      localStorage.removeItem("guestSession")
    }

    router.push("/")
  }, [session, router])

  // Loading state
  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: space?.primaryColor || undefined }}
      >
        <VStack gap="lg" align="center" className="text-center">
          {space?.logoUrl && (
            <img
              src={space.logoUrl}
              alt={space.name}
              className="size-24 rounded-xl object-cover"
            />
          )}
          <Text size="lg" className={space?.primaryColor ? "text-white/80" : "text-muted-foreground"}>
            {space?.loadingMessage || "공간에 입장 중..."}
          </Text>
          <div className="mt-4 size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </VStack>
      </main>
    )
  }

  // Error state
  if (error || !space || !session) {
    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <VStack gap="lg" align="center" className="py-24">
            <Text tone="muted">{error || "공간을 찾을 수 없습니다"}</Text>
            <Button variant="outline" asChild>
              <Link href="/">홈으로 돌아가기</Link>
            </Button>
          </VStack>
        </Container>
      </main>
    )
  }

  // Main space view with ZEP-style layout
  return (
    <SpaceLayout
      spaceId={space.id}
      spaceName={space.name}
      spaceLogoUrl={space.logoUrl}
      spacePrimaryColor={space.primaryColor}
      userNickname={session.nickname}
      userId={session.sessionToken}
      userAvatarColor={session.avatar as "default" | "red" | "green" | "purple" | "orange" | "pink"}
      onExit={handleExit}
    />
  )
}
