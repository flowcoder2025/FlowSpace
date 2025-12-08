"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import {
  Container,
  Section,
  HStack,
  VStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Icons
// ============================================
const GoogleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

// ============================================
// Auth Form (Google OAuth Only)
// ============================================
function AuthForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"
  const error = searchParams.get("error")

  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl })
    } catch (err) {
      console.error("Sign in error:", err)
      setIsLoading(false)
    }
  }

  return (
    <VStack gap="lg">
      {/* Error Messages */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-center">
          <Text size="sm" className="text-destructive">
            {error === "OAuthAccountNotLinked"
              ? "이 이메일은 다른 로그인 방식으로 등록되어 있습니다."
              : error === "OAuthCallback"
              ? "로그인 중 오류가 발생했습니다. 다시 시도해주세요."
              : getText("LID.AUTH.ERROR.DEFAULT")}
          </Text>
        </div>
      )}

      {/* Google Login Button */}
      <Button
        variant="outline"
        size="lg"
        className="w-full py-6"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <HStack gap="sm" align="center" justify="center">
          <GoogleIcon />
          <span className="text-base">
            {isLoading
              ? getText("LID.STATUS.LOADING")
              : "Google로 계속하기"}
          </span>
        </HStack>
      </Button>

      {/* Guest Entry Info */}
      <VStack gap="xs" align="center" className="pt-4 text-center">
        <Text tone="muted" size="sm">
          공간에 게스트로 입장하시려면
        </Text>
        <Text tone="muted" size="sm">
          초대 링크를 통해 접속하세요
        </Text>
      </VStack>
    </VStack>
  )
}

// ============================================
// Loading Fallback
// ============================================
function AuthFormFallback() {
  return (
    <VStack gap="lg">
      <div className="h-14 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-2/3 mx-auto animate-pulse rounded bg-muted" />
    </VStack>
  )
}

// ============================================
// Login Page
// ============================================
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <Container>
          <HStack justify="between" className="h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/FlowSpace_logo_transparent_clean.png" alt="FlowSpace" className="size-8 rounded-lg object-contain" />
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
            {/* Auth Card */}
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {getText("LID.AUTH.LOGIN.TITLE")}
                </CardTitle>
                <CardDescription>
                  Google 계정으로 시작하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<AuthFormFallback />}>
                  <AuthForm />
                </Suspense>
              </CardContent>
            </Card>

            {/* Back to Home */}
            <Button variant="outline" asChild>
              <Link href="/">{getText("BTN.SECONDARY.BACK")}</Link>
            </Button>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
