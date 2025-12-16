/**
 * MapData - 모던 오피스 맵 레이아웃 데이터
 * Phaser Tilemap 시스템에서 사용할 맵 데이터 정의
 */

import { TILE_INDEX } from "./TilesetGenerator"

// 맵 설정
export const MAP_CONFIG = {
  WIDTH: 80, // 타일 단위 (학습 공간 확장)
  HEIGHT: 60, // 타일 단위 (학습 공간 확장)
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
      let tile = T.FLOOR_CONCRETE_1 + ((x + y) % 2) // 기본 바닥

      // 로비 (y: 0-7)
      if (y <= 7) {
        tile = T.FLOOR_TILE_1 + ((x + y) % 2)
      }

      // 강의실 (x: 2-28, y: 8-50) - 카펫 바닥
      if (x >= 2 && x <= 28 && y >= 8 && y <= 50) {
        tile = T.FLOOR_CARPET_1 + ((x + y) % 2)
      }

      // 강의실 무대 영역 (x: 2-28, y: 44-50)
      if (x >= 2 && x <= 28 && y >= 44 && y <= 50) {
        tile = T.FLOOR_WOOD_1 + ((x + y) % 4)
      }

      // 수업실 1 (x: 32-44, y: 8-24) - 나무 바닥
      if (x >= 32 && x <= 44 && y >= 8 && y <= 24) {
        tile = T.FLOOR_WOOD_1 + ((x + y) % 4)
      }

      // 수업실 2 (x: 46-58, y: 8-24) - 나무 바닥
      if (x >= 46 && x <= 58 && y >= 8 && y <= 24) {
        tile = T.FLOOR_WOOD_2 + ((x + y) % 4)
      }

      // 수업실 3 (x: 32-44, y: 26-42) - 나무 바닥
      if (x >= 32 && x <= 44 && y >= 26 && y <= 42) {
        tile = T.FLOOR_WOOD_3 + ((x + y) % 4)
      }

      // 멘토링방 1-4 (x: 62-78) - 타일 바닥
      if (x >= 62 && x <= 78) {
        // M1: y: 8-18
        if (y >= 8 && y <= 18) {
          tile = T.FLOOR_ACCENT_1 + ((x + y) % 2)
        }
        // M2: y: 20-30
        if (y >= 20 && y <= 30) {
          tile = T.FLOOR_ACCENT_2 + ((x + y) % 2)
        }
        // M3: y: 32-42
        if (y >= 32 && y <= 42) {
          tile = T.FLOOR_ACCENT_1 + ((x + y) % 2)
        }
        // M4: y: 44-54
        if (y >= 44 && y <= 54) {
          tile = T.FLOOR_ACCENT_2 + ((x + y) % 2)
        }
      }

      // 복도 (y: 52-59, 중앙) - 콘크리트
      if (y >= 52 && y <= 59 && x < 62) {
        tile = T.FLOOR_CONCRETE_1 + ((x + y) % 2)
      }

      // 수직 복도 (x: 29-31) - 연결 통로
      if (x >= 29 && x <= 31 && y >= 8 && y <= 51) {
        tile = T.FLOOR_CONCRETE_1 + ((x + y) % 2)
      }

      // 수직 복도 (x: 45) - 수업실 연결
      if (x === 45 && y >= 8 && y <= 42) {
        tile = T.FLOOR_CONCRETE_1 + ((x + y) % 2)
      }

      // 수직 복도 (x: 59-61) - 멘토링방 연결
      if (x >= 59 && x <= 61 && y >= 8 && y <= 54) {
        tile = T.FLOOR_CONCRETE_1 + ((x + y) % 2)
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

  // === 로비 하단 벽 (y=7) ===
  for (let x = 2; x < width - 2; x++) {
    layer[7][x] = T.WALL_SOLID
  }

  // === 강의실 벽 (x: 2-28, y: 8-50) ===
  // 강의실 오른쪽 벽
  for (let y = 8; y <= 50; y++) {
    layer[y][28] = T.WALL_MID_M
    layer[y][29] = T.WALL_MID_R
  }

  // === 복도 벽 (y=51) ===
  for (let x = 2; x < 62; x++) {
    layer[51][x] = T.WALL_SOLID
  }

  // === 수업실 1 벽 (x: 32-44, y: 8-24) ===
  // 수업실 1 하단 벽
  for (let x = 32; x <= 44; x++) {
    layer[24][x] = T.WALL_SOLID
  }
  // 수업실 1 오른쪽 벽
  for (let y = 8; y <= 24; y++) {
    layer[y][44] = T.WALL_MID_M
  }

  // === 수업실 2 벽 (x: 46-58, y: 8-24) ===
  // 수업실 2 하단 벽
  for (let x = 46; x <= 58; x++) {
    layer[24][x] = T.WALL_SOLID
  }
  // 수업실 2 오른쪽 벽
  for (let y = 8; y <= 24; y++) {
    layer[y][58] = T.WALL_MID_M
  }

  // === 수업실 3 벽 (x: 32-44, y: 26-42) ===
  // 수업실 3 하단 벽
  for (let x = 32; x <= 44; x++) {
    layer[42][x] = T.WALL_SOLID
  }
  // 수업실 3 오른쪽 벽
  for (let y = 26; y <= 42; y++) {
    layer[y][44] = T.WALL_MID_M
  }

  // === 멘토링 영역 왼쪽 벽 (x: 60-61) ===
  for (let y = 8; y <= 54; y++) {
    layer[y][60] = T.WALL_MID_L
    layer[y][61] = T.WALL_MID_R
  }

  // === 멘토링방 구분 벽 ===
  // M1-M2 구분 (y=19)
  for (let x = 62; x < width - 2; x++) {
    layer[19][x] = T.WALL_SOLID
  }
  // M2-M3 구분 (y=31)
  for (let x = 62; x < width - 2; x++) {
    layer[31][x] = T.WALL_SOLID
  }
  // M3-M4 구분 (y=43)
  for (let x = 62; x < width - 2; x++) {
    layer[43][x] = T.WALL_SOLID
  }

  // === 창문 ===
  // 상단 외벽 창문
  for (let x = 6; x < width - 6; x += 8) {
    layer[0][x] = T.WALL_WINDOW
    layer[0][x + 1] = T.WALL_WINDOW
  }
  // 좌측 외벽 창문
  for (let y = 12; y < height - 10; y += 10) {
    layer[y][0] = T.WALL_WINDOW
  }

  // === 문 ===
  // 로비 → 강의실 문
  layer[7][15] = T.WALL_DOOR
  // 로비 → 수업실 영역 문
  layer[7][38] = T.WALL_DOOR
  layer[7][52] = T.WALL_DOOR
  // 로비 → 멘토링 영역 문
  layer[7][70] = T.WALL_DOOR
  // 강의실 → 복도 문
  layer[51][15] = T.WALL_DOOR
  // 수업실 → 복도 문
  layer[51][38] = T.WALL_DOOR
  // 수업실 1-2 연결 문
  layer[16][44] = T.WALL_DOOR
  // 수업실 1-3 연결 문
  layer[24][38] = T.WALL_DOOR
  // 멘토링방 문
  layer[13][60] = T.WALL_DOOR
  layer[25][60] = T.WALL_DOOR
  layer[37][60] = T.WALL_DOOR
  layer[49][60] = T.WALL_DOOR
  // 메인 입구
  layer[height - 2][40] = T.WALL_DOOR

  return layer
}

/**
 * 가구 레이어 생성 (플레이어 뒤)
 */
function createFurnitureLayer(width: number, height: number): number[][] {
  const layer: number[][] = Array.from({ length: height }, () =>
    Array(width).fill(_)
  )

  // === 로비 (y: 2-6) ===
  // 안내 데스크
  layer[3][38] = T.DESK_TOP_L
  layer[3][39] = T.DESK_TOP_M
  layer[3][40] = T.DESK_TOP_R
  layer[4][38] = T.DESK_BOT_L
  layer[4][39] = T.DESK_BOT_M
  layer[4][40] = T.DESK_BOT_R
  // 로비 소파
  layer[4][10] = T.SOFA_L
  layer[4][11] = T.SOFA_M
  layer[4][12] = T.SOFA_R
  layer[4][60] = T.SOFA_L
  layer[4][61] = T.SOFA_M
  layer[4][62] = T.SOFA_R
  // 화분
  layer[3][5] = T.PLANT_LARGE
  layer[3][75] = T.PLANT_LARGE

  // === 강의실 (x: 2-28, y: 8-50) ===
  // 무대 영역 (y: 44-49)
  // 칠판
  layer[45][8] = T.BLACKBOARD_L
  layer[45][9] = T.BLACKBOARD_M
  layer[45][10] = T.BLACKBOARD_R
  // 스크린
  layer[45][16] = T.SCREEN_L
  layer[45][17] = T.SCREEN_M
  layer[45][18] = T.SCREEN_R
  // 연단
  layer[47][12] = T.PODIUM_L
  layer[47][13] = T.PODIUM_M
  layer[47][14] = T.PODIUM_R
  // 교수 책상
  layer[48][10] = T.LECTURE_DESK

  // 강의실 좌석 (50석: 10열 x 5행, y: 10-40)
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 10; col++) {
      const seatX = 4 + col * 2
      const seatY = 12 + row * 6
      // 좌석 (접이식 책상 포함)
      layer[seatY][seatX] = T.LECTURE_SEAT_2
      layer[seatY][seatX + 1] = T.LECTURE_SEAT_2
    }
  }

  // === 수업실 1 (x: 32-44, y: 8-24) ===
  // 그룹 테이블 2개
  // 테이블 1
  layer[12][35] = T.GROUP_TABLE_TL
  layer[12][36] = T.GROUP_TABLE_TR
  layer[13][35] = T.GROUP_TABLE_BL
  layer[13][36] = T.GROUP_TABLE_BR
  // 테이블 2
  layer[18][35] = T.GROUP_TABLE_TL
  layer[18][36] = T.GROUP_TABLE_TR
  layer[19][35] = T.GROUP_TABLE_BL
  layer[19][36] = T.GROUP_TABLE_BR
  // 학생 책상
  layer[12][40] = T.STUDENT_DESK_L
  layer[12][41] = T.STUDENT_DESK_R
  layer[18][40] = T.STUDENT_DESK_L
  layer[18][41] = T.STUDENT_DESK_R
  // 화이트보드
  layer[10][38] = T.WHITEBOARD

  // === 수업실 2 (x: 46-58, y: 8-24) ===
  // 그룹 테이블 2개
  layer[12][49] = T.GROUP_TABLE_TL
  layer[12][50] = T.GROUP_TABLE_TR
  layer[13][49] = T.GROUP_TABLE_BL
  layer[13][50] = T.GROUP_TABLE_BR
  layer[18][49] = T.GROUP_TABLE_TL
  layer[18][50] = T.GROUP_TABLE_TR
  layer[19][49] = T.GROUP_TABLE_BL
  layer[19][50] = T.GROUP_TABLE_BR
  // 학생 책상
  layer[12][54] = T.STUDENT_DESK_L
  layer[12][55] = T.STUDENT_DESK_R
  layer[18][54] = T.STUDENT_DESK_L
  layer[18][55] = T.STUDENT_DESK_R
  // 화이트보드
  layer[10][52] = T.WHITEBOARD

  // === 수업실 3 (x: 32-44, y: 26-42) ===
  // 그룹 테이블 2개
  layer[30][35] = T.GROUP_TABLE_TL
  layer[30][36] = T.GROUP_TABLE_TR
  layer[31][35] = T.GROUP_TABLE_BL
  layer[31][36] = T.GROUP_TABLE_BR
  layer[36][35] = T.GROUP_TABLE_TL
  layer[36][36] = T.GROUP_TABLE_TR
  layer[37][35] = T.GROUP_TABLE_BL
  layer[37][36] = T.GROUP_TABLE_BR
  // 학생 책상
  layer[30][40] = T.STUDENT_DESK_L
  layer[30][41] = T.STUDENT_DESK_R
  layer[36][40] = T.STUDENT_DESK_L
  layer[36][41] = T.STUDENT_DESK_R
  // 화이트보드
  layer[28][38] = T.WHITEBOARD

  // === 멘토링방 1 (x: 62-78, y: 8-18) ===
  layer[12][69] = T.MENTOR_TABLE
  layer[11][68] = T.MENTOR_CHAIR
  layer[11][70] = T.MENTOR_CHAIR
  layer[13][68] = T.MENTOR_CHAIR
  layer[13][70] = T.MENTOR_CHAIR
  layer[10][75] = T.PLANT_SMALL

  // === 멘토링방 2 (x: 62-78, y: 20-30) ===
  layer[24][69] = T.MENTOR_TABLE
  layer[23][68] = T.MENTOR_CHAIR
  layer[23][70] = T.MENTOR_CHAIR
  layer[25][68] = T.MENTOR_CHAIR
  layer[25][70] = T.MENTOR_CHAIR
  layer[22][75] = T.PLANT_SMALL

  // === 멘토링방 3 (x: 62-78, y: 32-42) ===
  layer[36][69] = T.MENTOR_TABLE
  layer[35][68] = T.MENTOR_CHAIR
  layer[35][70] = T.MENTOR_CHAIR
  layer[37][68] = T.MENTOR_CHAIR
  layer[37][70] = T.MENTOR_CHAIR
  layer[34][75] = T.PLANT_SMALL

  // === 멘토링방 4 (x: 62-78, y: 44-54) ===
  layer[48][69] = T.MENTOR_TABLE
  layer[47][68] = T.MENTOR_CHAIR
  layer[47][70] = T.MENTOR_CHAIR
  layer[49][68] = T.MENTOR_CHAIR
  layer[49][70] = T.MENTOR_CHAIR
  layer[46][75] = T.PLANT_SMALL

  // === 복도 장식 ===
  layer[54][10] = T.PLANT_LARGE
  layer[54][25] = T.PLANT_LARGE
  layer[54][50] = T.PLANT_LARGE

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
  layer[height - 2][40] = _
  layer[height - 1][40] = _

  // === 로비 하단 벽 충돌 (y=7) ===
  for (let x = 2; x < width - 2; x++) {
    layer[7][x] = T.COLLISION
  }
  // 문 열기
  layer[7][15] = _
  layer[7][38] = _
  layer[7][52] = _
  layer[7][70] = _

  // === 강의실 벽 충돌 ===
  for (let y = 8; y <= 50; y++) {
    layer[y][28] = T.COLLISION
    layer[y][29] = T.COLLISION
  }

  // === 복도 벽 충돌 (y=51) ===
  for (let x = 2; x < 62; x++) {
    layer[51][x] = T.COLLISION
  }
  // 문 열기
  layer[51][15] = _
  layer[51][38] = _

  // === 수업실 벽 충돌 ===
  // 수업실 1,2 하단 벽 (y=24)
  for (let x = 32; x <= 58; x++) {
    layer[24][x] = T.COLLISION
  }
  layer[24][45] = _ // 복도 통로
  // 수업실 1,2 사이 벽
  for (let y = 8; y <= 24; y++) {
    layer[y][44] = T.COLLISION
  }
  layer[16][44] = _ // 문
  // 수업실 2 오른쪽 벽
  for (let y = 8; y <= 24; y++) {
    layer[y][58] = T.COLLISION
  }
  // 수업실 3 하단 벽 (y=42)
  for (let x = 32; x <= 44; x++) {
    layer[42][x] = T.COLLISION
  }
  // 수업실 1-3 연결 문 열기
  layer[24][38] = _

  // === 멘토링 영역 벽 충돌 ===
  for (let y = 8; y <= 54; y++) {
    layer[y][60] = T.COLLISION
    layer[y][61] = T.COLLISION
  }
  // 멘토링방 문 열기
  layer[13][60] = _
  layer[13][61] = _
  layer[25][60] = _
  layer[25][61] = _
  layer[37][60] = _
  layer[37][61] = _
  layer[49][60] = _
  layer[49][61] = _

  // 멘토링방 구분 벽 충돌
  for (let x = 62; x < width - 2; x++) {
    layer[19][x] = T.COLLISION
    layer[31][x] = T.COLLISION
    layer[43][x] = T.COLLISION
  }

  // === 가구 충돌 ===
  // 로비 안내 데스크
  for (let dy = 3; dy <= 4; dy++) {
    for (let dx = 38; dx <= 40; dx++) {
      layer[dy][dx] = T.COLLISION
    }
  }
  // 로비 소파
  for (let dx = 10; dx <= 12; dx++) {
    layer[4][dx] = T.COLLISION
  }
  for (let dx = 60; dx <= 62; dx++) {
    layer[4][dx] = T.COLLISION
  }
  // 화분
  layer[3][5] = T.COLLISION
  layer[3][75] = T.COLLISION

  // 강의실 무대 가구
  // 칠판
  layer[45][8] = T.COLLISION
  layer[45][9] = T.COLLISION
  layer[45][10] = T.COLLISION
  // 스크린
  layer[45][16] = T.COLLISION
  layer[45][17] = T.COLLISION
  layer[45][18] = T.COLLISION
  // 연단
  layer[47][12] = T.COLLISION
  layer[47][13] = T.COLLISION
  layer[47][14] = T.COLLISION
  // 교수 책상
  layer[48][10] = T.COLLISION

  // 강의실 좌석 (충돌 없음 - 좌석 사이로 이동 가능)

  // 수업실 그룹 테이블 충돌
  // 수업실 1
  layer[12][35] = T.COLLISION
  layer[12][36] = T.COLLISION
  layer[13][35] = T.COLLISION
  layer[13][36] = T.COLLISION
  layer[18][35] = T.COLLISION
  layer[18][36] = T.COLLISION
  layer[19][35] = T.COLLISION
  layer[19][36] = T.COLLISION
  layer[10][38] = T.COLLISION // 화이트보드
  // 수업실 2
  layer[12][49] = T.COLLISION
  layer[12][50] = T.COLLISION
  layer[13][49] = T.COLLISION
  layer[13][50] = T.COLLISION
  layer[18][49] = T.COLLISION
  layer[18][50] = T.COLLISION
  layer[19][49] = T.COLLISION
  layer[19][50] = T.COLLISION
  layer[10][52] = T.COLLISION // 화이트보드
  // 수업실 3
  layer[30][35] = T.COLLISION
  layer[30][36] = T.COLLISION
  layer[31][35] = T.COLLISION
  layer[31][36] = T.COLLISION
  layer[36][35] = T.COLLISION
  layer[36][36] = T.COLLISION
  layer[37][35] = T.COLLISION
  layer[37][36] = T.COLLISION
  layer[28][38] = T.COLLISION // 화이트보드

  // 멘토링방 테이블 충돌
  layer[12][69] = T.COLLISION // M1
  layer[24][69] = T.COLLISION // M2
  layer[36][69] = T.COLLISION // M3
  layer[48][69] = T.COLLISION // M4

  // 복도 화분
  layer[54][10] = T.COLLISION
  layer[54][25] = T.COLLISION
  layer[54][50] = T.COLLISION

  return layer
}

