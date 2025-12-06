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
}
