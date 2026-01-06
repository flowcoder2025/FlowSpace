"use client"

/**
 * DeviceSelector
 *
 * 미디어 장치 선택 드롭다운 컴포넌트
 * - 마이크, 스피커, 카메라 선택
 * - 장치 없음 상태 표시
 * - 권한 없을 때 라벨 표시 처리
 */

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Volume2, Video, AlertCircle } from "lucide-react"
import type { MediaDeviceInfo } from "../../hooks/useMediaDevices"

export type DeviceKind = "audioinput" | "audiooutput" | "videoinput"

interface DeviceSelectorProps {
  /** 장치 종류 */
  kind: DeviceKind
  /** 장치 목록 */
  devices: MediaDeviceInfo[]
  /** 선택된 장치 ID */
  selectedDeviceId: string | null
  /** 장치 선택 콜백 */
  onDeviceSelect: (deviceId: string) => void
  /** 비활성화 여부 */
  disabled?: boolean
  /** 커스텀 라벨 */
  label?: string
  /** 추가 클래스 */
  className?: string
}

const DEVICE_ICONS: Record<DeviceKind, typeof Mic> = {
  audioinput: Mic,
  audiooutput: Volume2,
  videoinput: Video,
}

const DEVICE_LABELS: Record<DeviceKind, string> = {
  audioinput: "마이크",
  audiooutput: "스피커",
  videoinput: "카메라",
}

const DEVICE_PLACEHOLDERS: Record<DeviceKind, string> = {
  audioinput: "마이크 선택",
  audiooutput: "스피커 선택",
  videoinput: "카메라 선택",
}

export function DeviceSelector({
  kind,
  devices,
  selectedDeviceId,
  onDeviceSelect,
  disabled = false,
  label,
  className,
}: DeviceSelectorProps) {
  const Icon = DEVICE_ICONS[kind]
  const displayLabel = label || DEVICE_LABELS[kind]
  const placeholder = DEVICE_PLACEHOLDERS[kind]

  const hasDevices = devices.length > 0

  return (
    <div className={cn("space-y-2", className)}>
      {/* 라벨 */}
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4" />
        {displayLabel}
      </label>

      {/* 드롭다운 */}
      {hasDevices ? (
        <Select
          value={selectedDeviceId || undefined}
          onValueChange={onDeviceSelect}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <AlertCircle className="size-4" />
          <span>{displayLabel}을(를) 찾을 수 없습니다</span>
        </div>
      )}
    </div>
  )
}
