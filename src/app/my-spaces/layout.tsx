/**
 * My Spaces Layout - 인증된 사용자 전용
 *
 * /my-spaces 페이지는 로그인한 사용자만 접근 가능
 * 참여 중인 모든 공간 목록을 보여주는 페이지
 */

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function MySpacesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 세션 확인
  const session = await auth()

  if (!session?.user?.id) {
    // 로그인 안 됨 → 로그인 페이지로
    redirect("/login?callbackUrl=/my-spaces")
  }

  // 로그인됨 → 자식 렌더링
  return <>{children}</>
}
