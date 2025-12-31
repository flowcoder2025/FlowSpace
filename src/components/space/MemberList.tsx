"use client"

/**
 * MemberList - 공용 멤버 목록 컴포넌트
 *
 * 사용처:
 * - Admin Dashboard: 공간 관리 페이지 멤버 섹션
 * - Space: 공간 내 멤버 패널
 *
 * 기능:
 * - 전체 멤버 목록 조회 (OWNER/STAFF/PARTICIPANT)
 * - 역할별 그룹핑
 * - SuperAdmin: OWNER 임명
 * - OWNER: STAFF 임명/해제
 * - 온라인/오프라인 상태 표시
 */

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "./RoleBadge"
import { MemberSearchInput } from "./MemberSearchInput"
import type { SpaceRole } from "@prisma/client"

// ============================================
// Types
// ============================================
interface MemberUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface SpaceMember {
  id: string
  spaceId: string
  userId: string | null
  guestSessionId: string | null
  displayName: string | null
  role: SpaceRole
  restriction: string
  user: MemberUser | null
  guestSession: {
    id: string
    nickname: string
    avatar: string
  } | null
  createdAt: string
  updatedAt: string
}

interface MembersResponse {
  members: SpaceMember[]
  totalCount: number
  byRole: {
    OWNER: number
    STAFF: number
    PARTICIPANT: number
  }
}

interface MemberListProps {
  spaceId: string
  className?: string
  /** 컴팩트 모드 (Space 내 패널용) */
  compact?: boolean
  /** 현재 사용자가 SuperAdmin인지 */
  isSuperAdmin?: boolean
  /** 현재 사용자가 OWNER인지 */
  isOwner?: boolean
  /** 온라인 사용자 ID 목록 */
  onlineUserIds?: string[]
  /** 외부에서 트리거하는 새로고침 */
  refreshTrigger?: number
  /** 읽기 전용 모드 */
  readOnly?: boolean
}

