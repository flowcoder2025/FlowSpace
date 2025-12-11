/**
 * useChatDrag - 채팅창 드래그 & 리사이즈 훅
 *
 * 기능:
 * - 헤더 드래그로 위치 이동
 * - 모서리 드래그로 크기 조절
 * - localStorage에 위치/크기 저장
 * - 화면 경계 내 제한
 *
 * 버그 수정:
 * - ref 동기화 타이밍 이슈 해결 (클릭 시 점프 방지)
 */
import { useState, useCallback, useEffect, useRef } from "react"

const STORAGE_KEY = "flowspace-chat-position"

// 채팅창 기본/최소/최대 크기
const DEFAULT_WIDTH = 320
const DEFAULT_HEIGHT = 300
const MIN_WIDTH = 280
const MIN_HEIGHT = 200
const MAX_WIDTH = 600
const MAX_HEIGHT = 600

// 기본 위치: 좌하단
const getDefaultPosition = () => {
  if (typeof window === "undefined") return { x: 16, y: 400 }
  return {
    x: 16,
    y: Math.max(100, window.innerHeight - DEFAULT_HEIGHT - 100),
  }
}

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface ChatState {
  position: Position
  size: Size
}

type DragMode = "none" | "move" | "resize"

export function useChatDrag() {
  // localStorage에서 초기값 로드
  const [state, setState] = useState<ChatState>(() => {
    if (typeof window === "undefined") {
      return {
        position: { x: 16, y: 400 },
        size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      }
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.position && parsed.size) {
          return {
            position: {
              x: typeof parsed.position.x === "number" ? parsed.position.x : 16,
              y: typeof parsed.position.y === "number" ? parsed.position.y : 400,
            },
            size: {
              width: typeof parsed.size.width === "number" ? parsed.size.width : DEFAULT_WIDTH,
              height: typeof parsed.size.height === "number" ? parsed.size.height : DEFAULT_HEIGHT,
            },
          }
        }
        // 레거시 형식 지원 (position만 있는 경우)
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return {
            position: { x: parsed.x, y: parsed.y },
            size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return {
      position: getDefaultPosition(),
      size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    }
  })

  const [dragMode, setDragMode] = useState<DragMode>("none")

  // 드래그 시작 시점의 마우스 오프셋 (위치 이동용)
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 })
  // 드래그 시작 시점의 상태 (리사이즈용)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; state: ChatState } | null>(null)
  // RAF ID
  const rafIdRef = useRef<number | null>(null)
  // 마지막 마우스 위치
  const lastMouseRef = useRef<Position>({ x: 0, y: 0 })

  // 화면 경계 내로 위치 제한
  const clampPosition = useCallback((x: number, y: number, width: number, height: number): Position => {
    if (typeof window === "undefined") return { x, y }

    const maxX = window.innerWidth - width - 16
    const maxY = window.innerHeight - height - 16

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    }
  }, [])

  // 크기 제한
  const clampSize = useCallback((width: number, height: number): Size => {
    return {
      width: Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH)),
      height: Math.max(MIN_HEIGHT, Math.min(height, MAX_HEIGHT)),
    }
  }, [])

  // 위치 이동 시작 (헤더 드래그)
  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 🔧 클릭 시점의 마우스 위치로 초기화 (클릭 시 점프 방지)
    lastMouseRef.current = { x: e.clientX, y: e.clientY }

    // 현재 state를 직접 읽어서 오프셋 계산 (ref 동기화 이슈 방지)
    setState((currentState) => {
      dragOffsetRef.current = {
        x: e.clientX - currentState.position.x,
        y: e.clientY - currentState.position.y,
      }
      return currentState
    })

    setDragMode("move")
  }, [])

  // 리사이즈 시작 (모서리 드래그)
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 🔧 클릭 시점의 마우스 위치로 초기화 (클릭 시 점프 방지)
    lastMouseRef.current = { x: e.clientX, y: e.clientY }

    setState((currentState) => {
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        state: currentState,
      }
      return currentState
    })

    setDragMode("resize")
  }, [])

  // 드래그 중 업데이트
  useEffect(() => {
    if (dragMode === "none") return

    const updatePosition = () => {
      const mouseX = lastMouseRef.current.x
      const mouseY = lastMouseRef.current.y

      if (dragMode === "move") {
        const newX = mouseX - dragOffsetRef.current.x
        const newY = mouseY - dragOffsetRef.current.y

        setState((prev) => {
          const clamped = clampPosition(newX, newY, prev.size.width, prev.size.height)
          if (clamped.x === prev.position.x && clamped.y === prev.position.y) {
            return prev
          }
          return { ...prev, position: clamped }
        })
      } else if (dragMode === "resize" && dragStartRef.current) {
        const deltaX = mouseX - dragStartRef.current.mouseX
        const deltaY = mouseY - dragStartRef.current.mouseY
        const startState = dragStartRef.current.state

        const newWidth = startState.size.width + deltaX
        const newHeight = startState.size.height + deltaY
        const clampedSize = clampSize(newWidth, newHeight)

        setState((prev) => {
          if (clampedSize.width === prev.size.width && clampedSize.height === prev.size.height) {
            return prev
          }
          // 크기 변경 시 위치도 재조정 (화면 밖으로 나가지 않도록)
          const clampedPos = clampPosition(prev.position.x, prev.position.y, clampedSize.width, clampedSize.height)
          return { position: clampedPos, size: clampedSize }
        })
      }

      // 드래그 중이면 계속 RAF 루프
      rafIdRef.current = requestAnimationFrame(updatePosition)
    }

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      setDragMode("none")

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      // localStorage에 저장
      setState((currentState) => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState))
        } catch {
          // Ignore storage errors
        }
        return currentState
      })
    }

    // RAF 루프 시작
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
  }, [dragMode, clampPosition, clampSize])

  // 창 리사이즈 시 위치/크기 재조정
  useEffect(() => {
    const handleWindowResize = () => {
      setState((prev) => {
        const clampedPos = clampPosition(prev.position.x, prev.position.y, prev.size.width, prev.size.height)
        if (clampedPos.x === prev.position.x && clampedPos.y === prev.position.y) {
          return prev
        }
        return { ...prev, position: clampedPos }
      })
    }

    window.addEventListener("resize", handleWindowResize)
    return () => window.removeEventListener("resize", handleWindowResize)
  }, [clampPosition])

  return {
    position: state.position,
    size: state.size,
    isDragging: dragMode !== "none",
    isResizing: dragMode === "resize",
    handleMoveStart,
    handleResizeStart,
  }
}
