/**
 * MapData - 모던 오피스 맵 레이아웃 데이터
 * Phaser Tilemap 시스템에서 사용할 맵 데이터 정의
 */

import { TILE_INDEX } from "./TilesetGenerator"

// 맵 설정
export const MAP_CONFIG = {
  WIDTH: 50, // 타일 단위 (기존 유지)
  HEIGHT: 35, // 타일 단위 (기존 유지)
  TILE_SIZE: 32,
}

// 레이어 타입
export type MapLayerType =
  | "ground"
  | "walls"
  | "furniture"
  | "furniture_top"
  | "decorations"
  | "collision"

// 맵 레이어 데이터 타입
export interface MapLayerData {
  name: MapLayerType
  visible: boolean
  data: number[][]
}

// 스폰 포인트
export interface SpawnPoint {
  x: number
  y: number
  isDefault?: boolean
}

// 상호작용 영역
export interface InteractiveZone {
  x: number
  y: number
  width: number
  height: number
  type: "link" | "notice" | "survey" | "portal"
  data?: Record<string, unknown>
}

// 맵 데이터 인터페이스
export interface MapData {
  name: string
  width: number
  height: number
  tileSize: number
  layers: MapLayerData[]
  spawnPoints: SpawnPoint[]
  interactiveZones: InteractiveZone[]
}

// 타일 단축키 (가독성 향상)
const T = TILE_INDEX
const _ = -1 // 빈 타일

/**
 * 모던 오피스 맵 생성
 * 50x35 타일 (1600x1120px)
 */
export function createModernOfficeMap(): MapData {
  const { WIDTH, HEIGHT, TILE_SIZE } = MAP_CONFIG

  // 바닥 레이어 생성
  const groundLayer = createGroundLayer(WIDTH, HEIGHT)

  // 벽 레이어 생성
  const wallsLayer = createWallsLayer(WIDTH, HEIGHT)

  // 가구 레이어 생성
  const furnitureLayer = createFurnitureLayer(WIDTH, HEIGHT)

  // 가구 상단 레이어 (플레이어 앞에 렌더링)
  const furnitureTopLayer = createFurnitureTopLayer(WIDTH, HEIGHT)

  // 장식 레이어
  const decorationsLayer = createDecorationsLayer(WIDTH, HEIGHT)

  // 충돌 레이어
  const collisionLayer = createCollisionLayer(WIDTH, HEIGHT)

  return {
    name: "Modern Office",
    width: WIDTH,
    height: HEIGHT,
    tileSize: TILE_SIZE,
    layers: [
      { name: "ground", visible: true, data: groundLayer },
      { name: "walls", visible: true, data: wallsLayer },
      { name: "furniture", visible: true, data: furnitureLayer },
      { name: "furniture_top", visible: true, data: furnitureTopLayer },
      { name: "decorations", visible: true, data: decorationsLayer },
      { name: "collision", visible: false, data: collisionLayer },
    ],
    spawnPoints: createSpawnPoints(),
    interactiveZones: createInteractiveZones(),
  }
}

/**
 * 바닥 레이어 생성
 */
function createGroundLayer(width: number, height: number): number[][] {
  const layer: number[][] = []

  for (let y = 0; y < height; y++) {
    const row: number[] = []
    for (let x = 0; x < width; x++) {
      // 기본 나무 바닥 (변형 포함)
      let tile = T.FLOOR_WOOD_1 + ((x + y) % 4)

      // 회의실 영역 (카펫)
      if (x >= 35 && x <= 48 && y >= 5 && y <= 15) {
        tile = T.FLOOR_CARPET_1 + ((x + y) % 2)
      }

      // 로비 영역 (타일)
      if (x >= 2 && x <= 12 && y >= 2 && y <= 12) {
        tile = T.FLOOR_TILE_1 + ((x + y) % 2)
      }

      // 휴게 공간 (카펫)
      if (x >= 20 && x <= 32 && y >= 22 && y <= 32) {
        tile = T.FLOOR_CARPET_1 + ((x + y) % 2)
      }

      // 복도 (콘크리트)
      if (
        (x >= 13 && x <= 19 && y >= 2 && y <= 32) ||
        (y >= 16 && y <= 21 && x >= 2 && x <= 48)
      ) {
        tile = T.FLOOR_CONCRETE_1 + ((x + y) % 2)
      }

      // 액센트 포인트 (입구 등)
      if (x >= 14 && x <= 18 && y >= 30 && y <= 32) {
        tile = T.FLOOR_ACCENT_1 + ((x + y) % 2)
      }

      row.push(tile)
    }
    layer.push(row)
  }

  return layer
}

