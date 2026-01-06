"use client"

/**
 * useAudioGateProcessor
 *
 * AudioWorklet 기반 전문급 노이즈 게이트 훅
 * - 별도 스레드에서 오디오 처리 (메인 스레드 차단 없음)
 * - 부드러운 Attack/Release 엔벨로프
 * - 히스테리시스로 채터링 방지
 *
 * 사용법:
 * const { processedTrack, currentLevel, isGateOpen, setThreshold } = useAudioGateProcessor({
 *   inputTrack: localAudioTrack,
 *   sensitivity: audioSettings.inputSensitivity,
 *   enabled: true,
 * })
 */

import { useState, useEffect, useRef, useCallback } from "react"

const IS_DEV = process.env.NODE_ENV === "development"

interface UseAudioGateProcessorOptions {
  /** 입력 오디오 트랙 (마이크) */
  inputTrack: MediaStreamTrack | null
  /** 입력 감도 (0-100, 낮을수록 민감) - 0이면 게이트 비활성화 */
  sensitivity: number
  /** 게이트 활성화 여부 */
  enabled: boolean
  /** Attack 시간 (초) - 게이트 열림 속도 */
  attackTime?: number
  /** Release 시간 (초) - 게이트 닫힘 속도 */
  releaseTime?: number
}

interface UseAudioGateProcessorReturn {
  /** 처리된 오디오 트랙 (LiveKit에 전달용) */
  processedTrack: MediaStreamTrack | null
  /** 현재 오디오 레벨 (0-100) */
  currentLevel: number
  /** 현재 게이트 상태 (열림/닫힘) */
  isGateOpen: boolean
  /** 현재 게인 값 (0-1) */
  currentGain: number
  /** 임계값 설정 */
  setThreshold: (sensitivity: number) => void
  /** 게이트 활성화/비활성화 */
  setEnabled: (enabled: boolean) => void
  /** 초기화 완료 여부 */
  isInitialized: boolean
  /** 에러 상태 */
  error: string | null
}

