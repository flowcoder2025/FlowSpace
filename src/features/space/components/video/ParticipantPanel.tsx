"use client"

import { cn } from "@/lib/utils"
import { VStack, Text } from "@/components/ui"
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

  const participantCount = tracks.length

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <Text weight="semibold" size="sm">참가자</Text>
        <Text size="xs" tone="muted">{participantCount}명</Text>
      </div>

      {/* Participant Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <VStack gap="sm">
          {/* 화면공유 타일 (있을 경우 상단에 표시) */}
          {screenShareTracks.length > 0 && (
            <>
              {screenShareTracks.map((track) => (
                <VideoTile
                  key={`${track.participantId}-screen`}
                  track={track}
                  isLocal={track.participantId === localParticipantId}
                  isScreenShare
                  className="ring-2 ring-primary/50"
                />
              ))}
              <div className="border-t border-border" />
            </>
          )}

          {/* 일반 참가자 타일 */}
          {participantCount === 0 ? (
            <Text tone="muted" size="sm" className="py-8 text-center">
              참가자가 없습니다
            </Text>
          ) : (
            tracks.map((track) => (
              <VideoTile
                key={track.participantId}
                track={track}
                isLocal={track.participantId === localParticipantId}
              />
            ))
          )}
        </VStack>
      </div>
    </div>
  )
}
