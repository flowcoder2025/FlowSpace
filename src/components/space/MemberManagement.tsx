"use client"

/**
 * MemberManagement - 멤버 관리 컴포넌트 (SSOT)
 *
 * 사용처:
 * - /dashboard/spaces/[id] - OWNER/STAFF 관리 페이지
 * - /admin/spaces/[id] - SuperAdmin 관리 페이지
 *
 * 기능:
 * - 역할별 카테고리 분류 (OWNER/STAFF/PARTICIPANT)
 * - 온라인/오프라인 상태 표시
 * - 멤버 추가 (OWNER/STAFF)
 * - 권한 변경:
 *   - OWNER로 승격: OWNER 또는 SuperAdmin 가능
 *   - OWNER에서 강등: SuperAdmin만 가능
 *   - STAFF ↔ PARTICIPANT: OWNER 또는 SuperAdmin 가능
 * - 멤버 제거 (OWNER 제외)
 */

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "./RoleBadge"
import { MemberSearchInput } from "./MemberSearchInput"
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Crown,
  Shield,
  User,
  RefreshCw,
  X,
} from "lucide-react"

// ============================================
// Types
// ============================================
type SpaceRole = "OWNER" | "STAFF" | "PARTICIPANT"

interface MemberUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface GuestSession {
  id: string
  nickname: string
  avatar: string | null
}

interface Member {
  id: string
  spaceId: string
  userId: string | null
  guestSessionId: string | null
  displayName: string | null
  role: SpaceRole
  restriction: string
  user: MemberUser | null
  guestSession: GuestSession | null
  createdAt: string | Date
  updatedAt: string | Date
  isOnline?: boolean
}

interface MembersResponse {
  members: Member[]
  totalCount: number
  byRole: {
    OWNER: number
    STAFF: number
    PARTICIPANT: number
  }
  onlineCounts?: {
    OWNER: number
    STAFF: number
    PARTICIPANT: number
  }
}

interface MemberManagementProps {
  spaceId: string
  /** 현재 사용자가 SuperAdmin인지 여부 */
  isSuperAdmin?: boolean
  /** 현재 사용자가 OWNER인지 여부 */
  isOwner?: boolean
  /** 멤버 관리 권한 (권한 변경 가능) */
  canManage?: boolean
  /** 컴팩트 모드 */
  compact?: boolean
  className?: string
  /** 외부 새로고침 트리거 */
  refreshTrigger?: number
}

// ============================================
// Role 카테고리 설정
// ============================================
const roleConfig: Record<
  SpaceRole,
  { icon: React.ElementType; label: string; color: string }
> = {
  OWNER: {
    icon: Crown,
    label: "OWNER",
    color: "text-amber-400",
  },
  STAFF: {
    icon: Shield,
    label: "STAFF",
    color: "text-blue-400",
  },
  PARTICIPANT: {
    icon: User,
    label: "PARTICIPANT",
    color: "text-slate-400",
  },
}

