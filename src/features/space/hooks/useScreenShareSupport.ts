"use client"

/**
 * useScreenShareSupport
 *
 * 화면공유 지원 여부를 감지하는 훅
 * - getDisplayMedia API 지원 여부 체크
 * - iOS/iPadOS Safari는 지원하지 않음
 * - 모바일 브라우저 대부분 미지원
 */

import { useMemo } from "react"

interface ScreenShareSupportResult {
  /** 화면공유 API 지원 여부 */
  isSupported: boolean
  /** 미지원 이유 (지원하면 null) */
  reason: string | null
}

/**
 * 화면공유 지원 여부 감지
 *
 * 브라우저 지원 현황 (2024-2025):
 * - Chrome/Edge Desktop: ✅ 지원
 * - Firefox Desktop: ✅ 지원
 * - Safari Desktop (macOS 12.1+): ✅ 지원
 * - Safari iOS/iPadOS: ❌ 미지원
 * - Chrome Android: ⚠️ 제한적 (탭만)
 * - Samsung Internet: ❌ 미지원
 */
export function useScreenShareSupport(): ScreenShareSupportResult {
  return useMemo(() => {
    // SSR 환경에서는 지원으로 가정 (클라이언트에서 재평가)
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return { isSupported: true, reason: null }
    }

    // 1. getDisplayMedia API 존재 여부
    const hasGetDisplayMedia =
      navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function"

    if (!hasGetDisplayMedia) {
      return {
        isSupported: false,
        reason: "이 브라우저는 화면공유를 지원하지 않습니다.",
      }
    }

    // 2. iOS/iPadOS 감지 (Safari와 Chrome for iOS 모두 WebKit 기반이라 미지원)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) // iPadOS 13+

    if (isIOS) {
      return {
        isSupported: false,
        reason: "iOS/iPadOS에서는 화면공유가 지원되지 않습니다. 데스크톱 브라우저를 이용해 주세요.",
      }
    }

    // 3. 기타 환경은 지원
    return { isSupported: true, reason: null }
  }, [])
}