export function useAudioGateProcessor({
  inputTrack,
  sensitivity,
  enabled,
  attackTime = 0.01,
  releaseTime = 0.1,
}: UseAudioGateProcessorOptions): UseAudioGateProcessorReturn {
  // 상태
  const [processedTrack, setProcessedTrack] = useState<MediaStreamTrack | null>(null)
  const [currentLevel, setCurrentLevel] = useState(0)
  const [isGateOpen, setIsGateOpen] = useState(false)
  const [currentGain, setCurrentGain] = useState(1)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs for audio nodes
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const isCleaningUpRef = useRef(false)

  // 📌 sensitivity를 ref로 추적 (0 ↔ non-zero 전환 감지용)
  // sensitivity 자체는 파이프라인 재생성을 트리거하지 않음 (worklet에 메시지만 전송)
  const prevSensitivityRef = useRef(sensitivity)
  const isGateEnabledRef = useRef(sensitivity > 0) // 게이트 활성화 여부 (0이면 비활성화)

  // 📌 초기화 상태를 ref로 추적 (의존성 배열에서 제외하기 위함)
  // isInitialized가 의존성에 있으면 초기화 완료 시 cleanup이 호출되어 파이프라인이 파괴됨
  const isInitializedRef = useRef(false)

  // Cleanup 함수
  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    if (IS_DEV) {
      console.log("[useAudioGateProcessor] Cleaning up...")
    }

    // Source node disconnect
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch (e) {
        // Ignore disconnect errors
      }
      sourceNodeRef.current = null
    }

    // Worklet node disconnect
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect()
        workletNodeRef.current.port.close()
      } catch (e) {
        // Ignore disconnect errors
      }
      workletNodeRef.current = null
    }

    // Destination node
    if (destinationNodeRef.current) {
      destinationNodeRef.current = null
    }

    // Don't close AudioContext - reuse it
    setProcessedTrack(null)
    setIsInitialized(false)
    isInitializedRef.current = false  // 📌 ref도 동기화
    isCleaningUpRef.current = false
  }, [])

  // 📌 0 ↔ non-zero 전환 감지 (파이프라인 생성/정리 트리거)
  // sensitivity 값 자체의 변경(예: 30→50)은 파이프라인을 재생성하지 않음
  const shouldCreatePipeline = sensitivity > 0

  // ref 업데이트
  useEffect(() => {
    prevSensitivityRef.current = sensitivity
    isGateEnabledRef.current = sensitivity > 0
  }, [sensitivity])

  // AudioWorklet 초기화 및 파이프라인 설정
  // 📌 핵심 수정: sensitivity 자체는 의존성에서 제외
  // - 0 → non-zero 전환 시에만 파이프라인 생성 (shouldCreatePipeline 사용)
  // - non-zero → non-zero 변경은 두 번째 effect에서 메시지로 처리
  useEffect(() => {
    // 📌 sensitivity가 0이면 AudioWorklet 파이프라인을 생성하지 않음
    // 이 경우 원본 LiveKit 트랙이 그대로 사용됨 (성능 최적화 + 호환성)
    if (!shouldCreatePipeline) {
      cleanup()
      if (IS_DEV) {
        console.log("[useAudioGateProcessor] Sensitivity is 0, skipping AudioWorklet pipeline")
      }
      return
    }

    // 입력 트랙이 없거나 유효하지 않으면 정리
    if (!inputTrack || inputTrack.readyState !== "live") {
      cleanup()
      return
    }

    // 📌 이미 초기화된 파이프라인이 있으면 재생성하지 않음
    // (sensitivity 변경은 메시지로 처리)
    // ref를 사용하여 의존성 배열에서 제외 (isInitialized가 의존성에 있으면 cleanup 호출됨)
    if (isInitializedRef.current && workletNodeRef.current && sourceNodeRef.current) {
      if (IS_DEV) {
        console.log("[useAudioGateProcessor] Pipeline already initialized, skipping recreation")
      }
      return
    }

    let isMounted = true

    const initializeWorklet = async () => {
      try {
        setError(null)

        // AudioContext 생성 또는 재사용
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext()
        }

        const audioContext = audioContextRef.current

        // Suspended 상태면 resume
        if (audioContext.state === "suspended") {
          await audioContext.resume()
        }

        // AudioWorklet 모듈 로드 (한 번만)
        try {
          await audioContext.audioWorklet.addModule("/audio-worklets/noise-gate-processor.js")
        } catch (e) {
          // 이미 로드된 경우 에러 무시
          if (!(e instanceof DOMException && e.name === "InvalidStateError")) {
            throw e
          }
        }

        if (!isMounted) return

        // 입력 스트림 생성
        const inputStream = new MediaStream([inputTrack])
        const sourceNode = audioContext.createMediaStreamSource(inputStream)
        sourceNodeRef.current = sourceNode

        // AudioWorkletNode 생성
        const workletNode = new AudioWorkletNode(audioContext, "noise-gate-processor")
        workletNodeRef.current = workletNode

        // Worklet에서 메시지 수신 (레벨 리포트)
        workletNode.port.onmessage = (event) => {
          if (!isMounted) return

          const { type, data } = event.data
          if (type === "levelReport") {
            setCurrentLevel(data.level)
            setIsGateOpen(data.isGateOpen)
            setCurrentGain(data.gain)
          }
        }

        // 출력 destination 생성
        const destinationNode = audioContext.createMediaStreamDestination()
        destinationNodeRef.current = destinationNode

        // 노드 연결: Source → Worklet → Destination
        sourceNode.connect(workletNode)
        workletNode.connect(destinationNode)

        // 처리된 트랙 추출
        const processedAudioTrack = destinationNode.stream.getAudioTracks()[0]
        if (!processedAudioTrack) {
          throw new Error("Failed to get processed audio track")
        }

        setProcessedTrack(processedAudioTrack)
        setIsInitialized(true)
        isInitializedRef.current = true  // 📌 ref도 동기화

        // 초기 파라미터 설정 (현재 sensitivity 값 사용)
        const currentSensitivity = prevSensitivityRef.current
        workletNode.port.postMessage({ type: "setThreshold", data: currentSensitivity })
        workletNode.port.postMessage({ type: "setEnabled", data: enabled && currentSensitivity > 0 })
        workletNode.port.postMessage({ type: "setAttackTime", data: attackTime })
        workletNode.port.postMessage({ type: "setReleaseTime", data: releaseTime })

        if (IS_DEV) {
          console.log("[useAudioGateProcessor] Initialized successfully", {
            sensitivity: currentSensitivity,
            enabled,
            attackTime,
            releaseTime,
          })
        }
      } catch (err) {
        console.error("[useAudioGateProcessor] Initialization error:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        cleanup()
      }
    }

    initializeWorklet()

    return () => {
      isMounted = false
      cleanup()
    }
    // 📌 isInitialized 제거! 의존성에 있으면 초기화 완료 시 cleanup이 호출됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTrack, shouldCreatePipeline, cleanup, attackTime, releaseTime, enabled])

  // Sensitivity 변경 시 Worklet에 전달
  useEffect(() => {
    if (workletNodeRef.current && isInitialized) {
      workletNodeRef.current.port.postMessage({ type: "setThreshold", data: sensitivity })
      // sensitivity가 0이면 게이트 비활성화
      workletNodeRef.current.port.postMessage({
        type: "setEnabled",
        data: enabled && sensitivity > 0,
      })

      if (IS_DEV) {
        console.log("[useAudioGateProcessor] Updated threshold:", { sensitivity, enabled })
      }
    }
  }, [sensitivity, enabled, isInitialized])

  // setThreshold 콜백
  const setThreshold = useCallback((newSensitivity: number) => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: "setThreshold", data: newSensitivity })
    }
  }, [])

  // setEnabled 콜백
  const setEnabled = useCallback((newEnabled: boolean) => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: "setEnabled", data: newEnabled })
    }
  }, [])

  // 컴포넌트 언마운트 시 AudioContext 정리
  useEffect(() => {
    return () => {
      cleanup()
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    }
  }, [cleanup])

  return {
    processedTrack,
    currentLevel,
    isGateOpen,
    currentGain,
    setThreshold,
    setEnabled,
    isInitialized,
    error,
  }
}
