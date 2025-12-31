/**
 * 요금제 페이지
 *
 * ROADMAP 1순위: NoPermissionView에서 링크됨
 * 플랜: FREE, PRO, PREMIUM
 */

import Link from "next/link"
import {
  Container,
  Section,
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
  CardFooter,
  CardTitle,
  CardDescription,
  Badge,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// 플랜 데이터 정의
// ============================================
interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  tier: "FREE" | "PRO" | "PREMIUM"
  name: string
  price: string
  period: string
  description: string
  features: PlanFeature[]
  cta: string
  ctaVariant: "outline" | "default"
  highlighted: boolean
}

const PLANS: Plan[] = [
  {
    tier: "FREE",
    name: getText("LID.PRICING.PLAN.FREE"),
    price: "₩0",
    period: getText("LID.PRICING.PERIOD.MONTH"),
    description: getText("LID.PRICING.FREE.DESC"),
    features: [
      { text: getText("LID.PRICING.FEATURE.JOIN_SPACE"), included: true },
      { text: getText("LID.PRICING.FEATURE.BASIC_AVATAR"), included: true },
      { text: getText("LID.PRICING.FEATURE.CHAT"), included: true },
      { text: getText("LID.PRICING.FEATURE.VOICE_VIDEO"), included: true },
      { text: getText("LID.PRICING.FEATURE.CREATE_SPACE"), included: false },
      { text: getText("LID.PRICING.FEATURE.BRANDING"), included: false },
    ],
    cta: getText("BTN.PRICING.START_FREE"),
    ctaVariant: "outline",
    highlighted: false,
  },
  {
    tier: "PRO",
    name: getText("LID.PRICING.PLAN.PRO"),
    price: "₩9,900",
    period: getText("LID.PRICING.PERIOD.MONTH"),
    description: getText("LID.PRICING.PRO.DESC"),
    features: [
      { text: getText("LID.PRICING.FEATURE.JOIN_SPACE"), included: true },
      { text: getText("LID.PRICING.FEATURE.CUSTOM_AVATAR"), included: true },
      { text: getText("LID.PRICING.FEATURE.CHAT"), included: true },
      { text: getText("LID.PRICING.FEATURE.VOICE_VIDEO"), included: true },
      { text: getText("LID.PRICING.FEATURE.CREATE_SPACE_3"), included: true },
      { text: getText("LID.PRICING.FEATURE.BASIC_BRANDING"), included: true },
      { text: getText("LID.PRICING.FEATURE.STATS"), included: true },
    ],
    cta: getText("BTN.PRICING.START_PRO"),
    ctaVariant: "default",
    highlighted: true,
  },
  {
    tier: "PREMIUM",
    name: getText("LID.PRICING.PLAN.PREMIUM"),
    price: "₩29,900",
    period: getText("LID.PRICING.PERIOD.MONTH"),
    description: getText("LID.PRICING.PREMIUM.DESC"),
    features: [
      { text: getText("LID.PRICING.FEATURE.JOIN_SPACE"), included: true },
      { text: getText("LID.PRICING.FEATURE.CUSTOM_AVATAR"), included: true },
      { text: getText("LID.PRICING.FEATURE.CHAT"), included: true },
      { text: getText("LID.PRICING.FEATURE.VOICE_VIDEO"), included: true },
      { text: getText("LID.PRICING.FEATURE.CREATE_SPACE_UNLIMITED"), included: true },
      { text: getText("LID.PRICING.FEATURE.ADVANCED_BRANDING"), included: true },
      { text: getText("LID.PRICING.FEATURE.ADVANCED_STATS"), included: true },
      { text: getText("LID.PRICING.FEATURE.PRIORITY_SUPPORT"), included: true },
      { text: getText("LID.PRICING.FEATURE.API_ACCESS"), included: true },
    ],
    cta: getText("BTN.PRICING.START_PREMIUM"),
    ctaVariant: "outline",
    highlighted: false,
  },
]

