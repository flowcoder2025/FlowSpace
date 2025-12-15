/**
 * Admin Space Detail Layout - 공간 상세 페이지 권한 체크
 *
 * /admin/spaces/[id] 및 하위 페이지에 대한 서버 사이드 권한 검증
 *
 * 권한 계층:
 * - 상위 admin/layout.tsx에서 SuperAdmin 체크 완료
 * - 이 layout에서 추가로 공간 존재 여부 및 접근 가능성 검증
 */

import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function AdminSpaceDetailLayout({
  children,
  params,
}: LayoutProps) {
  const { id: spaceId } = await params

  // 1. 공간 ID 형식 검증
  if (!spaceId || spaceId.length > 100) {
    notFound()
  }

  // 2. 공간 존재 확인 (삭제되지 않은 공간만)
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      deletedAt: true,
      status: true,
    },
  })

  if (!space) {
    notFound()
  }

  // 3. 삭제된 공간 접근 방지 (관리자도 별도 복구 페이지 필요)
  if (space.deletedAt) {
    // 삭제된 공간은 별도 처리 페이지로 리다이렉트
    redirect(`/admin?error=space_deleted&spaceId=${spaceId}`)
  }

  // 4. 공간 유효 → 자식 렌더링
  return <>{children}</>
}
