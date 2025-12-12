"use client"

/**
 * RoleBadge - 역할 뱃지 컴포넌트
 *
 * 공간 내 역할(OWNER/STAFF/PARTICIPANT)을 시각적으로 표시
 */

import { cn } from "@/lib/utils"
import type { SpaceRole } from "@prisma/client"

// ============================================
// Types
// ============================================
interface RoleBadgeProps {
  role: SpaceRole | string
  size?: "sm" | "default"
  className?: string
  /** SuperAdmin 표시 여부 */
  isSuperAdmin?: boolean
}

// ============================================
// Role 스타일 정의
// ============================================
const roleStyles: Record<string, { bg: string; text: string; label: string }> = {
  OWNER: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    label: "OWNER",
  },
  STAFF: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    label: "STAFF",
  },
  PARTICIPANT: {
    bg: "bg-slate-500/20",
    text: "text-slate-400",
    label: "참가자",
  },
}

const superAdminStyle = {
  bg: "bg-purple-500/20",
  text: "text-purple-400",
  label: "SuperAdmin",
}

// ============================================
// RoleBadge Component
// ============================================
export function RoleBadge({
  role,
  size = "default",
  className,
  isSuperAdmin,
}: RoleBadgeProps) {
  const style = roleStyles[role] || roleStyles.PARTICIPANT

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* SuperAdmin 뱃지 */}
      {isSuperAdmin && (
        <span
          className={cn(
            "inline-flex items-center rounded-full font-medium",
            superAdminStyle.bg,
            superAdminStyle.text,
            size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
          )}
        >
          {superAdminStyle.label}
        </span>
      )}

      {/* 역할 뱃지 */}
      <span
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          style.bg,
          style.text,
          size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
        )}
      >
        {style.label}
      </span>
    </div>
  )
}

// ============================================
// Export utilities
// ============================================
export function getRoleLabel(role: SpaceRole | string): string {
  return roleStyles[role]?.label || "참가자"
}

export function getRoleColor(role: SpaceRole | string): string {
  return roleStyles[role]?.text || "text-slate-400"
}
