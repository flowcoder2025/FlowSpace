"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Container,
  Section,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"

// ============================================
// Onboarding Form - useSearchParams 사용하는 컴포넌트
// ============================================
function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 기본 랜딩: /my-spaces (모든 역할 접근 가능)
  // /admin은 SuperAdmin 전용이므로 기본값으로 부적절
  const callbackUrl = searchParams.get("callbackUrl") || "/my-spaces"
  const { update: updateSession } = useSession()
  const [agreed, setAgreed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!agreed) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedToRecording: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "동의 처리에 실패했습니다")
      }

      // 세션 업데이트 (agreedToRecording 반영)
      await updateSession()

      // 동의 완료 → 원래 가려던 페이지로 이동
      router.push(callbackUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

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
        <Container size="sm">
          <VStack gap="lg" align="center">
            {/* Welcome Card */}
            <Card className="w-full max-w-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  FlowSpace에 오신 것을 환영합니다!
                </CardTitle>
                <CardDescription>
                  서비스 이용을 위해 아래 내용에 동의해주세요
                </CardDescription>
              </CardHeader>

              <CardContent>
                <VStack gap="lg">
                  {/* 서비스 안내 */}
                  <div className="rounded-lg bg-muted/50 p-4">
                    <VStack gap="sm">
                      <Text weight="medium" size="sm">
                        FlowSpace 서비스 이용 안내
                      </Text>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>2D 메타버스 공간에서 실시간 협업이 가능합니다</li>
                        <li>음성/영상 통화, 화면공유 기능을 제공합니다</li>
                        <li>공간 운영자(Owner, Staff)는 활동을 녹화할 수 있습니다</li>
                      </ul>
                    </VStack>
                  </div>

                  {/* 녹화 정책 안내 */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <VStack gap="sm">
                      <HStack gap="sm" align="center">
                        <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                        <Text weight="medium" size="sm" className="text-primary">
                          녹화 정책 안내
                        </Text>
                      </HStack>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>공간 운영자가 화면공유 내용을 녹화할 수 있습니다</li>
                        <li>녹화 시 화면에 <span className="font-mono text-red-500">REC</span> 표시가 나타납니다</li>
                        <li>녹화 파일은 교육/기록/증빙 목적으로 활용됩니다</li>
                        <li>녹화에 동의하지 않으면 서비스 이용이 제한됩니다</li>
                      </ul>
                    </VStack>
                  </div>

                  {/* 동의 체크박스 */}
                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      id="consent"
                      checked={agreed}
                      onCheckedChange={(checked: boolean) => setAgreed(checked)}
                      className="mt-1"
                    />
                    <label
                      htmlFor="consent"
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      위 내용을 확인하였으며,{" "}
                      <span className="font-medium text-primary">
                        서비스 이용약관 및 녹화 정책
                      </span>
                      에 동의합니다. (필수)
                    </label>
                  </div>

                  {/* 에러 메시지 */}
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-center">
                      <Text size="sm" className="text-destructive">
                        {error}
                      </Text>
                    </div>
                  )}
                </VStack>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!agreed || isLoading}
                >
                  {isLoading ? "처리 중..." : "동의하고 시작하기"}
                </Button>
              </CardFooter>
            </Card>

            {/* 추가 정보 */}
            <Text tone="muted" size="xs" className="text-center max-w-md">
              동의 내용은 언제든지 설정에서 확인할 수 있으며,
              <br />
              동의 철회 시 서비스 이용이 제한될 수 있습니다.
            </Text>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}

// ============================================
// Page Export - Suspense boundary 필수 (useSearchParams 사용)
// ============================================
export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-muted/30 flex items-center justify-center">
          <Text tone="muted">로딩 중...</Text>
        </main>
      }
    >
      <OnboardingForm />
    </Suspense>
  )
}