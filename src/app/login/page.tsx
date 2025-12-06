"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  Input,
  Label,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Icons
// ============================================
const GitHubIcon = () => (
  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
)

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
// Auth Form (Login + Register)
// ============================================
function AuthForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"
  const error = searchParams.get("error")

  const [mode, setMode] = useState<"login" | "register">("login")
  const [isLoading, setIsLoading] = useState<"github" | "google" | "credentials" | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setIsLoading(provider)
    setFormError(null)
    try {
      await signIn(provider, { callbackUrl })
    } catch (err) {
      console.error("Sign in error:", err)
      setIsLoading(null)
    }
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsLoading("credentials")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setFormError("이메일 또는 비밀번호가 일치하지 않습니다")
        setIsLoading(null)
        return
      }

      router.push(callbackUrl)
    } catch (err) {
      console.error("Sign in error:", err)
      setFormError("로그인에 실패했습니다")
      setIsLoading(null)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    // Validation
    if (!email || !password) {
      setFormError("이메일과 비밀번호를 입력해주세요")
      return
    }

    if (password !== confirmPassword) {
      setFormError("비밀번호가 일치하지 않습니다")
      return
    }

    if (password.length < 8) {
      setFormError("비밀번호는 8자 이상이어야 합니다")
      return
    }

    setIsLoading("credentials")

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || "회원가입에 실패했습니다")
        setIsLoading(null)
        return
      }

      // Success - switch to login mode
      setSuccessMessage("회원가입이 완료되었습니다. 로그인해주세요.")
      setMode("login")
      setPassword("")
      setConfirmPassword("")
      setIsLoading(null)
    } catch (err) {
      console.error("Register error:", err)
      setFormError("회원가입에 실패했습니다")
      setIsLoading(null)
    }
  }

  const resetForm = () => {
    setFormError(null)
    setSuccessMessage(null)
    setPassword("")
    setConfirmPassword("")
  }

  return (
    <VStack gap="default">
      {/* Mode Tabs */}
      <div className="flex w-full rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => { setMode("login"); resetForm() }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); resetForm() }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "register"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          회원가입
        </button>
      </div>

      {/* Error/Success Messages */}
      {(error || formError) && (
        <div className="rounded-lg bg-destructive/10 p-3 text-center">
          <Text size="sm" className="text-destructive">
            {error === "OAuthAccountNotLinked"
              ? "이 이메일은 다른 로그인 방식으로 등록되어 있습니다."
              : formError || getText("LID.AUTH.ERROR.DEFAULT")}
          </Text>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-primary/10 p-3 text-center">
          <Text size="sm" className="text-primary">
            {successMessage}
          </Text>
        </div>
      )}

      {/* Login Form */}
      {mode === "login" && (
        <form onSubmit={handleCredentialsSignIn}>
          <VStack gap="default">
            <VStack gap="sm">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                disabled={isLoading !== null}
              />
            </VStack>

            <VStack gap="sm">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading !== null}
              />
            </VStack>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading !== null}
            >
              {isLoading === "credentials" ? getText("LID.STATUS.LOADING") : "로그인"}
            </Button>
          </VStack>
        </form>
      )}

      {/* Register Form */}
      {mode === "register" && (
        <form onSubmit={handleRegister}>
          <VStack gap="default">
            <VStack gap="sm">
              <Label htmlFor="name">이름 (선택)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                disabled={isLoading !== null}
              />
            </VStack>

            <VStack gap="sm">
              <Label htmlFor="register-email">이메일</Label>
              <Input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                disabled={isLoading !== null}
              />
            </VStack>

            <VStack gap="sm">
              <Label htmlFor="register-password">비밀번호</Label>
              <Input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상, 영문+숫자 포함"
                disabled={isLoading !== null}
              />
            </VStack>

            <VStack gap="sm">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isLoading !== null}
              />
            </VStack>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading !== null}
            >
              {isLoading === "credentials" ? getText("LID.STATUS.LOADING") : "회원가입"}
            </Button>
          </VStack>
        </form>
      )}

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">또는</span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <VStack gap="sm">
        {/* Google Login */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading !== null}
        >
          <HStack gap="sm" align="center" justify="center">
            <GoogleIcon />
            <span>
              {isLoading === "google"
                ? getText("LID.STATUS.LOADING")
                : "Google로 계속하기"}
            </span>
          </HStack>
        </Button>

        {/* GitHub Login */}
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => handleOAuthSignIn("github")}
          disabled={isLoading !== null}
        >
          <HStack gap="sm" align="center" justify="center">
            <GitHubIcon />
            <span>
              {isLoading === "github"
                ? getText("LID.STATUS.LOADING")
                : "GitHub로 계속하기"}
            </span>
          </HStack>
        </Button>
      </VStack>

      {/* Guest Entry Info */}
      <VStack gap="xs" align="center" className="pt-2 text-center">
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
    <VStack gap="default">
      <div className="flex w-full rounded-lg bg-muted p-1">
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted-foreground/20" />
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted-foreground/20" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
      <div className="my-4 h-px w-full bg-border" />
      <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
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
              <img src="/logo.jpg" alt="Flow Metaverse" className="size-8 rounded-lg object-contain" />
              <Text weight="semibold" size="lg">
                Flow Metaverse
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
                  계정에 로그인하거나 새로 가입하세요
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