// ============================================
// 플랜 카드 컴포넌트
// ============================================
function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Card
      className={`relative flex flex-col ${
        plan.highlighted
          ? "border-primary ring-2 ring-primary/20 scale-105"
          : "border-border"
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default">{getText("LID.PRICING.RECOMMENDED")}</Badge>
        </div>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {/* 가격 */}
        <div className="text-center mb-6">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">{plan.period}</span>
        </div>

        {/* 기능 목록 */}
        <VStack gap="sm" className="text-sm">
          {plan.features.map((feature, index) => (
            <HStack key={index} gap="sm" align="start">
              {feature.included ? (
                <svg
                  className="size-5 text-primary shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="size-5 text-muted-foreground/50 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <Text
                className={
                  feature.included ? "" : "text-muted-foreground/50 line-through"
                }
              >
                {feature.text}
              </Text>
            </HStack>
          ))}
        </VStack>
      </CardContent>

      <CardFooter>
        <Button
          variant={plan.ctaVariant}
          className="w-full"
          asChild
        >
          <Link href={plan.tier === "FREE" ? "/login" : "/login?plan=" + plan.tier.toLowerCase()}>
            {plan.cta}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

// ============================================
// 메인 페이지 컴포넌트
// ============================================
export default function PricingPage() {
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
            <HStack gap="default">
              <Button variant="outline" asChild>
                <Link href="/login">{getText("BTN.AUTH.LOGIN")}</Link>
              </Button>
            </HStack>
          </HStack>
        </Container>
      </nav>

      {/* Hero Section */}
      <Section spacing="lg">
        <Container size="lg">
          <VStack gap="xl" className="text-center">
            <VStack gap="default">
              <Heading as="h1" size="3xl">
                {getText("LID.PRICING.TITLE")}
              </Heading>
              <Text tone="muted" size="lg" className="max-w-2xl mx-auto">
                {getText("LID.PRICING.SUBTITLE")}
              </Text>
            </VStack>

            {/* 플랜 카드 그리드 */}
            <Grid cols={3} gap="lg" className="w-full max-w-5xl mx-auto items-stretch">
              {PLANS.map((plan) => (
                <GridItem key={plan.tier} className="flex">
                  <PlanCard plan={plan} />
                </GridItem>
              ))}
            </Grid>

            {/* 추가 안내 */}
            <VStack gap="sm" className="text-center pt-8">
              <Text tone="muted">
                {getText("LID.PRICING.CONTACT_INFO")}
              </Text>
              <Button variant="outline" asChild>
                <Link href="mailto:support@flowspace.com">
                  {getText("BTN.PRICING.CONTACT")}
                </Link>
              </Button>
            </VStack>
          </VStack>
        </Container>
      </Section>

      {/* FAQ Section (간단 버전) */}
      <Section spacing="default" className="bg-background">
        <Container size="md">
          <VStack gap="lg">
            <Heading as="h2" size="2xl" className="text-center">
              {getText("LID.PRICING.FAQ.TITLE")}
            </Heading>

            <VStack gap="default">
              {/* FAQ 항목 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {getText("LID.PRICING.FAQ.Q1")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Text tone="muted" size="sm">
                    {getText("LID.PRICING.FAQ.A1")}
                  </Text>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {getText("LID.PRICING.FAQ.Q2")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Text tone="muted" size="sm">
                    {getText("LID.PRICING.FAQ.A2")}
                  </Text>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {getText("LID.PRICING.FAQ.Q3")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Text tone="muted" size="sm">
                    {getText("LID.PRICING.FAQ.A3")}
                  </Text>
                </CardContent>
              </Card>
            </VStack>
          </VStack>
        </Container>
      </Section>

      {/* Footer CTA */}
      <Section spacing="lg" className="bg-primary/5">
        <Container size="sm">
          <VStack gap="default" className="text-center">
            <Heading as="h2" size="2xl">
              {getText("LID.PRICING.CTA.TITLE")}
            </Heading>
            <Text tone="muted">
              {getText("LID.PRICING.CTA.SUBTITLE")}
            </Text>
            <Button asChild>
              <Link href="/login">{getText("BTN.CTA.START")}</Link>
            </Button>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
