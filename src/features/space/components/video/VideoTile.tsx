"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Text, Button } from "@/components/ui"
import { useScreenRecorder } from "../../hooks"
import type { ParticipantTrack } from "../../livekit/types"

const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// Icons
// ============================================
const MicOffIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
)

const CameraOffIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
  </svg>
)

const ScreenShareIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm14 0H4v8h12V6z" />
  </svg>
)

const SpeakingIcon = () => (
  <svg className="size-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
  </svg>
)

const AudioBlockedIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12 7a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
)

const FullscreenIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)

const ExitFullscreenIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
  </svg>
)

const PipIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8M3 17V7a2 2 0 012-2h6" />
    <rect x="3" y="13" width="8" height="6" rx="1" strokeWidth={2} />
  </svg>
)

const RecordIcon = () => (
  <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" />
  </svg>
)

const StopIcon = () => (
  <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
)

const VolumeHighIcon = () => (
  <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
)

const VolumeLowIcon = () => (
  <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
  </svg>
)

const VolumeMuteIcon = () => (
  <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
)

/**
 * 녹화 시간 포맷 (MM:SS 또는 HH:MM:SS)
 */
function formatRecordingTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

// ============================================
// VideoTile Props
// ============================================
interface VideoTileProps {
  track: ParticipantTrack
  isLocal?: boolean
  isScreenShare?: boolean  // 화면공유 전용 타일
  className?: string
  /** 🎬 녹화 권한 (본인 화면 공유일 때만 적용) */
  canRecord?: boolean
  /** 🏷️ 공간 이름 (녹화 파일명용) */
  spaceName?: string
  /** 🎤 모든 참가자의 오디오 트랙 (녹화 시 믹싱용) */
  allAudioTracks?: MediaStreamTrack[]
  /** 🔊 전역 출력 볼륨 (0-100, 개별 볼륨과 곱해짐) */
  globalOutputVolume?: number
  /** 🪞 로컬 비디오 미러 모드 */
  mirrorLocalVideo?: boolean
}

