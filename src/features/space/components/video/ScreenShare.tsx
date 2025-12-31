"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Text, Button } from "@/components/ui"
import { useScreenRecorder } from "../../hooks"
import type { ParticipantTrack } from "../../livekit/types"

const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// 🔧 PIP 원리 기반 크기 계산 유틸리티
// ============================================
interface DisplayDimensions {
  width: number
  height: number
}

/**
 * 비디오 비율을 유지하면서 컨테이너에 맞는 크기 계산
 * PIP가 작동하는 핵심 원리와 동일
 */
function calculateFitSize(
  videoWidth: number,
  videoHeight: number,
  maxWidth: number,
  maxHeight: number
): DisplayDimensions {
  if (videoWidth <= 0 || videoHeight <= 0) {
    return { width: maxWidth, height: maxHeight }
  }

  const videoRatio = videoWidth / videoHeight
  const containerRatio = maxWidth / maxHeight

  if (videoRatio > containerRatio) {
    // 비디오가 컨테이너보다 넓음 → width 기준으로 맞춤
    return {
      width: maxWidth,
      height: Math.round(maxWidth / videoRatio),
    }
  } else {
    // 비디오가 컨테이너보다 높음 → height 기준으로 맞춤
    return {
      width: Math.round(maxHeight * videoRatio),
      height: maxHeight,
    }
  }
}

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
// Icons
// ============================================
const CloseIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const FullscreenIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)

const PipIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8M3 17V7a2 2 0 012-2h6" />
    <rect x="3" y="13" width="8" height="6" rx="1" strokeWidth={2} />
  </svg>
)

const RecordIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" />
  </svg>
)

const StopIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
)

const VolumeHighIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
)

const VolumeLowIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
  </svg>
)

const VolumeMuteIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
)

// ============================================
// ScreenShare Props
// ============================================
interface ScreenShareProps {
  track: ParticipantTrack
  onClose?: () => void
  className?: string
  /** 🎬 녹화 권한 (STAFF/OWNER/SuperAdmin) */
  canRecord?: boolean
  /** 🏷️ 공간 이름 (녹화 파일명용) */
  spaceName?: string
  /** 🔊 오디오 트랙 (화면+음성 녹화용) - 레거시 */
  audioTrack?: MediaStreamTrack
  /** 🎤 모든 참가자의 오디오 트랙 (녹화 시 믹싱용) */
  allAudioTracks?: MediaStreamTrack[]
}

