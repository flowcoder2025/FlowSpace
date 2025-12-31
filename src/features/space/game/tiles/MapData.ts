/**
 * MapData - 모던 오피스 맵 레이아웃 데이터
 * Phaser Tilemap 시스템에서 사용할 맵 데이터 정의
 */

import { TILE_INDEX } from "./TilesetGenerator"

// 맵 설정
export const MAP_CONFIG = {
  WIDTH: 40, // 타일 단위 (40x30 세미나실 - 화면 전체 사용)
  HEIGHT: 30, // 타일 단위 (40x30 세미나실 - 화면 전체 사용)
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
 * 세미나실 맵 생성
 * 40x30 타일 (1280x960px) - 화면 전체 사용
 *
 * 레이아웃:
 * - 상단: 발표자 공간 (스크린, 연단)
 * - 중앙: 청중 좌석 (4열)
 * - 하단: 입구 및 로비
 */
export function createModernOfficeMap(): MapData {
  const { WIDTH, HEIGHT, TILE_SIZE } = MAP_CONFIG

  // 바닥 레이어 생성
  const groundLayer = createSeminarGroundLayer(WIDTH, HEIGHT)

  // 벽 레이어 생성
  const wallsLayer = createSeminarWallsLayer(WIDTH, HEIGHT)

  // 가구 레이어 생성
  const furnitureLayer = createSeminarFurnitureLayer(WIDTH, HEIGHT)

  // 가구 상단 레이어 (플레이어 앞에 렌더링)
  const furnitureTopLayer = createSeminarFurnitureTopLayer(WIDTH, HEIGHT)

  // 장식 레이어
  const decorationsLayer = createSeminarDecorationsLayer(WIDTH, HEIGHT)

  // 충돌 레이어
  const collisionLayer = createSeminarCollisionLayer(WIDTH, HEIGHT)

  return {
    name: "Seminar Room",
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
    spawnPoints: createSeminarSpawnPoints(),
    interactiveZones: createSeminarInteractiveZones(),
  }
}

// ============================================
// 40x30 세미나실 레이어 생성 함수들
// ============================================

/**
 * 세미나실 바닥 레이어 생성 (40x30)
 */
function createSeminarGroundLayer(width: number, height: number): number[][] {
  const layer: number[][] = []

  for (let y = 0; y < height; y++) {
    const row: number[] = []
    for (let x = 0; x < width; x++) {
      let tile = T.FLOOR_CARPET_1 + ((x + y) % 2) // 기본 카펫 바닥

      // 발표자 영역 (상단 y: 2-6) - 나무 바닥
      if (y >= 2 && y <= 6 && x >= 4 && x < width - 4) {
        tile = T.FLOOR_WOOD_1 + ((x + y) % 4)
      }

      // 입구/로비 영역 (하단 y: 25-28) - 타일 바닥
      if (y >= 25 && y <= 28 && x >= 15 && x <= 24) {
        tile = T.FLOOR_TILE_1 + ((x + y) % 2)
      }

      row.push(tile)
    }
    layer.push(row)
  }

  return layer
}

/**
 * 세미나실 벽 레이어 생성 (40x30)
 */
function createSeminarWallsLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // === 외벽 ===
  // 상단 외벽
  for (let x = 0; x < width; x++) {
    layer[0][x] = T.WALL_TOP_M
    layer[1][x] = T.WALL_BOT_M
  }

  // 하단 외벽
  for (let x = 0; x < width; x++) {
    layer[height - 2][x] = T.WALL_TOP_M
    layer[height - 1][x] = T.WALL_BOT_M
  }

  // 좌측 외벽
  for (let y = 2; y < height - 2; y++) {
    layer[y][0] = T.WALL_MID_L
    layer[y][1] = T.WALL_MID_R
  }

  // 우측 외벽
  for (let y = 2; y < height - 2; y++) {
    layer[y][width - 2] = T.WALL_MID_L
    layer[y][width - 1] = T.WALL_MID_R
  }

  // 코너
  layer[0][0] = T.WALL_CORNER_TL
  layer[0][width - 1] = T.WALL_CORNER_TR
  layer[height - 1][0] = T.WALL_CORNER_BL
  layer[height - 1][width - 1] = T.WALL_CORNER_BR

  // === 창문 (상단 - 균등 분배) ===
  layer[0][8] = T.WALL_WINDOW
  layer[0][9] = T.WALL_WINDOW
  layer[0][18] = T.WALL_WINDOW
  layer[0][19] = T.WALL_WINDOW
  layer[0][20] = T.WALL_WINDOW
  layer[0][21] = T.WALL_WINDOW
  layer[0][30] = T.WALL_WINDOW
  layer[0][31] = T.WALL_WINDOW

  // 좌측 외벽 창문
  layer[8][0] = T.WALL_WINDOW
  layer[15][0] = T.WALL_WINDOW
  layer[22][0] = T.WALL_WINDOW

  // 우측 외벽 창문
  layer[8][width - 1] = T.WALL_WINDOW
  layer[15][width - 1] = T.WALL_WINDOW
  layer[22][width - 1] = T.WALL_WINDOW

  // === 입구 문 (하단 중앙) ===
  layer[height - 2][19] = T.WALL_DOOR
  layer[height - 2][20] = T.WALL_DOOR

  return layer
}