/**
 * 벽 레이어 생성
 */
function createWallsLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // 외벽 상단
  for (let x = 0; x < width; x++) {
    layer[0][x] = T.WALL_TOP_M
    layer[1][x] = T.WALL_BOT_M
  }

  // 외벽 하단
  for (let x = 0; x < width; x++) {
    layer[height - 2][x] = T.WALL_TOP_M
    layer[height - 1][x] = T.WALL_BOT_M
  }

  // 외벽 좌측
  for (let y = 2; y < height - 2; y++) {
    layer[y][0] = T.WALL_MID_L
    layer[y][1] = T.WALL_MID_R
  }

  // 외벽 우측
  for (let y = 2; y < height - 2; y++) {
    layer[y][width - 2] = T.WALL_MID_L
    layer[y][width - 1] = T.WALL_MID_R
  }

  // 코너
  layer[0][0] = T.WALL_CORNER_TL
  layer[0][width - 1] = T.WALL_CORNER_TR
  layer[height - 1][0] = T.WALL_CORNER_BL
  layer[height - 1][width - 1] = T.WALL_CORNER_BR

  // 내부 벽 - 로비와 복도 구분
  for (let y = 2; y < 13; y++) {
    layer[y][12] = T.WALL_MID_M
  }

  // 내부 벽 - 회의실 구분
  for (let y = 2; y < 16; y++) {
    layer[y][34] = T.WALL_MID_M
  }

  // 창문 (외벽에 추가)
  for (let x = 4; x < width - 4; x += 6) {
    layer[0][x] = T.WALL_WINDOW
  }

  // 문
  layer[12][12] = T.WALL_DOOR // 로비 문
  layer[15][34] = T.WALL_DOOR // 회의실 문
  layer[height - 2][16] = T.WALL_DOOR // 입구

  return layer
}

/**
 * 가구 레이어 생성 (플레이어 뒤)
 */
function createFurnitureLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // 로비 - 리셉션 데스크
  layer[5][4] = T.DESK_TOP_L
  layer[5][5] = T.DESK_TOP_M
  layer[5][6] = T.DESK_TOP_R
  layer[6][4] = T.DESK_BOT_L
  layer[6][5] = T.DESK_BOT_M
  layer[6][6] = T.DESK_BOT_R

  // 로비 - 소파
  layer[9][3] = T.SOFA_L
  layer[9][4] = T.SOFA_M
  layer[9][5] = T.SOFA_R

  // 업무 공간 - 책상들 (4인)
  for (let i = 0; i < 4; i++) {
    const dx = 22 + i * 3
    layer[5][dx] = T.DESK_TOP_L
    layer[5][dx + 1] = T.DESK_TOP_R
    layer[6][dx] = T.DESK_BOT_L
    layer[6][dx + 1] = T.DESK_BOT_R
    layer[7][dx] = T.CHAIR_1
    layer[7][dx + 1] = T.CHAIR_1
  }

  // 업무 공간 - 책상들 (4인, 두번째 줄)
  for (let i = 0; i < 4; i++) {
    const dx = 22 + i * 3
    layer[10][dx] = T.DESK_TOP_L
    layer[10][dx + 1] = T.DESK_TOP_R
    layer[11][dx] = T.DESK_BOT_L
    layer[11][dx + 1] = T.DESK_BOT_R
    layer[9][dx] = T.CHAIR_2
    layer[9][dx + 1] = T.CHAIR_2
  }

  // 회의실 - 큰 테이블
  layer[8][38] = T.TABLE_SQUARE
  layer[8][39] = T.TABLE_SQUARE
  layer[8][40] = T.TABLE_SQUARE
  layer[8][41] = T.TABLE_SQUARE
  layer[9][38] = T.TABLE_SQUARE
  layer[9][39] = T.TABLE_SQUARE
  layer[9][40] = T.TABLE_SQUARE
  layer[9][41] = T.TABLE_SQUARE
  layer[10][38] = T.TABLE_SQUARE
  layer[10][39] = T.TABLE_SQUARE
  layer[10][40] = T.TABLE_SQUARE
  layer[10][41] = T.TABLE_SQUARE

  // 회의실 - 의자들
  layer[7][38] = T.CHAIR_1
  layer[7][39] = T.CHAIR_1
  layer[7][40] = T.CHAIR_1
  layer[7][41] = T.CHAIR_1
  layer[11][38] = T.CHAIR_2
  layer[11][39] = T.CHAIR_2
  layer[11][40] = T.CHAIR_2
  layer[11][41] = T.CHAIR_2

  // 휴게 공간 - 소파
  layer[24][22] = T.SOFA_L
  layer[24][23] = T.SOFA_M
  layer[24][24] = T.SOFA_R
  layer[28][22] = T.SOFA_L
  layer[28][23] = T.SOFA_M
  layer[28][24] = T.SOFA_R

  // 휴게 공간 - 테이블
  layer[26][23] = T.TABLE_ROUND

  // 복도 - 화분들
  layer[3][15] = T.PLANT_LARGE
  layer[3][17] = T.PLANT_LARGE
  layer[18][15] = T.PLANT_SMALL
  layer[18][17] = T.PLANT_SMALL

  // 복사기, 커피머신 등
  layer[20][3] = T.PRINTER
  layer[20][5] = T.COFFEE_MACHINE
  layer[20][7] = T.WATER_COOLER

  // 책장
  layer[3][22] = T.BOOKSHELF_T
  layer[3][23] = T.BOOKSHELF_T
  layer[3][24] = T.BOOKSHELF_T

  // 캐비넷
  layer[14][3] = T.CABINET_T
  layer[14][4] = T.CABINET_T

  return layer
}

