import Link from "next/link"
import { auth } from "@/lib/auth"
import {
  Container,
  Section,
  Stack,
  HStack,
  VStack,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Badge,
  IconBox,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Feature Card Component
// ============================================
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="h-full transition-shadow hover:shadow-lg">
      <CardHeader>
        <IconBox size="lg" variant="subtle">
          {icon}
        </IconBox>
        <CardTitle className="mt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

// ============================================
// Template Card Component
// ============================================
function TemplateCard({
  name,
  description,
  badge,
}: {
  name: string
  description: string
  badge?: string
}) {
  return (
    <Card className="group h-full cursor-pointer transition-all hover:border-primary hover:shadow-lg">
      <CardHeader>
        <HStack justify="between" align="start">
          <CardTitle>{name}</CardTitle>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </HStack>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4 h-32 rounded-lg bg-muted transition-colors group-hover:bg-primary/10" />
      </CardContent>
    </Card>
  )
}

// ============================================
// Stat Card Component
// ============================================
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <VStack gap="sm" align="center">
      <Text weight="bold" className="text-4xl text-primary">
        {value}
      </Text>
      <Text tone="muted" size="sm">
        {label}
      </Text>
    </VStack>
  )
}

// ============================================
// Icons (Simple SVG)
// ============================================
const BrandingIcon = () => (
  <svg
    className="size-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
    />
  </svg>
)

const TemplateIcon = () => (
  <svg
    className="size-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
    />
  </svg>
)

const AccessIcon = () => (
  <svg
    className="size-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
)

const AnalyticsIcon = () => (
  <svg
    className="size-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
)

