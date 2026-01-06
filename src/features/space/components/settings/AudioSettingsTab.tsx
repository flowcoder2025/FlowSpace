"use client"

/**
 * AudioSettingsTab
 *
 * 오디오 설정 탭 컴포넌트
 * - 입력/출력 장치 선택
 * - 볼륨 미터
 * - 음성 처리 토글들
 * - 입력 감도 슬라이더
 * - 마이크 테스트
 *
 * 📌 음성 처리 옵션 변경 시 마이크 자동 재시작:
 * - LiveKit은 트랙 캡처 시에만 옵션을 적용하므로 재시작 필요
 * - noiseSuppression, echoCancellation, autoGainControl, voiceIsolation 변경 시 동작
 */

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useMediaDevices } from "../../hooks/useMediaDevices"
import { useAudioSettings } from "../../hooks/useAudioSettings"
import { useVolumeMeter } from "../../hooks/useVolumeMeter"
import { useLiveKitMedia } from "../../livekit"
import { DeviceSelector } from "./DeviceSelector"
import { VolumeMeter } from "./VolumeMeter"
import { MicrophoneTest } from "./MicrophoneTest"

interface AudioSettingsTabProps {
  className?: string
}

export function AudioSettingsTab({ className }: AudioSettingsTabProps) {
  const {
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectAudioInput,
    selectAudioOutput,
    requestPermission,
    hasPermission,
  } = useMediaDevices()

  const {
    settings,
    toggleNoiseSuppression,
    toggleEchoCancellation,
    toggleAutoGainControl,
    toggleVoiceIsolation,
    setInputVolume,
    setOutputVolume,
    setInputSensitivity,
    setInputDevice,
    setOutputDevice,
    audioCaptureOptions,
  } = useAudioSettings()

  const { restartMicrophoneWithOptions, mediaState } = useLiveKitMedia()
  const { volume, start, stop, error: volumeError } = useVolumeMeter()

  // 📌 start/stop 함수 참조를 ref로 유지 (의존성 문제 해결)
  const startRef = useRef(start)
  const stopRef = useRef(stop)
  useEffect(() => {
    startRef.current = start
    stopRef.current = stop
  }, [start, stop])

  // 📌 이전 음성 처리 옵션 저장 (변경 감지용)
  const prevAudioProcessingRef = useRef({
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
    voiceIsolation: settings.voiceIsolation,
  })

  // 📌 마이크 재시작 디바운스용
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 📌 음성 처리 옵션 변경 시 마이크 재시작 (디바운스 적용)
  const handleAudioProcessingChange = useCallback(async () => {
    // 마이크가 꺼져 있으면 재시작 불필요
    if (!mediaState.isMicrophoneEnabled) return

    // 이전 타임아웃 취소
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
    }

    // 500ms 디바운스 - 연속 변경 시 한 번만 재시작
    restartTimeoutRef.current = setTimeout(async () => {
      await restartMicrophoneWithOptions(audioCaptureOptions)
    }, 500)
  }, [mediaState.isMicrophoneEnabled, restartMicrophoneWithOptions, audioCaptureOptions])

  // 📌 음성 처리 옵션 변경 감지 및 마이크 재시작
  useEffect(() => {
    const prev = prevAudioProcessingRef.current
    const curr = {
      noiseSuppression: settings.noiseSuppression,
      echoCancellation: settings.echoCancellation,
      autoGainControl: settings.autoGainControl,
      voiceIsolation: settings.voiceIsolation,
    }

    // 변경 여부 확인
    const hasChanged =
      prev.noiseSuppression !== curr.noiseSuppression ||
      prev.echoCancellation !== curr.echoCancellation ||
      prev.autoGainControl !== curr.autoGainControl ||
      prev.voiceIsolation !== curr.voiceIsolation

    if (hasChanged) {
      prevAudioProcessingRef.current = curr
      handleAudioProcessingChange()
    }
  }, [
    settings.noiseSuppression,
    settings.echoCancellation,
    settings.autoGainControl,
    settings.voiceIsolation,
    handleAudioProcessingChange,
  ])

  // 📌 cleanup
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [])

  // 설정 탭 열릴 때 권한 요청
  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  // 볼륨 미터 시작/중지
  useEffect(() => {
    if (hasPermission && selectedAudioInput) {
      startRef.current(selectedAudioInput)
    }
    return () => stopRef.current()
  }, [hasPermission, selectedAudioInput]) // 📌 start/stop 제거 - ref 사용

  // 장치 선택 동기화
  const handleInputDeviceSelect = (deviceId: string) => {
    selectAudioInput(deviceId)
    setInputDevice(deviceId)
  }

  const handleOutputDeviceSelect = (deviceId: string) => {
    selectAudioOutput(deviceId)
    setOutputDevice(deviceId)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 입력 장치 섹션 */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          입력 장치
        </h3>

        {/* 마이크 선택 */}
        <DeviceSelector
          kind="audioinput"
          devices={audioInputDevices}
          selectedDeviceId={selectedAudioInput}
          onDeviceSelect={handleInputDeviceSelect}
        />

        {/* 실시간 볼륨 미터 */}
        <div className="space-y-2">
          <Label className="text-sm">입력 레벨</Label>
          <VolumeMeter
            level={volume}
            sensitivity={settings.inputSensitivity}
            className="h-3"
          />
          {volumeError && (
            <p className="text-xs text-destructive">{volumeError}</p>
          )}
        </div>

        {/* 입력 볼륨 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">입력 볼륨</Label>
            <span className="text-sm text-muted-foreground">{settings.inputVolume}%</span>
          </div>
          <Slider
            value={[settings.inputVolume]}
            onValueChange={([value]) => setInputVolume(value)}
            min={0}
            max={100}
            step={1}
          />
        </div>

        {/* 입력 감도 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">입력 감도</Label>
            <span className="text-sm text-muted-foreground">{settings.inputSensitivity}%</span>
          </div>
          <Slider
            value={[settings.inputSensitivity]}
            onValueChange={([value]) => setInputSensitivity(value)}
            min={0}
            max={100}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            볼륨 미터의 감지 기준선입니다 (시각적 가이드)
          </p>
        </div>
      </section>

      <Separator />

      {/* 출력 장치 섹션 */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          출력 장치
        </h3>

        {/* 스피커 선택 */}
        <DeviceSelector
          kind="audiooutput"
          devices={audioOutputDevices}
          selectedDeviceId={selectedAudioOutput}
          onDeviceSelect={handleOutputDeviceSelect}
        />

        {/* 출력 볼륨 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">출력 볼륨</Label>
            <span className="text-sm text-muted-foreground">{settings.outputVolume}%</span>
          </div>
          <Slider
            value={[settings.outputVolume]}
            onValueChange={([value]) => setOutputVolume(value)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </section>

      <Separator />

      {/* 음성 처리 섹션 */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          음성 처리
        </h3>

        {/* 잡음 제거 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">잡음 제거</Label>
            <p className="text-xs text-muted-foreground">
              배경 소음을 줄입니다
            </p>
          </div>
          <Switch
            checked={settings.noiseSuppression}
            onCheckedChange={toggleNoiseSuppression}
          />
        </div>

        {/* 에코 제거 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">에코 제거</Label>
            <p className="text-xs text-muted-foreground">
              스피커 출력으로 인한 에코를 제거합니다
            </p>
          </div>
          <Switch
            checked={settings.echoCancellation}
            onCheckedChange={toggleEchoCancellation}
          />
        </div>

        {/* 자동 게인 조절 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">자동 게인 조절</Label>
            <p className="text-xs text-muted-foreground">
              입력 볼륨을 자동으로 조절합니다
            </p>
          </div>
          <Switch
            checked={settings.autoGainControl}
            onCheckedChange={toggleAutoGainControl}
          />
        </div>

        {/* 고급 음성 분리 (실험적) */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label className="text-sm">고급 음성 분리</Label>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                실험적
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI 기반 음성/배경 분리 (일부 브라우저만 지원)
            </p>
          </div>
          <Switch
            checked={settings.voiceIsolation}
            onCheckedChange={toggleVoiceIsolation}
          />
        </div>
      </section>

      <Separator />

      {/* 마이크 테스트 섹션 */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          마이크 테스트
        </h3>
        <MicrophoneTest deviceId={selectedAudioInput} />
      </section>
    </div>
  )
}
