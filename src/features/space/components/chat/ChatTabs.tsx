"use client"

/**
 * ChatTabs - 채팅 탭 컴포넌트
 *
 * 탭 종류 (4개):
 * - all: 전체 메시지 (일반 + 파티 + 귓속말 + 시스템)
 * - party: 파티/구역 채팅만
 * - whisper: 귓속말만 (송신 + 수신)
 * - system: 시스템 메시지만
 *
 * 기능:
 * - 탭별 읽지 않은 메시지 카운트 배지
 * - 활성 탭 하이라이트
 */
import { cn } from "@/lib/utils"
import type { ChatTab } from "../../types/space.types"

// ============================================
// 탭 설정
// ============================================
interface TabConfig {
  id: ChatTab
  label: string
  shortLabel: string  // 좁은 너비용
  badgeColor?: string // 배지 색상 (기본: primary)
}

const TABS: TabConfig[] = [
  { id: "all", label: "전체", shortLabel: "전체" },
  { id: "party", label: "파티", shortLabel: "파", badgeColor: "bg-blue-500" },
  { id: "whisper", label: "귓속말", shortLabel: "귓", badgeColor: "bg-purple-500" },
  { id: "system", label: "시스템", shortLabel: "시" },
]

// ============================================
// ChatTabs Props
// ============================================
interface ChatTabsProps {
  activeTab: ChatTab
  onTabChange: (tab: ChatTab) => void
  unreadCounts: Record<ChatTab, number>
  onDeactivate?: () => void  // Enter 키 누를 시 채팅 비활성화
  className?: string
}

// ============================================
// ChatTabs Component
// ============================================
export function ChatTabs({
  activeTab,
  onTabChange,
  unreadCounts,
  onDeactivate,
  className,
}: ChatTabsProps) {
  // 탭에서 Enter 키 누르면 채팅 비활성화
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onDeactivate) {
      e.preventDefault()
      e.stopPropagation()
      onDeactivate()
    }
  }

  return (
    <div
      tabIndex={-1}  // 클릭 시 포커스 가능 (Tab 네비게이션에서는 제외)
      onKeyDown={handleKeyDown}
      className={cn(
        "flex items-center gap-0.5 px-2 py-1",
        "border-b border-white/5",
        // 🔧 컨테이너 포커스 링 제거
        "outline-none focus:outline-none",
        className
      )}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const unreadCount = unreadCounts[tab.id]
        const hasUnread = unreadCount > 0 && !isActive

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative px-2 py-1 text-[10px] rounded transition-all",
              "hover:bg-white/10",
              // 🔧 포커스 링 제거
              "outline-none focus:outline-none focus-visible:outline-none",
              isActive
                ? "bg-white/15 text-white font-medium"
                : "text-white/60 hover:text-white/80"
            )}
          >
            {/* 탭 라벨 */}
            <span>{tab.label}</span>

            {/* 읽지 않은 메시지 배지 */}
            {hasUnread && (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px]",
                  "flex items-center justify-center",
                  "text-[8px] font-bold rounded-full",
                  tab.badgeColor
                    ? `${tab.badgeColor} text-white`
                    : "bg-primary text-primary-foreground"
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
