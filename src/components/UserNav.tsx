"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { Button, HStack, Text } from "@/components/ui"
import { getText } from "@/lib/text-config"

export function UserNav() {
  const { data: session, status } = useSession()

  // 로딩 중
  if (status === "loading") {
    return (
      <HStack gap="md">
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </HStack>
    )
  }

  // 로그인 상태
  if (session?.user) {
    return (
      <HStack gap="md" align="center">
        {/* 사용자 정보 */}
        <HStack gap="sm" align="center" className="mr-2">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="size-8 rounded-full"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {session.user.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <Text size="sm" weight="medium" className="hidden sm:block">
            {session.user.name || session.user.email?.split("@")[0]}
          </Text>
        </HStack>

        {/* 대시보드 버튼 */}
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">{getText("BTN.NAV.DASHBOARD")}</Link>
        </Button>

        {/* 공간 만들기 버튼 */}
        <Button size="sm" asChild>
          <Link href="/spaces/new">{getText("BTN.LANDING.CREATE_SPACE")}</Link>
        </Button>

        {/* 로그아웃 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          {getText("BTN.AUTH.LOGOUT")}
        </Button>
      </HStack>
    )
  }

  // 비로그인 상태
  return (
    <HStack gap="md">
      <Button variant="ghost" asChild>
        <Link href="/login">{getText("BTN.AUTH.LOGIN")}</Link>
      </Button>
      <Button asChild>
        <Link href="/login">{getText("BTN.AUTH.SIGNUP")}</Link>
      </Button>
    </HStack>
  )
}
