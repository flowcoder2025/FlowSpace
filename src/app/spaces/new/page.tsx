/**
 * 공간 생성 페이지 (서버 컴포넌트)
 *
 * 권한 확인: SuperAdmin 또는 유료 구독자만 접근 가능
 */

import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { canCreateSpace } from "@/lib/space-auth"
import {
  Container,
  Section,
  HStack,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui"
import { getText } from "@/lib/text-config"
import CreateSpaceForm from "./CreateSpaceForm"

// ============================================
// 권한 없음 안내 컴포넌트
// ============================================
function NoPermissionView() {
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
            <Button variant="outline" asChild>
              <Link href="/">{getText("BTN.SECONDARY.BACK")}</Link>
            </Button>
          </HStack>
        </Container>
      </nav>

      <Section spacing="lg">
        <Container size="sm">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">공간 생성 권한이 필요합니다</CardTitle>
              <CardDescription>
                공간을 생성하려면 유료 플랜을 구독해야 합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VStack gap="lg" className="items-center">
                <div className="rounded-full bg-muted p-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-12 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <VStack gap="sm" className="text-center">
                  <Text>
                    FlowSpace의 유료 플랜(PRO, PREMIUM)을 구독하시면
                    <br />
                    나만의 메타버스 공간을 자유롭게 생성할 수 있습니다.
                  </Text>
                  <Text tone="muted" size="sm">
                    문의: support@flowspace.com
                  </Text>
                </VStack>
                <HStack gap="default">
                  <Button variant="outline" asChild>
                    <Link href="/">홈으로 돌아가기</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/pricing">요금제 보기</Link>
                  </Button>
                </HStack>
              </VStack>
            </CardContent>
          </Card>
        </Container>
      </Section>
    </main>
  )
}

// ============================================
// 서버 컴포넌트 - 권한 확인 후 폼 렌더링
// ============================================
export default async function CreateSpacePage() {
  // 1. 인증 확인
  const session = await auth()
  if (!session?.user?.id) {
    // 로그인 페이지로 리다이렉트 (returnUrl 포함)
    redirect("/login?returnUrl=/spaces/new")
  }

  // 2. 공간 생성 권한 확인
  const hasPermission = await canCreateSpace(session.user.id)

  // 3. 권한 없으면 안내 페이지 표시
  if (!hasPermission) {
    return <NoPermissionView />
  }

  // 4. 권한 있으면 폼 표시
  return <CreateSpaceForm />
}
