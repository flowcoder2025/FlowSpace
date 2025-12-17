"use client"

/**
 * ProtectedLayout
 *
 * 인증된 사용자의 녹화 동의 상태를 클라이언트에서 체크
 * 동의하지 않은 경우 인라인 모달 표시 (같은 페이지에서 처리)
 *
 * 📌 Option A 구현: middleware 제거 + 클라이언트 동의 모달
 * - 별도 onboarding 페이지 불필요
 * - 동의 완료 시 세션 갱신 후 바로 콘텐츠 표시
 */

import { useState, useEffect, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { Text } from "@/components/ui"
import { ConsentModal } from "@/components/ConsentModal"

interface ProtectedLayoutProps {
  children: React.ReactNode
  requireConsent?: boolean // 동의 체크 필요 여부 (기본: true)
}

export function ProtectedLayout({
  children,
  requireConsent = true,
}: ProtectedLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)

  // 동의 완료 상태 (로컬)
  const [hasConsented, setHasConsented] = useState(false)

  // 동의 모달 표시 여부 (파생 상태 - setState in effect 패턴 회피)
  const showConsentModal = useMemo(() => {
    if (!requireConsent) return false
    if (status !== "authenticated") return false
    if (hasConsented) return false
    return session?.user?.agreedToRecording === false
  }, [requireConsent, status, hasConsented, session?.user?.agreedToRecording])

  // 미인증 → 로그인 페이지로 리다이렉트 (사이드 이펙트)
  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated" && !hasRedirected.current) {
      hasRedirected.current = true
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
    }
  }, [status, pathname, router])

  // 동의 완료 핸들러
  const handleConsented = () => {
    setHasConsented(true)
    // 세션이 자동으로 갱신되므로 추가 작업 불필요
  }

  // 로딩 중
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Text tone="muted">로딩 중...</Text>
      </div>
    )
  }

  // 미인증 상태 (리다이렉트 대기)
  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Text tone="muted">로그인 페이지로 이동 중...</Text>
      </div>
    )
  }

  // 동의 필요 + 미동의 상태 → 인라인 모달 표시
  const needsConsent = requireConsent &&
    session?.user?.agreedToRecording === false &&
    !hasConsented

  return (
    <>
      {/* 동의 모달 (인라인) */}
      <ConsentModal
        open={showConsentModal}
        onConsented={handleConsented}
      />

      {/* 동의 대기 중이면 배경만 표시 */}
      {needsConsent ? (
        <div className="flex min-h-screen items-center justify-center">
          <Text tone="muted">서비스 이용 동의가 필요합니다</Text>
        </div>
      ) : (
        children
      )}
    </>
  )
}

export default ProtectedLayout
