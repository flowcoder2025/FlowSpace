"use client"

/**
 * IOSAudioActivator
 *
 * iOS Safari 전용 오디오 활성화 오버레이
 *
 * iOS Safari에서는 getUserMedia를 호출해야 WebRTC 오디오 출력(다른 사용자 음성)이 활성화됨
 * - 마이크를 켜지 않아도 다른 사용자 소리를 듣기 위해 필요
 * - 입장 버튼 클릭 또는 새로고침 후 첫 터치 시 자동 활성화 시도
 * - 실패 시 명시적 "오디오 활성화" 버튼 표시
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button, Text } from "@/components/ui"

const IS_DEV = process.env.NODE_ENV === "development"

interface IOSAudioActivatorProps {
  /** 활성화 성공 시 콜백 */
  onActivated?: () => void
}

export function IOSAudioActivator({ onActivated }: IOSAudioActivatorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [activationAttempted, setActivationAttempted] = useState(false)

  // iOS/iPadOS 감지
  const isIOSSafari = useMemo(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    return isIOS
  }, [])

  // 미디어 세션 활성화 (getUserMedia 호출)
  const activateMediaSession = useCallback(async (): Promise<boolean> => {
    if (!isIOSSafari) return true

    try {
      setIsActivating(true)

      if (IS_DEV) {
        console.log("[IOSAudioActivator] 🍎 Activating media session via getUserMedia...")
      }

      // 오디오만 요청 (카메라는 불필요)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 즉시 트랙 중지 (마이크 사용 안 함)
      stream.getTracks().forEach((track) => {
        track.stop()
      })

      if (IS_DEV) {
        console.log("[IOSAudioActivator] 🍎 Media session activated successfully")
      }

      setIsVisible(false)
      setActivationAttempted(true)
      onActivated?.()
      return true
    } catch (error) {
      if (IS_DEV) {
        console.warn("[IOSAudioActivator] 🍎 Media session activation failed:", error)
      }
      // 권한 거부 시에도 오버레이 숨김 (사용자가 마이크를 수동으로 켤 수 있음)
      setIsVisible(false)
      setActivationAttempted(true)
      return false
    } finally {
      setIsActivating(false)
    }
  }, [isIOSSafari, onActivated])

  // 첫 터치/클릭 시 자동 활성화 시도
  useEffect(() => {
    if (!isIOSSafari || activationAttempted) return

    // iOS Safari에서 오버레이 표시 (짧은 딜레이 후)
    const showTimer = setTimeout(() => {
      setIsVisible(true)
    }, 500)

    // 첫 인터랙션에서 자동 활성화 시도
    const handleFirstInteraction = async () => {
      if (activationAttempted) return
      await activateMediaSession()
    }

    // passive: false로 설정하여 preventDefault 가능하게 (필요시)
    document.addEventListener("touchend", handleFirstInteraction, { once: true })
    document.addEventListener("click", handleFirstInteraction, { once: true })

    return () => {
      clearTimeout(showTimer)
      document.removeEventListener("touchend", handleFirstInteraction)
      document.removeEventListener("click", handleFirstInteraction)
    }
  }, [isIOSSafari, activationAttempted, activateMediaSession])

  // iOS Safari가 아니거나 이미 활성화 시도됨
  if (!isIOSSafari || activationAttempted || !isVisible) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={activateMediaSession}
    >
      <div
        className="mx-4 flex max-w-sm flex-col items-center gap-4 rounded-xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 아이콘 */}
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="size-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        </div>

        {/* 설명 */}
        <div className="text-center">
          <Text size="lg" className="font-semibold">
            오디오 활성화 필요
          </Text>
          <Text size="sm" tone="muted" className="mt-1">
            다른 참가자의 음성을 듣기 위해<br />
            마이크 권한이 필요합니다
          </Text>
        </div>

        {/* 버튼 */}
        <Button
          onClick={activateMediaSession}
          disabled={isActivating}
          className="w-full"
        >
          {isActivating ? "활성화 중..." : "탭하여 오디오 활성화"}
        </Button>

        <Text size="xs" tone="muted" className="text-center">
          마이크를 사용하지 않아도<br />
          다른 참가자 소리를 들을 수 있습니다
        </Text>
      </div>
    </div>
  )
}