// ============================================
// MemberManagement Component
// ============================================
export function MemberManagement({
  spaceId,
  isSuperAdmin = false,
  isOwner = false,
  canManage = false,
  compact = false,
  className,
  refreshTrigger,
}: MemberManagementProps) {
  // State
  const [members, setMembers] = useState<Member[]>([])
  const [byRole, setByRole] = useState<MembersResponse["byRole"]>({
    OWNER: 0,
    STAFF: 0,
    PARTICIPANT: 0,
  })
  const [onlineCounts, setOnlineCounts] = useState<MembersResponse["onlineCounts"]>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRoles, setExpandedRoles] = useState<Set<SpaceRole>>(
    new Set(["OWNER", "STAFF", "PARTICIPANT"])
  )
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 멤버 추가 모드
  const [addingRole, setAddingRole] = useState<SpaceRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ============================================
  // Fetch members
  // ============================================
  const fetchMembers = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(
        `/api/spaces/${spaceId}/members?includePresence=true`,
        { cache: "no-store" }
      )

      if (!res.ok) {
        throw new Error("멤버 목록을 불러오는데 실패했습니다")
      }

      const data: MembersResponse = await res.json()
      setMembers(data.members)
      setByRole(data.byRole)
      setOnlineCounts(data.onlineCounts)
    } catch (err) {
      console.error("[MemberManagement] Fetch error:", err)
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [spaceId])

  // Initial fetch
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers, refreshTrigger])

  // ============================================
  // Handlers
  // ============================================

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchMembers()
  }

  // Toggle role expansion
  const toggleRole = (role: SpaceRole) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(role)) {
        newSet.delete(role)
      } else {
        newSet.add(role)
      }
      return newSet
    })
  }

  // 멤버 추가
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
      console.error("[MemberManagement] Add member failed:", err)
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 역할 변경
  const handleChangeRole = async (userId: string, newRole: SpaceRole) => {
    if (!confirm(`역할을 ${newRole}로 변경하시겠습니까?`)) return

    try {
      setIsSubmitting(true)

      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "권한 변경에 실패했습니다")
        return
      }

      // Refresh members
      await fetchMembers()
    } catch (err) {
      console.error("[MemberManagement] Role change error:", err)
      alert(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 멤버 제거
  const handleRemoveMember = async (userId: string, memberRole: SpaceRole) => {
    // OWNER는 제거 불가 - 역할 변경 안내
    if (memberRole === "OWNER") {
      alert("OWNER는 직접 제거할 수 없습니다. STAFF로 역할 변경 후 제거해주세요.")
      return
    }

    if (!confirm("이 멤버를 제거하시겠습니까?")) return

    try {
      setIsSubmitting(true)

      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "멤버 제거에 실패했습니다.")
        return
      }

      fetchMembers()
    } catch (err) {
      console.error("[MemberManagement] Remove member failed:", err)
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Helper functions
  // ============================================
  const getDisplayName = (member: Member): string => {
    if (member.displayName) return member.displayName
    if (member.user?.name) return member.user.name
    if (member.guestSession?.nickname) return member.guestSession.nickname
    return "알 수 없음"
  }

  const getEmail = (member: Member): string | null => {
    return member.user?.email || null
  }

  const getAvatarUrl = (member: Member): string | null => {
    return member.user?.image || null
  }

  const getInitials = (member: Member): string => {
    const name = getDisplayName(member)
    return name.charAt(0).toUpperCase()
  }

  // Group members by role
  const membersByRole: Record<SpaceRole, Member[]> = {
    OWNER: members.filter((m) => m.role === "OWNER"),
    STAFF: members.filter((m) => m.role === "STAFF"),
    PARTICIPANT: members.filter((m) => m.role === "PARTICIPANT"),
  }

  // Total online count
  const totalOnline = onlineCounts
    ? onlineCounts.OWNER + onlineCounts.STAFF + onlineCounts.PARTICIPANT
    : members.filter((m) => m.isOnline).length

  // 권한 체크: 멤버 편집 가능 여부
  const canEditMember = (member: Member): boolean => {
    if (!canManage) return false
    // SuperAdmin은 모든 멤버 편집 가능
    if (isSuperAdmin) return true
    // OWNER는 OWNER 외 멤버 편집 가능
    if (isOwner && member.role !== "OWNER") return true
    return false
  }

  // ============================================
  // Loading state
  // ============================================
  if (isLoading) {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    )
  }

  // ============================================
  // Error state
  // ============================================
  if (error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    )
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
            멤버 관리
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            총 {members.length}명 |{" "}
            <span className="text-green-500">🟢 온라인 {totalOnline}명</span> |{" "}
            <span className="text-slate-500">⚫ 오프라인 {members.length - totalOnline}명</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>

          {/* 멤버 추가 버튼 */}
          {canManage && !addingRole && (
            <div className="flex items-center gap-1">
              {/* OWNER 추가: OWNER 또는 SuperAdmin */}
              {(isSuperAdmin || isOwner) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingRole("OWNER")}
                  className={cn(
                    compact ? "h-7 text-xs px-2" : "h-8",
                    "text-amber-400 border-amber-400/50 hover:bg-amber-400/10 hover:text-amber-400"
                  )}
                >
                  + OWNER
                </Button>
              )}
              {/* STAFF 추가: SuperAdmin 또는 OWNER */}
              {(isSuperAdmin || isOwner) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingRole("STAFF")}
                  className={cn(
                    compact ? "h-7 text-xs px-2" : "h-8",
                    "text-blue-400 border-blue-400/50 hover:bg-blue-400/10 hover:text-blue-400"
                  )}
                >
                  + STAFF
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Role Categories */}
      <div className="space-y-2">
        {(["OWNER", "STAFF", "PARTICIPANT"] as SpaceRole[]).map((role) => {
          const config = roleConfig[role]
          const Icon = config.icon
          const roleMembers = membersByRole[role]
          const isExpanded = expandedRoles.has(role)
          const onlineCount = onlineCounts?.[role] ?? roleMembers.filter((m) => m.isOnline).length

          return (
            <div
              key={role}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleRole(role)}
                className={cn(
                  "w-full flex items-center justify-between p-3",
                  "bg-muted/50 hover:bg-muted transition-colors",
                  "text-left"
                )}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className={cn("font-medium text-sm", config.color)}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({byRole[role]})
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  온라인 {onlineCount}/{byRole[role]}
                </span>
              </button>

              {/* Member List */}
              {isExpanded && (
                <div className="divide-y divide-border">
                  {roleMembers.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">
                      멤버가 없습니다
                    </p>
                  ) : (
                    roleMembers.map((member) => (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center justify-between p-3",
                          "hover:bg-muted/30 transition-colors"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Online Status Indicator */}
                          <Circle
                            className={cn(
                              "h-2.5 w-2.5 fill-current",
                              member.isOnline
                                ? "text-green-500"
                                : "text-slate-500"
                            )}
                          />

                          {/* Avatar */}
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getAvatarUrl(member) || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Name & Email */}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getDisplayName(member)}
                            </p>
                            {getEmail(member) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {getEmail(member)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <RoleBadge role={member.role} size="sm" />

                          {/* 역할 변경 UI */}
                          {canEditMember(member) && member.userId && (
                            <div className="flex items-center gap-1">
                              {/* OWNER 역할 변경: SuperAdmin만 */}
                              {member.role === "OWNER" && isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleChangeRole(member.userId!, "STAFF")}
                                  disabled={isSubmitting}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  STAFF로
                                </Button>
                              )}

                              {/* STAFF 역할 변경 */}
                              {member.role === "STAFF" && (
                                <>
                                  {/* STAFF → OWNER: OWNER 또는 SuperAdmin */}
                                  {(isSuperAdmin || isOwner) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleChangeRole(member.userId!, "OWNER")}
                                      disabled={isSubmitting}
                                      className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                    >
                                      OWNER로
                                    </Button>
                                  )}
                                  {/* STAFF → PARTICIPANT: OWNER 또는 SuperAdmin */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChangeRole(member.userId!, "PARTICIPANT")}
                                    disabled={isSubmitting}
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    참가자로
                                  </Button>
                                </>
                              )}

                              {/* PARTICIPANT 역할 변경 */}
                              {member.role === "PARTICIPANT" && (
                                <>
                                  {/* PARTICIPANT → OWNER: OWNER 또는 SuperAdmin */}
                                  {(isSuperAdmin || isOwner) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleChangeRole(member.userId!, "OWNER")}
                                      disabled={isSubmitting}
                                      className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                    >
                                      OWNER로
                                    </Button>
                                  )}
                                  {/* PARTICIPANT → STAFF: OWNER 또는 SuperAdmin */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleChangeRole(member.userId!, "STAFF")}
                                    disabled={isSubmitting}
                                    className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                  >
                                    STAFF로
                                  </Button>
                                </>
                              )}

                              {/* 멤버 제거 버튼: OWNER 제외 */}
                              {member.role !== "OWNER" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.userId!, member.role)}
                                  disabled={isSubmitting}
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