// ============================================
// MemberList Component
// ============================================
export function MemberList({
  spaceId,
  className,
  compact = false,
  isSuperAdmin = false,
  isOwner = false,
  onlineUserIds = [],
  refreshTrigger,
  readOnly = false,
}: MemberListProps) {
  const [data, setData] = useState<MembersResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 역할 추가 모드
  const [addingRole, setAddingRole] = useState<SpaceRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ============================================
  // 멤버 목록 조회
  // ============================================
  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/spaces/${spaceId}/members`)

      if (!res.ok) {
        if (res.status === 403) {
          setError("멤버 조회 권한이 없습니다.")
        } else if (res.status === 404) {
          setError("공간을 찾을 수 없습니다.")
        } else {
          setError("멤버 목록을 불러오는데 실패했습니다.")
        }
        return
      }

      const result: MembersResponse = await res.json()
      setData(result)
    } catch (err) {
      console.error("[MemberList] Failed to fetch members:", err)
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers, refreshTrigger])

  // ============================================
  // 역할 추가/변경
  // ============================================
  const handleAddMember = async (user: { id: string; name: string | null; email: string }) => {
    if (!addingRole) return

    try {
      setIsSubmitting(true)

      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: addingRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "멤버 추가에 실패했습니다.")
        return
      }

      // 성공 - 폼 닫고 목록 새로고침
      setAddingRole(null)
      fetchMembers()
    } catch (err) {
      console.error("[MemberList] Add member failed:", err)
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // 역할 변경
  // ============================================
  const handleChangeRole = async (userId: string, newRole: SpaceRole) => {
    if (!confirm(`역할을 ${newRole}로 변경하시겠습니까?`)) return

    try {
      setIsSubmitting(true)

      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "역할 변경에 실패했습니다.")
        return
      }

      fetchMembers()
    } catch (err) {
      console.error("[MemberList] Change role failed:", err)
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // 역할 제거
  // ============================================
  const handleRemoveRole = async (userId: string) => {
    if (!confirm("이 멤버의 역할을 제거하시겠습니까?")) return

    try {
      setIsSubmitting(true)

      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "역할 제거에 실패했습니다.")
        return
      }

      fetchMembers()
    } catch (err) {
      console.error("[MemberList] Remove role failed:", err)
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // 역할별 멤버 그룹핑
  // ============================================
  const groupedMembers = {
    OWNER: data?.members.filter((m) => m.role === "OWNER") || [],
    STAFF: data?.members.filter((m) => m.role === "STAFF") || [],
    PARTICIPANT: data?.members.filter((m) => m.role === "PARTICIPANT") || [],
  }

  // ============================================
  // 멤버 카드 렌더링
  // ============================================
  const renderMemberCard = (member: SpaceMember) => {
    const name = member.user?.name || member.guestSession?.nickname || "알 수 없음"
    const email = member.user?.email || null
    const image = member.user?.image || null
    const isOnline = member.userId ? onlineUserIds.includes(member.userId) : false
    const canEdit = !readOnly && (isSuperAdmin || (isOwner && member.role !== "OWNER"))

    return (
      <div
        key={member.id}
        className={cn(
          "flex items-center justify-between",
          "rounded border border-border/50 bg-background/50",
          compact ? "px-2 py-1.5" : "px-3 py-2"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* 온라인 상태 + 프로필 이미지 */}
          <div className="relative">
            {image ? (
              <img
                src={image}
                alt=""
                className={cn("rounded-full", compact ? "size-6" : "size-8")}
              />
            ) : (
              <div
                className={cn(
                  "rounded-full bg-muted flex items-center justify-center text-xs text-foreground/70",
                  compact ? "size-6" : "size-8"
                )}
              >
                {name[0] || "?"}
              </div>
            )}
            {/* 온라인 인디케이터 */}
            <span
              className={cn(
                "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background",
                isOnline ? "bg-green-500" : "bg-gray-400"
              )}
            />
          </div>

          {/* 이름, 이메일, 공간명 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  "font-medium text-foreground truncate",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {name}
              </p>
              {member.displayName && (
                <span className="text-xs text-primary truncate">
                  ({member.displayName})
                </span>
              )}
            </div>
            {!compact && email && (
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            )}
          </div>

          {/* 역할 뱃지 */}
          <RoleBadge role={member.role} size={compact ? "sm" : "default"} />
        </div>

        {/* 액션 버튼 */}
        {canEdit && (
          <div className="flex items-center gap-1 ml-2">
            {/* OWNER → STAFF 강등 (SuperAdmin만) */}
            {member.role === "OWNER" && isSuperAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleChangeRole(member.userId!, "STAFF")}
                disabled={isSubmitting}
                className={cn(
                  "text-xs text-muted-foreground hover:text-foreground",
                  compact ? "h-6 px-1.5" : "h-7 px-2"
                )}
              >
                STAFF로
              </Button>
            )}

            {/* STAFF → PARTICIPANT 강등 */}
            {member.role === "STAFF" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRole(member.userId!)}
                disabled={isSubmitting}
                className={cn(
                  "text-destructive hover:text-destructive hover:bg-destructive/10",
                  compact ? "h-6 px-1.5" : "h-7 px-2"
                )}
              >
                제거
              </Button>
            )}

            {/* PARTICIPANT → STAFF 승급 */}
            {member.role === "PARTICIPANT" && member.userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleChangeRole(member.userId!, "STAFF")}
                disabled={isSubmitting}
                className={cn(
                  "text-xs text-muted-foreground hover:text-foreground",
                  compact ? "h-6 px-1.5" : "h-7 px-2"
                )}
              >
                STAFF로
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4", className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            "font-semibold text-foreground",
            compact ? "text-sm" : "text-base"
          )}
        >
          멤버 관리
          {data && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({data.totalCount}명)
            </span>
          )}
        </h3>

        {/* 추가 버튼 */}
        {!readOnly && !addingRole && (
          <div className="flex items-center gap-1">
            {/* OWNER 추가: OWNER 또는 SuperAdmin */}
            {(isSuperAdmin || isOwner) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingRole("OWNER")}
                className={cn(
                  compact ? "h-7 text-xs px-2" : "",
                  "text-amber-400 border-amber-400/50 hover:bg-amber-400/10 hover:text-amber-400"
                )}
              >
                + OWNER
              </Button>
            )}
            {(isSuperAdmin || isOwner) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingRole("STAFF")}
                className={cn(
                  compact ? "h-7 text-xs px-2" : "",
                  "text-blue-400 border-blue-400/50 hover:bg-blue-400/10 hover:text-blue-400"
                )}
              >
                + STAFF
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* 멤버 추가 폼 */}
      {addingRole && (
        <div
          className={cn(
            "border border-border rounded-lg bg-muted/30",
            compact ? "p-2" : "p-4"
          )}
        >
          <p className="text-xs font-medium text-foreground/80 mb-2">
            {addingRole === "OWNER" ? "OWNER" : "STAFF"}로 추가할 사용자 검색
          </p>
          <MemberSearchInput
            spaceId={spaceId}
            compact={compact}
            onSelect={handleAddMember}
            onCancel={() => setAddingRole(null)}
            placeholder="이메일 또는 이름으로 검색..."
          />
        </div>
      )}

      {/* 로딩 */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">로딩중...</p>
      ) : (
        <>
          {/* OWNER 그룹 */}
          {groupedMembers.OWNER.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-amber-400 mb-1">
                OWNER ({groupedMembers.OWNER.length})
              </p>
              {groupedMembers.OWNER.map(renderMemberCard)}
            </div>
          )}

          {/* STAFF 그룹 */}
          {groupedMembers.STAFF.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-blue-400 mb-1">
                STAFF ({groupedMembers.STAFF.length})
              </p>
              {groupedMembers.STAFF.map(renderMemberCard)}
            </div>
          )}

          {/* PARTICIPANT 그룹 */}
          {groupedMembers.PARTICIPANT.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-slate-400 mb-1">
                참가자 ({groupedMembers.PARTICIPANT.length})
              </p>
              {groupedMembers.PARTICIPANT.map(renderMemberCard)}
            </div>
          )}

          {/* 빈 상태 */}
          {data?.totalCount === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              등록된 멤버가 없습니다.
            </p>
          )}
        </>
      )}
    </div>
  )
}
