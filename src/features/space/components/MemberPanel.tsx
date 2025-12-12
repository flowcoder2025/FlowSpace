"use client"

/**
 * MemberPanel - 공간 내 멤버 관리 패널
 *
 * 기능:
 * - 전체 멤버 목록 조회 (OWNER/STAFF/PARTICIPANT)
 * - 온라인/오프라인 상태 표시 (Socket.io players 연동)
 * - OWNER: STAFF 임명/해제
 * - SuperAdmin: OWNER 임명
 */

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { MemberList } from "@/components/space"

// ============================================
// Icons
// ============================================
const CloseIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// ============================================
// Types
// ============================================
interface MemberPanelProps {
  spaceId: string
  /** 현재 사용자가 SuperAdmin인지 */
  isSuperAdmin?: boolean
  /** 현재 사용자가 OWNER인지 */
  isOwner?: boolean
  /** 온라인 사용자 ID 목록 (Socket.io players에서 추출) */
  onlineUserIds?: string[]
  /** 패널 닫기 콜백 */
  onClose?: () => void
  className?: string
}

// ============================================
// MemberPanel Component
// ============================================
export function MemberPanel({
  spaceId,
  isSuperAdmin = false,
  isOwner = false,
  onlineUserIds = [],
  onClose,
  className,
}: MemberPanelProps) {
  // 🔄 새로고침 트리거 (외부에서 트리거 가능)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <div
      className={cn(
        "flex flex-col bg-black/30 backdrop-blur-sm rounded-lg border border-white/10",
        className
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-sm font-medium text-white">멤버 관리</span>
        <div className="flex items-center gap-1">
          {/* 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
            aria-label="새로고침"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          {/* 닫기 버튼 */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
              aria-label="닫기"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {/* 멤버 목록 */}
      <div className="flex-1 overflow-y-auto p-2 max-h-[calc(100vh-200px)]">
        <MemberList
          spaceId={spaceId}
          compact
          isSuperAdmin={isSuperAdmin}
          isOwner={isOwner}
          onlineUserIds={onlineUserIds}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  )
}
