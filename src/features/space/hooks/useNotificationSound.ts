/**
 * useNotificationSound - 알림음 재생 훅
 *
 * Web Audio API로 LoL 스타일의 미약한 알림음 생성
 * - 귓속말 수신 시 짧고 부드러운 "띵" 소리
 * - 별도 오디오 파일 불필요
 * - 볼륨 조절 가능
 */
import { useCallback, useRef } from "react"

// 알림음 타입
export type NotificationSoundType = "whisper" | "mention" | "system"

// 알림음 설정
interface SoundConfig {
  frequency: number    // 주파수 (Hz)
  duration: number     // 지속 시간 (초)
  volume: number       // 볼륨 (0-1)
  type: OscillatorType // 파형 타입
}

// 알림음 타입별 설정
const SOUND_CONFIGS: Record<NotificationSoundType, SoundConfig> = {
  // 귓속말: 부드럽고 짧은 "띵" 소리 (LoL 스타일)
  whisper: {
    frequency: 880,     // A5 음 (부드러운 높은 톤)
    duration: 0.12,     // 120ms (짧게)
    volume: 0.15,       // 15% 볼륨 (미약함)
    type: "sine",       // 부드러운 사인파
  },
  // 멘션: 조금 더 눈에 띄는 소리
  mention: {
    frequency: 1046,    // C6 음
    duration: 0.15,
    volume: 0.2,
    type: "sine",
  },
  // 시스템: 낮고 짧은 톤
  system: {
    frequency: 440,     // A4 음
    duration: 0.1,
    volume: 0.1,
    type: "sine",
  },
}

export function useNotificationSound() {
  // AudioContext 참조 (lazy initialization)
  const audioContextRef = useRef<AudioContext | null>(null)
  // 마지막 재생 시간 (중복 방지)
  const lastPlayTimeRef = useRef<number>(0)

  // AudioContext 초기화 (사용자 상호작용 후에만 동작)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // 알림음 재생
  const playSound = useCallback((type: NotificationSoundType = "whisper") => {
    // 너무 빠른 연속 재생 방지 (100ms 쿨다운)
    const now = Date.now()
    if (now - lastPlayTimeRef.current < 100) {
      return
    }
    lastPlayTimeRef.current = now

    try {
      const audioContext = getAudioContext()

      // AudioContext가 suspended 상태면 resume
      if (audioContext.state === "suspended") {
        audioContext.resume()
      }

      const config = SOUND_CONFIGS[type]
      const currentTime = audioContext.currentTime

      // 오실레이터 생성 (소리 생성기)
      const oscillator = audioContext.createOscillator()
      oscillator.type = config.type
      oscillator.frequency.setValueAtTime(config.frequency, currentTime)

      // 게인 노드 생성 (볼륨 조절)
      const gainNode = audioContext.createGain()

      // 페이드 인/아웃으로 부드러운 소리
      gainNode.gain.setValueAtTime(0, currentTime)
      gainNode.gain.linearRampToValueAtTime(config.volume, currentTime + 0.01) // 10ms 페이드 인
      gainNode.gain.linearRampToValueAtTime(0, currentTime + config.duration)  // 페이드 아웃

      // 노드 연결: 오실레이터 → 게인 → 출력
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // 재생
      oscillator.start(currentTime)
      oscillator.stop(currentTime + config.duration)

      // 메모리 정리
      oscillator.onended = () => {
        oscillator.disconnect()
        gainNode.disconnect()
      }
    } catch {
      // 오디오 재생 실패는 무시 (브라우저 정책 등)
      console.debug("[NotificationSound] Failed to play sound")
    }
  }, [getAudioContext])

  // 귓속말 알림음 (편의 함수)
  const playWhisperSound = useCallback(() => {
    playSound("whisper")
  }, [playSound])

  // 멘션 알림음 (편의 함수)
  const playMentionSound = useCallback(() => {
    playSound("mention")
  }, [playSound])

  // 시스템 알림음 (편의 함수)
  const playSystemSound = useCallback(() => {
    playSound("system")
  }, [playSound])

  return {
    playSound,
    playWhisperSound,
    playMentionSound,
    playSystemSound,
  }
}
