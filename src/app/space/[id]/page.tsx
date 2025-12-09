"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
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

// 유효한 아바타 색상 목록 (socket/types.ts의 AvatarColor와 일치)
const VALID_AVATAR_COLORS = ["default", "red", "green", "purple", "orange", "pink"] as const
type LocalAvatarColor = typeof VALID_AVATAR_COLORS[number]

// 아바타 색상 유효성 검사 헬퍼 함수
function isValidAvatarColor(value: unknown): value is LocalAvatarColor {
  return typeof value === "string" && VALID_AVATAR_COLORS.includes(value as LocalAvatarColor)
}

// 안전한 아바타 색상 반환 (유효하지 않으면 "default")
function getSafeAvatarColor(value: unknown): LocalAvatarColor {
  return isValidAvatarColor(value) ? value : "default"
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

  // NextAuth 세션 확인
  const { data: authSession, status: authStatus } = useSession()

  // Dev mode: ?dev=true 쿼리 파라미터로 세션 체크 우회
  const devMode = IS_DEV && searchParams.get("dev") === "true"

  const [space, setSpace] = useState<SpaceData | null>(null)
  const [session, setSession] = useState<GuestSession | null>(null)
  // 🔐 로그인 사용자 여부 추적
  const [isAuthUser, setIsAuthUser] = useState(false)
  // 🔒 서버 검증된 사용자 정보 (participantId는 서버에서 파생)
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 🔑 로그인 필요 상태 (게스트 세션 없고 로그인도 안 된 경우)
  const [needsLogin, setNeedsLogin] = useState(false)

  // Load session from NextAuth or localStorage
  useEffect(() => {
    // NextAuth 세션 로딩 중이면 대기
    if (authStatus === "loading") return

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

    // 🔐 NextAuth 로그인 사용자인 경우
    if (authSession?.user) {
      console.log("[SpacePage] NextAuth session detected, using auth user")
      setIsAuthUser(true)
      // 로그인 사용자용 가상 세션 생성 (기존 로직 호환)
      // ⚠️ avatar는 유효한 색상만 허용 (Google 프로필 URL이 아님!)
      const safeAvatar = getSafeAvatarColor(authSession.user.image)
      const authUserSession: GuestSession = {
        sessionToken: `auth-${authSession.user.id || Date.now()}`,
        nickname: authSession.user.name || authSession.user.email?.split("@")[0] || "User",
        avatar: safeAvatar,
        spaceId,
      }
      setSession(authUserSession)
      // 로그인 사용자는 서버 검증 대신 바로 verifiedUser 설정
      setVerifiedUser({
        participantId: `user-${authSession.user.id}`,
        nickname: authUserSession.nickname,
        avatar: safeAvatar,
      })
      console.log(`[SpacePage] Auth user avatar set to: ${safeAvatar}`)
      return
    }

    // 🎫 게스트 사용자: localStorage에서 세션 확인
    let storedSession: string | null = null
    try {
      storedSession = localStorage.getItem("guestSession")
    } catch (storageError) {
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
          console.log("[SpacePage] Different space session detected, clearing old session")
          try {
            localStorage.removeItem("guestSession")
          } catch {
            // localStorage 접근 불가 시 무시
          }
          setError("이전 공간의 세션이 초기화되었습니다. 초대 링크를 통해 다시 입장해주세요.")
          setLoading(false)
        }
      } catch {
        setError("세션 정보가 올바르지 않습니다.")
        setLoading(false)
      }
    } else {
      // 🔑 게스트 세션도 없고 로그인도 안 된 경우 → 로그인 유도
      console.log("[SpacePage] No session found, prompting login")
      setNeedsLogin(true)
      setLoading(false)
    }
  }, [spaceId, devMode, authSession, authStatus])

  // 🔒 서버에서 세션 검증 및 서버 파생 participantId 조회
  useEffect(() => {
    if (!session) return

    // 🔐 로그인 사용자는 이미 verifiedUser가 설정되어 있음, 스킵
    if (isAuthUser) {
      console.log("[SpacePage] Auth user detected, skipping guest verification")
      return
    }

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

        // 🔒 서버에서 파생된 participantId 저장 (avatar도 유효성 검사)
        const safeAvatar = getSafeAvatarColor(data.avatar)
        setVerifiedUser({
          participantId: data.participantId,
          nickname: data.nickname,
          avatar: safeAvatar,
        })

        console.log("[SpacePage] Session verified, participantId:", data.participantId, "avatar:", safeAvatar)
      } catch (err) {
        console.error("[SpacePage] Failed to verify session:", err)
        setError("세션 검증에 실패했습니다.")
        setLoading(false)
      }
    }

    verifySession()
  }, [session, devMode, isAuthUser])

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

  // 🔑 로그인 필요 상태 - 로그인 유도 화면
  if (needsLogin) {
    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <VStack gap="lg" align="center" className="py-24">
            <div className="rounded-full bg-primary/10 p-4">
              <svg
                className="size-12 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <VStack gap="sm" align="center">
              <Text size="lg" weight="semibold">공간에 입장하려면 로그인이 필요합니다</Text>
              <Text tone="muted" className="text-center">
                로그인하거나 초대 링크를 통해 게스트로 입장해주세요
              </Text>
            </VStack>
            <VStack gap="sm" className="w-full max-w-xs">
              <Button asChild className="w-full">
                <Link href={`/login?callbackUrl=/space/${spaceId}`}>로그인</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">홈으로 돌아가기</Link>
              </Button>
            </VStack>
          </VStack>
        </Container>
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
  // 🔒 avatar는 이미 getSafeAvatarColor로 검증됨
  return (
    <SpaceLayout
      spaceId={space.id}
      spaceName={space.name}
      spaceLogoUrl={space.logoUrl}
      spacePrimaryColor={space.primaryColor}
      userNickname={verifiedUser.nickname}
      userId={verifiedUser.participantId}
      userAvatarColor={verifiedUser.avatar as LocalAvatarColor}
      sessionToken={session.sessionToken}
      onExit={handleExit}
    />
  )
}
