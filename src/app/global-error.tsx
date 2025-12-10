"use client"

import { useEffect } from "react"

// ============================================
// Global Error Page
// This handles errors in the root layout
// ============================================
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console (or send to error reporting service)
    console.error("Global application error:", error)
  }, [error])

  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            {/* Error Icon */}
            <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-red-100">
              <svg
                className="size-12 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              시스템 오류가 발생했습니다
            </h1>
            <p className="mb-8 text-gray-600">
              죄송합니다. 예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === "development" && (
              <div className="mb-8 rounded-lg bg-gray-100 p-4 text-left">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Error Details:
                </p>
                <p className="break-all font-mono text-xs text-gray-600">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 font-mono text-xs text-gray-500">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                다시 시도
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error는 Router 컨텍스트 외부라서 Link 사용 불가 */}
              <a
                href="/"
                className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
              >
                홈으로 이동
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
