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
import { getText } from "@/lib/text-config"

// ============================================
// 404 Not Found Page
// ============================================
export default function NotFound() {
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

      <Section spacing="xl">
        <Container size="sm">
          <VStack gap="xl" align="center" className="text-center">
            {/* 404 Icon */}
            <div className="flex size-24 items-center justify-center rounded-full bg-muted">
              <svg
                className="size-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <VStack gap="sm" align="center">
              <Text className="text-6xl font-bold text-primary">404</Text>
              <Heading as="h1" size="2xl">
                {getText("LID.ERROR.NOT_FOUND.TITLE")}
              </Heading>
              <Text tone="muted" className="max-w-md">
                {getText("LID.ERROR.NOT_FOUND.DESC")}
              </Text>
            </VStack>

            {/* Actions */}
            <HStack gap="default">
              <Button asChild>
                <Link href="/">{getText("BTN.ERROR.HOME")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin">대시보드</Link>
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
