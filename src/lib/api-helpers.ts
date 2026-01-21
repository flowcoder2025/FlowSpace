/**
 * API 헬퍼 유틸리티
 *
 * 공통 API 라우트 패턴 통합
 * - 인증 처리
 * - ID 검증
 * - 표준 응답 생성
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// ============================================
// 상수
// ============================================

/** 개발 환경 여부 */
export const IS_DEV = process.env.NODE_ENV === "development"

/** 개발환경 테스트용 사용자 ID (seed.ts의 TEST_USER_ID와 동일) */
export const DEV_TEST_USER_ID = "test-user-dev-001"

// ============================================
// 인증 헬퍼
// ============================================

/**
 * 세션에서 사용자 ID 추출
 *
 * 개발 환경에서는 테스트 사용자 ID를 반환 (옵션)
 *
 * @param allowDevFallback - 개발 환경에서 테스트 사용자 ID 사용 허용 여부 (기본: false)
 * @returns 사용자 ID 또는 null
 */
export async function getUserIdFromSession(
  allowDevFallback = false
): Promise<string | null> {
  const session = await auth()

  if (session?.user?.id) {
    return session.user.id
  }

  // 개발 환경에서만 테스트 사용자 허용 (명시적으로 요청한 경우에만)
  if (allowDevFallback && IS_DEV) {
    console.warn("[API] Using dev test user - not for production!")
    return DEV_TEST_USER_ID
  }

  return null
}

// ============================================
// ID 검증
// ============================================

/**
 * ID 유효성 검증
 *
 * @param id - 검증할 ID
 * @param maxLength - 최대 길이 (기본: 100)
 * @returns 유효 여부
 */
export function validateId(
  id: string | undefined | null,
  maxLength = 100
): boolean {
  if (!id || typeof id !== "string") {
    return false
  }
  if (id.length === 0 || id.length > maxLength) {
    return false
  }
  return true
}

// ============================================
// 표준 응답 생성
// ============================================

/**
 * 잘못된 ID 응답
 *
 * @param fieldName - 필드 이름 (기본: "ID")
 */
export function invalidIdResponse(fieldName = "ID"): NextResponse {
  return NextResponse.json(
    { error: `Invalid ${fieldName}` },
    { status: 400 }
  )
}

/**
 * 인증 필요 응답
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  )
}

/**
 * 권한 부족 응답
 *
 * @param message - 커스텀 메시지 (옵션)
 */
export function forbiddenResponse(message = "Forbidden"): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  )
}

/**
 * 리소스 없음 응답
 *
 * @param resourceName - 리소스 이름 (기본: "Resource")
 */
export function notFoundResponse(resourceName = "Resource"): NextResponse {
  return NextResponse.json(
    { error: `${resourceName} not found` },
    { status: 404 }
  )
}

/**
 * 서버 에러 응답
 *
 * @param message - 에러 메시지
 */
export function serverErrorResponse(message = "Internal server error"): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 500 }
  )
}
