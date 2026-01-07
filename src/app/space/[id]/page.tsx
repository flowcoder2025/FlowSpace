"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import {
  ParticipantEntryModal,
  getSpaceParticipant,
  saveSpaceParticipant,
} from "@/features/space/components/ParticipantEntryModal"
import {
  getSafeAvatarString,
  getLegacyAvatarColor,
  type ClassicColorId,
} from "@/features/space/avatar"

// ============================================
// Types
// ============================================
import type { SpaceRole } from "@prisma/client"

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
  inviteCode: string  // 초대 코드 (인게임 초대 링크용)
}

// 🛡️ 역할 API 응답 타입
interface RoleResponse {
  role: SpaceRole
  isOwner: boolean
  isStaff: boolean
  isSuperAdmin: boolean   // 플랫폼 관리자
  canManageChat: boolean
  canManageSpace: boolean
  canManageMembers: boolean
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

// 레거시 아바타 색상 타입 (backward compatibility)
type LocalAvatarColor = ClassicColorId

// 안전한 아바타 색상 반환 (새 포맷에서 레거시 색상 추출)
function getSafeAvatarColor(value: unknown): LocalAvatarColor {
  if (typeof value !== "string") return "default"
  return getLegacyAvatarColor(value)
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
// 🧹 게스트 세션 정리 (인증 사용자 전환 시)
// ============================================
/**
 * 인증된 사용자가 공간에 입장할 때 기존 게스트 세션을 정리합니다.
 * 이렇게 하면 LiveKit/Socket.io에서 중복 참가자 문제를 방지합니다.
 */
async function cleanupGuestSession(spaceId: string): Promise<string | null> {
  try {
    const storedSession = localStorage.getItem("guestSession")
    if (!storedSession) return null

    const parsed = JSON.parse(storedSession) as GuestSession
    if (parsed.spaceId !== spaceId) return null

    // 서버에 exit 이벤트 기록 + 세션 만료
    await fetch("/api/guest/exit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: parsed.sessionToken,
        spaceId: parsed.spaceId,
      }),
    }).catch(() => {
      // exit API 실패해도 계속 진행
    })

    // localStorage에서 제거
    localStorage.removeItem("guestSession")
    console.log("[SpacePage] 🧹 Cleaned up guest session for auth user transition")

    return parsed.sessionToken
  } catch (error) {
    console.warn("[SpacePage] Failed to cleanup guest session:", error)
    // 실패해도 localStorage는 제거 시도
    try {
      localStorage.removeItem("guestSession")
    } catch {}
    return null
  }
}

// ============================================
// Fetch with Timeout and Retry
// ============================================
const DEFAULT_TIMEOUT = 15000 // 15초 타임아웃
const MAX_RETRIES = 2 // 최대 2번 재시도

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number
  retries?: number
}

