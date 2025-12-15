"use client"

import { useState, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui"
import { VideoTile } from "./VideoTile"
import type { ParticipantTrack } from "../../livekit/types"

// ============================================
// Types
// ============================================
export type ParticipantViewMode = "sidebar" | "grid" | "hidden"
export type ParticipantSortOrder = "name-asc" | "name-desc"

// ============================================
// Icons
// ============================================
const SidebarIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
)

const GridIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
)

const SortAscIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m0 0l4-4m-4 4l4 4" />
  </svg>
)

const SortDescIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4 4m-4-4l4-4" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const CheckIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

// ============================================
// ParticipantPanel Props
// ============================================
interface ParticipantPanelProps {
  participantTracks: Map<string, ParticipantTrack>
  localParticipantId: string | null
  className?: string
  /** 외부에서 뷰 모드 제어 (선택적) */
  viewMode?: ParticipantViewMode
  onViewModeChange?: (mode: ParticipantViewMode) => void
  /** 🎬 녹화 권한 (본인 화면 공유 녹화용) */
  canRecord?: boolean
  /** 🏷️ 공간 이름 (녹화 파일명용) */
  spaceName?: string
}

// ============================================
// 그리드 크기 계산 함수
// 참가자 수에 따라 최적의 그리드 레이아웃 계산
// - 1-2명: 2열, 동일한 타일 크기 유지
// - 인원 증가 시 점차 축소
// ============================================
function getGridLayout(count: number): { cols: number; tileSize: string } {
  // 1-2명: 2열 그리드, 동일한 타일 크기 (사이드바 모드와 유사한 크기)
  if (count <= 2) return { cols: 2, tileSize: "aspect-video" }
  if (count <= 4) return { cols: 2, tileSize: "aspect-video" }
  if (count <= 6) return { cols: 3, tileSize: "aspect-video" }
  if (count <= 9) return { cols: 3, tileSize: "aspect-square" }
  if (count <= 12) return { cols: 4, tileSize: "aspect-square" }
  return { cols: 4, tileSize: "aspect-square" } // 12명 초과
}

// ============================================
// 한글/영문 정렬 비교 함수
// ============================================
function compareNames(a: string, b: string, order: ParticipantSortOrder): number {
  // 한글 우선 정렬 (가나다 → ABC)
  const result = a.localeCompare(b, "ko", { sensitivity: "base" })
  return order === "name-asc" ? result : -result
}

