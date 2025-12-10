/**
 * useChatDrag - 채팅창 드래그 훅 (개선판)
 *
 * 개선 사항:
 * - requestAnimationFrame 사용으로 부드러운 60fps 이동
 * - CSS transform 기반으로 GPU 가속
 * - 대각선 이동 완벽 지원
 * - 화면 경계 처리
 */
import { useState, useCallback, useEffect, useRef } from "react"

const STORAGE_KEY = "flowspace-chat-position"

// 채팅창 크기 (경계 계산용)
const CHAT_WIDTH = 320 // w-80 = 20rem = 320px
const CHAT_HEIGHT = 240

// 기본 위치: 좌하단 (LoL 스타일)
// y는 window 기준이므로 mount 후 계산
const getDefaultPosition = () => {
  if (typeof window === "undefined") return { x: 16, y: 400 }
  return {
    x: 16,
    y: window.innerHeight - CHAT_HEIGHT - 100, // 하단에서 100px 위
  }
}

interface Position {
  x: number
  y: number
}

export function useChatDrag() {
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === "undefined") return { x: 16, y: 400 }
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
    return getDefaultPosition()
  })

  const [isDragging, setIsDragging] = useState(false)

  // Refs for smooth animation
  const dragStartRef = useRef<Position>({ x: 0, y: 0 })
  const currentPositionRef = useRef<Position>(position)
  const rafIdRef = useRef<number | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    currentPositionRef.current = position
  }, [position])

  // 화면 경계 내로 위치 제한
  const clampPosition = useCallback((x: number, y: number): Position => {
    if (typeof window === "undefined") return { x, y }

    const maxX = window.innerWidth - CHAT_WIDTH - 16
    const maxY = window.innerHeight - CHAT_HEIGHT - 16

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - currentPositionRef.current.x,
      y: e.clientY - currentPositionRef.current.y,
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    let lastMouseX = 0
    let lastMouseY = 0

    const updatePosition = () => {
      const newX = lastMouseX - dragStartRef.current.x
      const newY = lastMouseY - dragStartRef.current.y
      const clamped = clampPosition(newX, newY)

      // 이전 위치와 다를 때만 업데이트
      if (
        clamped.x !== currentPositionRef.current.x ||
        clamped.y !== currentPositionRef.current.y
      ) {
        currentPositionRef.current = clamped
        setPosition(clamped)
      }

      if (isDragging) {
        rafIdRef.current = requestAnimationFrame(updatePosition)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      // 마우스 좌표만 저장 (실제 업데이트는 rAF에서)
      lastMouseX = e.clientX
      lastMouseY = e.clientY
    }

    const handleMouseUp = () => {
      setIsDragging(false)

      // rAF 취소
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      // localStorage에 위치 저장
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPositionRef.current))
      } catch {
        // Ignore storage errors
      }
    }

    // rAF 루프 시작
    rafIdRef.current = requestAnimationFrame(updatePosition)

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, clampPosition])

  // 창 리사이즈 시 위치 재조정
  useEffect(() => {
    const handleResize = () => {
      const clamped = clampPosition(
        currentPositionRef.current.x,
        currentPositionRef.current.y
      )
      if (
        clamped.x !== currentPositionRef.current.x ||
        clamped.y !== currentPositionRef.current.y
      ) {
        setPosition(clamped)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [clampPosition])

  return {
    position,
    isDragging,
    handleMouseDown,
  }
}