// ============================================
// ScreenShare Component
// Large view for screen share presentations
// ============================================
export function ScreenShare({
  track,
  onClose,
  className,
  canRecord = false,
  spaceName = "recording",
  audioTrack,
  allAudioTracks = [],
}: ScreenShareProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPipActive, setIsPipActive] = useState(false)

  // 🔊 볼륨 상태 (화면 공유별 localStorage 저장)
  const volumeStorageKey = `flow-screenshare-volume-${track.participantId}`
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

  // 🔧 PIP 원리 기반: 비디오 원본 크기
  const [videoNativeSize, setVideoNativeSize] = useState<{ width: number; height: number } | null>(null)
  // 윈도우 리사이즈 트리거용 상태 (lazy init으로 초기값 설정)
  const [windowSize, setWindowSize] = useState(() => {
    if (typeof window === "undefined") return { width: 0, height: 0 }
    return { width: window.innerWidth, height: window.innerHeight }
  })

  // Check PIP availability (lazy initialization for client-side only)
  const [canPip] = useState(() => {
    if (typeof document === "undefined") return false
    return !!document.pictureInPictureEnabled
  })

  // 🎬 녹화 훅
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
        console.error("[ScreenShare] Recording error:", err)
      }
    },
  })

  const isRecording = recordingState === "recording" || recordingState === "paused"

  // 🔧 displaySize를 useMemo로 계산 (setState 없이 파생 상태)
  const displaySize = useMemo<DisplayDimensions | null>(() => {
    if (!videoNativeSize || windowSize.width === 0) return null

    const padding = 64 // 좌우상하 패딩 (32px * 2)
    const maxWidth = windowSize.width - padding
    const maxHeight = windowSize.height - padding

    const newSize = calculateFitSize(
      videoNativeSize.width,
      videoNativeSize.height,
      maxWidth,
      maxHeight
    )

    if (IS_DEV) {
      console.log("[ScreenShare] Size calculated:", {
        videoNative: videoNativeSize,
        viewport: windowSize,
        display: newSize,
      })
    }

    return newSize
  }, [videoNativeSize, windowSize])

  // Attach screen track to video element + 원본 크기 추출
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (track.screenTrack) {
      // 비디오 스트림 연결
      const stream = new MediaStream([track.screenTrack])
      video.srcObject = stream

      // 🔧 loadedmetadata 이벤트 콜백에서만 크기 설정 (React 19 규칙 준수)
      const handleLoadedMetadata = () => {
        const { videoWidth, videoHeight } = video
        if (videoWidth > 0 && videoHeight > 0) {
          setVideoNativeSize({ width: videoWidth, height: videoHeight })
          if (IS_DEV) {
            console.log("[ScreenShare] Video metadata size:", {
              width: videoWidth,
              height: videoHeight,
            })
          }
          return
        }
        // 백업: track settings에서 크기 가져오기
        const settings = track.screenTrack?.getSettings()
        if (settings?.width && settings?.height) {
          setVideoNativeSize({ width: settings.width, height: settings.height })
          if (IS_DEV) {
            console.log("[ScreenShare] 🎯 Track settings size:", {
              width: settings.width,
              height: settings.height,
            })
          }
        }
      }

      video.addEventListener("loadedmetadata", handleLoadedMetadata)
      if (video.readyState >= 1 && video.videoWidth > 0) {
        video.dispatchEvent(new Event("loadedmetadata"))
      }

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata)
        video.srcObject = null
        video.load()
      }
    } else {
      video.srcObject = null
      video.load()
    }
  }, [track.screenTrack])

  // 🔧 윈도우 리사이즈 시 windowSize 상태 업데이트
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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
        console.log("[ScreenShare] Entered PIP mode for:", track.participantName)
      }
    }
    const handleLeavePip = () => {
      setIsPipActive(false)
      if (IS_DEV) {
        console.log("[ScreenShare] Left PIP mode for:", track.participantName)
      }
    }

    video.addEventListener("enterpictureinpicture", handleEnterPip)
    video.addEventListener("leavepictureinpicture", handleLeavePip)

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPip)
      video.removeEventListener("leavepictureinpicture", handleLeavePip)
    }
  }, [track.participantName])

  // 컨테이너를 전체화면으로
  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
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
      console.error("[ScreenShare] PIP toggle error:", error)
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
        : audioTrack ? [audioTrack] : []
      await startRecording(track.screenTrack, audioTracksToRecord)
    }
  }, [isRecording, track.screenTrack, audioTrack, allAudioTracks, startRecording, stopRecording])

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

  const handleToggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    localStorage.setItem(`${volumeStorageKey}-muted`, newMuted.toString())
  }, [isMuted, volumeStorageKey])

  // 🔊 볼륨/음소거 상태를 비디오 요소에 적용
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = isMuted ? 0 : volume
    video.muted = isMuted
  }, [volume, isMuted])

  if (!track.screenTrack) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-lg bg-black",
        isFullscreen && "fixed inset-0 z-50 flex items-center justify-center",
        className
      )}
    >
      {/* Screen share video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          display: "block",
          width: displaySize ? `${displaySize.width}px` : "80vw",
          height: displaySize ? `${displaySize.height}px` : "auto",
          maxWidth: isFullscreen ? "100vw" : "calc(100vw - 64px)",
          maxHeight: isFullscreen ? "100vh" : "calc(100vh - 64px)",
          objectFit: "contain",
        }}
        className="rounded-lg"
      />

      {/* 🔴 녹화 중 표시 - 화면 좌상단 */}
      {isRecording && (
        <div className="absolute left-3 top-12 flex items-center gap-2 rounded-md bg-red-600/90 px-3 py-1.5 text-white shadow-lg">
          <div className="size-2.5 animate-pulse rounded-full bg-white" />
          <Text size="sm" className="font-medium tracking-wider">
            REC {formatRecordingTime(recordingTime)}
          </Text>
        </div>
      )}

      {/* Header overlay */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between rounded-t-lg bg-linear-to-b from-black/70 to-transparent p-3">
        <div className="flex items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-red-500" />
          <Text size="sm" className="text-white">
            {track.participantName}님의 화면 공유
          </Text>
        </div>
        <div className="flex items-center gap-1">
          {/* 🔊 볼륨 조절 */}
          <div className="group/volume relative flex items-center">
            {/* 음소거 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMute}
              className={cn(
                "size-8 p-0 text-white hover:bg-white/20",
                isMuted && "text-red-400"
              )}
              title={isMuted ? "음소거 해제" : "음소거"}
              aria-label={isMuted ? "음소거 해제" : "음소거"}
            >
              {isMuted ? <VolumeMuteIcon /> : volume > 0.5 ? <VolumeHighIcon /> : <VolumeLowIcon />}
            </Button>
            {/* 볼륨 슬라이더 (호버 시 표시) */}
            <div className="absolute right-full mr-1 hidden items-center rounded bg-black/80 px-2 py-1 group-hover/volume:flex">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="h-1 w-24 cursor-pointer accent-primary"
                title={`볼륨: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                aria-label="화면 공유 볼륨 조절"
              />
              <span className="ml-2 w-10 text-xs text-white">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
          {/* 🎬 녹화 버튼 - 권한이 있을 때만 표시 */}
          {canRecord && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleRecording}
              disabled={recordingState === "stopping"}
              className={cn(
                "size-8 p-0 text-white hover:bg-white/20",
                isRecording && "bg-red-600/80 hover:bg-red-600"
              )}
              title={isRecording ? "녹화 중지" : "녹화 시작"}
              aria-label={isRecording ? "화면 녹화 중지" : "화면 녹화 시작"}
            >
              {isRecording ? <StopIcon /> : <RecordIcon />}
            </Button>
          )}
          {/* PIP Button */}
          {canPip && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePip}
              className={cn(
                "size-8 p-0 text-white hover:bg-white/20",
                isPipActive && "bg-primary/60 hover:bg-primary/80"
              )}
              title={isPipActive ? "PIP 종료" : "PIP 모드"}
              aria-label={isPipActive ? "PIP 모드 종료" : "PIP 모드 시작"}
            >
              <PipIcon />
            </Button>
          )}
          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="size-8 p-0 text-white hover:bg-white/20"
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
            aria-label={isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
          >
            <FullscreenIcon />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 text-white hover:bg-white/20"
              title="닫기"
              aria-label="화면 공유 닫기"
            >
              <CloseIcon />
            </Button>
          )}
        </div>
      </div>

      {/* 🎬 OSD 알림 (자동 사라짐) - 화면 상단 중앙 */}
      {notification && (
        <div
          className={cn(
            "absolute left-1/2 top-4 z-20 -translate-x-1/2 flex items-center justify-between gap-2 rounded-md px-4 py-2 text-white shadow-lg backdrop-blur-sm transition-all duration-300",
            notification.type === "success" && "bg-green-600/90",
            notification.type === "info" && "bg-blue-600/90",
            notification.type === "error" && "bg-red-600/90"
          )}
        >
          <Text size="sm" className="font-medium">
            {notification.message}
          </Text>
          <button
            onClick={clearNotification}
            className="shrink-0 rounded p-0.5 hover:bg-white/20"
            aria-label="알림 닫기"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 녹화 에러 표시 (영구 - 명시적 확인 필요) */}
      {recordingError && !notification && (
        <div className="absolute bottom-3 left-3 right-3 z-10 rounded-md bg-red-600/90 px-3 py-2 text-white shadow-lg">
          <Text size="sm">{recordingError}</Text>
        </div>
      )}
    </div>
  )
}

// ============================================
// ScreenShareOverlay Component
// Modal overlay for prominent screen share display
// ============================================
interface ScreenShareOverlayProps {
  track: ParticipantTrack
  onClose: () => void
  /** 🎬 녹화 권한 (STAFF/OWNER/SuperAdmin) */
  canRecord?: boolean
  /** 🏷️ 공간 이름 (녹화 파일명용) */
  spaceName?: string
  /** 🔊 오디오 트랙 (화면+음성 녹화용) - 레거시 */
  audioTrack?: MediaStreamTrack
  /** 🎤 모든 참가자의 오디오 트랙 (녹화 시 믹싱용) */
  allAudioTracks?: MediaStreamTrack[]
}

export function ScreenShareOverlay({
  track,
  onClose,
  canRecord,
  spaceName,
  audioTrack,
  allAudioTracks,
}: ScreenShareOverlayProps) {
  if (!track.screenTrack) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <ScreenShare
        track={track}
        onClose={onClose}
        canRecord={canRecord}
        spaceName={spaceName}
        audioTrack={audioTrack}
        allAudioTracks={allAudioTracks}
      />
    </div>
  )
}