// ============================================
// ParticipantPanel Component
// ZEP 스타일: 사이드바/그리드 뷰 전환 지원
// ============================================
export function ParticipantPanel({
  participantTracks,
  localParticipantId,
  className,
  viewMode: externalViewMode,
  onViewModeChange,
  canRecord = false,
  spaceName = "recording",
}: ParticipantPanelProps) {
  // 내부 상태 (외부 제어가 없을 때 사용)
  const [internalViewMode, setInternalViewMode] = useState<ParticipantViewMode>("sidebar")
  const [sortOrder, setSortOrder] = useState<ParticipantSortOrder>("name-asc")

  // 외부 제어 또는 내부 상태 사용
  const viewMode = externalViewMode ?? internalViewMode
  const handleViewModeChange = useCallback((mode: ParticipantViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode)
    } else {
      setInternalViewMode(mode)
    }
  }, [onViewModeChange])

  // 참가자 목록 정렬 (로컬 우선 + 정렬 옵션 적용)
  const sortedTracks = useMemo(() => {
    const tracks = Array.from(participantTracks.values())

    return tracks.sort((a, b) => {
      // 로컬 참가자는 항상 맨 앞
      if (a.participantId === localParticipantId) return -1
      if (b.participantId === localParticipantId) return 1

      // 이름순 정렬
      return compareNames(a.participantName, b.participantName, sortOrder)
    })
  }, [participantTracks, localParticipantId, sortOrder])

  // 화면공유 중인 참가자 필터링
  const screenShareTracks = useMemo(() =>
    sortedTracks.filter((track) => track.screenTrack),
    [sortedTracks]
  )

  // 그리드 레이아웃 계산
  const gridLayout = useMemo(() =>
    getGridLayout(sortedTracks.length),
    [sortedTracks.length]
  )

  if (sortedTracks.length === 0) {
    return null
  }

  // 사이드바 뷰
  if (viewMode === "sidebar") {
    return (
      <div className={cn("flex flex-col", className)}>
        {/* 헤더 - 드롭다운 메뉴 */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-black/30 backdrop-blur-sm rounded-t-lg border-b border-white/10">
          <span className="text-xs text-white/70 font-medium">
            참가자 {sortedTracks.length}
          </span>
          <DropdownMenu onOpenChange={(open) => {
            // 닫힐 때 버튼 포커스 해제 (스페이스바로 재열림 방지)
            // Radix가 포커스를 트리거로 복원한 후에 blur 호출
            if (!open) {
              setTimeout(() => {
                (document.activeElement as HTMLElement)?.blur()
              }, 0)
            }
          }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-white/70 hover:text-white hover:bg-white/10"
              >
                <SidebarIcon />
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-40">
              <DropdownMenuLabel className="text-xs">보기 방식</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => handleViewModeChange("sidebar")}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <SidebarIcon />
                  우측 정렬
                </span>
                {/* sidebar 블록이므로 항상 체크 */}
                <CheckIcon />
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleViewModeChange("grid")}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <GridIcon />
                  그리드 보기
                </span>
                {/* sidebar 블록이므로 grid는 체크 없음 */}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs">정렬</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => setSortOrder("name-asc")}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <SortAscIcon />
                  이름순 (오름차순)
                </span>
                {sortOrder === "name-asc" && <CheckIcon />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setSortOrder("name-desc")}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <SortDescIcon />
                  이름순 (내림차순)
                </span>
                {sortOrder === "name-desc" && <CheckIcon />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 참가자 목록 - 사이드바 스타일 */}
        <div className="flex flex-col gap-2 p-2 bg-black/20 backdrop-blur-sm rounded-b-lg">
          {/* 화면공유 타일 (있을 경우 상단에 표시) */}
          {screenShareTracks.length > 0 && (
            <>
              {screenShareTracks.map((track) => (
                <VideoTile
                  key={`${track.participantId}-screen-${track.revision ?? 0}`}
                  track={track}
                  isLocal={track.participantId === localParticipantId}
                  isScreenShare
                  canRecord={canRecord}
                  spaceName={spaceName}
                  className="ring-2 ring-primary/50"
                />
              ))}
            </>
          )}

          {/* 일반 참가자 타일 */}
          {sortedTracks.map((track) => (
            <VideoTile
              key={`${track.participantId}-${track.revision ?? 0}`}
              track={track}
              isLocal={track.participantId === localParticipantId}
            />
          ))}
        </div>
      </div>
    )
  }

  // 그리드 뷰
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 헤더 - 드롭다운 메뉴 */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/50 backdrop-blur-sm border-b border-white/10">
        <span className="text-sm text-white font-medium">
          참가자 {sortedTracks.length}명
        </span>
        <DropdownMenu onOpenChange={(open) => {
          // 닫힐 때 버튼 포커스 해제 (스페이스바로 재열림 방지)
          // Radix가 포커스를 트리거로 복원한 후에 blur 호출
          if (!open) {
            setTimeout(() => {
              (document.activeElement as HTMLElement)?.blur()
            }, 0)
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/10"
            >
              <GridIcon />
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-40">
            <DropdownMenuLabel className="text-xs">보기 방식</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => handleViewModeChange("sidebar")}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <SidebarIcon />
                우측 정렬
              </span>
              {/* grid 블록이므로 sidebar는 체크 없음 */}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleViewModeChange("grid")}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <GridIcon />
                그리드 보기
              </span>
              {/* grid 블록에서 viewMode가 "grid"일 때만 체크 */}
              {viewMode === "grid" && <CheckIcon />}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-xs">정렬</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => setSortOrder("name-asc")}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <SortAscIcon />
                이름순 (오름차순)
              </span>
              {sortOrder === "name-asc" && <CheckIcon />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setSortOrder("name-desc")}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <SortDescIcon />
                이름순 (내림차순)
              </span>
              {sortOrder === "name-desc" && <CheckIcon />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 참가자 목록 - 그리드 스타일 (ZEP 유사 레이아웃) */}
      <div className="flex-1 p-4 bg-black/30 backdrop-blur-sm overflow-auto flex flex-col items-center">
        {/* 화면공유 타일 (있을 경우 상단에 표시) */}
        {screenShareTracks.length > 0 && (
          <div className="w-full max-w-2xl mb-4">
            {screenShareTracks.map((track) => (
              <VideoTile
                key={`${track.participantId}-screen-${track.revision ?? 0}`}
                track={track}
                isLocal={track.participantId === localParticipantId}
                isScreenShare
                canRecord={canRecord}
                spaceName={spaceName}
                className="ring-2 ring-primary/50 w-full aspect-video"
              />
            ))}
          </div>
        )}

        {/* 일반 참가자 타일 - 중앙 정렬, 최대 크기 제한 */}
        <div
          className="w-full max-w-4xl"
          style={{
            display: "grid",
            // 최소 176px (사이드바 크기), 최대 240px (ZEP 유사)
            gridTemplateColumns: `repeat(auto-fit, minmax(176px, 240px))`,
            gap: "12px",
            justifyContent: "center",
            alignContent: "start",
          }}
        >
          {sortedTracks.map((track) => (
            <div key={`${track.participantId}-${track.revision ?? 0}`} className="aspect-video">
              <VideoTile
                track={track}
                isLocal={track.participantId === localParticipantId}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
