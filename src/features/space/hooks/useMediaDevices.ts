"use client"

/**
 * useMediaDevices
 *
 * 미디어 장치(마이크, 스피커, 카메라) 목록 및 선택 관리 훅
 * navigator.mediaDevices API 사용
 *
 * 기능:
 * - 장치 목록 가져오기 (마이크, 스피커, 카메라)
 * - 선택된 장치 관리
 * - 장치 변경 시 콜백 실행
 * - LiveKit과 연동하여 장치 전환
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { useMaybeRoomContext } from "@livekit/components-react"
import { Room } from "livekit-client"

export interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: "audioinput" | "audiooutput" | "videoinput"
}

interface UseMediaDevicesReturn {
  // 장치 목록
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  videoInputDevices: MediaDeviceInfo[]
  // 선택된 장치 ID
  selectedAudioInput: string | null
  selectedAudioOutput: string | null
  selectedVideoInput: string | null
  // 장치 선택 함수
  selectAudioInput: (deviceId: string) => Promise<void>
  selectAudioOutput: (deviceId: string) => Promise<void>
  selectVideoInput: (deviceId: string) => Promise<void>
  // 장치 목록 새로고침
  refreshDevices: () => Promise<void>
  // 로딩/에러 상태
  isLoading: boolean
  error: string | null
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null)
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string | null>(null)
  const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // LiveKit Room context
  const room = useMaybeRoomContext()

  // 장치 목록 가져오기
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("미디어 장치 API를 사용할 수 없습니다.")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // 먼저 권한 요청 (권한이 없으면 label이 빈 문자열)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
        // 권한 획득 후 스트림 정리
        stream.getTracks().forEach((track) => track.stop())
      } catch {
        // 권한 거부 - 장치 목록은 가져올 수 있지만 label이 비어있을 수 있음
        console.warn("[useMediaDevices] 미디어 권한 요청 실패")
      }

      const deviceList = await navigator.mediaDevices.enumerateDevices()

      const formattedDevices: MediaDeviceInfo[] = deviceList
        .filter((device) =>
          ["audioinput", "audiooutput", "videoinput"].includes(device.kind)
        )
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `${getDeviceKindLabel(device.kind)} (${device.deviceId.slice(0, 8)})`,
          kind: device.kind as MediaDeviceInfo["kind"],
        }))

      setDevices(formattedDevices)

      // 기본 장치 선택 (처음에만)
      if (selectedAudioInput === null) {
        const defaultAudio = formattedDevices.find((d) => d.kind === "audioinput")
        if (defaultAudio) setSelectedAudioInput(defaultAudio.deviceId)
      }
      if (selectedVideoInput === null) {
        const defaultVideo = formattedDevices.find((d) => d.kind === "videoinput")
        if (defaultVideo) setSelectedVideoInput(defaultVideo.deviceId)
      }
      if (selectedAudioOutput === null) {
        const defaultOutput = formattedDevices.find((d) => d.kind === "audiooutput")
        if (defaultOutput) setSelectedAudioOutput(defaultOutput.deviceId)
      }
    } catch (err) {
      console.error("[useMediaDevices] 장치 목록 가져오기 실패:", err)
      setError("장치 목록을 가져오는 데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput])

  // 초기 로드 및 장치 변경 감지
  useEffect(() => {
    refreshDevices()

    // 장치 변경 이벤트 리스너
    const handleDeviceChange = () => {
      refreshDevices()
    }

    navigator.mediaDevices?.addEventListener("devicechange", handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [refreshDevices])

  // 장치 종류별 필터링
  const audioInputDevices = useMemo(
    () => devices.filter((d) => d.kind === "audioinput"),
    [devices]
  )
  const audioOutputDevices = useMemo(
    () => devices.filter((d) => d.kind === "audiooutput"),
    [devices]
  )
  const videoInputDevices = useMemo(
    () => devices.filter((d) => d.kind === "videoinput"),
    [devices]
  )

  // 오디오 입력 장치 선택
  const selectAudioInput = useCallback(
    async (deviceId: string) => {
      setSelectedAudioInput(deviceId)

      // LiveKit이 연결되어 있으면 장치 전환
      if (room && room instanceof Room) {
        try {
          await room.switchActiveDevice("audioinput", deviceId)
          console.log("[useMediaDevices] 오디오 입력 장치 전환:", deviceId)
        } catch (err) {
          console.error("[useMediaDevices] 오디오 입력 장치 전환 실패:", err)
        }
      }
    },
    [room]
  )

  // 오디오 출력 장치 선택
  const selectAudioOutput = useCallback(
    async (deviceId: string) => {
      setSelectedAudioOutput(deviceId)

      // LiveKit이 연결되어 있으면 장치 전환
      if (room && room instanceof Room) {
        try {
          await room.switchActiveDevice("audiooutput", deviceId)
          console.log("[useMediaDevices] 오디오 출력 장치 전환:", deviceId)
        } catch (err) {
          console.error("[useMediaDevices] 오디오 출력 장치 전환 실패:", err)
        }
      }
    },
    [room]
  )

  // 비디오 입력 장치 선택
  const selectVideoInput = useCallback(
    async (deviceId: string) => {
      setSelectedVideoInput(deviceId)

      // LiveKit이 연결되어 있으면 장치 전환
      if (room && room instanceof Room) {
        try {
          await room.switchActiveDevice("videoinput", deviceId)
          console.log("[useMediaDevices] 비디오 입력 장치 전환:", deviceId)
        } catch (err) {
          console.error("[useMediaDevices] 비디오 입력 장치 전환 실패:", err)
        }
      }
    },
    [room]
  )

  return {
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
    refreshDevices,
    isLoading,
    error,
  }
}

// 장치 종류 한글 레이블
function getDeviceKindLabel(kind: string): string {
  switch (kind) {
    case "audioinput":
      return "마이크"
    case "audiooutput":
      return "스피커"
    case "videoinput":
      return "카메라"
    default:
      return "장치"
  }
}
