/**
 * useChatDrag - 채팅창 드래그 훅
 *
 * 기능:
 * - 마우스 다운 → 드래그 시작
 * - 마우스 이동 → 위치 업데이트
 * - 마우스 업 → 드래그 종료 + localStorage 저장
 */
import { useState, useCallback, useEffect, useRef } from "react"

const STORAGE_KEY = "flowspace-chat-position"
const DEFAULT_POSITION = { x: 16, y: 16 }

interface Position {
  x: number
  y: number
}

export function useChatDrag() {
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === "undefined") return DEFAULT_POSITION
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return parsed
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return DEFAULT_POSITION
  })

  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position>({ x: 0, y: 0 })
  const positionRef = useRef<Position>(position)

  // Keep positionRef in sync
  useEffect(() => {
    positionRef.current = position
  }, [position])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      }
    },
    []
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, e.clientX - dragStartRef.current.x)
      const newY = Math.max(0, e.clientY - dragStartRef.current.y)
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      // Save position to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(positionRef.current))
      } catch {
        // Ignore storage errors
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  return {
    position,
    isDragging,
    handleMouseDown,
  }
}
