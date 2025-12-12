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
import type { ChatTab, ChatFontSize } from "../../types/space.types"
import { CHAT_FONT_SIZE_ORDER } from "../../types/space.types"

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
  { id: "links", label: "링크", shortLabel: "링", badgeColor: "bg-emerald-500" },
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
  /** 채팅 관리 권한 여부 - OWNER 또는 STAFF (설정 버튼 표시) */
  canManageChat?: boolean
  /** 설정 패널 열기 콜백 */
  onOpenSettings?: () => void
  /** 현재 글씨 크기 */
  fontSize?: ChatFontSize
  /** 글씨 크기 변경 콜백 */
  onFontSizeChange?: (size: ChatFontSize) => void
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
  canManageChat = false,
  onOpenSettings,
  fontSize = "medium",
  onFontSizeChange,
}: ChatTabsProps) {
  // 글씨 크기 증가/감소 핸들러
  const handleFontSizeIncrease = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onFontSizeChange) return
    const currentIndex = CHAT_FONT_SIZE_ORDER.indexOf(fontSize)
    if (currentIndex < CHAT_FONT_SIZE_ORDER.length - 1) {
      onFontSizeChange(CHAT_FONT_SIZE_ORDER[currentIndex + 1])
    }
  }

  const handleFontSizeDecrease = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onFontSizeChange) return
    const currentIndex = CHAT_FONT_SIZE_ORDER.indexOf(fontSize)
    if (currentIndex > 0) {
      onFontSizeChange(CHAT_FONT_SIZE_ORDER[currentIndex - 1])
    }
  }

  // 현재 크기가 최소/최대인지 확인
  const isMinSize = fontSize === CHAT_FONT_SIZE_ORDER[0]
  const isMaxSize = fontSize === CHAT_FONT_SIZE_ORDER[CHAT_FONT_SIZE_ORDER.length - 1]
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
      {/* 탭 버튼들 */}
      <div className="flex items-center gap-0.5 flex-1">
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

      {/* 🔤 글씨 크기 조절 버튼 */}
      {onFontSizeChange && (
        <div className="flex items-center gap-0.5 mr-1">
          <button
            onClick={handleFontSizeDecrease}
            disabled={isMinSize}
            className={cn(
              "px-1 py-0.5 rounded transition-all text-[10px] font-medium",
              "outline-none focus:outline-none",
              isMinSize
                ? "text-white/30 cursor-not-allowed"
                : "text-white/60 hover:text-white/80 hover:bg-white/10"
            )}
            title="글씨 작게"
          >
            A-
          </button>
          <button
            onClick={handleFontSizeIncrease}
            disabled={isMaxSize}
            className={cn(
              "px-1 py-0.5 rounded transition-all text-[10px] font-medium",
              "outline-none focus:outline-none",
              isMaxSize
                ? "text-white/30 cursor-not-allowed"
                : "text-white/60 hover:text-white/80 hover:bg-white/10"
            )}
            title="글씨 크게"
          >
            A+
          </button>
        </div>
      )}

      {/* ⚙️ 설정 버튼 (OWNER 또는 STAFF만 표시) */}
      {canManageChat && onOpenSettings && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenSettings()
          }}
          className={cn(
            "p-1 rounded transition-all",
            "hover:bg-white/10",
            "outline-none focus:outline-none",
            "text-white/60 hover:text-white/80"
          )}
          title="스태프 관리"
        >
          <svg
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
