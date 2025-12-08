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

// 🔒 서버에서 파생된 유효한 사용자 정보 (세션 검증 후)
interface VerifiedUser {
  participantId: string // 서버 파생 ID (guest-{sessionId} 또는 user-{userId})
  nickname: string
  avatar: string
}

// /api/guest/verify 응답 타입
interface VerifyResponse {
  valid: boolean
  sessionId: string
  participantId: string
  nickname: string
  avatar: string
  spaceId: string
  expiresAt: string
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
  // 🔒 서버 검증된 사용자 정보 (participantId는 서버에서 파생)
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null)
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

    // Safari 프라이빗 모드 등 localStorage 접근이 차단된 환경 대응
    let storedSession: string | null = null
    try {
      storedSession = localStorage.getItem("guestSession")
    } catch (storageError) {
      // localStorage 접근 불가 (Safari 프라이빗 모드, 제3자 쿠키 차단 등)
      console.warn("[SpacePage] localStorage access denied:", storageError)
      setError("브라우저 저장소에 접근할 수 없습니다. 프라이빗 모드를 해제하거나 다른 브라우저를 사용해주세요.")
      setLoading(false)
      return
    }

    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as GuestSession
        if (parsed.spaceId === spaceId) {
          setSession(parsed)
        } else {
          // Session is for different space - 기존 세션 클리어하고 새 입장 유도
          console.log("[SpacePage] Different space session detected, clearing old session")
          try {
            localStorage.removeItem("guestSession")
          } catch {
            // localStorage 접근 불가 시 무시
          }
          // 이 공간의 초대 링크를 찾아서 리다이렉트 (또는 에러 표시)
          setError("이전 공간의 세션이 초기화되었습니다. 초대 링크를 통해 다시 입장해주세요.")
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

  // 🔒 서버에서 세션 검증 및 서버 파생 participantId 조회
  useEffect(() => {
    if (!session) return

    // Dev mode: 검증 API 호출 없이 가상 ID 생성
    if (devMode) {
      setVerifiedUser({
        participantId: `dev-${session.sessionToken}`,
        nickname: session.nickname,
        avatar: session.avatar,
      })
      return
    }

    async function verifySession() {
      try {
        const res = await fetch("/api/guest/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: session!.sessionToken,
            spaceId: session!.spaceId,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          console.error("[SpacePage] Session verification failed:", errorData)
          setError("세션이 만료되었거나 유효하지 않습니다. 다시 입장해주세요.")
          setLoading(false)
          return
        }

        const data: VerifyResponse = await res.json()

        // 🔒 서버에서 파생된 participantId 저장
        setVerifiedUser({
          participantId: data.participantId,
          nickname: data.nickname,
          avatar: data.avatar,
        })

        console.log("[SpacePage] Session verified, participantId:", data.participantId)
      } catch (err) {
        console.error("[SpacePage] Failed to verify session:", err)
        setError("세션 검증에 실패했습니다.")
        setLoading(false)
      }
    }

    verifySession()
  }, [session, devMode])

  // Fetch space data
  useEffect(() => {
    if (!session) return

    // Dev mode: API 호출 없이 바로 목업 데이터 사용 (404 에러 방지)
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

    async function fetchSpace() {
      try {
        const res = await fetch(`/api/spaces/${spaceId}`)
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
      try {
        localStorage.removeItem("guestSession")
      } catch {
        // localStorage 접근 불가 시 무시
      }
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

  // Error state (🔒 verifiedUser도 체크 - 서버 검증 필수)
  if (error || !space || !session || !verifiedUser) {
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
  // 🔒 userId는 서버 파생 participantId 사용 (session.sessionToken 대신)
  return (
    <SpaceLayout
      spaceId={space.id}
      spaceName={space.name}
      spaceLogoUrl={space.logoUrl}
      spacePrimaryColor={space.primaryColor}
      userNickname={verifiedUser.nickname}
      userId={verifiedUser.participantId}
      userAvatarColor={verifiedUser.avatar as "default" | "red" | "green" | "purple" | "orange" | "pink"}
      sessionToken={session.sessionToken}
      onExit={handleExit}
    />
  )
}
