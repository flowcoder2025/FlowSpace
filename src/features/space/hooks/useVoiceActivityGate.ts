"use client"

/**
 * useVoiceActivityGate
 *
 * 음성 활동 감지(VAD) 기반 게이트 훅
 * - Web Audio API로 실시간 오디오 레벨 측정
 * - inputSensitivity 임계값 기반 음성 활동 감지
 * - 히스테리시스 + 디바운스로 빈번한 토글 방지
 * - 감도 임계값에 도달하지 않으면 isBelowThreshold = true
 */

import { useState, useEffect, useRef, useCallback } from "react"

const IS_DEV = process.env.NODE_ENV === "development"

interface UseVoiceActivityGateOptions {
  /** 오디오 트랙 (마이크) */
  audioTrack: MediaStreamTrack | null | undefined
  /** 입력 감도 (0-100, 낮을수록 민감) */
  sensitivity: number
  /** VAD 활성화 여부 */
  enabled: boolean
  /** 디바운스 시간 (ms) - 임계값 미만 유지 시간 */
  debounceMs?: number
  /** 히스테리시스 (0-1) - 임계값 전환 시 여유 */
  hysteresis?: number
}

interface UseVoiceActivityGateReturn {
  /** 현재 오디오 레벨이 임계값 미만인지 */
  isBelowThreshold: boolean
  /** 현재 오디오 레벨 (0-100) */
  currentLevel: number
  /** 현재 적용된 임계값 (0-100) */
  threshold: number
}

/**
 * sensitivity (0-100)를 실제 RMS 임계값 (0-1)로 변환
 * - sensitivity 0 = 가장 민감 (임계값 0.01)
 * - sensitivity 100 = 가장 둔감 (임계값 0.5)
 *
 * 📌 감도가 낮을수록 작은 소리에도 반응해야 하므로
 * sensitivity 값이 낮으면 threshold도 낮아야 함
 */
function sensitivityToThreshold(sensitivity: number): number {
  // 0-100 → 0-1 범위로 정규화
  const normalized = Math.max(0, Math.min(100, sensitivity)) / 100
  // 임계값 범위: 0.01 (매우 민감) ~ 0.5 (매우 둔감)
  // normalized 0 → threshold 0.01
  // normalized 1 → threshold 0.5
  return 0.01 + normalized * 0.49
}

export function useVoiceActivityGate({
  audioTrack,
  sensitivity,
  enabled,
  debounceMs = 150,
  hysteresis = 0.02,
}: UseVoiceActivityGateOptions): UseVoiceActivityGateReturn {
  const [isBelowThreshold, setIsBelowThreshold] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(0)

  // 내부 상태 refs (렌더링 사이에 유지)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastStateRef = useRef<boolean>(false) // 마지막 게이트 상태

  // 현재 임계값 계산
  const threshold = sensitivityToThreshold(sensitivity)

  // 정리 함수
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }
    // AudioContext는 재사용을 위해 유지 (close하지 않음)
  }, [])

  // VAD 측정 루프
  useEffect(() => {
    // 조건 체크
    if (!enabled || !audioTrack || audioTrack.readyState !== "live") {
      cleanup()
      // 📌 비동기로 setState 호출 (ESLint react-hooks/set-state-in-effect 규칙 대응)
      void Promise.resolve().then(() => {
        setIsBelowThreshold(false)
        setCurrentLevel(0)
      })
      lastStateRef.current = false
      return
    }

    // AudioContext 생성 (재사용)
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext()
      } catch (err) {
        console.error("[useVoiceActivityGate] AudioContext 생성 실패:", err)
        return
      }
    }

    const audioContext = audioContextRef.current

    // suspended 상태면 resume
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(console.error)
    }

    // AnalyserNode 생성
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.5
    analyserRef.current = analyser

    // MediaStreamSource 생성
    try {
      const stream = new MediaStream([audioTrack])
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source
    } catch (err) {
      console.error("[useVoiceActivityGate] MediaStreamSource 생성 실패:", err)
      cleanup()
      return
    }

    // 측정 데이터 버퍼
    const dataArray = new Float32Array(analyser.fftSize)

    // 측정 루프
    const measureLevel = () => {
      if (!analyserRef.current) return

      analyserRef.current.getFloatTimeDomainData(dataArray)

      // RMS 계산
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // 0-100 레벨로 변환 (표시용)
      const levelPercent = Math.min(100, Math.round(rms * 200))
      setCurrentLevel(levelPercent)

      // 히스테리시스 적용 임계값
      const upperThreshold = threshold + hysteresis
      const lowerThreshold = Math.max(0.01, threshold - hysteresis)

      // 현재 상태 기준 임계값 선택
      const effectiveThreshold = lastStateRef.current ? upperThreshold : lowerThreshold

      // 임계값 비교
      const nowBelowThreshold = rms < effectiveThreshold

      // 디바운스: 상태 변경 시에만
      if (nowBelowThreshold !== lastStateRef.current) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
          lastStateRef.current = nowBelowThreshold
          setIsBelowThreshold(nowBelowThreshold)

          if (IS_DEV) {
            console.log("[useVoiceActivityGate] State changed:", {
              isBelowThreshold: nowBelowThreshold,
              rms: rms.toFixed(4),
              threshold: effectiveThreshold.toFixed(4),
              sensitivity,
            })
          }
        }, debounceMs)
      }

      animationFrameRef.current = requestAnimationFrame(measureLevel)
    }

    // 측정 시작
    animationFrameRef.current = requestAnimationFrame(measureLevel)

    if (IS_DEV) {
      console.log("[useVoiceActivityGate] Started monitoring:", {
        trackId: audioTrack.id,
        sensitivity,
        threshold: threshold.toFixed(4),
      })
    }

    return cleanup
  }, [audioTrack, enabled, threshold, hysteresis, debounceMs, cleanup, sensitivity])

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
    isBelowThreshold,
    currentLevel,
    threshold: Math.round(threshold * 100),
  }
}
