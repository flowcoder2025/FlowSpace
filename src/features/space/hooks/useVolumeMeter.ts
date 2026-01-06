"use client"

/**
 * useVolumeMeter
 *
 * Web Audio API 기반 실시간 볼륨 측정 훅
 * - AnalyserNode로 오디오 레벨 분석
 * - requestAnimationFrame 기반 최적화
 * - 미디어 스트림 또는 장치 ID로 측정 가능
 *
 * 사용 예시:
 * ```tsx
 * const { volume, start, stop, isActive } = useVolumeMeter()
 *
 * // 마이크 테스트 시작
 * await start(deviceId)
 *
 * // 볼륨 표시
 * <VolumeMeter level={volume} />
 *
 * // 정리
 * stop()
 * ```
 */

import { useState, useCallback, useRef, useEffect } from "react"

interface UseVolumeMeterReturn {
  /** 현재 볼륨 레벨 (0-100) */
  volume: number
  /** 볼륨 측정 시작 */
  start: (deviceIdOrStream?: string | MediaStream) => Promise<void>
  /** 볼륨 측정 중지 */
  stop: () => void
  /** 측정 활성화 여부 */
  isActive: boolean
  /** 에러 상태 */
  error: string | null
}

export function useVolumeMeter(): UseVolumeMeterReturn {
  const [volume, setVolume] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 정리용 레퍼런스
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const ownedStreamRef = useRef(false) // 내부에서 생성한 스트림인지 여부

  // 볼륨 측정 루프 (ref를 사용하여 재귀 참조 문제 해결)
  const measureVolumeRef = useRef<() => void>(() => {})

  useEffect(() => {
    measureVolumeRef.current = () => {
      if (!analyserRef.current) return

      const analyser = analyserRef.current
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)

      // RMS (Root Mean Square) 계산으로 평균 볼륨 측정
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // 0-100 스케일로 정규화 (0-255 → 0-100)
      const normalizedVolume = Math.min(100, Math.round((rms / 128) * 100))
      setVolume(normalizedVolume)

      // 다음 프레임 요청
      animationFrameRef.current = requestAnimationFrame(measureVolumeRef.current)
    }
  }, [])

  // 정리 함수
  const cleanupResources = useCallback(() => {
    // 애니메이션 프레임 취소
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // 소스 연결 해제
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // AudioContext 닫기
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // 내부에서 생성한 스트림만 정리
    if (streamRef.current && ownedStreamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    streamRef.current = null
    ownedStreamRef.current = false

    analyserRef.current = null
    setVolume(0)
    setIsActive(false)
  }, [])

  // 측정 중지
  const stop = useCallback(() => {
    cleanupResources()
  }, [cleanupResources])

  // 측정 시작
  const start = useCallback(
    async (deviceIdOrStream?: string | MediaStream) => {
      // 이미 활성화 상태면 중지 후 재시작
      if (isActive) {
        cleanupResources()
      }

      setError(null)

      try {
        // MediaStream 얻기
        let stream: MediaStream

        if (deviceIdOrStream instanceof MediaStream) {
          // 외부 스트림 사용
          stream = deviceIdOrStream
          ownedStreamRef.current = false
        } else {
          // 새 스트림 생성
          const constraints: MediaStreamConstraints = {
            audio: deviceIdOrStream
              ? { deviceId: { exact: deviceIdOrStream } }
              : true,
            video: false,
          }
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          ownedStreamRef.current = true
        }

        streamRef.current = stream

        // AudioContext 생성
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        // AnalyserNode 설정
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.3
        analyserRef.current = analyser

        // 소스 연결
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        sourceRef.current = source

        // 측정 시작
        setIsActive(true)
        measureVolumeRef.current()
      } catch (err) {
        console.error("[useVolumeMeter] 시작 실패:", err)
        setError("마이크 접근 권한이 필요합니다.")
        setIsActive(false)
      }
    },
    [isActive, cleanupResources]
  )

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupResources()
    }
  }, [cleanupResources])

  return {
    volume,
    start,
    stop,
    isActive,
    error,
  }
}
