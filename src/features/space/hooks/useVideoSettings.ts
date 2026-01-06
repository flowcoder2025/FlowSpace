"use client"

/**
 * useVideoSettings
 *
 * 비디오 설정 관리 훅
 * - localStorage 기반 설정 영속성
 * - 해상도 프리셋 관리 (480p/720p/1080p)
 * - 프레임레이트 관리 (15/24/30/60 fps)
 * - 미러 모드 및 카메라 방향 관리
 * - LiveKit 옵션 변환 지원
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  VideoSettings,
  VideoResolutionPreset,
  FrameRateOption,
  FacingMode,
  DEFAULT_VIDEO_SETTINGS,
  STORAGE_KEYS,
  toVideoCaptureOptions,
} from "../types/media-settings.types"

interface UseVideoSettingsReturn {
  // 전체 설정
  settings: VideoSettings
  // 개별 설정 업데이트
  updateSettings: (updates: Partial<VideoSettings>) => void
  // 해상도 설정
  setResolution: (resolution: VideoResolutionPreset) => void
  // 프레임레이트 설정
  setFrameRate: (frameRate: FrameRateOption) => void
  // 카메라 방향 설정 (모바일)
  setFacingMode: (facingMode: FacingMode) => void
  // 미러 모드 토글
  toggleMirrorMode: () => void
  setMirrorMode: (enabled: boolean) => void
  // 장치 선택
  setVideoDevice: (deviceId: string | null) => void
  // 기본값 복원
  resetToDefaults: () => void
  // LiveKit 옵션 변환
  videoCaptureOptions: ReturnType<typeof toVideoCaptureOptions>
  // 로딩 상태
  isLoading: boolean
}

export function useVideoSettings(): UseVideoSettingsReturn {
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  // localStorage에서 설정 로드
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false)
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIDEO_SETTINGS)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<VideoSettings>
        // 기본값과 병합 (새로 추가된 필드 대응)
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }))
      }
    } catch (err) {
      console.warn("[useVideoSettings] localStorage 로드 실패:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 설정 변경 시 localStorage 저장
  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return

    try {
      localStorage.setItem(STORAGE_KEYS.VIDEO_SETTINGS, JSON.stringify(settings))
    } catch (err) {
      console.warn("[useVideoSettings] localStorage 저장 실패:", err)
    }
  }, [settings, isLoading])

  // 설정 업데이트 함수
  const updateSettings = useCallback((updates: Partial<VideoSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  // 해상도 설정
  const setResolution = useCallback((resolution: VideoResolutionPreset) => {
    setSettings((prev) => ({ ...prev, resolution }))
  }, [])

  // 프레임레이트 설정
  const setFrameRate = useCallback((frameRate: FrameRateOption) => {
    setSettings((prev) => ({ ...prev, frameRate }))
  }, [])

  // 카메라 방향 설정 (모바일)
  const setFacingMode = useCallback((facingMode: FacingMode) => {
    setSettings((prev) => ({ ...prev, facingMode }))
  }, [])

  // 미러 모드 설정
  const toggleMirrorMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, mirrorMode: !prev.mirrorMode }))
  }, [])

  const setMirrorMode = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, mirrorMode: enabled }))
  }, [])

  // 장치 선택
  const setVideoDevice = useCallback((deviceId: string | null) => {
    setSettings((prev) => ({ ...prev, selectedDeviceId: deviceId }))
  }, [])

  // 기본값 복원
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_VIDEO_SETTINGS)
  }, [])

  // LiveKit 옵션 변환 (메모이제이션)
  const videoCaptureOptions = useMemo(
    () => toVideoCaptureOptions(settings),
    [settings]
  )

  return {
    settings,
    updateSettings,
    setResolution,
    setFrameRate,
    setFacingMode,
    toggleMirrorMode,
    setMirrorMode,
    setVideoDevice,
    resetToDefaults,
    videoCaptureOptions,
    isLoading,
  }
}
