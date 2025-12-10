"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// ============================================
// Modal Context
// ============================================
interface ModalContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ModalContext = React.createContext<ModalContextValue | undefined>(undefined)

function useModalContext() {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error("Modal components must be used within Modal")
  }
  return context
}

// ============================================
// Modal Root
// ============================================
interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  // ESC 키로 닫기
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  // 스크롤 잠금
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <ModalContext.Provider value={{ open, onOpenChange }}>
      {children}
    </ModalContext.Provider>
  )
}

// ============================================
// Modal Overlay
// ============================================
export function ModalOverlay({ className }: { className?: string }) {
  const { onOpenChange } = useModalContext()

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 animate-in fade-in-0",
        className
      )}
      onClick={() => onOpenChange(false)}
      aria-hidden="true"
    />
  )
}

// ============================================
// Modal Content
// ============================================
interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  preventClose?: boolean
}

export function ModalContent({
  children,
  className,
  preventClose = false,
  ...props
}: ModalContentProps) {
  const { onOpenChange } = useModalContext()

  return (
    <>
      <ModalOverlay />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {!preventClose && (
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
        {children}
      </div>
    </>
  )
}

// ============================================
// Modal Header
// ============================================
export function ModalHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// Modal Title
// ============================================
export function ModalTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

// ============================================
// Modal Description
// ============================================
export function ModalDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  )
}

// ============================================
// Modal Footer
// ============================================
export function ModalFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
