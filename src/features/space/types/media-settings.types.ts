/**
 * Media Settings Types
 *
 * 음성 및 비디오 고급 설정을 위한 타입 정의
 * - 오디오: 잡음 제거, 에코 제거, 자동 게인, 입력 감도
 * - 비디오: 해상도, 프레임레이트, 미러 모드
 */

// ============================================
// Audio Settings
// ============================================

/**
 * 오디오 처리 설정
 */
export interface AudioProcessingSettings {
  /** 잡음 제거 (WebRTC 기본) */
  noiseSuppression: boolean
  /** 에코 제거 (WebRTC 기본) */
  echoCancellation: boolean
  /** 자동 게인 조절 (WebRTC 기본) */
  autoGainControl: boolean
  /** 고급 음성 분리 - 실험적, 브라우저 지원 제한적 */
  voiceIsolation: boolean
}

/**
 * 오디오 볼륨 및 감도 설정
 */
export interface AudioVolumeSettings {
  /** 입력 볼륨 (0-100) */
  inputVolume: number
  /** 출력 볼륨 (0-100) */
  outputVolume: number
  /** 입력 감도 임계값 (0-100, 낮을수록 민감) */
  inputSensitivity: number
}

/**
 * 전체 오디오 설정
 */
export interface AudioSettings extends AudioProcessingSettings, AudioVolumeSettings {
  /** 선택된 입력 장치 ID */
  selectedInputDeviceId: string | null
  /** 선택된 출력 장치 ID */
  selectedOutputDeviceId: string | null
}

/**
 * 오디오 설정 기본값
 */
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  // 처리 옵션 (기본 활성화)
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  voiceIsolation: false, // 실험적이므로 기본 비활성화

  // 볼륨 설정
  inputVolume: 100,
  outputVolume: 100,
  inputSensitivity: 50, // 중간 감도

  // 장치 선택 (null = 시스템 기본)
  selectedInputDeviceId: null,
  selectedOutputDeviceId: null,
}

// ============================================
// Video Settings
// ============================================

/**
 * 비디오 해상도 프리셋
 */
export type VideoResolutionPreset = "480p" | "720p" | "1080p"

/**
 * 비디오 해상도 상세
 */
export interface VideoResolution {
  width: number
  height: number
  label: string
}

/**
 * 해상도 프리셋 매핑
 */
export const VIDEO_RESOLUTION_PRESETS: Record<VideoResolutionPreset, VideoResolution> = {
  "480p": { width: 640, height: 480, label: "480p (SD)" },
  "720p": { width: 1280, height: 720, label: "720p (HD)" },
  "1080p": { width: 1920, height: 1080, label: "1080p (Full HD)" },
}

/**
 * 프레임레이트 옵션
 */
export type FrameRateOption = 15 | 24 | 30 | 60

/**
 * 프레임레이트 옵션 목록
 */
export const FRAME_RATE_OPTIONS: { value: FrameRateOption; label: string }[] = [
  { value: 15, label: "15 fps (저사양)" },
  { value: 24, label: "24 fps (영화)" },
  { value: 30, label: "30 fps (표준)" },
  { value: 60, label: "60 fps (부드러움)" },
]

/**
 * 카메라 방향 (모바일)
 */
export type FacingMode = "user" | "environment"

/**
 * 전체 비디오 설정
 */
export interface VideoSettings {
  /** 선택된 카메라 장치 ID */
  selectedDeviceId: string | null
  /** 해상도 프리셋 */
  resolution: VideoResolutionPreset
  /** 프레임레이트 */
  frameRate: FrameRateOption
  /** 카메라 방향 (모바일) */
  facingMode: FacingMode
  /** 미러 모드 (셀카 좌우 반전) */
  mirrorMode: boolean
}

/**
 * 비디오 설정 기본값
 */
export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  selectedDeviceId: null, // 시스템 기본
  resolution: "480p", // 가벼운 기본값 (현재 설정과 동일)
  frameRate: 24, // 현재 설정과 동일
  facingMode: "user", // 전면 카메라 (셀카)
  mirrorMode: true, // 셀카 미러링 기본 활성화
}

// ============================================
// Combined Settings
// ============================================

/**
 * 전체 미디어 설정
 */
export interface MediaSettings {
  audio: AudioSettings
  video: VideoSettings
}

/**
 * 전체 미디어 설정 기본값
 */
export const DEFAULT_MEDIA_SETTINGS: MediaSettings = {
  audio: DEFAULT_AUDIO_SETTINGS,
  video: DEFAULT_VIDEO_SETTINGS,
}

// ============================================
// Microphone Test Types
// ============================================

/**
 * 마이크 테스트 상태
 */
export type MicrophoneTestState =
  | "idle"      // 대기 중
  | "recording" // 녹음 중
  | "recorded"  // 녹음 완료 (재생 대기)
  | "playing"   // 재생 중

/**
 * 마이크 테스트 설정
 */
export const MICROPHONE_TEST_DURATION_MS = 5000 // 5초 녹음

// ============================================
// Storage Keys
// ============================================

export const STORAGE_KEYS = {
  AUDIO_SETTINGS: "flowspace-audio-settings",
  VIDEO_SETTINGS: "flowspace-video-settings",
} as const

// ============================================
// LiveKit Capture Options Helpers
// ============================================

/**
 * AudioSettings를 LiveKit AudioCaptureOptions로 변환
 */
export function toAudioCaptureOptions(settings: AudioSettings): {
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  deviceId?: string
} {
  return {
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
    ...(settings.selectedInputDeviceId && {
      deviceId: settings.selectedInputDeviceId,
    }),
  }
}

/**
 * VideoSettings를 LiveKit VideoCaptureOptions로 변환
 */
export function toVideoCaptureOptions(settings: VideoSettings): {
  resolution: { width: number; height: number; frameRate: number }
  facingMode?: FacingMode
  deviceId?: string
} {
  const preset = VIDEO_RESOLUTION_PRESETS[settings.resolution]

  return {
    resolution: {
      width: preset.width,
      height: preset.height,
      frameRate: settings.frameRate,
    },
    facingMode: settings.facingMode,
    ...(settings.selectedDeviceId && {
      deviceId: settings.selectedDeviceId,
    }),
  }
}
