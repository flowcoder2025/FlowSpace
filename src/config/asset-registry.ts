/**
 * Asset Registry
 *
 * 에셋 메타데이터 레지스트리 - 배치 가능한 모든 오브젝트 정의
 * 하드코딩 금지 원칙에 따라 에셋 속성은 이 설정에서 정의
 *
 * 페어 오브젝트 (포털 등)도 메타데이터로 정의
 */

// ============================================
// Types
// ============================================

export interface PairConfig {
  /** 페어 타입 식별자 */
  type: string
  /** 배치 안내 메시지 */
  labels: {
    first: string
    second: string
  }
  /** DB에 저장될 연결 속성명 */
  linkProperty: string
}

/** 배치 타입: point(단일 위치) 또는 area(영역 드래그) */
export type PlacementType = "point" | "area"

export interface AssetMetadata {
  /** 고유 식별자 */
  id: string
  /** 표시 이름 */
  name: string
  /** 검색용 별칭 (한글/영어) */
  aliases: string[]
  /** 카테고리 ID (asset-categories.ts 참조) */
  categoryId: string
  /** 썸네일 이미지 경로 */
  thumbnail?: string
  /** 스프라이트 시트 경로 */
  spritesheet?: string

  // 페어 오브젝트 설정
  /** 페어 배치 필요 여부 */
  requiresPair: boolean
  /** 페어 설정 (requiresPair가 true일 때) */
  pairConfig?: PairConfig

  // 배치 옵션
  /** 배치 타입 (기본: point) */
  placementType?: PlacementType
  /** 회전 가능 여부 */
  rotatable: boolean
  /** 그리드 스냅 여부 */
  snapToGrid: boolean
  /** 충돌 활성화 여부 */
  collisionEnabled: boolean
  /** 크기 (타일 단위) - point 타입용, area는 드래그로 결정 */
  size: { width: number; height: number }

  /** 설명 */
  description?: string
}

// ============================================
// Asset Registry
// ============================================

/**
 * 에셋 메타데이터 레지스트리
 *
 * 새 에셋 추가 시 이 배열에 추가하면 에디터에서 자동으로 인식
 * 실제 에셋 파일은 /public/assets/game/ 에 위치
 */
