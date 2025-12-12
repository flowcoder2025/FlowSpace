/**
 * Dashboard Layout - 인증된 사용자 전용
 *
 * /dashboard 및 하위 모든 페이지는 로그인한 사용자만 접근 가능
 * Owner/Staff가 관리하는 공간을 확인하는 대시보드
 */

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 세션 확인
  const session = await auth()

  if (!session?.user?.id) {
    // 로그인 안 됨 → 로그인 페이지로
    redirect("/login?callbackUrl=/dashboard")
  }

  // 로그인됨 → 자식 렌더링
  return <>{children}</>
}
