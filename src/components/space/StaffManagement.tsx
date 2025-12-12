"use client"

/**
 * StaffManagement - 공용 스태프 관리 컴포넌트 (SSOT)
 *
 * 사용처:
 * - Space: FloatingChatOverlay 설정 패널
 * - Admin: 공간 관리 페이지 스태프 섹션
 *
 * 기능:
 * - 현재 스태프 목록 조회
 * - 스태프 추가 (이메일로 검색)
 * - 스태프 제거
 */

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ============================================
// Types
// ============================================
interface StaffMember {
  id: string
  userId: string
  role: string
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  createdAt: string
}

interface StaffManagementProps {
  spaceId: string
  className?: string
  /** 컴팩트 모드 (Space 내 패널용) */
  compact?: boolean
  /** 외부에서 트리거하는 새로고침 */
  refreshTrigger?: number
}

// ============================================
// StaffManagement Component
// ============================================
export function StaffManagement({
  spaceId,
  className,
  compact = false,
  refreshTrigger,
}: StaffManagementProps) {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 스태프 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchEmail, setSearchEmail] = useState("")
  const [searchResult, setSearchResult] = useState<{
    id: string
    name: string | null
    email: string | null
    image?: string | null
  } | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  // ============================================
  // 스태프 목록 조회
  // ============================================
  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/spaces/${spaceId}/members`)

      if (!res.ok) {
        if (res.status === 403) {
          setError("스태프 관리 권한이 없습니다.")
        } else {
          setError("스태프 목록을 불러오는데 실패했습니다.")
        }
        return
      }

      const data = await res.json()
      setMembers(data.members || [])
    } catch (err) {
      console.error("[StaffManagement] Failed to fetch members:", err)
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [spaceId])

  // 초기 로드 및 refreshTrigger 변경 시 새로고침
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers, refreshTrigger])

  // ============================================
  // 사용자 검색
  // ============================================
  const handleSearch = async () => {
    if (!searchEmail.trim()) return

    try {
      setIsSearching(true)
      setSearchError(null)
      setSearchResult(null)

      const res = await fetch(
        `/api/users/search?email=${encodeURIComponent(searchEmail.trim())}`
      )

      if (!res.ok) {
        if (res.status === 404) {
          setSearchError("해당 이메일의 사용자를 찾을 수 없습니다.")
        } else {
          setSearchError("사용자 검색에 실패했습니다.")
        }
        return
      }

      const data = await res.json()
      setSearchResult(data.user)
    } catch (err) {
      console.error("[StaffManagement] Search failed:", err)
      setSearchError("네트워크 오류가 발생했습니다.")
    } finally {
      setIsSearching(false)
    }
  }

  // ============================================
  // 스태프 추가
  // ============================================
  const handleAddStaff = async () => {
    if (!searchResult) return

    try {
      setIsAdding(true)

      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: searchResult.id,
          role: "STAFF",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setSearchError(data.error || "스태프 추가에 실패했습니다.")
        return
      }

      // 성공 - 폼 초기화 및 목록 새로고침
      setShowAddForm(false)
      setSearchEmail("")
      setSearchResult(null)
      fetchMembers()
    } catch (err) {
      console.error("[StaffManagement] Add staff failed:", err)
      setSearchError("네트워크 오류가 발생했습니다.")
    } finally {
      setIsAdding(false)
    }
  }

  // ============================================
  // 스태프 제거
  // ============================================
  const handleRemoveStaff = async (userId: string) => {
    if (!confirm("이 스태프를 제거하시겠습니까?")) return

    try {
      setIsRemoving(userId)

      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "스태프 제거에 실패했습니다.")
        return
      }

      // 성공 - 목록 새로고침
      fetchMembers()
    } catch (err) {
      console.error("[StaffManagement] Remove staff failed:", err)
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setIsRemoving(null)
    }
  }

  // ============================================
  // 폼 초기화
  // ============================================
  const resetForm = () => {
    setShowAddForm(false)
    setSearchEmail("")
    setSearchResult(null)
    setSearchError(null)
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div
      className={cn(
        "flex flex-col",
        compact ? "gap-2" : "gap-4",
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className={cn(
          "font-semibold text-white",
          compact ? "text-sm" : "text-base"
        )}>
          스태프 관리
        </h3>
        {!showAddForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className={cn(
              compact ? "h-7 text-xs px-2" : "",
              "text-white border-white/50 hover:bg-white/10 hover:text-white"
            )}
          >
            + 추가
          </Button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* 스태프 추가 폼 */}
      {showAddForm && (
        <div className={cn(
          "border border-border rounded-lg bg-muted/30",
          compact ? "p-2" : "p-4"
        )}>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-foreground/80 font-medium">
              추가할 사용자의 이메일
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="example@email.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => {
                  // 🔒 모든 키 입력이 게임 엔진으로 전파되지 않도록 차단
                  e.stopPropagation()
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                className={cn(
                  compact ? "h-8 text-xs" : "",
                  "bg-background/80 text-foreground border-border/50"
                )}
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleSearch}
                disabled={isSearching || !searchEmail.trim()}
                className={cn(
                  compact ? "h-8 text-xs px-2" : "",
                  "font-medium"
                )}
              >
                {isSearching ? "검색중..." : "검색"}
              </Button>
            </div>

            {/* 검색 에러 */}
            {searchError && (
              <p className="text-xs text-destructive">{searchError}</p>
            )}

            {/* 검색 결과 */}
            {searchResult && (
              <div className="flex items-center justify-between mt-2 p-2 bg-background/80 rounded border border-border/50">
                <div className="flex items-center gap-2">
                  {searchResult.image ? (
                    <img
                      src={searchResult.image}
                      alt=""
                      className="size-8 rounded-full"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs text-foreground/70">
                      {searchResult.name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {searchResult.name || "이름 없음"}
                    </p>
                    <p className="text-xs text-foreground/70">
                      {searchResult.email}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddStaff}
                  disabled={isAdding}
                  className={compact ? "h-7 text-xs" : ""}
                >
                  {isAdding ? "추가중..." : "스태프 추가"}
                </Button>
              </div>
            )}

            {/* 취소 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className={cn(
                "mt-1 font-medium",
                compact ? "h-7 text-xs" : "",
                "text-foreground/80 hover:text-foreground border-border/50 hover:bg-muted/50"
              )}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* 스태프 목록 */}
      <div className="flex flex-col gap-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-2">로딩중...</p>
        ) : members.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            등록된 스태프가 없습니다.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className={cn(
                "flex items-center justify-between",
                "rounded border border-border/50 bg-background/50",
                compact ? "px-2 py-1.5" : "px-3 py-2"
              )}
            >
              <div className="flex items-center gap-2">
                {member.user.image ? (
                  <img
                    src={member.user.image}
                    alt=""
                    className={cn(
                      "rounded-full",
                      compact ? "size-6" : "size-8"
                    )}
                  />
                ) : (
                  <div className={cn(
                    "rounded-full bg-muted flex items-center justify-center text-xs",
                    compact ? "size-6" : "size-8"
                  )}>
                    {member.user.name?.[0] || "?"}
                  </div>
                )}
                <div>
                  <p className={cn(
                    "font-medium text-foreground",
                    compact ? "text-xs" : "text-sm"
                  )}>
                    {member.user.name || "이름 없음"}
                  </p>
                  {!compact && (
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveStaff(member.userId)}
                disabled={isRemoving === member.userId}
                className={cn(
                  "text-destructive hover:text-destructive hover:bg-destructive/10",
                  compact ? "h-6 w-6 p-0" : "h-8 px-2"
                )}
              >
                {isRemoving === member.userId ? (
                  <span className="text-xs">...</span>
                ) : compact ? (
                  <svg
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  "제거"
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
