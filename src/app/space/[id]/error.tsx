"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardContent,
} from "@/components/ui"

// ============================================
// Space Error Page
// 공간 페이지에서 발생하는 에러 전용 처리
// - 게임 엔진 에러
// - 소켓 연결 에러
// - LiveKit 에러
// ============================================

interface SpaceErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SpaceError({ error, reset }: SpaceErrorProps) {
  useEffect(() => {
    // 에러 로깅 (향후 Sentry 등 연동 가능)
    console.error("[Space Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  // 에러 유형 분류
  const errorType = getErrorType(error)

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Container size="sm">
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <VStack gap="lg" align="center" className="text-center">
              {/* Error Icon */}
              <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
                {errorType.icon}
              </div>

              {/* Error Message */}
              <VStack gap="sm" align="center">
                <Heading as="h1" size="xl">
                  {errorType.title}
                </Heading>
                <Text tone="muted" className="max-w-md">
                  {errorType.description}
                </Text>
              </VStack>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === "development" && (
                <div className="w-full max-w-md rounded-lg bg-muted p-4 text-left">
                  <Text size="sm" weight="medium" className="mb-2">
                    디버그 정보:
                  </Text>
                  <Text size="xs" tone="muted" className="font-mono break-all">
                    {error.message}
                  </Text>
                  {error.digest && (
                    <Text size="xs" tone="muted" className="mt-2 font-mono">
                      Digest: {error.digest}
                    </Text>
                  )}
                </div>
              )}

              {/* Actions */}
              <HStack gap="default" className="pt-2">
                <Button onClick={reset} variant="outline">
                  다시 시도
                </Button>
                <Button asChild>
                  <Link href="/my-spaces">내 공간으로</Link>
                </Button>
              </HStack>

              {/* Help Text */}
              <Text size="sm" tone="muted">
                문제가 지속되면{" "}
                <a href="mailto:support@flowspace.io" className="text-primary underline">
                  고객센터
                </a>
                로 문의해주세요.
              </Text>
            </VStack>
          </CardContent>
        </Card>
      </Container>
    </main>
  )
}

// ============================================
// Error Type Classification
// ============================================

interface ErrorTypeInfo {
  title: string
  description: string
  icon: React.ReactNode
}

function getErrorType(error: Error): ErrorTypeInfo {
  const message = error.message.toLowerCase()

  // 소켓/연결 에러
  if (
    message.includes("socket") ||
    message.includes("connection") ||
    message.includes("websocket") ||
    message.includes("disconnect")
  ) {
    return {
      title: "연결 오류",
      description: "서버와의 연결이 불안정합니다. 네트워크 상태를 확인하고 다시 시도해주세요.",
      icon: (
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
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
          />
        </svg>
      ),
    }
  }

  // 게임/Phaser 에러
  if (
    message.includes("phaser") ||
    message.includes("game") ||
    message.includes("canvas") ||
    message.includes("webgl")
  ) {
    return {
      title: "게임 로딩 오류",
      description: "게임 엔진을 불러오는 중 문제가 발생했습니다. 브라우저를 새로고침 해주세요.",
      icon: (
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
            d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"
          />
        </svg>
      ),
    }
  }

  // LiveKit/미디어 에러
  if (
    message.includes("livekit") ||
    message.includes("media") ||
    message.includes("camera") ||
    message.includes("microphone") ||
    message.includes("permission")
  ) {
    return {
      title: "미디어 오류",
      description: "카메라 또는 마이크 접근에 문제가 있습니다. 브라우저 권한 설정을 확인해주세요.",
      icon: (
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
            d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      ),
    }
  }

  // 권한/접근 에러
  if (
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("access")
  ) {
    return {
      title: "접근 권한 오류",
      description: "이 공간에 접근할 권한이 없거나 세션이 만료되었습니다.",
      icon: (
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
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      ),
    }
  }

  // 기본 에러
  return {
    title: "공간 로딩 오류",
    description: "공간을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    icon: (
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
    ),
  }
}