async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES, ...fetchOptions } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error("Fetch failed")

      // AbortError (타임아웃) 또는 네트워크 오류인 경우 재시도
      const isRetryable =
        lastError.name === "AbortError" ||
        lastError.message.includes("fetch") ||
        lastError.message.includes("network")

      if (isRetryable && attempt < retries) {
        console.log(`[SpacePage] Fetch retry ${attempt + 1}/${retries} for ${url}`)
        // 재시도 전 짧은 대기 (지수 백오프)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }

      throw lastError
    }
  }

  throw lastError || new Error("Fetch failed after retries")
}

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
  // 🛡️ 사용자 역할 (OWNER/STAFF/PARTICIPANT)
  const [userRole, setUserRole] = useState<SpaceRole | null>(null)
  // 🌟 플랫폼 관리자 (SuperAdmin)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 🔑 로그인 필요 상태 (게스트 세션 없고 로그인도 안 된 경우)
  const [needsLogin, setNeedsLogin] = useState(false)
  // 🎫 참가자명 입력 모달 상태 (로그인 사용자용)
  const [showParticipantModal, setShowParticipantModal] = useState(false)

  // Load session from NextAuth or localStorage
  useEffect(() => {
    // NextAuth 세션 로딩 중이면 대기
    if (authStatus === "loading") return

    // 🔐 NextAuth 로그인 사용자인 경우 (dev 모드여도 로그인 사용자 우선)
    // dev 모드에서도 로그인 사용자가 있으면 로그인 사용자로 처리 (중복 참가자 방지)
    if (authSession?.user) {
      console.log("[SpacePage] NextAuth session detected, checking saved participant info")
      setIsAuthUser(true)

      // 🧹 기존 게스트 세션 정리 (중복 참가자 방지)
      // 비동기로 처리하되, 세션 설정은 동기적으로 진행
      cleanupGuestSession(spaceId).then((cleanedToken) => {
        if (cleanedToken) {
          console.log("[SpacePage] 🧹 Guest session cleaned up, token was:", cleanedToken.substring(0, 20) + "...")
        }
      })

      // 🎫 저장된 참가자 정보 확인 (공간별)
      const savedParticipant = getSpaceParticipant(spaceId)

      if (savedParticipant) {
        // 저장된 참가자 정보가 있으면 사용
        console.log("[SpacePage] Using saved participant:", savedParticipant.nickname)
        // 🔄 새 아바타 포맷 지원 - 전체 문자열 저장
        const safeAvatar = getSafeAvatarString(savedParticipant.avatar)
        const authUserSession: GuestSession = {
          sessionToken: `auth-${authSession.user.id || Date.now()}`,
          nickname: savedParticipant.nickname,
          avatar: safeAvatar,
          spaceId,
        }
        setSession(authUserSession)
        setVerifiedUser({
          participantId: `user-${authSession.user.id}`,
          nickname: savedParticipant.nickname,
          avatar: safeAvatar,
        })
        // 마지막 방문 시간 업데이트
        saveSpaceParticipant({ ...savedParticipant, lastVisit: Date.now() })
      } else {
        // 저장된 정보 없음 → 참가자명 입력 모달 표시
        console.log("[SpacePage] No saved participant info, showing modal")
        setShowParticipantModal(true)
        setLoading(false)
      }
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
      // 🔑 게스트 세션도 없고 로그인도 안 된 경우
      // Dev mode: 로그인 안 된 경우에만 테스트용 가상 세션 생성
      if (devMode) {
        console.log("[SpacePage] Dev mode: creating test session (no auth user)")
        const devSession: GuestSession = {
          sessionToken: `dev-${Date.now()}`,
          nickname: "Developer",
          avatar: "default",
          spaceId,
        }
        setSession(devSession)
        return
      }

      // 로그인 유도
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
        const res = await fetchWithRetry("/api/guest/verify", {
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
        // 🔄 새 아바타 포맷 지원 - 전체 문자열 저장
        const safeAvatar = getSafeAvatarString(data.avatar)
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
        inviteCode: `dev-${spaceId}`,  // 개발용 초대 코드
      })
      setLoading(false)
      return
    }

    async function fetchSpace() {
      try {
        const res = await fetchWithRetry(`/api/spaces/${spaceId}`)
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
        const errorMessage = err instanceof Error && err.name === "AbortError"
          ? "서버 응답 시간 초과. 네트워크 연결을 확인하고 다시 시도해주세요."
          : "공간을 불러올 수 없습니다"
        setError(errorMessage)
        console.error("[SpacePage] fetchSpace error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchSpace()
  }, [spaceId, session, devMode])

  // 🎫 멤버십 자동 생성 (공간 입장 시)
  useEffect(() => {
    if (!session || !spaceId) return

    // Dev mode: 스킵
    if (devMode) return

    async function joinSpace() {
      try {
        // 인증된 사용자 vs 게스트 분기
        // auth-: 로그인 사용자, dev-: 개발 모드 (스킵됨), 그 외: 게스트
        const isGuest = !session!.sessionToken.startsWith("dev-") &&
                        !session!.sessionToken.startsWith("auth-")

        const body = isGuest
          ? { guestSessionToken: session!.sessionToken } // 게스트: sessionToken 전달
          : {} // 인증된 사용자: 쿠키에서 자동 인증

        const res = await fetchWithRetry(`/api/spaces/${spaceId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (res.ok) {
          const data = await res.json()
          console.log("[SpacePage] Membership ensured:", {
            memberId: data.membership.id,
            role: data.membership.role,
            isNew: data.membership.isNew,
          })
        } else {
          // 멤버십 생성 실패해도 입장은 계속 진행
          console.warn("[SpacePage] Join API failed, but continuing:", await res.text())
        }
      } catch (err) {
        // 멤버십 생성 실패해도 입장은 계속 진행 (비동기 처리)
        console.warn("[SpacePage] Join API error, but continuing:", err)
      }
    }

    joinSpace()
  }, [spaceId, session, devMode])

  // 🛡️ 사용자 역할 조회
  useEffect(() => {
    if (!session || !spaceId) return

    // Dev mode: 테스트용 OWNER 역할 + SuperAdmin 부여
    if (devMode) {
      setUserRole("OWNER" as SpaceRole)
      setIsSuperAdmin(true)
      return
    }

    async function fetchRole() {
      try {
        const res = await fetchWithRetry(`/api/spaces/${spaceId}/my-role`)
        if (!res.ok) {
          console.warn("[SpacePage] Failed to fetch role, defaulting to PARTICIPANT")
          setUserRole("PARTICIPANT" as SpaceRole)
          return
        }
        const data: RoleResponse = await res.json()
        setUserRole(data.role)
        setIsSuperAdmin(data.isSuperAdmin)
        console.log("[SpacePage] User role:", data.role, { isSuperAdmin: data.isSuperAdmin, canManageChat: data.canManageChat })
      } catch (err) {
        console.error("[SpacePage] fetchRole error:", err)
        // 에러 시 기본값 PARTICIPANT
        setUserRole("PARTICIPANT" as SpaceRole)
      }
    }

    fetchRole()
  }, [spaceId, session, devMode])

  // 📊 인증 사용자 방문 로깅 (ENTER 이벤트)
  // ⚠️ useRef로 React StrictMode 중복 실행 방지
  const enterLoggedRef = useRef(false)

  useEffect(() => {
    // 조건: 인증 사용자 + verifiedUser 설정 완료 + 공간 로드 완료
    if (!isAuthUser || !verifiedUser || !space || devMode) return

    // ⚠️ 이미 로깅했으면 스킵 (StrictMode 중복 방지)
    if (enterLoggedRef.current) {
      console.log("[SpacePage] 📊 ENTER already logged (ref guard)")
      return
    }
    enterLoggedRef.current = true

    async function recordVisit() {
      try {
        const res = await fetch(`/api/spaces/${spaceId}/visit`, {
          method: "POST",
        })
        if (res.ok) {
          const data = await res.json()
          if (data.skipped) {
            console.log("[SpacePage] 📊 Visit already recorded recently")
          } else {
            console.log("[SpacePage] 📊 ENTER recorded:", data.eventLogId)
          }
        } else {
          console.warn("[SpacePage] 📊 Visit recording failed:", await res.text())
        }
      } catch (err) {
        // 방문 로깅 실패해도 입장은 계속 진행
        console.warn("[SpacePage] 📊 Visit recording error:", err)
      }
    }

    recordVisit()
  }, [isAuthUser, verifiedUser, space, spaceId, devMode])

  // 🎫 참가자명 입력 완료 핸들러 (로그인 사용자용)
  const handleParticipantComplete = useCallback(
    ({ nickname, avatar }: { nickname: string; avatar: string }) => {
      if (!authSession?.user) return

      console.log("[SpacePage] Participant entry completed:", nickname, avatar)
      setShowParticipantModal(false)
      setLoading(true)

      // 🔄 새 아바타 포맷 지원 - 전체 문자열 저장 (예: "classic:default" 또는 "custom:office_male")
      const safeAvatar = getSafeAvatarString(avatar)
      const authUserSession: GuestSession = {
        sessionToken: `auth-${authSession.user.id || Date.now()}`,
        nickname,
        avatar: safeAvatar,
        spaceId,
      }
      setSession(authUserSession)
      setVerifiedUser({
        participantId: `user-${authSession.user.id}`,
        nickname,
        avatar: safeAvatar,
      })
    },
    [authSession, spaceId]
  )

  // 🎫 닉네임 변경 핸들러 (설정에서 변경 시) - 🔄 핫 리로드로 페이지 리로드 불필요
  const handleNicknameChange = useCallback(
    (nickname: string, avatar: string) => {
      console.log("[SpacePage] Nickname changed (hot reload):", nickname, avatar)
      // 🔄 SpaceLayout 내부에서 updateProfile()로 핫 리로드 처리되므로
      // page.tsx에서는 verifiedUser 상태만 동기화
      // 🔄 새 아바타 포맷 지원
      const safeAvatar = getSafeAvatarString(avatar)
      setVerifiedUser((prev) =>
        prev ? { ...prev, nickname, avatar: safeAvatar } : prev
      )
    },
    []
  )

  // 🔄 재시도 핸들러 (에러 발생 시 페이지 새로고침)
  const handleRetry = useCallback(() => {
    setError(null)
    setLoading(true)
    window.location.reload()
  }, [])

  // Handle exit
  // ⚠️ SSOT: EXIT 로깅은 Socket disconnect에서만 처리
  // 페이지 이동 → SpaceLayout 언마운트 → socket.disconnect() → 서버에서 EXIT 기록
  const handleExit = useCallback(async () => {
    // Clear session (게스트만)
    if (session && !isAuthUser) {
      try {
        localStorage.removeItem("guestSession")
      } catch {
        // localStorage 접근 불가 시 무시
      }
    }

    router.push("/")
  }, [session, router, isAuthUser])

  // 📊 브라우저 종료 시 EXIT 이벤트 로깅 (sendBeacon 사용)
  // ⚠️ Socket.io disconnect만으로는 브라우저 종료 시 서버에 도달하지 않을 수 있음
  // sendBeacon은 브라우저 종료 시에도 백그라운드에서 전송을 완료함
  useEffect(() => {
    if (!session || !spaceId || devMode) return

    const handleBeforeUnload = () => {
      // sendBeacon으로 EXIT 이벤트 전송 (브라우저 종료 시에도 신뢰성 있게 전송)
      if (isAuthUser && authSession?.user?.id) {
        // 인증 사용자: visit API (_method=DELETE 쿼리 파라미터로 POST 사용)
        const url = `/api/spaces/${spaceId}/visit?_method=DELETE`
        navigator.sendBeacon(url, JSON.stringify({ userId: authSession.user.id }))
      } else if (session.sessionToken && !session.sessionToken.startsWith("dev-")) {
        // 게스트 사용자: guest/event API
        const url = "/api/guest/event"
        const blob = new Blob([JSON.stringify({
          sessionToken: session.sessionToken,
          spaceId,
          eventType: "EXIT",
          payload: { reason: "beforeunload" },
        })], { type: "application/json" })
        navigator.sendBeacon(url, blob)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [session, spaceId, devMode, isAuthUser, authSession])

  // 🎫 참가자명 입력 모달 (로그인 사용자 첫 입장)
  if (showParticipantModal && authSession?.user) {
    return (
      <>
        <main className="flex min-h-screen items-center justify-center bg-muted/30">
          <VStack gap="lg" align="center" className="text-center">
            <Text size="lg" className="text-muted-foreground">
              공간 입장 준비 중...
            </Text>
          </VStack>
        </main>
        <ParticipantEntryModal
          open={showParticipantModal}
          spaceId={spaceId}
          spaceName={space?.name || "공간"}
          defaultNickname={authSession.user.name || authSession.user.email?.split("@")[0] || ""}
          onComplete={handleParticipantComplete}
        />
      </>
    )
  }

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
    const isTimeoutError = error?.includes("시간 초과") || error?.includes("timeout")
    const isNetworkError = error?.includes("네트워크") || error?.includes("연결")

    return (
      <main className="min-h-screen bg-muted/30">
        <Container>
          <VStack gap="lg" align="center" className="py-24">
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
            <VStack gap="sm" align="center">
              <Text size="lg" weight="semibold">
                {isTimeoutError ? "연결 시간 초과" : "공간 로딩 실패"}
              </Text>
              <Text tone="muted" className="text-center max-w-md">
                {error || "공간을 찾을 수 없습니다"}
              </Text>
              {(isTimeoutError || isNetworkError) && (
                <Text size="sm" tone="muted" className="text-center">
                  서버가 일시적으로 응답하지 않을 수 있습니다. 잠시 후 다시 시도해주세요.
                </Text>
              )}
            </VStack>
            <VStack gap="sm" className="w-full max-w-xs">
              {(isTimeoutError || isNetworkError || !space) && (
                <Button onClick={handleRetry} className="w-full">
                  다시 시도
                </Button>
              )}
              <Button variant="outline" asChild className="w-full">
                <Link href="/">홈으로 돌아가기</Link>
              </Button>
            </VStack>
          </VStack>
        </Container>
      </main>
    )
  }

  // Main space view with ZEP-style layout
  // 🔒 userId는 서버 파생 participantId 사용 (session.sessionToken 대신)
  // 🔒 avatar는 이미 getSafeAvatarColor로 검증됨
  // 🛡️ userRole은 /api/spaces/[id]/my-role에서 조회
  return (
    <SpaceLayout
      spaceId={space.id}
      spaceName={space.name}
      spaceLogoUrl={space.logoUrl}
      spacePrimaryColor={space.primaryColor}
      spaceInviteCode={space.inviteCode}
      userNickname={verifiedUser.nickname}
      userId={verifiedUser.participantId}
      userAvatarColor={getSafeAvatarColor(verifiedUser.avatar)}
      userAvatar={verifiedUser.avatar}
      userRole={userRole ?? undefined}
      isSuperAdmin={isSuperAdmin}
      sessionToken={session.sessionToken}
      onExit={handleExit}
      onNicknameChange={handleNicknameChange}
    />
  )
}
