/**
 * Editor Types
 *
 * 맵 에디터 관련 타입 정의
 */

import type { SpaceRole } from "@prisma/client"
import type { AssetMetadata } from "@/config/asset-registry"

// ============================================
// Editor State Types
// ============================================

/**
 * 에디터 도구 타입
 */
export type EditorTool = "select" | "place" | "move" | "delete" | "rotate"

/**
 * 페어 배치 상태
 */
export type PairPlacementPhase = "idle" | "placing_first" | "placing_second" | "complete"

/**
 * 🆕 영역 배치 상태 (파티 존 등)
 */
export type AreaPlacementPhase = "idle" | "placing_start" | "placing_end" | "complete"

/**
 * 🆕 영역 범위 (그리드 좌표)
 */
export interface AreaBounds {
  x1: number  // 좌상단 X
  y1: number  // 좌상단 Y
  x2: number  // 우하단 X
  y2: number  // 우하단 Y
}

/**
 * 에디터 모드 상태
 */
export interface EditorModeState {
  /** 에디터 활성화 여부 */
  isActive: boolean
  /** 현재 선택된 도구 */
  selectedTool: EditorTool
  /** 현재 선택된 에셋 */
  selectedAsset: AssetMetadata | null
  /** 페어 배치 상태 */
  pairPhase: PairPlacementPhase
  /** 페어 배치 중 첫 번째 위치 */
  pairFirstPosition: GridPosition | null
  /** 🆕 영역 배치 상태 */
  areaPhase: AreaPlacementPhase
  /** 🆕 영역 배치 시작점 */
  areaStartPosition: GridPosition | null
  /** 🆕 영역 배치 현재 끝점 (드래그 중 프리뷰) */
  areaEndPosition: GridPosition | null
}

/**
 * 그리드 좌표
 */
export interface GridPosition {
  /** 타일 X 좌표 */
  x: number
  /** 타일 Y 좌표 */
  y: number
}

/**
 * 픽셀 좌표
 */
export interface PixelPosition {
  /** 픽셀 X 좌표 */
  x: number
  /** 픽셀 Y 좌표 */
  y: number
}

/**
 * 캐릭터 방향
 */
export type Direction = "up" | "down" | "left" | "right"

// ============================================
// Placed Object Types
// ============================================

/**
 * 배치된 오브젝트
 */
export interface PlacedObject {
  /** 고유 식별자 */
  id: string
  /** 에셋 ID */
  assetId: string
  /** 그리드 위치 (point 타입 또는 area의 좌상단) */
  position: GridPosition
  /** 회전 각도 (0, 90, 180, 270) */
  rotation: 0 | 90 | 180 | 270
  /** 페어 연결 대상 ID (포털 등) */
  linkedObjectId?: string
  /** 🆕 영역 범위 (area 타입 에셋용) */
  bounds?: AreaBounds
  /** 커스텀 데이터 */
  customData?: Record<string, unknown>
  /** 배치자 ID */
  placedBy: string
  /** 배치 시간 */
  placedAt: Date
}

/**
 * 오브젝트 생성 입력
 */
export interface CreateObjectInput {
  assetId: string
  position: GridPosition
  rotation?: 0 | 90 | 180 | 270
  linkedObjectId?: string
  /** 🆕 영역 범위 (area 타입 에셋용) */
  bounds?: AreaBounds
  customData?: Record<string, unknown>
}

/**
 * 오브젝트 업데이트 입력
 */
export interface UpdateObjectInput {
  id: string
  position?: GridPosition
  rotation?: 0 | 90 | 180 | 270
  linkedObjectId?: string
  customData?: Record<string, unknown>
}

// ============================================
// History Types (Undo/Redo)
// ============================================

/**
 * 히스토리 액션 타입
 */
export type HistoryActionType = "place" | "delete" | "move" | "rotate" | "update"

/**
 * 히스토리 엔트리
 */
export interface HistoryEntry {
  /** 액션 타입 */
  type: HistoryActionType
  /** 액션 대상 오브젝트 ID */
  objectId: string
  /** 이전 상태 (undo용) */
  previousState: PlacedObject | null
  /** 새 상태 (redo용) */
  newState: PlacedObject | null
  /** 타임스탬프 */
  timestamp: Date
}

// ============================================
// Command Types
// ============================================

/**
 * 파싱된 에디터 명령어
 */
export interface ParsedEditorCommand {
  /** 명령어 ID */
  commandId: string
  /** 원본 입력 */
  rawInput: string
  /** 파싱된 인자 */
  args: {
    /** 에셋 이름/ID */
    assetName?: string
    /** 좌표 (x, y) */
    coordinates?: GridPosition
    /** 카테고리 */
    category?: string
    /** 검색 키워드 */
    keyword?: string
    /** 반경 */
    radius?: number
    /** 오브젝트 ID */
    objectId?: string
  }
}

/**
 * 명령어 실행 결과
 */
