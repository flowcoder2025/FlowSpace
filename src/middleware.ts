/**
 * Next.js Middleware
 *
 * CSRF 보호 및 보안 헤더 적용
 *
 * @see ROADMAP.md 5.3 - CSRF 토큰 검증 강화
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 허용된 Origin 목록
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.NEXT_PUBLIC_APP_URL,
  // Vercel Preview URLs
  /^https:\/\/.*\.vercel\.app$/,
].filter(Boolean)

// CSRF 검증이 필요한 HTTP 메서드
const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"]

// CSRF 검증에서 제외할 경로 (외부 서비스 콜백 등)
const CSRF_EXEMPT_PATHS = [
  "/api/auth/", // NextAuth 콜백 (자체 CSRF 보호)
  "/api/webhooks/", // 웹훅 엔드포인트 (API 키로 보호)
]

/**
 * Origin 헤더 검증
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true // Same-origin 요청 (브라우저가 Origin 안 보냄)

  for (const allowed of ALLOWED_ORIGINS) {
    if (typeof allowed === "string" && origin === allowed) {
      return true
    }
    if (allowed instanceof RegExp && allowed.test(origin)) {
      return true
    }
  }
  return false
}

/**
 * CSRF 검증 제외 경로인지 확인
 */
function isCSRFExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((path) => pathname.startsWith(path))
}

export function middleware(request: NextRequest) {
  const { method, nextUrl, headers } = request
  const pathname = nextUrl.pathname

  // API 라우트에만 CSRF 검증 적용
  if (pathname.startsWith("/api/")) {
    // 상태 변경 메서드에 대해 Origin 검증
    if (STATE_CHANGING_METHODS.includes(method) && !isCSRFExempt(pathname)) {
      const origin = headers.get("origin")
      const referer = headers.get("referer")

      // Origin 또는 Referer 헤더 검증
      if (!isAllowedOrigin(origin)) {
        // Referer로 fallback 검증
        const refererOrigin = referer ? new URL(referer).origin : null
        if (!isAllowedOrigin(refererOrigin)) {
          console.warn(
            `[CSRF] Blocked request: ${method} ${pathname} from origin=${origin}, referer=${referer}`
          )
          return NextResponse.json(
            { error: "CSRF validation failed" },
            { status: 403 }
          )
        }
      }
    }
  }

  // 응답에 보안 헤더 추가
  const response = NextResponse.next()

  // X-Content-Type-Options: MIME 타입 스니핑 방지
  response.headers.set("X-Content-Type-Options", "nosniff")

  // X-Frame-Options: 클릭재킹 방지 (기본값, CSP로 대체 가능)
  response.headers.set("X-Frame-Options", "SAMEORIGIN")

  // Referrer-Policy: 리퍼러 정보 제한
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

// 미들웨어 적용 경로 설정
export const config = {
  matcher: [
    // API 라우트
    "/api/:path*",
    // 정적 파일 제외
    "/((?!_next/static|_next/image|favicon.ico|assets).*)",
  ],
}
