/**
 * Error Handling Utilities
 *
 * 통합 에러 처리 시스템
 * - AppError: 커스텀 에러 클래스
 * - handleApiError: API 라우트 에러 핸들러
 * - ErrorCode: 표준 에러 코드
 */

import { NextResponse } from "next/server"

// ============================================
// Error Codes
// ============================================

export const ErrorCode = {
  // Authentication (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",

  // Authorization (403)
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",

  // Not Found (404)
  NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  SPACE_NOT_FOUND: "SPACE_NOT_FOUND",
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",

  // Validation (400)
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Conflict (409)
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",

  // Rate Limiting (429)
  RATE_LIMITED: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server Error (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

// ============================================
// AppError Class
// ============================================

export class AppError extends Error {
  public readonly code: ErrorCodeType
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: Record<string, unknown>

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.statusCode = statusCode
    this.isOperational = true // 예상된 에러인지 여부
    this.details = details

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  // Factory methods for common errors
  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError(message, ErrorCode.BAD_REQUEST, 400, details)
  }

  static unauthorized(message = "인증이 필요합니다") {
    return new AppError(message, ErrorCode.UNAUTHORIZED, 401)
  }

  static forbidden(message = "접근 권한이 없습니다") {
    return new AppError(message, ErrorCode.FORBIDDEN, 403)
  }

  static notFound(message = "요청한 리소스를 찾을 수 없습니다") {
    return new AppError(message, ErrorCode.NOT_FOUND, 404)
  }

  static conflict(message: string, details?: Record<string, unknown>) {
    return new AppError(message, ErrorCode.CONFLICT, 409, details)
  }

  static rateLimited(message = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.") {
    return new AppError(message, ErrorCode.RATE_LIMITED, 429)
  }

  static internal(message = "서버 오류가 발생했습니다") {
    return new AppError(message, ErrorCode.INTERNAL_ERROR, 500)
  }

  static validation(message: string, details?: Record<string, unknown>) {
    return new AppError(message, ErrorCode.VALIDATION_ERROR, 400, details)
  }

  static subscriptionRequired(message = "이 기능을 사용하려면 구독이 필요합니다") {
    return new AppError(message, ErrorCode.SUBSCRIPTION_REQUIRED, 403)
  }
}

// ============================================
// API Error Response
// ============================================

interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCodeType
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * API 에러를 NextResponse로 변환
 */
export function createErrorResponse(error: AppError): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === "development" && error.details && { details: error.details }),
    },
  }

  return NextResponse.json(response, { status: error.statusCode })
}

// ============================================
// API Route Error Handler
// ============================================

type ApiHandler = (
  request: Request,
  context?: { params?: Record<string, string | string[]> }
) => Promise<NextResponse>

/**
 * API 라우트 핸들러를 try-catch로 감싸는 래퍼
 *
 * @example
 * export const GET = withErrorHandler(async (req) => {
 *   const data = await fetchData()
 *   return NextResponse.json({ success: true, data })
 * })
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * 에러를 분석하고 적절한 NextResponse 반환
 */
export function handleApiError(error: unknown): NextResponse {
  // 1. AppError 인스턴스
  if (error instanceof AppError) {
    logError(error, error.statusCode >= 500 ? "error" : "warn")
    return createErrorResponse(error)
  }

  // 2. Prisma 에러 처리
  if (isPrismaError(error)) {
    const appError = handlePrismaError(error)
    logError(appError, "error")
    return createErrorResponse(appError)
  }

  // 3. 일반 Error
  if (error instanceof Error) {
    const appError = new AppError(
      process.env.NODE_ENV === "development" ? error.message : "서버 오류가 발생했습니다",
      ErrorCode.INTERNAL_ERROR,
      500,
      process.env.NODE_ENV === "development" ? { stack: error.stack } : undefined
    )
    logError(error, "error")
    return createErrorResponse(appError)
  }

  // 4. 알 수 없는 에러
  const appError = AppError.internal()
  logError(new Error(String(error)), "error")
  return createErrorResponse(appError)
}

// ============================================
// Prisma Error Handling
// ============================================

interface PrismaError {
  code: string
  meta?: { target?: string[] }
  message: string
}

function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as PrismaError).code === "string" &&
    (error as PrismaError).code.startsWith("P")
  )
}

function handlePrismaError(error: PrismaError): AppError {
  switch (error.code) {
    case "P2002": // Unique constraint violation
      return new AppError(
        "이미 존재하는 데이터입니다",
        ErrorCode.DUPLICATE_ENTRY,
        409,
        { field: error.meta?.target }
      )
    case "P2025": // Record not found
      return AppError.notFound("요청한 데이터를 찾을 수 없습니다")
    case "P2003": // Foreign key constraint
      return new AppError(
        "관련된 데이터가 존재하지 않습니다",
        ErrorCode.BAD_REQUEST,
        400
      )
    case "P2014": // Required relation violation
      return new AppError(
        "필수 연결 데이터가 없습니다",
        ErrorCode.BAD_REQUEST,
        400
      )
    default:
      return new AppError(
        "데이터베이스 오류가 발생했습니다",
        ErrorCode.DATABASE_ERROR,
        500,
        process.env.NODE_ENV === "development" ? { prismaCode: error.code } : undefined
      )
  }
}

// ============================================
// Error Logging
// ============================================

type LogLevel = "error" | "warn" | "info"

function logError(error: Error, level: LogLevel = "error"): void {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    level,
    name: error.name,
    message: error.message,
    ...(error instanceof AppError && {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }),
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  }

  // 현재는 console 로깅, 향후 외부 서비스 연동 가능
  switch (level) {
    case "error":
      console.error("[API Error]", JSON.stringify(logData, null, 2))
      break
    case "warn":
      console.warn("[API Warning]", JSON.stringify(logData, null, 2))
      break
    default:
      console.info("[API Info]", JSON.stringify(logData, null, 2))
  }
}

// ============================================
// Exports
// ============================================

export { logError }
