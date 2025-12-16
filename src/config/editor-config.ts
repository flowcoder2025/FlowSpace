/**
 * Editor Global Configuration
 *
 * 에디터 전역 설정 - 동작, UI, 단축키 등
 * 하드코딩 금지 원칙에 따라 설정값은 이 파일에서 관리
 */

// ============================================
// Types
// ============================================

export interface EditorConfig {
  /** 그리드 설정 */
  grid: {
    /** 타일 크기 (픽셀) */
    tileSize: number
    /** 그리드 표시 여부 (에디터 모드) */
    showGrid: boolean
    /** 그리드 색상 */
    gridColor: string
    /** 그리드 투명도 (0-1) */
    gridOpacity: number
  }

  /** 고스트 프리뷰 설정 */
  ghost: {
    /** 투명도 (0-1) */
    opacity: number
    /** 배치 가능 색상 */
    validColor: string
    /** 배치 불가 색상 */
    invalidColor: string
  }

  /** 페어 배치 설정 */
  pairPlacement: {
    /** 연결선 색상 */
    lineColor: string
    /** 연결선 두께 */
    lineWidth: number
    /** 연결선 대시 패턴 */
    lineDash: number[]
  }

  /** 히스토리 설정 */
  history: {
    /** 최대 Undo 스택 크기 */
    maxUndoStack: number
  }

  /** DB 저장 설정 */
  persistence: {
    /** 디바운스 딜레이 (ms) */
    debounceDelay: number
    /** 자동 저장 활성화 */
    autoSave: boolean
  }

  /** 단축키 설정 */
  shortcuts: {
    /** 에디터 토글 (버튼/명령어만, 단축키 없음) */
    toggleEditor: null
    /** ESC 동작 */
    escape: "cancel_or_close"
    /** 회전 */
    rotate: string | null
    /** 삭제 */
    delete: string | null
    /** Undo */
    undo: string | null
    /** Redo */
    redo: string | null
  }

  /** UI 설정 */
  ui: {
    /** 에디터 패널 기본 위치 */
    panelPosition: "left" | "right"
    /** 에디터 패널 기본 너비 */
    panelWidth: number
    /** 시스템 메시지 표시 시간 (ms) */
    messageDisplayDuration: number
  }
}

// ============================================
// Default Configuration
// ============================================

/**
 * 에디터 기본 설정
 *
 * 필요시 이 설정을 오버라이드하여 커스터마이징 가능
 */
export const EDITOR_CONFIG: EditorConfig = {
  grid: {
    tileSize: 32,
    showGrid: true,
    gridColor: "#ffffff",
    gridOpacity: 0.2,
  },

  ghost: {
    opacity: 0.6,
    validColor: "#22c55e", // green-500
    invalidColor: "#ef4444", // red-500
  },

  pairPlacement: {
    lineColor: "#a855f7", // purple-500 (포털 색상)
    lineWidth: 2,
    lineDash: [5, 5],
  },

  history: {
    maxUndoStack: 50,
  },

  persistence: {
    debounceDelay: 1000, // 1초
    autoSave: true,
  },

  shortcuts: {
    toggleEditor: null, // 명령어로만 (@편집기)
    escape: "cancel_or_close",
    rotate: "r", // R키로 회전 (채팅 비활성 시)
    delete: "Delete", // Delete 키
    undo: "ctrl+z",
    redo: "ctrl+shift+z",
  },

  ui: {
    panelPosition: "right",
    panelWidth: 280,
    messageDisplayDuration: 3000,
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * 설정값 조회 (dot notation 지원)
 *
 * @example
 * getConfigValue("grid.tileSize") // 32
 * getConfigValue("ghost.opacity") // 0.6
 */
export function getConfigValue<T>(path: string): T | undefined {
  const keys = path.split(".")
  let current: unknown = EDITOR_CONFIG

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current as T
}

/**
 * 타일 크기 반환 (자주 사용되므로 헬퍼 제공)
 */
export function getTileSize(): number {
  return EDITOR_CONFIG.grid.tileSize
}

/**
 * 단축키가 활성화되었는지 확인
 */
export function isShortcutEnabled(action: keyof EditorConfig["shortcuts"]): boolean {
  return EDITOR_CONFIG.shortcuts[action] !== null
}
