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
 *
 * 🔧 Option C 적용 (2026-01-06):
 * - 마운트 시 getUserMedia 호출 제거 (마이크/카메라 충돌 방지)
 * - requestPermission()으로 명시적 권한 요청 (설정 열 때 호출)
 * - 권한 획득 전에는 장치 label이 비어있을 수 있음
 * - 크로스 브라우저 마이크 문제 해결 (Chrome, Safari, iOS)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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
  // 🆕 권한 요청 (Option C)
  requestPermission: () => Promise<boolean>
  hasPermission: boolean
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

  // 🔧 Option C: 권한 상태 추적
  const [hasPermission, setHasPermission] = useState(false)
  const isRequestingPermission = useRef(false)

  // LiveKit Room context
  const room = useMaybeRoomContext()

  // 🔧 장치 목록만 가져오기 (권한 요청 없이)
  const enumerateDevicesOnly = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return []
    }

    const deviceList = await navigator.mediaDevices.enumerateDevices()

    return deviceList
      .filter((device) =>
        ["audioinput", "audiooutput", "videoinput"].includes(device.kind)
      )
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `${getDeviceKindLabel(device.kind)} (${device.deviceId.slice(0, 8)})`,
        kind: device.kind as MediaDeviceInfo["kind"],
      }))
  }, [])

  // 기본 장치 선택 업데이트 헬퍼 (requestPermission보다 먼저 정의)
  const updateDefaultDevices = useCallback((formattedDevices: MediaDeviceInfo[]) => {
    setSelectedAudioInput((prev) => {
      if (prev !== null) return prev
      const defaultAudio = formattedDevices.find((d) => d.kind === "audioinput")
      return defaultAudio?.deviceId ?? null
    })
    setSelectedVideoInput((prev) => {
      if (prev !== null) return prev
      const defaultVideo = formattedDevices.find((d) => d.kind === "videoinput")
      return defaultVideo?.deviceId ?? null
    })
    setSelectedAudioOutput((prev) => {
      if (prev !== null) return prev
      const defaultOutput = formattedDevices.find((d) => d.kind === "audiooutput")
      return defaultOutput?.deviceId ?? null
    })
  }, [])

  // 🔧 Option C: 명시적 권한 요청 (설정 열 때 호출)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // 이미 권한이 있으면 바로 반환
    if (hasPermission) return true

    // 동시 요청 방지
    if (isRequestingPermission.current) return false
    isRequestingPermission.current = true

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("미디어 장치 API를 사용할 수 없습니다.")
      isRequestingPermission.current = false
      return false
    }

    try {
      // 🔧 사용자 제스처 컨텍스트에서 호출됨 (드롭다운/설정 클릭)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      // 🔧 트랙 정리 전 약간의 지연 (브라우저 안정화)
      await new Promise(resolve => setTimeout(resolve, 50))
      stream.getTracks().forEach((track) => track.stop())

      setHasPermission(true)

      // 권한 획득 후 장치 목록 갱신 (이제 label 포함됨)
      const formattedDevices = await enumerateDevicesOnly()
      setDevices(formattedDevices)

      // 기본 장치 선택 업데이트
      updateDefaultDevices(formattedDevices)

      console.log("[useMediaDevices] 권한 획득 성공, 장치 목록 갱신 완료")
      isRequestingPermission.current = false
      return true
    } catch (err) {
      console.warn("[useMediaDevices] 권한 요청 실패:", err)
      setError("미디어 권한을 획득하지 못했습니다.")
      isRequestingPermission.current = false
      return false
    }
  }, [hasPermission, enumerateDevicesOnly, updateDefaultDevices])

  // 🔧 초기 로드: 권한 없이 장치 목록만 조회
  const initialEnumerate = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("미디어 장치 API를 사용할 수 없습니다.")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // 🔧 Option C: getUserMedia 없이 장치 목록만 조회
      // 권한이 없으면 label이 비어있을 수 있음 (deviceId로 표시)
      const formattedDevices = await enumerateDevicesOnly()
      setDevices(formattedDevices)

      // 장치 label이 있으면 이미 권한이 있는 상태
      const hasLabels = formattedDevices.some(d => d.label && !d.label.includes(d.deviceId.slice(0, 8)))
      if (hasLabels) {
        setHasPermission(true)
      }

      // 기본 장치 선택
      updateDefaultDevices(formattedDevices)
    } catch (err) {
      console.error("[useMediaDevices] 장치 목록 가져오기 실패:", err)
      setError("장치 목록을 가져오는 데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [enumerateDevicesOnly, updateDefaultDevices])

  // 🔧 장치 목록 새로고침 (권한 요청 없이)
  const refreshDevices = useCallback(async () => {
    try {
      const formattedDevices = await enumerateDevicesOnly()
      setDevices(formattedDevices)
    } catch (err) {
      console.error("[useMediaDevices] 장치 목록 새로고침 실패:", err)
    }
  }, [enumerateDevicesOnly])

  // 초기 로드 (한 번만)
  useEffect(() => {
    initialEnumerate()
  }, [initialEnumerate])

  // 장치 변경 감지 (권한 요청 없이 목록만 갱신)
  useEffect(() => {
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
    // 🆕 Option C
    requestPermission,
    hasPermission,
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
