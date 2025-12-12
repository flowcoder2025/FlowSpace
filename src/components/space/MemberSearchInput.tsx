"use client"

/**
 * MemberSearchInput - 멤버 검색 컴포넌트
 *
 * 이메일 또는 이름으로 사용자 검색
 * 공간 내 displayName도 검색 가능 (spaceId 제공 시)
 */

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ============================================
// Types
// ============================================
interface SearchResult {
  id: string
  name: string | null
  email: string
  image: string | null
  displayName?: string | null
  matchedBy?: "email" | "name" | "displayName"
}

interface MemberSearchInputProps {
  spaceId?: string
  className?: string
  /** 검색 결과 선택 시 콜백 */
  onSelect: (user: SearchResult) => void
  /** 취소 버튼 클릭 시 콜백 */
  onCancel?: () => void
  /** 플레이스홀더 텍스트 */
  placeholder?: string
  /** 컴팩트 모드 */
  compact?: boolean
}

// ============================================
// MemberSearchInput Component
// ============================================
export function MemberSearchInput({
  spaceId,
  className,
  onSelect,
  onCancel,
  placeholder = "이메일 또는 이름으로 검색...",
  compact = false,
}: MemberSearchInputProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  // ============================================
  // 검색 실행
  // ============================================
  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.length < 2) {
      setError("2자 이상 입력해주세요.")
      return
    }

    try {
      setIsSearching(true)
      setError(null)

      const params = new URLSearchParams({ q: query.trim() })
      if (spaceId) {
        params.set("spaceId", spaceId)
      }

      const res = await fetch(`/api/users/search?${params.toString()}`)

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "검색에 실패했습니다.")
        setResults([])
        return
      }

      const data = await res.json()
      setResults(data.users || [])
      setShowResults(true)

      if (data.users?.length === 0) {
        setError("검색 결과가 없습니다.")
      }
    } catch (err) {
      console.error("[MemberSearchInput] Search failed:", err)
      setError("네트워크 오류가 발생했습니다.")
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [query, spaceId])

  // ============================================
  // 사용자 선택
  // ============================================
  const handleSelect = (user: SearchResult) => {
    onSelect(user)
    setQuery("")
    setResults([])
    setShowResults(false)
    setError(null)
  }

  // ============================================
  // 취소
  // ============================================
  const handleCancel = () => {
    setQuery("")
    setResults([])
    setShowResults(false)
    setError(null)
    onCancel?.()
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className={cn("relative", className)}>
      {/* 검색 입력 */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length < 2) {
              setResults([])
              setShowResults(false)
              setError(null)
            }
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === "Enter") {
              e.preventDefault()
              handleSearch()
            }
            if (e.key === "Escape") {
              handleCancel()
            }
          }}
          className={cn(
            "bg-background/80 text-foreground border-border/50",
            compact ? "h-8 text-xs" : ""
          )}
        />
        <Button
          variant="default"
          size="sm"
          onClick={handleSearch}
          disabled={isSearching || query.length < 2}
          className={cn(compact ? "h-8 text-xs px-3" : "")}
        >
          {isSearching ? "검색중..." : "검색"}
        </Button>
        {onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className={cn(
              compact ? "h-8 text-xs px-2" : "",
              "text-foreground/80 hover:text-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            취소
          </Button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {/* 검색 결과 */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors",
                "text-left"
              )}
            >
              {/* 프로필 이미지 */}
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className={cn(
                    "rounded-full",
                    compact ? "size-6" : "size-8"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "rounded-full bg-muted flex items-center justify-center text-xs text-foreground/70",
                    compact ? "size-6" : "size-8"
                  )}
                >
                  {user.name?.[0] || "?"}
                </div>
              )}

              {/* 사용자 정보 */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-foreground truncate",
                  compact ? "text-xs" : "text-sm"
                )}>
                  {user.name || "이름 없음"}
                  {user.displayName && (
                    <span className="ml-1 text-primary">
                      ({user.displayName})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>

              {/* 매칭 유형 표시 */}
              {user.matchedBy && (
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {user.matchedBy === "displayName" ? "공간명" :
                   user.matchedBy === "email" ? "이메일" : "이름"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