/**
 * 세미나실 가구 레이어 생성 (플레이어 뒤) - 40x30
 */
function createSeminarFurnitureLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // === 발표자 영역 (상단) ===
  // 스크린 (중앙 - 더 넓게)
  layer[3][16] = T.SCREEN_L
  layer[3][17] = T.SCREEN_M
  layer[3][18] = T.SCREEN_M
  layer[3][19] = T.SCREEN_M
  layer[3][20] = T.SCREEN_M
  layer[3][21] = T.SCREEN_M
  layer[3][22] = T.SCREEN_M
  layer[3][23] = T.SCREEN_R

  // 연단 (스크린 앞)
  layer[6][19] = T.PODIUM_L
  layer[6][20] = T.PODIUM_R

  // === 청중 좌석 (4열, 각 열 10석 - 좌우 그룹) ===
  // 좌측 그룹 (5석씩)
  for (let row = 0; row < 4; row++) {
    const rowY = 10 + row * 4
    for (let col = 0; col < 5; col++) {
      const seatX = 6 + col * 2
      layer[rowY][seatX] = T.LECTURE_SEAT_2
    }
  }

  // 우측 그룹 (5석씩)
  for (let row = 0; row < 4; row++) {
    const rowY = 10 + row * 4
    for (let col = 0; col < 5; col++) {
      const seatX = 24 + col * 2
      layer[rowY][seatX] = T.LECTURE_SEAT_2
    }
  }

  // === 장식 ===
  // 화분 (발표자 영역 양쪽)
  layer[4][5] = T.PLANT_LARGE
  layer[4][34] = T.PLANT_LARGE

  // 화분 (뒷쪽 양쪽)
  layer[24][4] = T.PLANT_LARGE
  layer[24][35] = T.PLANT_LARGE

  return layer
}

/**
 * 세미나실 가구 상단 레이어 (플레이어 앞에 렌더링) - 40x30
 */
function createSeminarFurnitureTopLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // 조명 (입구 양쪽)
  layer[25][8] = T.LAMP_FLOOR
  layer[25][31] = T.LAMP_FLOOR

  // 중앙 통로 조명
  layer[15][20] = T.LAMP_FLOOR

  return layer
}

/**
 * 세미나실 장식 레이어 - 40x30
 */
function createSeminarDecorationsLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // 벽 장식 - 시계, 액자
  layer[2][6] = T.CLOCK
  layer[2][12] = T.FRAME_1
  layer[2][27] = T.FRAME_1
  layer[2][33] = T.CLOCK

  // 스폰 포인트 마커 (디버그/가이드용 - 입구 근처)
  layer[26][20] = T.SPAWN_POINT

  return layer
}

/**
 * 세미나실 충돌 레이어 생성 - 40x30
 */
function createSeminarCollisionLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // === 외벽 충돌 ===
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

  // === 입구 문 열기 ===
  layer[height - 2][19] = _
  layer[height - 2][20] = _

  // === 가구 충돌 ===
  // 스크린
  for (let x = 16; x <= 23; x++) {
    layer[3][x] = T.COLLISION
  }

  // 연단
  layer[6][19] = T.COLLISION
  layer[6][20] = T.COLLISION

  // 화분 (발표자 영역)
  layer[4][5] = T.COLLISION
  layer[4][34] = T.COLLISION

  // 화분 (뒷쪽)
  layer[24][4] = T.COLLISION
  layer[24][35] = T.COLLISION

  // 조명
  layer[25][8] = T.COLLISION
  layer[25][31] = T.COLLISION
  layer[15][20] = T.COLLISION

  return layer
}

/**
 * 세미나실 스폰 포인트 생성 - 40x30
 */
function createSeminarSpawnPoints(): SpawnPoint[] {
  return [
    // 입구 (기본 스폰)
    { x: 20, y: 26, isDefault: true },
    // 발표자 영역
    { x: 20, y: 8 },
  ]
}

/**
 * 세미나실 상호작용 영역 생성 - 40x30
 */
function createSeminarInteractiveZones(): InteractiveZone[] {
  return [
    // 스크린 (링크)
    {
      x: 16,
      y: 3,
      width: 8,
      height: 1,
      type: "link",
      data: { url: "https://example.com/presentation", label: "발표 자료" },
    },
    // 연단 (공지)
    {
      x: 19,
      y: 6,
      width: 2,
      height: 1,
      type: "notice",
      data: { title: "발표 안내", content: "오늘의 세미나에 오신 것을 환영합니다!" },
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
