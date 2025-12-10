"use client"

/**
 * useFullscreen - 전체화면 상태 추적 훅
 *
 * 브라우저 Fullscreen API 사용 시 전체화면 요소 외부는 숨겨지는 문제 해결
 * 이 훅을 사용하여 전체화면 요소 내부에 Portal로 콘텐츠 렌더링 가능
 */
import { useState, useEffect, useCallback } from "react"

interface FullscreenState {
  isFullscreen: boolean
  fullscreenElement: Element | null
}

/**
 * 전체화면 상태를 추적하는 훅
 * @returns 전체화면 여부와 전체화면 요소
 */
export function useFullscreen(): FullscreenState {
  const [state, setState] = useState<FullscreenState>({
    isFullscreen: false,
    fullscreenElement: null,
  })

  useEffect(() => {
    const handleFullscreenChange = () => {
      setState({
        isFullscreen: !!document.fullscreenElement,
        fullscreenElement: document.fullscreenElement,
      })
    }

    // 초기 상태 설정
    handleFullscreenChange()

    // 이벤트 리스너 등록
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    // Safari 지원
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
    }
  }, [])

  return state
}

/**
 * 전체화면 토글 함수를 반환하는 훅
 * @param elementRef 전체화면으로 만들 요소의 ref
 */
export function useFullscreenToggle(elementRef: React.RefObject<Element | null>) {
  const { isFullscreen } = useFullscreen()

  const toggleFullscreen = useCallback(async () => {
    if (!elementRef.current) return

    try {
      if (!document.fullscreenElement) {
        await elementRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("[useFullscreenToggle] Error:", error)
    }
  }, [elementRef])

  const enterFullscreen = useCallback(async () => {
    if (!elementRef.current || document.fullscreenElement) return

    try {
      await elementRef.current.requestFullscreen()
    } catch (error) {
      console.error("[useFullscreenToggle] Enter error:", error)
    }
  }, [elementRef])

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return

    try {
      await document.exitFullscreen()
    } catch (error) {
      console.error("[useFullscreenToggle] Exit error:", error)
    }
  }, [])

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  }
}
