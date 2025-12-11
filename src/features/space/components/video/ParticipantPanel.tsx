"use client"

import { cn } from "@/lib/utils"
import { VideoTile } from "./VideoTile"
import type { ParticipantTrack } from "../../livekit/types"

// ============================================
// ParticipantPanel Props
// ============================================
interface ParticipantPanelProps {
  participantTracks: Map<string, ParticipantTrack>
  localParticipantId: string | null
  className?: string
}

// ============================================
// ParticipantPanel Component
// ZEP 스타일: 헤더 없이 비디오 타일만 플로팅으로 표시
// ============================================
export function ParticipantPanel({
  participantTracks,
  localParticipantId,
  className,
}: ParticipantPanelProps) {
  // Convert Map to array and sort (local first)
  const tracks = Array.from(participantTracks.values()).sort((a, b) => {
    if (a.participantId === localParticipantId) return -1
    if (b.participantId === localParticipantId) return 1
    return a.participantName.localeCompare(b.participantName)
  })

  // 화면공유 중인 참가자 필터링
  const screenShareTracks = tracks.filter((track) => track.screenTrack)

  if (tracks.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-col gap-2 p-2", className)}>
      {/* 화면공유 타일 (있을 경우 상단에 표시) */}
      {screenShareTracks.length > 0 && (
        <>
          {screenShareTracks.map((track) => (
            <VideoTile
              key={`${track.participantId}-screen-${track.revision ?? 0}`}
              track={track}
              isLocal={track.participantId === localParticipantId}
              isScreenShare
              className="ring-2 ring-primary/50"
            />
          ))}
        </>
      )}

      {/* 일반 참가자 타일 */}
      {tracks.map((track) => (
        <VideoTile
          key={`${track.participantId}-${track.revision ?? 0}`}
          track={track}
          isLocal={track.participantId === localParticipantId}
        />
      ))}
    </div>
  )
}