// ============================================
// VideoTile Component
// ============================================
export function VideoTile({
  track,
  isLocal = false,
  isScreenShare = false,
  className,
  canRecord = false,
  spaceName = "recording",
  allAudioTracks = [],
  globalOutputVolume = 100,
  mirrorLocalVideo = true,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPipActive, setIsPipActive] = useState(false)
  const [showControls, setShowControls] = useState(false)

  // 🔊 볼륨 상태 (참가자별 localStorage 저장)
  const volumeStorageKey = `flow-volume-${track.participantId}`
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 1
    const saved = localStorage.getItem(volumeStorageKey)
    return saved ? parseFloat(saved) : 1
  })
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return false
    const saved = localStorage.getItem(`${volumeStorageKey}-muted`)
    return saved === "true"
  })
  // 볼륨바는 타일 호버 시 하단에 표시 (showControls로 통합)

  // 🎬 녹화 훅 (본인 화면 공유일 때만 사용)
  const {
    recordingState,
    recordingTime,
    startRecording,
    stopRecording,
    error: recordingError,
    notification,
    clearNotification,
  } = useScreenRecorder({
    spaceName,
    notificationDuration: 4000, // 4초 후 자동 사라짐
    onError: (err) => {
      if (IS_DEV) {
        console.error("[VideoTile] Recording error:", err)
      }
    },
  })

  const isRecording = recordingState === "recording" || recordingState === "paused"
  // 🔧 화면공유 녹화: 본인/타인 구분 없이 권한만 있으면 녹화 가능
  const showRecordButton = isScreenShare && canRecord

  // 화면공유 모드일 때는 screenTrack, 아니면 videoTrack 사용
  const activeVideoTrack = isScreenShare ? track.screenTrack : track.videoTrack

  // 오디오 재생 시도 함수 (볼륨도 함께 적용)
  // 📌 전역 출력 볼륨(globalOutputVolume)과 개별 볼륨을 곱함
  const tryPlayAudio = useCallback(async () => {
    if (!audioRef.current || !track.audioTrack || isLocal) return

    // 개별 볼륨 * 전역 볼륨 (둘 다 0-1 범위로 변환)
    const effectiveVolume = (volume * globalOutputVolume) / 100

    // 🔧 재생 전에 볼륨 먼저 설정 (브라우저에 따라 srcObject 후 즉시 적용 필요)
    audioRef.current.volume = isMuted ? 0 : effectiveVolume

    try {
      await audioRef.current.play()
      setAudioBlocked(false)
      // 🔧 재생 성공 후에도 볼륨 다시 확인 적용 (일부 브라우저 이슈 대응)
      audioRef.current.volume = isMuted ? 0 : effectiveVolume
      if (IS_DEV) {
        console.log("[VideoTile] Audio playback started for:", track.participantName, {
          volume: audioRef.current.volume,
          isMuted,
          globalOutputVolume,
        })
      }
    } catch (error) {
      // NotAllowedError = 브라우저 autoplay 정책에 의해 차단됨
      if ((error as Error).name === "NotAllowedError") {
        console.warn("[VideoTile] Audio playback blocked by browser policy. Click anywhere to enable.")
        setAudioBlocked(true)
      } else {
        console.error("[VideoTile] Audio playback error:", error)
      }
    }
  }, [track.audioTrack, track.participantName, isLocal, volume, isMuted, globalOutputVolume])

  // 🔧 비디오 엘리먼트 클리어 헬퍼 (브라우저 버퍼 완전 해제)
  const clearVideoElement = useCallback((video: HTMLVideoElement) => {
    video.srcObject = null
    // 🔧 load()를 호출해야 브라우저가 마지막 프레임 버퍼를 완전히 해제
    video.load()
  }, [])

  // 🔧 트랙이 존재하고 아직 live 상태이며 muted가 아닌 경우만 비디오 표시
  // isVideoMuted/isScreenMuted 플래그를 우선 체크하여 mute 상태에서 마지막 프레임 표시 방지
  // 🔧 로컬 사용자는 muted 체크 건너뜀 (자신의 카메라는 항상 표시)
  const isTrackMuted = isScreenShare ? track.isScreenMuted : track.isVideoMuted

  // 🔑 핵심 개선: 실제 MediaStreamTrack 상태가 가장 신뢰할 수 있는 소스
  // isTrackMuted 플래그가 동기화 지연으로 부정확할 수 있으므로
  // 트랙이 실제로 활성 상태(enabled + live)이면 isTrackMuted 무시
  const isTrackActuallyLive = activeVideoTrack &&
    activeVideoTrack.enabled &&
    activeVideoTrack.readyState === "live"

  const shouldShowVideo = !!activeVideoTrack &&
    activeVideoTrack.readyState !== "ended" &&
    (isLocal || !isTrackMuted || isTrackActuallyLive)

  // Attach video track to video element
  // 🔑 mute 상태 변화 및 revision 변경도 의존성에 포함하여 재실행
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // 트랙이 없거나 muted 상태면 스트림 해제
    if (!shouldShowVideo) {
      clearVideoElement(video)
      if (IS_DEV) {
        console.log("[VideoTile] Clearing video for:", track.participantName, track.participantId, {
          hasTrack: !!activeVideoTrack,
          isTrackMuted,
          isTrackActuallyLive,
          shouldShowVideo,
          revision: track.revision,
        })
      }
      return
    }

    // 새 스트림 설정 (cleanup에서 이미 clearVideoElement 호출했으므로 srcObject=null 불필요)
    const stream = new MediaStream([activeVideoTrack])
    video.srcObject = stream

    // 🔧 명시적 play() 호출 - 같은 MediaStreamTrack이 재사용될 때 autoPlay가 동작하지 않는 문제 해결
    video.play().catch((err) => {
      // NotAllowedError: autoplay 정책에 의해 차단 (사용자 인터랙션 필요)
      // AbortError: useEffect 재실행으로 인한 중단 (정상 동작)
      if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
        console.error("[VideoTile] Video play error:", err)
      }
    })

    if (IS_DEV) {
      console.log("[VideoTile] Video track attached for:", track.participantName, track.participantId, {
        trackId: activeVideoTrack.id,
        enabled: activeVideoTrack.enabled,
        readyState: activeVideoTrack.readyState,
        isScreenShare,
        isTrackMuted,
        isTrackActuallyLive,
        revision: track.revision,
      })
    }

    // Handle track ended event (when remote user turns off camera)
    const handleTrackEnded = () => {
      if (IS_DEV) {
        console.log("[VideoTile] Video track ended for:", track.participantName)
      }
      // 🔧 srcObject만 null하면 브라우저가 마지막 프레임을 유지할 수 있음
      clearVideoElement(video)
    }

    activeVideoTrack.addEventListener("ended", handleTrackEnded)

    return () => {
      activeVideoTrack.removeEventListener("ended", handleTrackEnded)
      clearVideoElement(video)
    }
  }, [activeVideoTrack, shouldShowVideo, isTrackMuted, track.participantName, track.participantId, track.revision, isScreenShare, isTrackActuallyLive, clearVideoElement, isLocal])

  // Attach audio track to audio element (for remote participants only)
  // 📌 전역 출력 볼륨(globalOutputVolume)과 개별 볼륨을 곱함
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return

    if (track.audioTrack) {
      const stream = new MediaStream([track.audioTrack])
      audio.srcObject = stream

      // 개별 볼륨 * 전역 볼륨 (둘 다 0-1 범위로 변환)
      const effectiveVolume = (volume * globalOutputVolume) / 100

      // 🔧 스트림 연결 직후 저장된 볼륨 즉시 적용
      audio.volume = isMuted ? 0 : effectiveVolume

      if (IS_DEV) {
        console.log("[VideoTile] Audio track attached for:", track.participantName, {
          trackId: track.audioTrack.id,
          enabled: track.audioTrack.enabled,
          readyState: track.audioTrack.readyState,
          appliedVolume: audio.volume,
          globalOutputVolume,
        })
      }

      // 오디오 재생 시도 - defer to avoid synchronous setState in effect
      void Promise.resolve().then(() => {
        tryPlayAudio()
      })
    } else {
      audio.srcObject = null
      // Defer setState to avoid synchronous setState in effect
      void Promise.resolve().then(() => {
        setAudioBlocked(false)
      })
    }

    return () => {
      audio.srcObject = null
    }
  }, [track.audioTrack, track.participantName, isLocal, tryPlayAudio, volume, isMuted, globalOutputVolume])

  // 🔧 개선된 오디오 재생 시도 - once:true 제거, 지속적 재시도
  useEffect(() => {
    if (!audioBlocked) return

    const handleUserInteraction = () => {
      tryPlayAudio()
    }

    // 사용자 인터랙션 시 오디오 재생 시도 (once 제거 - 성공할 때까지 반복 시도)
    // 📌 touchstart/touchend 추가 - iOS Safari용
    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("touchstart", handleUserInteraction, { passive: true })
    document.addEventListener("touchend", handleUserInteraction, { passive: true })
    document.addEventListener("keydown", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("touchstart", handleUserInteraction)
      document.removeEventListener("touchend", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }
  }, [audioBlocked, tryPlayAudio])

  // 📌 iOS Safari: audio가 실제로 재생되면 audioBlocked 상태 자동 해제
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return

    const handlePlaying = () => {
      if (audioBlocked) {
        setAudioBlocked(false)
        if (IS_DEV) {
          console.log("[VideoTile] Audio now playing, clearing blocked state for:", track.participantName)
        }
      }
    }

    audio.addEventListener("playing", handlePlaying)
    return () => {
      audio.removeEventListener("playing", handlePlaying)
    }
  }, [audioBlocked, isLocal, track.participantName])

  // 🔧 명시적 오디오 활성화 버튼 핸들러
  const handleEnableAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    tryPlayAudio()
  }, [tryPlayAudio])

  // 🔊 볼륨/음소거 핸들러
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume)
    localStorage.setItem(volumeStorageKey, newVolume.toString())
    // 볼륨을 올리면 자동으로 음소거 해제
    if (newVolume > 0 && isMuted) {
      setIsMuted(false)
      localStorage.setItem(`${volumeStorageKey}-muted`, "false")
    }
  }, [volumeStorageKey, isMuted])

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const newMuted = !isMuted
    setIsMuted(newMuted)
    localStorage.setItem(`${volumeStorageKey}-muted`, newMuted.toString())
  }, [isMuted, volumeStorageKey])


  // 🔊 볼륨/음소거 상태를 오디오 요소에 적용
  // 📌 전역 출력 볼륨(globalOutputVolume)과 개별 볼륨을 곱함
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || isLocal) return

    // 개별 볼륨 * 전역 볼륨 (둘 다 0-1 범위로 변환)
    const effectiveVolume = (volume * globalOutputVolume) / 100
    audio.volume = isMuted ? 0 : effectiveVolume
  }, [volume, isMuted, isLocal, globalOutputVolume])

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // PIP change detection
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleEnterPip = () => {
      setIsPipActive(true)
      if (IS_DEV) {
        console.log("[VideoTile] Entered PIP mode for:", track.participantName)
      }
    }
    const handleLeavePip = () => {
      setIsPipActive(false)
      if (IS_DEV) {
        console.log("[VideoTile] Left PIP mode for:", track.participantName)
      }
    }

    video.addEventListener("enterpictureinpicture", handleEnterPip)
    video.addEventListener("leavepictureinpicture", handleLeavePip)

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPip)
      video.removeEventListener("leavepictureinpicture", handleLeavePip)
    }
  }, [track.participantName])

  // Toggle fullscreen handler
  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("[VideoTile] Fullscreen toggle error:", error)
    }
  }, [])

  // Toggle PIP handler
  const handleTogglePip = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture()
      }
    } catch (error) {
      console.error("[VideoTile] PIP toggle error:", error)
    }
  }, [])

  // 🎬 녹화 시작/중지 핸들러 (모든 참가자 오디오 믹싱)
  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording()
    } else if (track.screenTrack) {
      // 모든 참가자의 오디오 트랙을 믹싱하여 녹화
      // allAudioTracks가 비어있으면 현재 트랙의 오디오만 사용 (폴백)
      const audioTracksToRecord = allAudioTracks.length > 0
        ? allAudioTracks
        : track.audioTrack ? [track.audioTrack] : []
      await startRecording(track.screenTrack, audioTracksToRecord)
    }
  }, [isRecording, track.screenTrack, track.audioTrack, allAudioTracks, startRecording, stopRecording])

  // hasAudio, isAudioMuted, canPip는 렌더링에서만 사용
  const hasAudio = !!track.audioTrack
  const isAudioMuted = track.isAudioMuted ?? !hasAudio
  // 🔧 로컬 비디오에서도 PIP 허용 (자신의 비디오를 PIP로 볼 수 있도록)
  const canPip = shouldShowVideo && document.pictureInPictureEnabled

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative aspect-video rounded-lg bg-black",
        // 전체화면이 아닐 때만 overflow-hidden (Portal이 잘리지 않도록)
        !isFullscreen && "overflow-hidden",
        track.isSpeaking && "ring-2 ring-primary ring-offset-2",
        isFullscreen && "fixed inset-0 z-50 aspect-auto rounded-none",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video element - 🔑 항상 렌더링하여 adaptiveStream이 트랙을 활성화할 수 있게 함 */}
      {/* hidden(display:none) 대신 opacity-0 + absolute로 숨김 - IntersectionObserver가 감지할 수 있도록 */}
      {/* 🔧 absolute z-0: 전체화면 시 Portal로 렌더링되는 채팅 오버레이(z-max)가 위에 표시되도록 */}
      {/* z-index는 positioned 요소(relative/absolute/fixed)에만 적용됨 */}
      {/* 🪞 로컬 비디오 + 미러 모드 + 일반 비디오(화면공유 제외)일 때 좌우 반전 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local video to prevent feedback
        className={cn(
          "absolute inset-0 size-full z-0",
          // 🔧 화면 공유는 object-contain (잘리지 않음), 일반 비디오는 object-cover (꽉 채움)
          isScreenShare ? "object-contain bg-black" : "object-cover",
          !shouldShowVideo && "opacity-0 pointer-events-none",
          // 🪞 미러 모드: 로컬 + 일반 비디오(화면공유 제외) + mirrorLocalVideo 활성화
          isLocal && !isScreenShare && mirrorLocalVideo && "scale-x-[-1]"
        )}
      />

      {/* Placeholder - 비디오가 없을 때만 표시 (새 아바타 이미지 + 색상 필터) */}
      {!shouldShowVideo && (
        <div className="flex size-full items-center justify-center bg-black">
          {/* 아바타 색상에 따른 hue-rotate 필터 적용 */}
          {/* 원본 이미지: 청록색(teal, ~180° hue) */}
          <img
            src="/Game.png"
            alt={track.participantName}
            className="size-20 object-contain"
            style={{
              filter: (() => {
                // 원본 청록색(180°)에서 목표 색상으로 회전
                const hueMap: Record<string, number> = {
                  default: 0,     // 청록색 유지
                  red: 180,       // 빨강(0°): 180° 회전
                  green: -60,     // 초록(120°): -60° 회전
                  purple: 90,     // 보라(270°): 90° 회전
                  orange: -150,   // 주황(30°): -150° 회전
                  pink: 150,      // 핑크(330°): 150° 회전
                }
                const hue = hueMap[track.avatarColor || "default"] ?? 0
                return hue !== 0 ? `hue-rotate(${hue}deg)` : undefined
              })(),
            }}
          />
        </div>
      )}

      {/* Audio element (hidden, for remote participants) */}
      {!isLocal && (
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      )}

      {/* 🔴 녹화 중 표시 - 화면 좌상단 */}
      {isRecording && (
        <div className="absolute left-2 top-2 flex items-center gap-2 rounded-md bg-red-600/90 px-2 py-1 text-white shadow-lg">
          <div className="size-2 animate-pulse rounded-full bg-white" />
          <Text size="xs" className="font-medium tracking-wider">
            REC {formatRecordingTime(recordingTime)}
          </Text>
        </div>
      )}

      {/* 🎬 OSD 알림 (자동 사라짐)
          - 전체화면: 전체화면 정중앙에 표시
          - 일반 타일: Portal로 게임 패널(#game-panel) 정중앙에 표시
      */}
      {notification && (() => {
        const osdContent = (
          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-white shadow-lg backdrop-blur-sm transition-all duration-300",
              notification.type === "success" && "bg-green-600/90",
              notification.type === "info" && "bg-blue-600/90",
              notification.type === "error" && "bg-red-600/90",
              // 전체화면: 상단 중앙 (기존 위치)
              isFullscreen && "absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
              // 일반 타일: Portal 타겟 내에서 정중앙
              !isFullscreen && "fixed left-1/2 top-1/2 z-9999 -translate-x-1/2 -translate-y-1/2"
            )}
          >
            <Text size="xs" className="font-medium">
              {notification.message}
            </Text>
            <button
              onClick={clearNotification}
              className="shrink-0 rounded p-0.5 hover:bg-white/20"
              aria-label="알림 닫기"
            >
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )

        // 전체화면: VideoTile 내부에 렌더링
        if (isFullscreen) {
          return osdContent
        }

        // 일반 타일: 게임 패널에 Portal로 렌더링
        const gamePanel = typeof document !== "undefined" ? document.getElementById("game-panel") : null
        if (gamePanel) {
          return createPortal(osdContent, gamePanel)
        }

        // 폴백: 그냥 렌더링
        return osdContent
      })()}

      {/* 녹화 에러 표시 (영구 - 명시적 확인 필요) */}
      {recordingError && !notification && (
        <div className="absolute inset-x-2 top-10 z-10 rounded-md bg-red-600/90 px-3 py-2 text-white shadow-lg">
          <Text size="xs">{recordingError}</Text>
        </div>
      )}

      {/* Video controls overlay (top-right) - visible on hover */}
      {/* 🔧 비디오 유무와 관계없이 항상 렌더링 (전체화면은 비디오 없이도 가능) */}
      <div
        className={cn(
          "absolute right-2 top-2 flex items-center gap-1 transition-opacity duration-200",
          showControls || isFullscreen ? "opacity-100" : "opacity-0"
        )}
      >
        {/* 🎬 녹화 버튼 - 본인 화면 공유일 때만 표시 */}
        {showRecordButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleRecording}
            disabled={recordingState === "stopping"}
            className={cn(
              "size-7 p-0 hover:bg-white/20",
              isRecording ? "text-white bg-red-600/80 hover:bg-red-600" : "text-red-500"
            )}
            title={isRecording ? "녹화 중지" : "녹화 시작"}
            aria-label={isRecording ? "화면 녹화 중지" : "화면 녹화 시작"}
          >
            {isRecording ? <StopIcon /> : <RecordIcon />}
          </Button>
        )}
        {/* PIP Button - 비디오가 있을 때만 */}
        {canPip && (
          <button
            onClick={handleTogglePip}
            className={cn(
              "rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80",
              isPipActive && "bg-primary/80 hover:bg-primary/90"
            )}
            title={isPipActive ? "PIP 종료" : "PIP 모드"}
            aria-label={isPipActive ? "PIP 모드 종료" : "PIP 모드 시작"}
          >
            <PipIcon />
          </button>
        )}
        {/* Fullscreen Button - 항상 표시 */}
        <button
          onClick={handleToggleFullscreen}
          className="rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
          title={isFullscreen ? "전체화면 종료" : "전체화면"}
          aria-label={isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>

      {/* Overlay info (bottom) */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2">
        {/* 🔊 볼륨바 - 원격 참가자 + 호버 시에만 표시 */}
        {!isLocal && hasAudio && (
          <div
            className={cn(
              "mb-2 flex items-center gap-2 transition-all duration-200",
              showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            )}
          >
            <button
              onClick={handleToggleMute}
              className="shrink-0 text-white/80 hover:text-white transition-colors"
              title={isMuted ? "음소거 해제" : "음소거"}
              aria-label={isMuted ? "음소거 해제" : "음소거"}
            >
              {isMuted ? <VolumeMuteIcon /> : volume > 0.5 ? <VolumeHighIcon /> : <VolumeLowIcon />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-primary
                [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-125
                [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
              title={`볼륨: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              aria-label="볼륨 조절"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="shrink-0 w-8 text-xs text-white/80 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {track.isSpeaking && (
              <div className="rounded bg-primary/80 p-0.5 text-white">
                <SpeakingIcon />
              </div>
            )}
            <Text size="xs" className="truncate text-white">
              {track.participantName}
              {isLocal && " (나)"}
              {isScreenShare && " - 화면공유"}
            </Text>
          </div>
          <div className="flex items-center gap-1">
            {audioBlocked && (
              <button
                onClick={handleEnableAudio}
                className="flex items-center gap-1 rounded bg-warning/90 px-1.5 py-0.5 text-xs font-medium text-white transition-colors hover:bg-warning"
                title="클릭하여 오디오 활성화"
                aria-label="오디오 활성화"
              >
                <AudioBlockedIcon />
                <span>소리 켜기</span>
              </button>
            )}
            {isAudioMuted && (
              <div className="rounded bg-destructive/80 p-0.5 text-white">
                <MicOffIcon />
              </div>
            )}
            {!shouldShowVideo && (
              <div className="rounded bg-muted-foreground/80 p-0.5 text-white">
                <CameraOffIcon />
              </div>
            )}
            {track.screenTrack && (
              <div className="rounded bg-primary/80 p-0.5 text-white">
                <ScreenShareIcon />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
