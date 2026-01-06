"use client"

/**
 * useAudioSettings
 *
 * 오디오 설정 관리 훅
 * - localStorage 기반 설정 영속성
 * - 음성 처리 옵션 관리 (noiseSuppression, echoCancellation, autoGainControl, voiceIsolation)
 * - 볼륨 및 입력 감도 관리
 * - LiveKit 옵션 변환 지원
 * - 🔄 커스텀 이벤트 기반 실시간 동기화 (여러 컴포넌트 간 상태 공유)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  AudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  STORAGE_KEYS,
  toAudioCaptureOptions,
} from "../types/media-settings.types"

// 🔄 커스텀 이벤트명 (같은 탭 내 동기화용)
const AUDIO_SETTINGS_CHANGED_EVENT = "flowspace-audio-settings-changed"

interface UseAudioSettingsReturn {
  // 전체 설정
  settings: AudioSettings
  // 개별 설정 업데이트
  updateSettings: (updates: Partial<AudioSettings>) => void
  // 토글 함수들
  toggleNoiseSuppression: () => void
  toggleEchoCancellation: () => void
  toggleAutoGainControl: () => void
  toggleVoiceIsolation: () => void
  // 볼륨 설정
  setInputVolume: (volume: number) => void
  setOutputVolume: (volume: number) => void
  setInputSensitivity: (sensitivity: number) => void
  // 장치 선택
  setInputDevice: (deviceId: string | null) => void
  setOutputDevice: (deviceId: string | null) => void
  // 기본값 복원
  resetToDefaults: () => void
  // LiveKit 옵션 변환
  audioCaptureOptions: ReturnType<typeof toAudioCaptureOptions>
  // 로딩 상태
  isLoading: boolean
}

export function useAudioSettings(): UseAudioSettingsReturn {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  // 🔄 이 인스턴스에서 발생한 변경인지 구분 (무한 루프 방지)
  const isLocalChangeRef = useRef(false)

  // localStorage에서 설정 로드
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false)
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AudioSettings>
        // 기본값과 병합 (새로 추가된 필드 대응)
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }))
      }
    } catch (err) {
      console.warn("[useAudioSettings] localStorage 로드 실패:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 설정 변경 시 localStorage 저장 + 커스텀 이벤트 dispatch
  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return

    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO_SETTINGS, JSON.stringify(settings))

      // 🔄 이 인스턴스에서 변경한 경우에만 이벤트 dispatch (다른 인스턴스에 알림)
      if (isLocalChangeRef.current) {
        window.dispatchEvent(new CustomEvent(AUDIO_SETTINGS_CHANGED_EVENT, {
          detail: settings,
        }))
        isLocalChangeRef.current = false
      }
    } catch (err) {
      console.warn("[useAudioSettings] localStorage 저장 실패:", err)
    }
  }, [settings, isLoading])

  // 🔄 다른 인스턴스의 설정 변경 수신 (커스텀 이벤트 리스닝)
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent<AudioSettings>
      // 🔄 다른 인스턴스에서 변경된 설정으로 업데이트
      setSettings(customEvent.detail)
    }

    window.addEventListener(AUDIO_SETTINGS_CHANGED_EVENT, handleSettingsChanged)

    return () => {
      window.removeEventListener(AUDIO_SETTINGS_CHANGED_EVENT, handleSettingsChanged)
    }
  }, [])

  // 설정 업데이트 함수
  const updateSettings = useCallback((updates: Partial<AudioSettings>) => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  // 토글 함수들
  const toggleNoiseSuppression = useCallback(() => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      noiseSuppression: !prev.noiseSuppression,
    }))
  }, [])

  const toggleEchoCancellation = useCallback(() => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      echoCancellation: !prev.echoCancellation,
    }))
  }, [])

  const toggleAutoGainControl = useCallback(() => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      autoGainControl: !prev.autoGainControl,
    }))
  }, [])

  const toggleVoiceIsolation = useCallback(() => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      voiceIsolation: !prev.voiceIsolation,
    }))
  }, [])

  // 볼륨 설정 함수들
  const setInputVolume = useCallback((volume: number) => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      inputVolume: Math.max(0, Math.min(100, volume)),
    }))
  }, [])

  const setOutputVolume = useCallback((volume: number) => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      outputVolume: Math.max(0, Math.min(100, volume)),
    }))
  }, [])

  const setInputSensitivity = useCallback((sensitivity: number) => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      inputSensitivity: Math.max(0, Math.min(100, sensitivity)),
    }))
  }, [])

  // 장치 선택 함수들
  const setInputDevice = useCallback((deviceId: string | null) => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      selectedInputDeviceId: deviceId,
    }))
  }, [])

  const setOutputDevice = useCallback((deviceId: string | null) => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings((prev) => ({
      ...prev,
      selectedOutputDeviceId: deviceId,
    }))
  }, [])

  // 기본값 복원
  const resetToDefaults = useCallback(() => {
    isLocalChangeRef.current = true  // 🔄 로컬 변경 표시
    setSettings(DEFAULT_AUDIO_SETTINGS)
  }, [])

  // LiveKit 옵션 변환 (메모이제이션)
  const audioCaptureOptions = useMemo(
    () => toAudioCaptureOptions(settings),
    [settings]
  )

  return {
    settings,
    updateSettings,
    toggleNoiseSuppression,
    toggleEchoCancellation,
    toggleAutoGainControl,
    toggleVoiceIsolation,
    setInputVolume,
    setOutputVolume,
    setInputSensitivity,
    setInputDevice,
    setOutputDevice,
    resetToDefaults,
    audioCaptureOptions,
    isLoading,
  }
}
