"use client"

import { useRouter } from "next/navigation"
import { HStack, Text, Button } from "@/components/ui"

interface SpaceHeaderProps {
  spaceName: string
  spaceLogoUrl?: string | null
  spacePrimaryColor?: string | null
  userNickname: string
  onExit: () => void
}

export function SpaceHeader({
  spaceName,
  spaceLogoUrl,
  spacePrimaryColor,
  userNickname,
  onExit,
}: SpaceHeaderProps) {
  return (
    <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <HStack gap="sm">
        {spaceLogoUrl ? (
          <img
            src={spaceLogoUrl}
            alt={spaceName}
            className="size-8 rounded object-cover"
          />
        ) : (
          <div
            className="size-8 rounded"
            style={{ backgroundColor: spacePrimaryColor || "hsl(var(--primary))" }}
          />
        )}
        <Text weight="semibold">{spaceName}</Text>
      </HStack>

      <HStack gap="sm">
        <Text size="sm" tone="muted">
          {userNickname}
        </Text>
        <Button variant="outline" size="sm" onClick={onExit}>
          나가기
        </Button>
      </HStack>
    </header>
  )
}
