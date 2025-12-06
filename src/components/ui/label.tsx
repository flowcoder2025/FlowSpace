"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/* ============================================
   Label Component

   폼 입력 필드의 레이블 컴포넌트
   - htmlFor로 접근성 연결
   - Text와 동일한 스타일 (sm, medium)
   ============================================ */

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** 연결할 input의 id */
  htmlFor?: string
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...props}
      >
        {children}
      </label>
    )
  }
)
Label.displayName = "Label"

export { Label }
