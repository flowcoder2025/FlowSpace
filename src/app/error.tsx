"use client"

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
import { getText } from "@/lib/text-config"

// ============================================
// Error Page
// ============================================
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console (or send to error reporting service)
    console.error("Application error:", error)
  }, [error])

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

      <Section spacing="xl">
        <Container size="sm">
          <VStack gap="xl" align="center" className="text-center">
            {/* Error Icon */}
            <div className="flex size-24 items-center justify-center rounded-full bg-destructive/10">
              <svg
                className="size-12 text-destructive"
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
                {getText("LID.ERROR.GENERAL.TITLE")}
              </Heading>
              <Text tone="muted" className="max-w-md">
                {getText("LID.ERROR.GENERAL.DESC")}
              </Text>
            </VStack>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === "development" && (
              <div className="w-full max-w-md rounded-lg bg-muted p-4 text-left">
                <Text size="sm" weight="medium" className="mb-2">
                  Error Details:
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
            <HStack gap="default">
              <Button onClick={reset} variant="outline">
                {getText("BTN.ERROR.RETRY")}
              </Button>
              <Button asChild>
                <Link href="/">{getText("BTN.ERROR.HOME")}</Link>
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Section>
    </main>
  )
}
