/**
 * Admin Layout - SuperAdmin 전용 접근 제어
 *
 * /admin 및 하위 모든 페이지는 isSuperAdmin=true인 사용자만 접근 가능
 * 권한이 없으면 / 또는 /dashboard로 리다이렉트
 */

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. 세션 확인
  const session = await auth()

  if (!session?.user?.id) {
    // 로그인 안 됨 → 로그인 페이지로
    redirect("/login?callbackUrl=/admin")
  }

  // 2. SuperAdmin 권한 확인
  const isAdmin = await isSuperAdmin(session.user.id)

  if (!isAdmin) {
    // SuperAdmin이 아님 → 홈으로 리다이렉트
    // TODO: Phase 3에서 /dashboard로 변경
    redirect("/?error=unauthorized")
  }

  // 3. SuperAdmin 확인됨 → 자식 렌더링
  return <>{children}</>
}
