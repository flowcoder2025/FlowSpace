"use client"

/**
 * VideoSettingsTab
 *
 * 비디오 설정 탭 컴포넌트
 * - 카메라 선택
 * - 해상도 프리셋
 * - 프레임레이트 선택
 * - 미러 모드 토글
 * - 카메라 미리보기
 */

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMediaDevices } from "../../hooks/useMediaDevices"
import { useVideoSettings } from "../../hooks/useVideoSettings"
import { DeviceSelector } from "./DeviceSelector"
import { CameraPreview } from "./CameraPreview"
import {
  VIDEO_RESOLUTION_PRESETS,
  FRAME_RATE_OPTIONS,
  VideoResolutionPreset,
  FrameRateOption,
} from "../../types/media-settings.types"

interface VideoSettingsTabProps {
  className?: string
}

export function VideoSettingsTab({ className }: VideoSettingsTabProps) {
  const {
    videoInputDevices,
    selectedVideoInput,
    selectVideoInput,
    requestPermission,
    hasPermission,
  } = useMediaDevices()

  const {
    settings,
    setResolution,
    setFrameRate,
    setFacingMode,
    toggleMirrorMode,
    setVideoDevice,
  } = useVideoSettings()

  // 설정 탭 열릴 때 권한 요청
  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  // 장치 선택 동기화
  const handleDeviceSelect = (deviceId: string) => {
    selectVideoInput(deviceId)
    setVideoDevice(deviceId)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 카메라 미리보기 */}
      <section>
        <CameraPreview
          deviceId={selectedVideoInput}
          mirrorMode={settings.mirrorMode}
          resolution={settings.resolution}
          frameRate={settings.frameRate}
          enabled={hasPermission}
          className="aspect-video w-full"
        />
      </section>

      <Separator />

      {/* 카메라 선택 */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          카메라 설정
        </h3>

        <DeviceSelector
          kind="videoinput"
          devices={videoInputDevices}
          selectedDeviceId={selectedVideoInput}
          onDeviceSelect={handleDeviceSelect}
        />

        {/* 미러 모드 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">미러 모드</Label>
            <p className="text-xs text-muted-foreground">
              셀카처럼 좌우 반전하여 표시합니다
            </p>
          </div>
          <Switch
            checked={settings.mirrorMode}
            onCheckedChange={toggleMirrorMode}
          />
        </div>
      </section>

      <Separator />

      {/* 해상도 설정 */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          화질 설정
        </h3>

        {/* 해상도 프리셋 */}
        <div className="space-y-3">
          <Label className="text-sm">해상도</Label>
          <RadioGroup
            value={settings.resolution}
            onValueChange={(value) => setResolution(value as VideoResolutionPreset)}
            className="grid grid-cols-3 gap-2"
          >
            {(Object.keys(VIDEO_RESOLUTION_PRESETS) as VideoResolutionPreset[]).map(
              (preset) => {
                const { label } = VIDEO_RESOLUTION_PRESETS[preset]
                return (
                  <Label
                    key={preset}
                    htmlFor={`resolution-${preset}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-md border-2 px-3 py-2 text-sm transition-colors",
                      settings.resolution === preset
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <RadioGroupItem
                      id={`resolution-${preset}`}
                      value={preset}
                      className="sr-only"
                    />
                    {label}
                  </Label>
                )
              }
            )}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            높은 해상도는 더 많은 대역폭을 사용합니다
          </p>
        </div>

        {/* 프레임레이트 */}
        <div className="space-y-2">
          <Label className="text-sm">프레임레이트</Label>
          <Select
            value={String(settings.frameRate)}
            onValueChange={(value) => setFrameRate(Number(value) as FrameRateOption)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="프레임레이트 선택" />
            </SelectTrigger>
            <SelectContent>
              {FRAME_RATE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={String(value)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            높은 프레임레이트는 더 부드럽지만 CPU를 더 사용합니다
          </p>
        </div>
      </section>

      {/* 모바일 전용: 전면/후면 카메라 전환 */}
      <section className="space-y-4 sm:hidden">
        <Separator />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          카메라 방향
        </h3>
        <RadioGroup
          value={settings.facingMode}
          onValueChange={(value) => {
            setFacingMode(value as "user" | "environment")
            setVideoDevice(null) // 방향 변경 시 장치 초기화
          }}
          className="grid grid-cols-2 gap-2"
        >
          <Label
            htmlFor="facing-user"
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-md border-2 px-3 py-2 text-sm transition-colors",
              settings.facingMode === "user"
                ? "border-primary bg-primary/10"
                : "border-muted hover:border-muted-foreground/50"
            )}
          >
            <RadioGroupItem id="facing-user" value="user" className="sr-only" />
            전면 카메라
          </Label>
          <Label
            htmlFor="facing-environment"
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-md border-2 px-3 py-2 text-sm transition-colors",
              settings.facingMode === "environment"
                ? "border-primary bg-primary/10"
                : "border-muted hover:border-muted-foreground/50"
            )}
          >
            <RadioGroupItem
              id="facing-environment"
              value="environment"
              className="sr-only"
            />
            후면 카메라
          </Label>
        </RadioGroup>
      </section>
    </div>
  )
}
