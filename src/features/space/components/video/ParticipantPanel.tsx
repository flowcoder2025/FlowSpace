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
import { useAudioSettings } from "../../hooks/useAudioSettings"
import { useVideoSettings } from "../../hooks/useVideoSettings"
import type { ParticipantTrack } from "../../livekit/types"

// ============================================
// Types
// ============================================
export type ParticipantViewMode = "sidebar" | "grid" | "hidden"
export type ParticipantSortOrder = "name-asc" | "name-desc"

// ============================================
// Icons
// ============================================
const FilterIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
)

const MemberManageIcon = ({ active }: { active?: boolean }) => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      className={active ? "text-primary" : ""}
    />
    {/* 설정 기어 아이콘 (작게) */}
    <circle cx="18" cy="18" r="3" strokeWidth={1.5} className={active ? "text-primary" : ""} />
    <path strokeLinecap="round" strokeWidth={1.5} d="M18 16.5v-0.5M18 20v-0.5M16.5 18h-0.5M20 18h-0.5" className={active ? "text-primary" : ""} />
  </svg>
)

const LinkIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
)

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

const HiddenIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
// 메뉴 옵션 정의 (타입 좁힘 문제 방지)
// ============================================
const VIEW_MODE_OPTIONS: Array<{
  value: ParticipantViewMode
  label: string
  icon: React.FC
}> = [
  { value: "sidebar", label: "사이드바", icon: SidebarIcon },
  { value: "grid", label: "그리드", icon: GridIcon },
  { value: "hidden", label: "숨기기", icon: HiddenIcon },
]