export interface CommandExecutionResult {
  /** 성공 여부 */
  success: boolean
  /** 메시지 (채팅 출력용) */
  message: string
  /** 에러 코드 */
  errorCode?: string
  /** 추가 데이터 */
  data?: unknown
}

// ============================================
// Event Types (Socket.io)
// ============================================

/**
 * 오브젝트 배치 이벤트
 */
export interface ObjectPlaceEvent {
  /** 공간 ID */
  spaceId: string
  /** 배치된 오브젝트 */
  object: PlacedObject
  /** 배치자 ID */
  placedBy: string
}

/**
 * 오브젝트 삭제 이벤트
 */
export interface ObjectDeleteEvent {
  /** 공간 ID */
  spaceId: string
  /** 삭제된 오브젝트 ID */
  objectId: string
  /** 삭제자 ID */
  deletedBy: string
}

/**
 * 오브젝트 업데이트 이벤트
 */
export interface ObjectUpdateEvent {
  /** 공간 ID */
  spaceId: string
  /** 업데이트된 오브젝트 */
  object: PlacedObject
  /** 업데이트자 ID */
  updatedBy: string
}

// ============================================
// UI Types
// ============================================

/**
 * 에디터 패널 상태
 */
export interface EditorPanelState {
  /** 패널 표시 여부 */
  isOpen: boolean
  /** 선택된 카테고리 */
  selectedCategory: string | null
  /** 검색 쿼리 */
  searchQuery: string
}

/**
 * 시스템 메시지 타입
 */
export type SystemMessageType = "info" | "success" | "warning" | "error"

/**
 * 에디터 시스템 메시지
 */
export interface EditorSystemMessage {
  /** 메시지 타입 */
  type: SystemMessageType
  /** 메시지 내용 */
  content: string
  /** 표시 시간 (ms, 0이면 수동 닫기) */
  duration?: number
}

// ============================================
// Permission Types
// ============================================

/**
 * 에디터 권한
 */
export interface EditorPermissions {
  /** 에디터 사용 가능 여부 */
  canUseEditor: boolean
  /** 오브젝트 배치 가능 여부 */
  canPlaceObjects: boolean
  /** 오브젝트 삭제 가능 여부 */
  canDeleteObjects: boolean
  /** 오브젝트 수정 가능 여부 */
  canEditObjects: boolean
}

/**
 * 에디터 사용 가능한 역할 목록
 * OWNER와 STAFF만 에디터 사용 가능
 */
const EDITOR_STAFF_ROLES: SpaceRole[] = ["OWNER", "STAFF"]

/**
 * 역할별 권한 확인
 */
export function getEditorPermissions(role: SpaceRole): EditorPermissions {
  const hasAccess = EDITOR_STAFF_ROLES.includes(role)

  return {
    canUseEditor: hasAccess,
    canPlaceObjects: hasAccess,
    canDeleteObjects: hasAccess,
    canEditObjects: hasAccess,
  }
}

// ============================================
// Zustand Store Types
// ============================================

/**
 * 에디터 스토어 상태
 */
export interface EditorStoreState {
  // Mode State
  mode: EditorModeState

  // Panel State
  panel: EditorPanelState

  // Placed Objects (로컬 캐시)
  objects: Map<string, PlacedObject>

  // History
  history: HistoryEntry[]
  historyIndex: number

  // Clipboard
  clipboard: PlacedObject | null

  // Loading/Error
  isLoading: boolean
  error: string | null
}

/**
 * 에디터 스토어 액션
 */
export interface EditorStoreActions {
  // Mode Actions
  toggleEditor: () => void
  setTool: (tool: EditorTool) => void
  selectAsset: (asset: AssetMetadata | null) => void
  setPairPhase: (phase: PairPlacementPhase) => void
  setPairFirstPosition: (position: GridPosition | null) => void
  // 🆕 Area Placement Actions
  setAreaPhase: (phase: AreaPlacementPhase) => void
  setAreaStartPosition: (position: GridPosition | null) => void
  setAreaEndPosition: (position: GridPosition | null) => void

  // Panel Actions
  togglePanel: () => void
  setCategory: (category: string | null) => void
  setSearchQuery: (query: string) => void

  // Object Actions
  placeObject: (input: CreateObjectInput) => Promise<PlacedObject | null>
  deleteObject: (id: string) => Promise<boolean>
  updateObject: (input: UpdateObjectInput) => Promise<PlacedObject | null>

  // History Actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Clipboard Actions
  copyObject: (id: string) => void
  pasteObject: (position: GridPosition) => Promise<PlacedObject | null>

  // Sync Actions
  syncObjects: (objects: PlacedObject[]) => void
  handleRemotePlace: (event: ObjectPlaceEvent) => void
  handleRemoteDelete: (event: ObjectDeleteEvent) => void
  handleRemoteUpdate: (event: ObjectUpdateEvent) => void

  // Reset
  reset: () => void
}

/**
 * 에디터 스토어 전체 타입
 */
export type EditorStore = EditorStoreState & EditorStoreActions
