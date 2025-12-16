/**
 * Asset Categories Configuration
 *
 * 에셋 카테고리 설정 - 에디터 팔레트 탭 구성
 * 하드코딩 금지 원칙에 따라 카테고리는 이 설정에서 정의
 */

// ============================================
// Types
// ============================================

export interface CategoryConfig {
  /** 고유 식별자 */
  id: string
  /** 표시 이름 */
  name: string
  /** 아이콘 (이모지 또는 아이콘 클래스) */
  icon: string
  /** 정렬 순서 */
  order: number
  /** 설명 */
  description: string
}

// ============================================
// Category Registry
// ============================================

/**
 * 에셋 카테고리 레지스트리
 *
 * 새 카테고리 추가 시 이 배열에 추가하면 에디터 UI에 자동 반영
 */
export const ASSET_CATEGORIES: CategoryConfig[] = [
  {
    id: "floor",
    name: "바닥",
    icon: "🏠",
    order: 1,
    description: "바닥 타일 및 카펫",
  },
  {
    id: "wall",
    name: "벽/구조물",
    icon: "🧱",
    order: 2,
    description: "벽, 기둥, 파티션",
  },
  {
    id: "furniture",
    name: "가구",
    icon: "🪑",
    order: 3,
    description: "의자, 책상, 소파 등",
  },
  {
    id: "decoration",
    name: "장식",
    icon: "🌳",
    order: 4,
    description: "화분, 그림, 조명 등",
  },
  {
    id: "interactive",
    name: "상호작용",
    icon: "⚡",
    order: 5,
    description: "포털, NPC, 상호작용 오브젝트",
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * ID로 카테고리 조회
 */
export function getCategoryById(id: string): CategoryConfig | undefined {
  return ASSET_CATEGORIES.find((cat) => cat.id === id)
}

/**
 * 정렬된 카테고리 목록 반환
 */
export function getSortedCategories(): CategoryConfig[] {
  return [...ASSET_CATEGORIES].sort((a, b) => a.order - b.order)
}

/**
 * 카테고리 이름으로 ID 조회 (별칭 지원)
 */
export function getCategoryIdByName(name: string): string | undefined {
  const lowerName = name.toLowerCase()
  const cat = ASSET_CATEGORIES.find(
    (c) => c.name.toLowerCase() === lowerName || c.id.toLowerCase() === lowerName
  )
  return cat?.id
}