export const ASSET_REGISTRY: AssetMetadata[] = [
  // ========== Interactive (상호작용) ==========
  {
    id: "party-zone",
    name: "파티 존",
    aliases: ["파티존", "파티", "party", "zone", "영역", "회의실", "그룹"],
    categoryId: "interactive",
    thumbnail: "/assets/game/objects/party_zone_thumb.png",
    requiresPair: false,
    placementType: "area", // 🆕 영역 드래그 배치
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: false,
    size: { width: 1, height: 1 }, // area 타입이므로 드래그로 결정됨
    description: "같은 영역 내 사용자끼리만 음성/채팅이 연결되는 파티 존",
  },
  {
    id: "portal",
    name: "이동 포털",
    aliases: ["포털", "portal", "이동포털", "teleport", "워프", "warp"],
    categoryId: "interactive",
    thumbnail: "/assets/game/objects/portal_thumb.png",
    requiresPair: true,
    pairConfig: {
      type: "portal",
      labels: {
        first: "입구 위치를 선택하세요",
        second: "출구 위치를 선택하세요",
      },
      linkProperty: "destinationId",
    },
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: false,
    size: { width: 1, height: 1 },
    description: "다른 위치로 순간이동하는 포털",
  },
  {
    id: "spawn_point",
    name: "스폰 포인트",
    aliases: ["스폰", "spawn", "시작점", "시작위치"],
    categoryId: "interactive",
    thumbnail: "/assets/game/objects/spawn_thumb.png",
    requiresPair: false,
    rotatable: true,
    snapToGrid: true,
    collisionEnabled: false,
    size: { width: 1, height: 1 },
    description: "플레이어가 입장하는 시작 위치",
  },
  {
    id: "info_sign",
    name: "안내판",
    aliases: ["안내", "info", "표지판", "sign"],
    categoryId: "interactive",
    thumbnail: "/assets/game/objects/sign_thumb.png",
    requiresPair: false,
    rotatable: true,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 1 },
    description: "상호작용 시 메시지를 표시하는 안내판",
  },
  {
    id: "npc",
    name: "NPC",
    aliases: ["npc", "엔피시", "캐릭터"],
    categoryId: "interactive",
    thumbnail: "/assets/game/objects/npc_thumb.png",
    requiresPair: false,
    rotatable: true,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 1 },
    description: "대화 가능한 NPC 캐릭터",
  },

  // ========== Furniture (가구) ==========
  {
    id: "chair_wooden",
    name: "나무 의자",
    aliases: ["의자", "chair", "나무의자"],
    categoryId: "furniture",
    thumbnail: "/assets/game/objects/chair_thumb.png",
    requiresPair: false,
    rotatable: true,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 1 },
    description: "기본 나무 의자",
  },
  {
    id: "desk_wooden",
    name: "나무 책상",
    aliases: ["책상", "desk", "테이블", "table"],
    categoryId: "furniture",
    thumbnail: "/assets/game/objects/desk_thumb.png",
    requiresPair: false,
    rotatable: true,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 2, height: 1 },
    description: "기본 나무 책상",
  },
  {
    id: "sofa",
    name: "소파",
    aliases: ["소파", "sofa", "couch"],
    categoryId: "furniture",
    thumbnail: "/assets/game/objects/sofa_thumb.png",
    requiresPair: false,
    rotatable: true,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 2, height: 1 },
    description: "편안한 소파",
  },

  // ========== Decoration (장식) ==========
  {
    id: "tree",
    name: "나무",
    aliases: ["나무", "tree", "트리"],
    categoryId: "decoration",
    thumbnail: "/assets/game/objects/tree_thumb.png",
    requiresPair: false,
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 2 },
    description: "장식용 나무",
  },
  {
    id: "plant_pot",
    name: "화분",
    aliases: ["화분", "plant", "pot", "플랜트"],
    categoryId: "decoration",
    thumbnail: "/assets/game/objects/plant_thumb.png",
    requiresPair: false,
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 1 },
    description: "작은 화분",
  },
  {
    id: "lamp",
    name: "조명",
    aliases: ["조명", "lamp", "light", "램프"],
    categoryId: "decoration",
    thumbnail: "/assets/game/objects/lamp_thumb.png",
    requiresPair: false,
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 1 },
    description: "스탠드 조명",
  },

  // ========== Wall (벽/구조물) ==========
  {
    id: "wall_basic",
    name: "기본 벽",
    aliases: ["벽", "wall"],
    categoryId: "wall",
    thumbnail: "/assets/game/objects/wall_thumb.png",
    requiresPair: false,
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 1 },
    description: "기본 벽 타일",
  },
  {
    id: "pillar",
    name: "기둥",
    aliases: ["기둥", "pillar", "column"],
    categoryId: "wall",
    thumbnail: "/assets/game/objects/pillar_thumb.png",
    requiresPair: false,
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: true,
    size: { width: 1, height: 1 },
    description: "장식용 기둥",
  },

  // ========== Floor (바닥) ==========
  {
    id: "floor_wood",
    name: "나무 바닥",
    aliases: ["나무바닥", "wood", "woodfloor"],
    categoryId: "floor",
    thumbnail: "/assets/game/objects/floor_wood_thumb.png",
    requiresPair: false,
    rotatable: false,
    snapToGrid: true,
    collisionEnabled: false,
    size: { width: 1, height: 1 },
    description: "나무 바닥 타일",
  },
  {
    id: "floor_carpet",
    name: "카펫",
    aliases: ["카펫", "carpet", "러그", "rug"],
    categoryId: "floor",
    thumbnail: "/assets/game/objects/carpet_thumb.png",
    requiresPair: false,
    rotatable: true,
    snapToGrid: true,
    collisionEnabled: false,
    size: { width: 2, height: 2 },
    description: "부드러운 카펫",
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * ID로 에셋 조회
 */
export function getAssetById(id: string): AssetMetadata | undefined {
  return ASSET_REGISTRY.find((asset) => asset.id === id)
}

/**
 * 별칭으로 에셋 조회
 */
export function getAssetByAlias(alias: string): AssetMetadata | undefined {
  const lowerAlias = alias.toLowerCase()
  return ASSET_REGISTRY.find((asset) =>
    asset.aliases.some((a) => a.toLowerCase() === lowerAlias)
  )
}

/**
 * 카테고리별 에셋 목록 조회
 */
export function getAssetsByCategory(categoryId: string): AssetMetadata[] {
  return ASSET_REGISTRY.filter((asset) => asset.categoryId === categoryId)
}

/**
 * 키워드로 에셋 검색
 */
export function searchAssets(keyword: string): AssetMetadata[] {
  const lowerKeyword = keyword.toLowerCase()
  return ASSET_REGISTRY.filter(
    (asset) =>
      asset.name.toLowerCase().includes(lowerKeyword) ||
      asset.aliases.some((a) => a.toLowerCase().includes(lowerKeyword)) ||
      asset.description?.toLowerCase().includes(lowerKeyword)
  )
}

/**
 * 페어 오브젝트 여부 확인
 */
export function isPairObject(assetId: string): boolean {
  const asset = getAssetById(assetId)
  return asset?.requiresPair ?? false
}

/**
 * 영역 배치 타입 여부 확인
 */
export function isAreaPlacement(assetId: string): boolean {
  const asset = getAssetById(assetId)
  return asset?.placementType === "area"
}

/**
 * 모든 에셋 ID 목록
 */
export function getAllAssetIds(): string[] {
  return ASSET_REGISTRY.map((asset) => asset.id)
}

/**
 * 에셋 목록 포맷팅 (채팅 출력용)
 *
 * @param assetsOrCategoryId - 에셋 배열 또는 카테고리 ID
 * @param title - 목록 제목 (옵션)
 */
export function formatAssetList(
  assetsOrCategoryId?: AssetMetadata[] | string,
  title?: string
): string {
  // 에셋 배열 또는 카테고리 ID에서 에셋 목록 가져오기
  let assets: AssetMetadata[]
  let headerTitle: string

  if (Array.isArray(assetsOrCategoryId)) {
    // 에셋 배열이 직접 전달된 경우
    assets = assetsOrCategoryId
    headerTitle = title || "검색 결과"
  } else if (typeof assetsOrCategoryId === "string") {
    // 카테고리 ID가 전달된 경우
    assets = getAssetsByCategory(assetsOrCategoryId)
    headerTitle = title || assetsOrCategoryId
  } else {
    // 아무것도 전달되지 않은 경우 전체 목록
    assets = ASSET_REGISTRY
    headerTitle = title || "배치 가능 에셋"
  }

  if (assets.length === 0) {
    return `'${headerTitle}'에 에셋이 없습니다.`
  }

  const grouped = assets.reduce(
    (acc, asset) => {
      if (!acc[asset.categoryId]) {
        acc[asset.categoryId] = []
      }
      acc[asset.categoryId].push(asset)
      return acc
    },
    {} as Record<string, AssetMetadata[]>
  )

  const lines: string[] = [`[${headerTitle}]`]

  for (const [catId, catAssets] of Object.entries(grouped)) {
    lines.push(`\n[${catId}]`)
    for (const asset of catAssets) {
      const pairTag = asset.requiresPair ? " (페어)" : ""
      lines.push(`- ${asset.name}${pairTag}: @생성 ${asset.aliases[0]}`)
    }
  }

  return lines.join("\n")
}
