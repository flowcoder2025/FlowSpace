/**
 * LiveKit Types
 * Type definitions for video/audio communication
 */

export interface LiveKitConfig {
  serverUrl: string
  roomName: string
  participantName: string
  participantId: string
}

export interface MediaState {
  isCameraEnabled: boolean
  isMicrophoneEnabled: boolean
  isScreenShareEnabled: boolean
}

export interface ParticipantTrack {
  participantId: string
  participantName: string
  videoTrack?: MediaStreamTrack
  audioTrack?: MediaStreamTrack
  screenTrack?: MediaStreamTrack
  isSpeaking: boolean
  /** 🔧 비디오 트랙 mute 상태 (VideoTile에서 placeholder 표시용) */
  isVideoMuted?: boolean
  /** 🔧 오디오 트랙 mute 상태 */
  isAudioMuted?: boolean
  /** 🔧 화면공유 트랙 mute 상태 */
  isScreenMuted?: boolean
  /** 🔧 트랙 상태 변경 시 React 재렌더링 트리거용 revision 카운터 */
  revision?: number
  /** 🎨 아바타 색상 (VideoTile 플레이스홀더에서 캐릭터 스프라이트 표시용) */
  avatarColor?: string
}
