"use client"

/**
 * Admin Error Boundary
 *
 * /admin 및 하위 페이지에서 발생하는 런타임 에러를 처리
 * Next.js App Router의 error.tsx 컨벤션 사용
 */

import { useEffect } from "react"
import Link from "next/link"
import {
  Container,
  Section,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
} from "@/components/ui"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 외부 서비스로 전송 가능)
    console.error("[Admin Error]", error)
  }, [error])

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <Container>
          <HStack justify="between" className="h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/FlowSpace_logo_transparent_clean.png"
                alt="FlowSpace"
                className="size-8 rounded-lg object-contain"
              />
              <Text weight="semibold" size="lg">
                FlowSpace
              </Text>
            </Link>
          </HStack>
        </Container>
      </nav>

      <Section spacing="lg">
        <Container>
          <VStack gap="xl" align="center" className="py-16">
            {/* Error Icon */}
            <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
              <svg
                className="size-10 text-destructive"
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
            <VStack gap="sm" align="center">
              <Heading as="h1" size="2xl">
                페이지 로드 중 오류가 발생했습니다
              </Heading>
              <Text tone="muted" className="max-w-md text-center">
                일시적인 문제일 수 있습니다. 잠시 후 다시 시도하거나,
                문제가 지속되면 관리자에게 문의해주세요.
              </Text>
            </VStack>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === "development" && (
              <div className="w-full max-w-2xl rounded-lg border bg-muted/50 p-4">
                <Text size="sm" weight="medium" className="mb-2 text-destructive">
                  Error Details (개발 환경에서만 표시):
                </Text>
                <pre className="overflow-x-auto text-xs text-muted-foreground">
                  {error.message}
                  {error.digest && (
                    <>
                      {"\n\n"}Digest: {error.digest}
                    </>
                  )}
                </pre>
              </div>
            )}

            {/* Actions */}
            <HStack gap="default">
              <Button variant="outline" onClick={reset}>
                다시 시도
              </Button>
              <Button asChild>
                <Link href="/admin">관리자 대시보드로</Link>
              </Button>
            </HStack>

            {/* Help Link */}
            <Text size="sm" tone="muted">
              문제가 계속되나요?{" "}
              <Link href="/" className="text-primary underline">
                홈으로 돌아가기
              </Link>
            </Text>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