/**
 * 가구 상단 레이어 (플레이어 앞에 렌더링)
 */
function createFurnitureTopLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // 로비 - 리셉션 데스크 위 물건들
  layer[5][5] = T.MONITOR

  // 회의실 - 화이트보드
  layer[6][44] = T.WHITEBOARD
  layer[6][45] = T.WHITEBOARD

  // 업무 공간 - 모니터들
  for (let i = 0; i < 4; i++) {
    const dx = 22 + i * 3
    layer[5][dx] = T.MONITOR
    layer[5][dx + 1] = T.MONITOR
    layer[10][dx] = T.MONITOR
    layer[10][dx + 1] = T.MONITOR
  }

  // 조명
  layer[8][8] = T.LAMP_FLOOR
  layer[26][30] = T.LAMP_FLOOR

  return layer
}

/**
 * 장식 레이어
 */
function createDecorationsLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // 러그 - 로비
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      layer[7 + y][7 + x] = T.RUG_TL + y * 16 + x
    }
  }

  // 러그 - 휴게 공간
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      layer[25 + y][26 + x] = T.RUG_TL + y * 16 + x
    }
  }

  // 벽 장식 - 액자, 시계, 포스터
  layer[2][8] = T.FRAME_1
  layer[2][10] = T.CLOCK
  layer[2][26] = T.POSTER_1
  layer[2][28] = T.POSTER_2
  layer[2][38] = T.FRAME_2
  layer[2][42] = T.CORKBOARD

  // 사인
  layer[17][10] = T.SIGN

  // 스폰 포인트 마커 (디버그/가이드용)
  layer[31][16] = T.SPAWN_POINT

  return layer
}

/**
 * 충돌 레이어 생성
 */
function createCollisionLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // 외벽 충돌
  for (let x = 0; x < width; x++) {
    layer[0][x] = T.COLLISION
    layer[1][x] = T.COLLISION
    layer[height - 2][x] = T.COLLISION
    layer[height - 1][x] = T.COLLISION
  }
  for (let y = 0; y < height; y++) {
    layer[y][0] = T.COLLISION
    layer[y][1] = T.COLLISION
    layer[y][width - 2] = T.COLLISION
    layer[y][width - 1] = T.COLLISION
  }

  // 입구 문 열기 (충돌 제거)
  layer[height - 2][16] = _
  layer[height - 1][16] = _

  // 내부 벽 충돌
  for (let y = 2; y < 12; y++) {
    layer[y][12] = T.COLLISION
  }
  // 문 열기
  layer[12][12] = _

  for (let y = 2; y < 15; y++) {
    layer[y][34] = T.COLLISION
  }
  // 문 열기
  layer[15][34] = _

  // 가구 충돌
  // 데스크
  layer[5][4] = T.COLLISION
  layer[5][5] = T.COLLISION
  layer[5][6] = T.COLLISION
  layer[6][4] = T.COLLISION
  layer[6][5] = T.COLLISION
  layer[6][6] = T.COLLISION

  // 소파
  layer[9][3] = T.COLLISION
  layer[9][4] = T.COLLISION
  layer[9][5] = T.COLLISION

  // 업무 책상들
  for (let i = 0; i < 4; i++) {
    const dx = 22 + i * 3
    layer[5][dx] = T.COLLISION
    layer[5][dx + 1] = T.COLLISION
    layer[6][dx] = T.COLLISION
    layer[6][dx + 1] = T.COLLISION
    layer[10][dx] = T.COLLISION
    layer[10][dx + 1] = T.COLLISION
    layer[11][dx] = T.COLLISION
    layer[11][dx + 1] = T.COLLISION
  }

  // 회의실 테이블
  for (let y = 8; y <= 10; y++) {
    for (let x = 38; x <= 41; x++) {
      layer[y][x] = T.COLLISION
    }
  }

  // 휴게 소파
  layer[24][22] = T.COLLISION
  layer[24][23] = T.COLLISION
  layer[24][24] = T.COLLISION
  layer[28][22] = T.COLLISION
  layer[28][23] = T.COLLISION
  layer[28][24] = T.COLLISION
  layer[26][23] = T.COLLISION

  // 화분
  layer[3][15] = T.COLLISION
  layer[3][17] = T.COLLISION

  // 복사기, 커피머신 등
  layer[20][3] = T.COLLISION
  layer[20][5] = T.COLLISION
  layer[20][7] = T.COLLISION

  // 책장
  layer[3][22] = T.COLLISION
  layer[3][23] = T.COLLISION
  layer[3][24] = T.COLLISION

  // 캐비넷
  layer[14][3] = T.COLLISION
  layer[14][4] = T.COLLISION

  return layer
}

/**
 * 스폰 포인트 생성
 */
function createSpawnPoints(): SpawnPoint[] {
  return [
    // 메인 입구 (기본 스폰)
    { x: 16, y: 30, isDefault: true },
    // 로비
    { x: 8, y: 8 },
    // 회의실
    { x: 40, y: 12 },
    // 휴게 공간
    { x: 26, y: 26 },
  ]
}

/**
 * 상호작용 영역 생성
 */
function createInteractiveZones(): InteractiveZone[] {
  return [
    // 화이트보드 (공지)
    {
      x: 44,
      y: 6,
      width: 2,
      height: 1,
      type: "notice",
      data: { title: "회의실 공지", content: "회의 예정 없음" },
    },
    // 코르크보드 (링크)
    {
      x: 42,
      y: 2,
      width: 1,
      height: 1,
      type: "link",
      data: { url: "https://example.com", label: "회사 홈페이지" },
    },
    // 포털 (다른 공간으로 이동)
    {
      x: 47,
      y: 17,
      width: 1,
      height: 2,
      type: "portal",
      data: { targetSpaceId: "outdoor", label: "야외로 이동" },
    },
  ]
}

/**
 * 맵 데이터를 2D 배열에서 1D 배열로 변환 (Phaser Tilemap용)
 */
export function flattenLayerData(layer: number[][]): number[] {
  return layer.flat()
}

/**
 * 맵 데이터를 Tiled JSON 포맷으로 변환
 */
export function toTiledFormat(mapData: MapData): object {
  return {
    height: mapData.height,
    width: mapData.width,
    tilewidth: mapData.tileSize,
    tileheight: mapData.tileSize,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.10.0",
    type: "map",
    version: "1.10",
    layers: mapData.layers.map((layer, index) => ({
      id: index + 1,
      name: layer.name,
      type: "tilelayer",
      visible: layer.visible,
      width: mapData.width,
      height: mapData.height,
      x: 0,
      y: 0,
      data: flattenLayerData(layer.data).map((t) => (t === -1 ? 0 : t + 1)),
      opacity: 1,
    })),
    tilesets: [
      {
        firstgid: 1,
        name: "modern-office-tileset",
        tilewidth: mapData.tileSize,
        tileheight: mapData.tileSize,
        tilecount: 192,
        columns: 16,
      },
    ],
    properties: [
      {
        name: "spawnPoints",
        type: "string",
        value: JSON.stringify(mapData.spawnPoints),
      },
      {
        name: "interactiveZones",
        type: "string",
        value: JSON.stringify(mapData.interactiveZones),
      },
    ],
  }
}