/**
 * 스폰 포인트 생성
 */
function createSpawnPoints(): SpawnPoint[] {
  return [
    // 메인 입구 (기본 스폰)
    { x: 40, y: 56, isDefault: true },
    // 로비
    { x: 40, y: 4 },
    // 강의실 입구
    { x: 15, y: 10 },
    // 수업실 1 입구
    { x: 38, y: 10 },
    // 수업실 2 입구
    { x: 52, y: 10 },
    // 수업실 3 입구
    { x: 38, y: 28 },
    // 멘토링방 1 입구
    { x: 65, y: 13 },
    // 멘토링방 2 입구
    { x: 65, y: 25 },
    // 멘토링방 3 입구
    { x: 65, y: 37 },
    // 멘토링방 4 입구
    { x: 65, y: 49 },
  ]
}

/**
 * 상호작용 영역 생성
 */
function createInteractiveZones(): InteractiveZone[] {
  return [
    // 강의실 칠판 (공지)
    {
      x: 8,
      y: 45,
      width: 3,
      height: 1,
      type: "notice",
      data: { title: "강의 공지", content: "오늘의 강의: AI 기초" },
    },
    // 강의실 스크린 (링크)
    {
      x: 16,
      y: 45,
      width: 3,
      height: 1,
      type: "link",
      data: { url: "https://example.com/lecture", label: "강의 자료" },
    },
    // 수업실 1 화이트보드
    {
      x: 38,
      y: 10,
      width: 1,
      height: 1,
      type: "notice",
      data: { title: "수업실 1", content: "그룹 프로젝트 진행 중" },
    },
    // 수업실 2 화이트보드
    {
      x: 52,
      y: 10,
      width: 1,
      height: 1,
      type: "notice",
      data: { title: "수업실 2", content: "팀 미팅 예정" },
    },
    // 수업실 3 화이트보드
    {
      x: 38,
      y: 28,
      width: 1,
      height: 1,
      type: "notice",
      data: { title: "수업실 3", content: "워크숍 진행" },
    },
    // 멘토링방 1 포털
    {
      x: 75,
      y: 12,
      width: 1,
      height: 1,
      type: "portal",
      data: { targetSpaceId: "mentor1", label: "1:1 멘토링" },
    },
    // 멘토링방 2 포털
    {
      x: 75,
      y: 24,
      width: 1,
      height: 1,
      type: "portal",
      data: { targetSpaceId: "mentor2", label: "그룹 멘토링" },
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
