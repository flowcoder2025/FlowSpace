/**
 * Next.js Middleware
 *
 * 인증된 사용자의 녹화 동의 상태를 확인하고
 * 동의하지 않은 경우 /onboarding으로 리다이렉트
 *
 * 📌 법적 준수: 모든 사용자(신규 + 기존)가 동의해야 서비스 이용 가능
 */

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// 온보딩 체크를 스킵할 경로들
const PUBLIC_PATHS = [
  "/",            // 홈페이지 (랜딩)
  "/login",       // 로그인
  "/onboarding",  // 온보딩
  "/api",         // API 라우트
  "/_next",       // Next.js 내부
  "/favicon.ico",
  "/icon.png",
  "/FlowSpace_logo",
  "/assets",
]

// 게스트 입장 가능 경로 (동의 체크 불필요)
const GUEST_PATHS = [
  "/space/",      // 공간 입장 (게스트 가능)
  "/spaces/",     // 초대 코드 입장
]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // 1. 홈페이지는 정확히 "/" 경로만 허용
  if (pathname === "/") {
    return NextResponse.next()
  }

  // 2. 공개 경로는 체크 스킵
  if (PUBLIC_PATHS.some((path) => path !== "/" && pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 3. 게스트 경로는 체크 스킵 (로그인 없이 입장 가능)
  if (GUEST_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 4. 인증되지 않은 사용자 → 로그인 페이지로
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 5. 인증된 사용자 - 녹화 동의 여부 확인
  const user = req.auth.user
  // agreedToRecording이 false인 경우 온보딩 필요 (신규 + 기존 모두)
  if (user && user.agreedToRecording === false) {
    const onboardingUrl = new URL("/onboarding", req.url)
    onboardingUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(onboardingUrl)
  }

  // 6. 동의 완료된 사용자 → 계속 진행
  return NextResponse.next()
})

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청에서 실행:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - 정적 파일들 (.png, .jpg 등)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
}