// ============================================
// Landing Page
// ============================================
export default async function LandingPage() {
  const session = await auth()

  return (
    <main>
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Container>
          <HStack justify="between" align="center" className="h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/FlowSpace_logo_transparent_clean.png" alt="FlowSpace" className="size-8 rounded-lg object-contain" />
              <Text weight="semibold" size="lg">
                FlowSpace
              </Text>
            </Link>
            <HStack gap="md">
              {session?.user ? (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/admin">{getText("BTN.NAV.DASHBOARD")}</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/spaces/new">
                      {getText("BTN.LANDING.CREATE_SPACE")}
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/login">{getText("BTN.AUTH.LOGIN")}</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/spaces/new">
                      {getText("BTN.LANDING.CREATE_SPACE")}
                    </Link>
                  </Button>
                </>
              )}
            </HStack>
          </HStack>
        </Container>
      </nav>

      {/* Hero Section */}
      <Section spacing="xl" className="pt-32">
        <Container>
          <VStack gap="xl" align="center" className="text-center">
            <Badge variant="secondary" className="px-4 py-1.5">
              WorkAdventure 기반 오픈소스
            </Badge>
            <VStack gap="md" align="center">
              <Heading as="h1" size="3xl" className="max-w-4xl md:text-5xl">
                {getText("LID.LANDING.HERO.TITLE")}
              </Heading>
              <Text
                tone="muted"
                size="xl"
                className="max-w-2xl"
              >
                {getText("LID.LANDING.HERO.SUBTITLE")}
              </Text>
            </VStack>
            <HStack gap="md" className="pt-4">
              <Button size="lg" rounded="full" asChild>
                <Link href="/spaces/new">
                  {getText("BTN.LANDING.CREATE_SPACE")}
                </Link>
              </Button>
              <Button size="lg" variant="outline" rounded="full" asChild>
                <Link href="/demo">{getText("BTN.LANDING.TRY_DEMO")}</Link>
              </Button>
            </HStack>

            {/* Stats */}
            <HStack gap="xl" className="mt-8 rounded-2xl bg-muted/50 px-12 py-8">
              <StatCard value="10분" label="공간 개설 시간" />
              <div className="h-12 w-px bg-border" />
              <StatCard value="3종" label="템플릿 제공" />
              <div className="h-12 w-px bg-border" />
              <StatCard value="무료" label="시작 비용" />
            </HStack>
          </VStack>
        </Container>
      </Section>

      {/* Features Section */}
      <Section spacing="lg" className="bg-muted/30">
        <Container>
          <VStack gap="xl">
            <VStack gap="md" align="center" className="text-center">
              <Heading as="h2" size="3xl">
                {getText("LID.LANDING.FEATURES.TITLE")}
              </Heading>
              <Text tone="muted" size="lg" className="max-w-2xl">
                ZEP 수준의 기능을 오픈소스로. 브랜딩부터 분석까지 필요한 모든 것.
              </Text>
            </VStack>
            <Grid cols={4} gap="lg">
              <GridItem>
                <FeatureCard
                  icon={<BrandingIcon />}
                  title={getText("LID.LANDING.FEATURE.BRANDING.TITLE")}
                  description={getText("LID.LANDING.FEATURE.BRANDING.DESC")}
                />
              </GridItem>
              <GridItem>
                <FeatureCard
                  icon={<TemplateIcon />}
                  title={getText("LID.LANDING.FEATURE.TEMPLATE.TITLE")}
                  description={getText("LID.LANDING.FEATURE.TEMPLATE.DESC")}
                />
              </GridItem>
              <GridItem>
                <FeatureCard
                  icon={<AccessIcon />}
                  title={getText("LID.LANDING.FEATURE.ACCESS.TITLE")}
                  description={getText("LID.LANDING.FEATURE.ACCESS.DESC")}
                />
              </GridItem>
              <GridItem>
                <FeatureCard
                  icon={<AnalyticsIcon />}
                  title={getText("LID.LANDING.FEATURE.ANALYTICS.TITLE")}
                  description={getText("LID.LANDING.FEATURE.ANALYTICS.DESC")}
                />
              </GridItem>
            </Grid>
          </VStack>
        </Container>
      </Section>

      {/* Templates Section */}
      <Section spacing="lg">
        <Container>
          <VStack gap="xl">
            <VStack gap="md" align="center" className="text-center">
              <Heading as="h2" size="3xl">
                {getText("LID.LANDING.TEMPLATES.TITLE")}
              </Heading>
            </VStack>
            <Grid cols={3} gap="lg">
              <GridItem>
                <TemplateCard
                  name={getText("LID.LANDING.TEMPLATE.OFFICE")}
                  description={getText("LID.LANDING.TEMPLATE.OFFICE.DESC")}
                  badge="인기"
                />
              </GridItem>
              <GridItem>
                <TemplateCard
                  name={getText("LID.LANDING.TEMPLATE.CLASSROOM")}
                  description={getText("LID.LANDING.TEMPLATE.CLASSROOM.DESC")}
                />
              </GridItem>
              <GridItem>
                <TemplateCard
                  name={getText("LID.LANDING.TEMPLATE.LOUNGE")}
                  description={getText("LID.LANDING.TEMPLATE.LOUNGE.DESC")}
                />
              </GridItem>
            </Grid>
          </VStack>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section spacing="lg" className="bg-primary text-primary-foreground">
        <Container>
          <VStack gap="lg" align="center" className="text-center">
            <Heading as="h2" size="3xl" className="text-primary-foreground">
              {getText("LID.LANDING.CTA.TITLE")}
            </Heading>
            <Text size="lg" className="max-w-xl opacity-90">
              {getText("LID.LANDING.CTA.SUBTITLE")}
            </Text>
            <Button
              size="lg"
              variant="outline"
              rounded="full"
              className="mt-4 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              asChild
            >
              <Link href="/spaces/new">
                {getText("BTN.LANDING.CREATE_SPACE")}
              </Link>
            </Button>
          </VStack>
        </Container>
      </Section>

      {/* Footer */}
      <footer className="border-t py-12">
        <Container>
          <HStack justify="between" align="center">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <img src="/FlowSpace_logo_transparent_clean.png" alt="FlowSpace" className="size-6 rounded object-contain" />
                <Text weight="semibold">FlowSpace</Text>
              </HStack>
              <Text tone="muted" size="sm">
                WorkAdventure 기반 오픈소스 메타버스 플랫폼
              </Text>
            </VStack>
            <Text tone="muted" size="sm">
              &copy; 2025 Flow Metaverse. All rights reserved.
            </Text>
          </HStack>
        </Container>
      </footer>
    </main>
  )
}