const SORT_ORDER_OPTIONS: Array<{
  value: ParticipantSortOrder
  label: string
  icon: React.FC
}> = [
  { value: "name-asc", label: "이름 오름차순", icon: SortAscIcon },
  { value: "name-desc", label: "이름 내림차순", icon: SortDescIcon },
]

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
  /** 🔗 초대 코드 (인게임 초대 링크용) */
  inviteCode?: string
  /** 🧑‍🤝‍🧑 멤버 관리 패널 열림 상태 */
  isMemberPanelOpen?: boolean
  /** 🧑‍🤝‍🧑 멤버 관리 패널 토글 콜백 */
  onToggleMemberPanel?: () => void
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
  inviteCode,
  isMemberPanelOpen = false,
  onToggleMemberPanel,
}: ParticipantPanelProps) {
  // 내부 상태 (외부 제어가 없을 때 사용)
  const [internalViewMode, setInternalViewMode] = useState<ParticipantViewMode>("sidebar")
  const [sortOrder, setSortOrder] = useState<ParticipantSortOrder>("name-asc")
  const [copied, setCopied] = useState(false)

  // 📌 미디어 설정 로드 (전역 출력 볼륨, 미러 모드)
  const { settings: audioSettings } = useAudioSettings()
  const { settings: videoSettings } = useVideoSettings()

  // 외부 제어 또는 내부 상태 사용
  const viewMode = externalViewMode ?? internalViewMode
  const handleViewModeChange = useCallback((mode: ParticipantViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode)
    } else {
      setInternalViewMode(mode)
    }
  }, [onViewModeChange])

  // 초대 링크 복사 핸들러
  const handleCopyInviteLink = useCallback(async () => {
    if (!inviteCode) return

    // 올바른 초대 링크 형식: /spaces/{inviteCode}
    const inviteUrl = `${window.location.origin}/spaces/${inviteCode}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("초대 링크 복사 실패:", err)
    }
  }, [inviteCode])

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

  // 🎤 모든 참가자의 오디오 트랙 수집 (녹화 시 믹싱용)
  const allAudioTracks = useMemo(() => {
    const tracks: MediaStreamTrack[] = []
    sortedTracks.forEach((track) => {
      if (track.audioTrack && !track.isAudioMuted) {
        tracks.push(track.audioTrack)
      }
    })
    return tracks
  }, [sortedTracks])

  // 그리드 레이아웃 계산 (향후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _gridLayout = useMemo(() =>
    getGridLayout(sortedTracks.length),
    [sortedTracks.length]
  )

  if (sortedTracks.length === 0) {
    return null
  }

  // 숨김 뷰 - 헤더 버튼만 표시 (비디오 타일 숨김)
  if (viewMode === "hidden") {
    return (
      <div className={cn("flex flex-col", className)}>
        {/* 최소화된 헤더 - 필터 + 멤버관리 + 초대 */}
        <div className="flex items-center gap-1 px-2 py-2 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
          {/* 참가자 수 (아이콘 + 숫자) */}
          <span className="text-xs text-white/70 font-medium mr-1">
            👥 {sortedTracks.length}
          </span>

          {/* 필터 버튼 (드롭다운) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                title="필터"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
              >
                <FilterIcon />
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              className="w-44"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuLabel className="text-xs">보기 방식</DropdownMenuLabel>
              {VIEW_MODE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => handleViewModeChange(option.value)}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <option.icon />
                    {option.label}
                  </span>
                  {viewMode === option.value && <CheckIcon />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs">정렬</DropdownMenuLabel>
              {SORT_ORDER_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setSortOrder(option.value)}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <option.icon />
                    {option.label}
                  </span>
                  {sortOrder === option.value && <CheckIcon />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 멤버 관리 버튼 */}
          {onToggleMemberPanel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                onToggleMemberPanel()
                ;(e.currentTarget as HTMLElement).blur()
              }}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              className={cn(
                "h-7 px-2 text-xs font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                isMemberPanelOpen
                  ? "text-primary hover:text-primary hover:bg-primary/10"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
              title="멤버 관리"
            >
              <MemberManageIcon active={isMemberPanelOpen} />
            </Button>
          )}

          {/* 초대하기 버튼 */}
          {inviteCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                handleCopyInviteLink()
                ;(e.currentTarget as HTMLElement).blur()
              }}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              title="초대 링크 복사"
            >
              <LinkIcon />
              <span className="hidden sm:inline">{copied ? "복사됨!" : "초대"}</span>
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 사이드바 뷰
  if (viewMode === "sidebar") {
    return (
      <div className={cn("flex flex-col", className)}>
        {/* ZEP 스타일 헤더 - 필터 + 멤버관리 + 초대 */}
        <div className="flex flex-col gap-1.5 px-2 py-2 bg-black/40 backdrop-blur-sm rounded-t-lg border-b border-white/10">
          {/* 참가자 수 표시 */}
          <div className="text-xs text-white/70 font-medium px-1">
            참가자 {sortedTracks.length}명
          </div>
          {/* 상단 버튼 그룹: 필터 → 멤버관리 → 초대 */}
          <div className="flex items-center gap-1">
            {/* 1. 필터 버튼 (드롭다운) - 보기 방식/정렬 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                  title="필터"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <FilterIcon />
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="bottom"
                className="w-44"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuLabel className="text-xs">보기 방식</DropdownMenuLabel>
                {VIEW_MODE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => handleViewModeChange(option.value)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <option.icon />
                      {option.label}
                    </span>
                    {viewMode === option.value && <CheckIcon />}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs">정렬</DropdownMenuLabel>
                {SORT_ORDER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => setSortOrder(option.value)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <option.icon />
                      {option.label}
                    </span>
                    {sortOrder === option.value && <CheckIcon />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. 멤버 관리 버튼 */}
            {onToggleMemberPanel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  onToggleMemberPanel()
                  ;(e.currentTarget as HTMLElement).blur()
                }}
                onMouseDown={(e) => e.preventDefault()}
                tabIndex={-1}
                className={cn(
                  "h-7 px-2 text-xs font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                  isMemberPanelOpen
                    ? "text-primary hover:text-primary hover:bg-primary/10"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                )}
                title="멤버 관리"
              >
                <MemberManageIcon active={isMemberPanelOpen} />
              </Button>
            )}

            {/* 3. 초대하기 버튼 */}
            {inviteCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  handleCopyInviteLink()
                  ;(e.currentTarget as HTMLElement).blur()
                }}
                onMouseDown={(e) => e.preventDefault()}
                tabIndex={-1}
                className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                title="초대 링크 복사"
              >
                <LinkIcon />
                <span className="hidden sm:inline">{copied ? "복사됨!" : "초대"}</span>
              </Button>
            )}
          </div>
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
                  allAudioTracks={allAudioTracks}
                  globalOutputVolume={audioSettings.outputVolume}
                  mirrorLocalVideo={videoSettings.mirrorMode}
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
              globalOutputVolume={audioSettings.outputVolume}
              mirrorLocalVideo={videoSettings.mirrorMode}
            />
          ))}
        </div>
      </div>
    )
  }

  // 그리드 뷰
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* ZEP 스타일 헤더 - 필터 + 멤버관리 + 초대 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-sm border-b border-white/10">
        {/* 참가자 수 표시 */}
        <span className="text-sm text-white font-medium mr-auto">
          참가자 {sortedTracks.length}명
        </span>

        {/* 1. 필터 버튼 (드롭다운) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-sm text-white/90 hover:text-white hover:bg-white/10 font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              title="필터"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
            >
              <FilterIcon />
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            className="w-44"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="text-xs">보기 방식</DropdownMenuLabel>
            {VIEW_MODE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => handleViewModeChange(option.value)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <option.icon />
                  {option.label}
                </span>
                {viewMode === option.value && <CheckIcon />}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-xs">정렬</DropdownMenuLabel>
            {SORT_ORDER_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => setSortOrder(option.value)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <option.icon />
                  {option.label}
                </span>
                {sortOrder === option.value && <CheckIcon />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 2. 멤버 관리 버튼 */}
        {onToggleMemberPanel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              onToggleMemberPanel()
              ;(e.currentTarget as HTMLElement).blur()
            }}
            onMouseDown={(e) => e.preventDefault()}
            tabIndex={-1}
            className={cn(
              "h-8 px-2 text-sm font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0",
              isMemberPanelOpen
                ? "text-primary hover:text-primary hover:bg-primary/10"
                : "text-white/90 hover:text-white hover:bg-white/10"
            )}
            title="멤버 관리"
          >
            <MemberManageIcon active={isMemberPanelOpen} />
          </Button>
        )}

        {/* 3. 초대하기 버튼 */}
        {inviteCode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              handleCopyInviteLink()
              ;(e.currentTarget as HTMLElement).blur()
            }}
            onMouseDown={(e) => e.preventDefault()}
            tabIndex={-1}
            className="h-8 px-2 text-sm text-white/90 hover:text-white hover:bg-white/10 font-medium gap-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            title="초대 링크 복사"
          >
            <LinkIcon />
            <span>{copied ? "복사됨!" : "초대"}</span>
          </Button>
        )}
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
                allAudioTracks={allAudioTracks}
                globalOutputVolume={audioSettings.outputVolume}
                mirrorLocalVideo={videoSettings.mirrorMode}
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
                globalOutputVolume={audioSettings.outputVolume}
                mirrorLocalVideo={videoSettings.mirrorMode}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
