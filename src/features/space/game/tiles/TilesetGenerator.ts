/**
 * TilesetGenerator - 고품질 모던 오피스 스타일 타일셋 생성기
 * Phaser에서 사용할 타일셋 텍스처를 Canvas API로 생성
 */
import * as Phaser from "phaser"

// 타일셋 설정
export const TILESET_CONFIG = {
  TILE_SIZE: 32,
  TILESET_COLS: 16, // 가로 16타일
  TILESET_ROWS: 14, // 세로 14타일 (학습 공간 타일 추가)
  get WIDTH() {
    return this.TILE_SIZE * this.TILESET_COLS // 512px
  },
  get HEIGHT() {
    return this.TILE_SIZE * this.TILESET_ROWS // 448px
  },
}

// 타일 인덱스 매핑
export const TILE_INDEX = {
  // Row 0: 바닥 타일
  FLOOR_WOOD_1: 0,
  FLOOR_WOOD_2: 1,
  FLOOR_WOOD_3: 2,
  FLOOR_WOOD_4: 3,
  FLOOR_CARPET_1: 4,
  FLOOR_CARPET_2: 5,
  FLOOR_TILE_1: 6,
  FLOOR_TILE_2: 7,
  FLOOR_GRASS_1: 8,
  FLOOR_GRASS_2: 9,
  FLOOR_STONE_1: 10,
  FLOOR_STONE_2: 11,
  FLOOR_CONCRETE_1: 12,
  FLOOR_CONCRETE_2: 13,
  FLOOR_ACCENT_1: 14,
  FLOOR_ACCENT_2: 15,

  // Row 1: 벽 타일
  WALL_TOP_L: 16,
  WALL_TOP_M: 17,
  WALL_TOP_R: 18,
  WALL_MID_L: 19,
  WALL_MID_M: 20,
  WALL_MID_R: 21,
  WALL_BOT_L: 22,
  WALL_BOT_M: 23,
  WALL_BOT_R: 24,
  WALL_CORNER_TL: 25,
  WALL_CORNER_TR: 26,
  WALL_CORNER_BL: 27,
  WALL_CORNER_BR: 28,
  WALL_WINDOW: 29,
  WALL_DOOR: 30,
  WALL_SOLID: 31,

  // Row 2: 가구 (상단)
  DESK_TOP_L: 32,
  DESK_TOP_M: 33,
  DESK_TOP_R: 34,
  CHAIR_1: 35,
  CHAIR_2: 36,
  SOFA_L: 37,
  SOFA_M: 38,
  SOFA_R: 39,
  TABLE_ROUND: 40,
  TABLE_SQUARE: 41,
  BOOKSHELF_T: 42,
  CABINET_T: 43,
  WHITEBOARD: 44,
  MONITOR: 45,
  PLANT_LARGE: 46,
  PLANT_SMALL: 47,

  // Row 3: 가구 (하단)
  DESK_BOT_L: 48,
  DESK_BOT_M: 49,
  DESK_BOT_R: 50,
  CHAIR_LEG: 51,
  SOFA_SEAT: 52,
  TABLE_LEG: 53,
  BOOKSHELF_B: 54,
  CABINET_B: 55,
  LAMP_FLOOR: 56,
  LAMP_DESK: 57,
  TRASH: 58,
  PRINTER: 59,
  COFFEE_MACHINE: 60,
  WATER_COOLER: 61,
  COAT_RACK: 62,
  UMBRELLA_STAND: 63,

  // Row 4: 장식
  RUG_TL: 64,
  RUG_TM: 65,
  RUG_TR: 66,
  RUG_ML: 67,
  RUG_MM: 68,
  RUG_MR: 69,
  RUG_BL: 70,
  RUG_BM: 71,
  RUG_BR: 72,
  FRAME_1: 73,
  FRAME_2: 74,
  CLOCK: 75,
  POSTER_1: 76,
  POSTER_2: 77,
  SIGN: 78,
  CORKBOARD: 79,

  // Row 5: 특수
  SPAWN_POINT: 80,
  INTERACTIVE: 81,
  PORTAL: 82,
  HIGHLIGHT: 83,
  SHADOW_L: 84,
  SHADOW_M: 85,
  SHADOW_R: 86,
  SHADOW_FULL: 87,
  EMPTY: 88,
  COLLISION: 89,
  NAV_ZONE: 90,
  EVENT_ZONE: 91,

  // Row 6-7: 추가 장식/오브젝트
  COMPUTER_L: 96,
  COMPUTER_R: 97,
  KEYBOARD: 98,
  MOUSE_PAD: 99,
  COFFEE_CUP: 100,
  PAPERS: 101,
  BOOKS_STACK: 102,
  PEN_HOLDER: 103,
  PHONE: 104,
  NOTEBOOK: 105,
  LAPTOP: 106,
  TABLET: 107,

  // Row 8-9: 야외/자연
  TREE_TOP: 128,
  TREE_TRUNK: 144,
  BUSH_1: 129,
  BUSH_2: 130,
  FLOWER_1: 131,
  FLOWER_2: 132,
  ROCK_1: 133,
  ROCK_2: 134,
  FENCE_H: 135,
  FENCE_V: 136,
  PATH_1: 137,
  PATH_2: 138,
  BENCH: 139,
  STREETLAMP: 140,

  // Row 10: 학습 공간 - 강의실 타일
  LECTURE_SEAT_1: 160,      // 강의실 좌석 (일반)
  LECTURE_SEAT_2: 161,      // 강의실 좌석 (접힌 책상)
  LECTURE_SEAT_FRONT: 162,  // 강의실 앞줄 좌석
  PODIUM_L: 163,            // 연단 왼쪽
  PODIUM_M: 164,            // 연단 중앙
  PODIUM_R: 165,            // 연단 오른쪽
  BLACKBOARD_L: 166,        // 칠판 왼쪽
  BLACKBOARD_M: 167,        // 칠판 중앙
  BLACKBOARD_R: 168,        // 칠판 오른쪽
  SCREEN_L: 169,            // 스크린 왼쪽
  SCREEN_M: 170,            // 스크린 중앙
  SCREEN_R: 171,            // 스크린 오른쪽
  PROJECTOR: 172,           // 빔프로젝터
  LECTURE_DESK: 173,        // 교수 책상
  STAGE_FLOOR: 174,         // 무대 바닥
  AISLE: 175,               // 통로

  // Row 11: 학습 공간 - 수업실/멘토링
  STUDENT_DESK_L: 176,      // 학생 책상 왼쪽
  STUDENT_DESK_R: 177,      // 학생 책상 오른쪽
  GROUP_TABLE_TL: 178,      // 그룹 테이블 좌상
  GROUP_TABLE_TR: 179,      // 그룹 테이블 우상
  GROUP_TABLE_BL: 180,      // 그룹 테이블 좌하
  GROUP_TABLE_BR: 181,      // 그룹 테이블 우하
  MENTOR_TABLE: 182,        // 멘토링 테이블 (원형)
  MENTOR_CHAIR: 183,        // 멘토링 의자
  CLASSROOM_DOOR: 184,      // 수업실 문
  PARTITION_V: 185,         // 세로 파티션
  PARTITION_H: 186,         // 가로 파티션
  FLOOR_LECTURE: 187,       // 강의실 바닥
  FLOOR_CLASSROOM: 188,     // 수업실 바닥
  FLOOR_MENTORING: 189,     // 멘토링방 바닥
  CORRIDOR_FLOOR: 190,      // 복도 바닥
  LOBBY_FLOOR: 191,         // 로비 바닥
}

// 모던 오피스 색상 팔레트
export const MODERN_PALETTE = {
  // 바닥
  wood: {
    base: "#c4a77d",
    light: "#d4b78d",
    dark: "#a48757",
    grain: "#8b7355",
  },
  carpet: {
    base: "#7c8798",
    light: "#8c97a8",
    dark: "#6c7788",
    pattern: "#5c6778",
  },
  tile: {
    base: "#e8e8e8",
    light: "#f5f5f5",
    dark: "#d0d0d0",
    grout: "#c0c0c0",
  },
  grass: {
    base: "#7cb342",
    light: "#8bc34a",
    dark: "#689f38",
    detail: "#558b2f",
  },

  // 벽
  wall: {
    base: "#f0f0f0",
    light: "#ffffff",
    dark: "#d8d8d8",
    shadow: "#b0b0b0",
    trim: "#e0e0e0",
  },

  // 가구
  furniture: {
    wood_light: "#deb887",
    wood_dark: "#8b7355",
    metal: "#708090",
    metal_light: "#a0a0a0",
    fabric: "#4a5568",
    fabric_light: "#718096",
    white: "#ffffff",
    black: "#2d3748",
  },

  // 액센트 (primary color 기반)
  accent: {
    primary: "#00cec9",
    primaryLight: "#55efc4",
    primaryDark: "#00a8a8",
    secondary: "#6c5ce7",
    warning: "#fdcb6e",
    danger: "#e74c3c",
  },

  // 그림자
  shadow: {
    light: "rgba(0, 0, 0, 0.1)",
    medium: "rgba(0, 0, 0, 0.2)",
    dark: "rgba(0, 0, 0, 0.3)",
  },
}

/**
 * 타일셋 텍스처 생성
 */
export function generateTilesetTexture(scene: Phaser.Scene): void {
  const key = "modern-office-tileset"
  if (scene.textures.exists(key)) return

  const { WIDTH, HEIGHT, TILE_SIZE } = TILESET_CONFIG
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext("2d")!

  // 배경을 투명하게
  ctx.clearRect(0, 0, WIDTH, HEIGHT)

  // 각 타일 그리기
  drawFloorTiles(ctx, TILE_SIZE)
  drawWallTiles(ctx, TILE_SIZE)
  drawFurnitureTiles(ctx, TILE_SIZE)
  drawDecorationTiles(ctx, TILE_SIZE)
  drawSpecialTiles(ctx, TILE_SIZE)
  drawNatureTiles(ctx, TILE_SIZE)
  drawLearningSpaceTiles(ctx, TILE_SIZE) // 학습 공간 타일

  // Phaser 텍스처로 등록
  scene.textures.addCanvas(key, canvas)
}

/**
 * 바닥 타일 그리기 (Row 0)
 */
function drawFloorTiles(ctx: CanvasRenderingContext2D, size: number): void {
  const y = 0

  // 나무 바닥 (4종)
  for (let i = 0; i < 4; i++) {
    drawWoodFloor(ctx, i * size, y, size, i)
  }

  // 카펫 (2종)
  drawCarpetFloor(ctx, 4 * size, y, size, 0)
  drawCarpetFloor(ctx, 5 * size, y, size, 1)

  // 타일 바닥 (2종)
  drawTileFloor(ctx, 6 * size, y, size, 0)
  drawTileFloor(ctx, 7 * size, y, size, 1)

  // 잔디 (2종)
  drawGrassFloor(ctx, 8 * size, y, size, 0)
  drawGrassFloor(ctx, 9 * size, y, size, 1)

  // 돌 바닥 (2종)
  drawStoneFloor(ctx, 10 * size, y, size, 0)
  drawStoneFloor(ctx, 11 * size, y, size, 1)

  // 콘크리트 (2종)
  drawConcreteFloor(ctx, 12 * size, y, size, 0)
  drawConcreteFloor(ctx, 13 * size, y, size, 1)

  // 액센트 바닥 (2종)
  drawAccentFloor(ctx, 14 * size, y, size, 0)
  drawAccentFloor(ctx, 15 * size, y, size, 1)
}

/**
 * 벽 타일 그리기 (Row 1)
 */
function drawWallTiles(ctx: CanvasRenderingContext2D, size: number): void {
  const y = size

  // 벽 상단 (좌, 중, 우)
  drawWallTop(ctx, 0, y, size, "left")
  drawWallTop(ctx, size, y, size, "middle")
  drawWallTop(ctx, 2 * size, y, size, "right")

  // 벽 중간 (좌, 중, 우)
  drawWallMiddle(ctx, 3 * size, y, size, "left")
  drawWallMiddle(ctx, 4 * size, y, size, "middle")
  drawWallMiddle(ctx, 5 * size, y, size, "right")

  // 벽 하단 (좌, 중, 우)
  drawWallBottom(ctx, 6 * size, y, size, "left")
  drawWallBottom(ctx, 7 * size, y, size, "middle")
  drawWallBottom(ctx, 8 * size, y, size, "right")

  // 코너
  drawWallCorner(ctx, 9 * size, y, size, "tl")
  drawWallCorner(ctx, 10 * size, y, size, "tr")
  drawWallCorner(ctx, 11 * size, y, size, "bl")
  drawWallCorner(ctx, 12 * size, y, size, "br")

  // 창문, 문, 단단한 벽
  drawWindow(ctx, 13 * size, y, size)
  drawDoor(ctx, 14 * size, y, size)
  drawSolidWall(ctx, 15 * size, y, size)
}

/**
 * 가구 타일 그리기 (Row 2-3)
 */
function drawFurnitureTiles(ctx: CanvasRenderingContext2D, size: number): void {
  const y1 = 2 * size
  const y2 = 3 * size

  // 책상 (상단)
  drawDesk(ctx, 0, y1, size, "top-left")
  drawDesk(ctx, size, y1, size, "top-middle")
  drawDesk(ctx, 2 * size, y1, size, "top-right")

  // 의자
  drawChair(ctx, 3 * size, y1, size, 0)
  drawChair(ctx, 4 * size, y1, size, 1)

  // 소파
  drawSofa(ctx, 5 * size, y1, size, "left")
  drawSofa(ctx, 6 * size, y1, size, "middle")
  drawSofa(ctx, 7 * size, y1, size, "right")

  // 테이블
  drawTable(ctx, 8 * size, y1, size, "round")
  drawTable(ctx, 9 * size, y1, size, "square")

  // 책장, 캐비넷
  drawBookshelf(ctx, 10 * size, y1, size, "top")
  drawCabinet(ctx, 11 * size, y1, size, "top")

  // 화이트보드, 모니터
  drawWhiteboard(ctx, 12 * size, y1, size)
  drawMonitor(ctx, 13 * size, y1, size)

  // 화분
  drawPlant(ctx, 14 * size, y1, size, "large")
  drawPlant(ctx, 15 * size, y1, size, "small")

  // Row 3: 가구 하단/추가 아이템
  drawDesk(ctx, 0, y2, size, "bottom-left")
  drawDesk(ctx, size, y2, size, "bottom-middle")
  drawDesk(ctx, 2 * size, y2, size, "bottom-right")

  drawLamp(ctx, 8 * size, y2, size, "floor")
  drawLamp(ctx, 9 * size, y2, size, "desk")

  drawOfficeItem(ctx, 10 * size, y2, size, "trash")
  drawOfficeItem(ctx, 11 * size, y2, size, "printer")
  drawOfficeItem(ctx, 12 * size, y2, size, "coffee-machine")
  drawOfficeItem(ctx, 13 * size, y2, size, "water-cooler")
}

/**
 * 장식 타일 그리기 (Row 4-5)
 */
function drawDecorationTiles(
  ctx: CanvasRenderingContext2D,
  size: number
): void {
  const y1 = 4 * size

  // 러그 (3x3)
  for (let i = 0; i < 9; i++) {
    const col = i % 3
    const row = Math.floor(i / 3)
    drawRug(ctx, (i % 9) * size, y1, size, col, row)
  }

  // 액자, 시계, 포스터 등
  drawFrame(ctx, 9 * size, y1, size, 0)
  drawFrame(ctx, 10 * size, y1, size, 1)
  drawClock(ctx, 11 * size, y1, size)
  drawPoster(ctx, 12 * size, y1, size, 0)
  drawPoster(ctx, 13 * size, y1, size, 1)
  drawSign(ctx, 14 * size, y1, size)
  drawCorkboard(ctx, 15 * size, y1, size)
}

/**
 * 특수 타일 그리기 (Row 5)
 */
function drawSpecialTiles(ctx: CanvasRenderingContext2D, size: number): void {
  const y = 5 * size

  drawSpawnPoint(ctx, 0, y, size)
  drawInteractiveZone(ctx, size, y, size)
  drawPortal(ctx, 2 * size, y, size)
  drawHighlight(ctx, 3 * size, y, size)

  // 그림자
  drawShadow(ctx, 4 * size, y, size, "left")
  drawShadow(ctx, 5 * size, y, size, "middle")
  drawShadow(ctx, 6 * size, y, size, "right")
  drawShadow(ctx, 7 * size, y, size, "full")

  // 빈 타일, 충돌 타일
  // Empty는 그리지 않음 (투명)
  drawCollisionMarker(ctx, 9 * size, y, size)
}

/**
 * 자연 타일 그리기 (Row 8-9)
 */
function drawNatureTiles(ctx: CanvasRenderingContext2D, size: number): void {
  const y1 = 8 * size
  const y2 = 9 * size

  drawTree(ctx, 0, y1, size, "top")
  drawBush(ctx, size, y1, size, 0)
  drawBush(ctx, 2 * size, y1, size, 1)
  drawFlower(ctx, 3 * size, y1, size, 0)
  drawFlower(ctx, 4 * size, y1, size, 1)
  drawRock(ctx, 5 * size, y1, size, 0)
  drawRock(ctx, 6 * size, y1, size, 1)
  drawFence(ctx, 7 * size, y1, size, "horizontal")
  drawFence(ctx, 8 * size, y1, size, "vertical")
  drawPath(ctx, 9 * size, y1, size, 0)
  drawPath(ctx, 10 * size, y1, size, 1)
  drawBench(ctx, 11 * size, y1, size)
  drawStreetLamp(ctx, 12 * size, y1, size)

  drawTree(ctx, 0, y2, size, "trunk")
}


// ========================================
// 학습 공간 타일 (Row 10-11)
// ========================================

function drawLearningSpaceTiles(ctx: CanvasRenderingContext2D, size: number): void {
  const row10 = 10 * size // 강의실 타일
  const row11 = 11 * size // 수업실/멘토링 타일

  // Row 10: 강의실
  drawLectureSeat(ctx, 0 * size, row10, size, "normal")
  drawLectureSeat(ctx, 1 * size, row10, size, "desk")
  drawLectureSeat(ctx, 2 * size, row10, size, "front")
  drawPodium(ctx, 3 * size, row10, size, "left")
  drawPodium(ctx, 4 * size, row10, size, "middle")
  drawPodium(ctx, 5 * size, row10, size, "right")
  drawBlackboard(ctx, 6 * size, row10, size, "left")
  drawBlackboard(ctx, 7 * size, row10, size, "middle")
  drawBlackboard(ctx, 8 * size, row10, size, "right")
  drawScreen(ctx, 9 * size, row10, size, "left")
  drawScreen(ctx, 10 * size, row10, size, "middle")
  drawScreen(ctx, 11 * size, row10, size, "right")
  drawProjector(ctx, 12 * size, row10, size)
  drawLectureDesk(ctx, 13 * size, row10, size)
  drawStageFloor(ctx, 14 * size, row10, size)
  drawAisle(ctx, 15 * size, row10, size)

  // Row 11: 수업실/멘토링
  drawStudentDesk(ctx, 0 * size, row11, size, "left")
  drawStudentDesk(ctx, 1 * size, row11, size, "right")
  drawGroupTable(ctx, 2 * size, row11, size, "top-left")
  drawGroupTable(ctx, 3 * size, row11, size, "top-right")
  drawGroupTable(ctx, 4 * size, row11, size, "bottom-left")
  drawGroupTable(ctx, 5 * size, row11, size, "bottom-right")
  drawMentorTable(ctx, 6 * size, row11, size)
  drawMentorChair(ctx, 7 * size, row11, size)
  drawClassroomDoor(ctx, 8 * size, row11, size)
  drawPartition(ctx, 9 * size, row11, size, "vertical")
  drawPartition(ctx, 10 * size, row11, size, "horizontal")
  drawLearningFloor(ctx, 11 * size, row11, size, "lecture")
  drawLearningFloor(ctx, 12 * size, row11, size, "classroom")
  drawLearningFloor(ctx, 13 * size, row11, size, "mentoring")
  drawLearningFloor(ctx, 14 * size, row11, size, "corridor")
  drawLearningFloor(ctx, 15 * size, row11, size, "lobby")
}

// 강의실 좌석 (극장식)
function drawLectureSeat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: "normal" | "desk" | "front"
): void {
  const chairColor = "#4A5568" // 의자 색상
  const deskColor = "#A0AEC0"  // 책상 색상
  const seatPad = size * 0.15

  // 의자 등받이
  ctx.fillStyle = chairColor
  ctx.fillRect(x + seatPad, y + seatPad, size - 2 * seatPad, size * 0.3)

  // 의자 좌석
  ctx.fillStyle = type === "front" ? "#2D3748" : chairColor
  ctx.fillRect(x + seatPad, y + size * 0.35, size - 2 * seatPad, size * 0.35)

  // 접이식 책상 (desk 타입만)
  if (type === "desk") {
    ctx.fillStyle = deskColor
    ctx.fillRect(x + size * 0.1, y + size * 0.55, size * 0.8, size * 0.15)
  }

  // 의자 다리
  ctx.fillStyle = "#1A202C"
  ctx.fillRect(x + seatPad + 2, y + size * 0.7, 3, size * 0.25)
  ctx.fillRect(x + size - seatPad - 5, y + size * 0.7, 3, size * 0.25)
}

// 연단/포디움
function drawPodium(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: "left" | "middle" | "right"
): void {
  const podiumColor = "#744210" // 나무 색상
  const topColor = "#D69E2E"    // 상단 강조

  ctx.fillStyle = podiumColor

  if (part === "left") {
    ctx.fillRect(x, y + size * 0.3, size, size * 0.7)
    ctx.fillStyle = topColor
    ctx.fillRect(x, y + size * 0.2, size, size * 0.1)
  } else if (part === "middle") {
    ctx.fillRect(x, y + size * 0.3, size, size * 0.7)
    ctx.fillStyle = topColor
    ctx.fillRect(x, y + size * 0.2, size, size * 0.1)
    // 마이크
    ctx.fillStyle = "#1A202C"
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size * 0.4, 3, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillRect(x, y + size * 0.3, size, size * 0.7)
    ctx.fillStyle = topColor
    ctx.fillRect(x, y + size * 0.2, size, size * 0.1)
  }
}

// 칠판
function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: "left" | "middle" | "right"
): void {
  const boardColor = "#1A365D" // 진한 청록색
  const frameColor = "#744210" // 프레임

  // 프레임
  ctx.fillStyle = frameColor
  ctx.fillRect(x, y + size * 0.1, size, size * 0.8)

  // 칠판 면
  ctx.fillStyle = boardColor
  ctx.fillRect(x + 2, y + size * 0.15, size - 4, size * 0.7)

  // 분필 자국 (중앙에만)
  if (part === "middle") {
    ctx.strokeStyle = "#E2E8F0"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 6, y + size * 0.35)
    ctx.lineTo(x + size - 6, y + size * 0.35)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 6, y + size * 0.55)
    ctx.lineTo(x + size * 0.7, y + size * 0.55)
    ctx.stroke()
  }
}

// 스크린
function drawScreen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: "left" | "middle" | "right"
): void {
  const screenColor = "#EDF2F7" // 밝은 회색
  const frameColor = "#2D3748"

  // 프레임
  ctx.fillStyle = frameColor
  ctx.fillRect(x, y + size * 0.05, size, size * 0.9)

  // 스크린 면
  ctx.fillStyle = screenColor
  ctx.fillRect(x + 2, y + size * 0.1, size - 4, size * 0.8)

  // 프레젠테이션 내용 (중앙에만)
  if (part === "middle") {
    ctx.fillStyle = "#4299E1"
    ctx.fillRect(x + 6, y + size * 0.25, size * 0.6, size * 0.15)
    ctx.fillStyle = "#A0AEC0"
    ctx.fillRect(x + 6, y + size * 0.5, size * 0.5, size * 0.08)
    ctx.fillRect(x + 6, y + size * 0.65, size * 0.7, size * 0.08)
  }
}

// 빔프로젝터
function drawProjector(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const bodyColor = "#2D3748"

  // 본체
  ctx.fillStyle = bodyColor
  ctx.fillRect(x + size * 0.2, y + size * 0.3, size * 0.6, size * 0.4)

  // 렌즈
  ctx.fillStyle = "#4299E1"
  ctx.beginPath()
  ctx.arc(x + size * 0.3, y + size * 0.5, size * 0.1, 0, Math.PI * 2)
  ctx.fill()

  // 빛 효과
  ctx.fillStyle = "rgba(66, 153, 225, 0.3)"
  ctx.beginPath()
  ctx.moveTo(x + size * 0.2, y + size * 0.5)
  ctx.lineTo(x, y + size * 0.8)
  ctx.lineTo(x, y + size * 0.2)
  ctx.closePath()
  ctx.fill()
}

// 교수 책상
function drawLectureDesk(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const deskColor = "#744210"

  ctx.fillStyle = deskColor
  ctx.fillRect(x + size * 0.1, y + size * 0.4, size * 0.8, size * 0.5)

  // 상판
  ctx.fillStyle = "#D69E2E"
  ctx.fillRect(x + size * 0.05, y + size * 0.35, size * 0.9, size * 0.1)

  // 서랍
  ctx.fillStyle = "#553C0E"
  ctx.fillRect(x + size * 0.55, y + size * 0.5, size * 0.25, size * 0.3)
}

// 무대 바닥
function drawStageFloor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = "#553C0E"
  ctx.fillRect(x, y, size, size)

  // 나무결 패턴
  ctx.strokeStyle = "#744210"
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x, y + (size / 4) * i + size / 8)
    ctx.lineTo(x + size, y + (size / 4) * i + size / 8)
    ctx.stroke()
  }
}

// 통로
function drawAisle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = "#718096"
  ctx.fillRect(x, y, size, size)

  // 카펫 패턴
  ctx.fillStyle = "#4A5568"
  ctx.fillRect(x + size * 0.1, y, size * 0.8, size)
}

// 학생 책상
function drawStudentDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  side: "left" | "right"
): void {
  const deskColor = "#E2E8F0"
  const legColor = "#718096"

  // 책상 상판
  ctx.fillStyle = deskColor
  ctx.fillRect(x + size * 0.05, y + size * 0.3, size * 0.9, size * 0.4)

  // 다리
  ctx.fillStyle = legColor
  if (side === "left") {
    ctx.fillRect(x + size * 0.1, y + size * 0.7, size * 0.15, size * 0.25)
  } else {
    ctx.fillRect(x + size * 0.75, y + size * 0.7, size * 0.15, size * 0.25)
  }

  // 책/노트
  ctx.fillStyle = "#4299E1"
  ctx.fillRect(x + size * 0.3, y + size * 0.35, size * 0.4, size * 0.08)
}

// 그룹 테이블 (4분할)
function drawGroupTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
): void {
  const tableColor = "#E2E8F0"
  const borderColor = "#A0AEC0"

  ctx.fillStyle = tableColor
  ctx.fillRect(x, y, size, size)

  // 테두리 (연결된 느낌)
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 2

  if (corner === "top-left") {
    ctx.strokeRect(x, y, size, size)
  } else if (corner === "top-right") {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + size, y)
    ctx.lineTo(x + size, y + size)
    ctx.stroke()
  } else if (corner === "bottom-left") {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + size)
    ctx.lineTo(x + size, y + size)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(x + size, y)
    ctx.lineTo(x + size, y + size)
    ctx.lineTo(x, y + size)
    ctx.stroke()
  }
}

// 멘토링 테이블 (원형)
function drawMentorTable(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const tableColor = "#805AD5" // 보라색 테이블

  ctx.fillStyle = tableColor
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size * 0.4, 0, Math.PI * 2)
  ctx.fill()

  // 테두리
  ctx.strokeStyle = "#553C9A"
  ctx.lineWidth = 2
  ctx.stroke()
}

// 멘토링 의자
function drawMentorChair(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const chairColor = "#9F7AEA" // 밝은 보라

  // 좌석
  ctx.fillStyle = chairColor
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size * 0.3, 0, Math.PI * 2)
  ctx.fill()

  // 등받이
  ctx.fillStyle = "#805AD5"
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size * 0.25, size * 0.25, Math.PI, 0)
  ctx.fill()
}

// 수업실 문
function drawClassroomDoor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const doorColor = "#744210"
  const glassColor = "rgba(66, 153, 225, 0.3)"

  // 문틀
  ctx.fillStyle = "#553C0E"
  ctx.fillRect(x + size * 0.1, y, size * 0.8, size)

  // 문
  ctx.fillStyle = doorColor
  ctx.fillRect(x + size * 0.15, y + size * 0.05, size * 0.7, size * 0.9)

  // 유리창
  ctx.fillStyle = glassColor
  ctx.fillRect(x + size * 0.25, y + size * 0.15, size * 0.5, size * 0.35)

  // 손잡이
  ctx.fillStyle = "#D69E2E"
  ctx.beginPath()
  ctx.arc(x + size * 0.7, y + size * 0.55, size * 0.05, 0, Math.PI * 2)
  ctx.fill()
}

// 파티션
function drawPartition(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  orientation: "vertical" | "horizontal"
): void {
  const partitionColor = "#CBD5E0"
  const frameColor = "#A0AEC0"

  if (orientation === "vertical") {
    ctx.fillStyle = frameColor
    ctx.fillRect(x + size * 0.4, y, size * 0.2, size)
    ctx.fillStyle = partitionColor
    ctx.fillRect(x + size * 0.42, y + size * 0.05, size * 0.16, size * 0.9)
  } else {
    ctx.fillStyle = frameColor
    ctx.fillRect(x, y + size * 0.4, size, size * 0.2)
    ctx.fillStyle = partitionColor
    ctx.fillRect(x + size * 0.05, y + size * 0.42, size * 0.9, size * 0.16)
  }
}

// 학습 공간 바닥
function drawLearningFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: "lecture" | "classroom" | "mentoring" | "corridor" | "lobby"
): void {
  const colors: Record<string, string> = {
    lecture: "#2D3748",    // 진한 회색 (강의실)
    classroom: "#F7FAFC",  // 밝은 회색 (수업실)
    mentoring: "#FAF5FF",  // 연한 보라 (멘토링)
    corridor: "#EDF2F7",   // 중간 회색 (복도)
    lobby: "#E2E8F0",      // 로비
  }

  ctx.fillStyle = colors[type] || "#FFFFFF"
  ctx.fillRect(x, y, size, size)

  // 타일 무늬
  ctx.strokeStyle = type === "lecture" ? "#4A5568" : "#CBD5E0"
  ctx.lineWidth = 0.5
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)

  // 강의실은 카펫 느낌
  if (type === "lecture") {
    ctx.fillStyle = "rgba(74, 85, 104, 0.3)"
    for (let i = 0; i < size; i += 4) {
      ctx.fillRect(x + i, y, 2, size)
    }
  }
}

// ===== 개별 타일 그리기 함수들 =====

function drawWoodFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const { base, light, dark, grain } = MODERN_PALETTE.wood

  // 베이스
  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 나무 결 패턴
  ctx.strokeStyle = grain
  ctx.lineWidth = 1

  const offset = variant * 4
  for (let i = 0; i < 4; i++) {
    const ly = y + 4 + i * 8 + (offset % 8)
    ctx.beginPath()
    ctx.moveTo(x, ly)
    ctx.lineTo(x + size, ly)
    ctx.stroke()
  }

  // 하이라이트
  ctx.fillStyle = light
  ctx.fillRect(x, y, size, 2)

  // 그림자
  ctx.fillStyle = dark
  ctx.fillRect(x, y + size - 2, size, 2)

  // 테두리
  ctx.strokeStyle = dark
  ctx.lineWidth = 0.5
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
}

function drawCarpetFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const { base, light, dark, pattern } = MODERN_PALETTE.carpet

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 직조 패턴
  ctx.fillStyle = pattern
  for (let py = 0; py < size; py += 4) {
    for (let px = 0; px < size; px += 4) {
      if ((px + py + variant * 2) % 8 === 0) {
        ctx.fillRect(x + px, y + py, 2, 2)
      }
    }
  }

  ctx.fillStyle = light
  ctx.fillRect(x, y, 1, size)
  ctx.fillStyle = dark
  ctx.fillRect(x + size - 1, y, 1, size)
}

function drawTileFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const { base, light, dark, grout } = MODERN_PALETTE.tile

  // 그라우트 배경
  ctx.fillStyle = grout
  ctx.fillRect(x, y, size, size)

  // 타일
  ctx.fillStyle = variant === 0 ? base : light
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2)

  // 하이라이트
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
  gradient.addColorStop(0, "rgba(255,255,255,0.3)")
  gradient.addColorStop(1, "rgba(0,0,0,0.1)")
  ctx.fillStyle = gradient
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2)
}

function drawGrassFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const { base, light, dark, detail } = MODERN_PALETTE.grass

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 잔디 디테일
  ctx.fillStyle = variant === 0 ? light : dark
  for (let i = 0; i < 8; i++) {
    const gx = x + Math.random() * (size - 4)
    const gy = y + Math.random() * (size - 4)
    ctx.fillRect(gx, gy, 2, 4)
  }

  ctx.fillStyle = detail
  for (let i = 0; i < 4; i++) {
    const gx = x + Math.random() * (size - 2)
    const gy = y + Math.random() * (size - 2)
    ctx.fillRect(gx, gy, 1, 3)
  }
}

function drawStoneFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const colors = ["#9e9e9e", "#8e8e8e", "#aeaeae"]

  ctx.fillStyle = colors[variant % colors.length]
  ctx.fillRect(x, y, size, size)

  // 돌 질감
  ctx.fillStyle = "rgba(0,0,0,0.1)"
  for (let i = 0; i < 5; i++) {
    const sx = x + Math.random() * size
    const sy = y + Math.random() * size
    ctx.beginPath()
    ctx.arc(sx, sy, 2 + Math.random() * 3, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = "#7e7e7e"
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
}

function drawConcreteFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  ctx.fillStyle = variant === 0 ? "#c0c0c0" : "#b0b0b0"
  ctx.fillRect(x, y, size, size)

  // 콘크리트 질감
  ctx.fillStyle = "rgba(0,0,0,0.05)"
  for (let i = 0; i < 20; i++) {
    const px = x + Math.random() * size
    const py = y + Math.random() * size
    ctx.fillRect(px, py, 1, 1)
  }

  ctx.strokeStyle = "#a0a0a0"
  ctx.lineWidth = 0.5
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
}

function drawAccentFloor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const { primary, primaryLight, primaryDark } = MODERN_PALETTE.accent

  ctx.fillStyle = variant === 0 ? primary : primaryDark
  ctx.fillRect(x, y, size, size)

  // 그라데이션 효과
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
  gradient.addColorStop(0, "rgba(255,255,255,0.2)")
  gradient.addColorStop(1, "rgba(0,0,0,0.1)")
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, size, size)

  // 테두리
  ctx.strokeStyle = primaryDark
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)

  // 중앙 하이라이트
  ctx.fillStyle = primaryLight
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 4, 0, Math.PI * 2)
  ctx.fill()
}

// 벽 타일 함수들
function drawWallTop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pos: "left" | "middle" | "right"
): void {
  const { base, light, dark, trim } = MODERN_PALETTE.wall

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 상단 트림
  ctx.fillStyle = trim
  ctx.fillRect(x, y, size, 6)

  // 그림자
  ctx.fillStyle = dark
  ctx.fillRect(x, y + size - 4, size, 4)

  if (pos === "left") {
    ctx.fillStyle = dark
    ctx.fillRect(x, y, 2, size)
  } else if (pos === "right") {
    ctx.fillStyle = light
    ctx.fillRect(x + size - 2, y, 2, size)
  }
}

function drawWallMiddle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pos: "left" | "middle" | "right"
): void {
  const { base, light, dark } = MODERN_PALETTE.wall

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  if (pos === "left") {
    ctx.fillStyle = dark
    ctx.fillRect(x, y, 3, size)
  } else if (pos === "right") {
    ctx.fillStyle = light
    ctx.fillRect(x + size - 3, y, 3, size)
  }

  // 수평 라인 디테일
  ctx.strokeStyle = dark
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(x, y + size / 2)
  ctx.lineTo(x + size, y + size / 2)
  ctx.stroke()
}

function drawWallBottom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pos: "left" | "middle" | "right"
): void {
  const { base, light, dark, shadow } = MODERN_PALETTE.wall

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 바닥 쉐도우
  ctx.fillStyle = shadow
  ctx.fillRect(x, y + size - 8, size, 8)

  // 베이스보드
  ctx.fillStyle = dark
  ctx.fillRect(x, y + size - 4, size, 4)

  if (pos === "left") {
    ctx.fillStyle = dark
    ctx.fillRect(x, y, 2, size)
  } else if (pos === "right") {
    ctx.fillStyle = light
    ctx.fillRect(x + size - 2, y, 2, size)
  }
}

function drawWallCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  corner: "tl" | "tr" | "bl" | "br"
): void {
  const { base, dark, light } = MODERN_PALETTE.wall

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  ctx.fillStyle = dark
  if (corner === "tl" || corner === "bl") {
    ctx.fillRect(x, y, 4, size)
  }
  if (corner === "tl" || corner === "tr") {
    ctx.fillRect(x, y, size, 4)
  }

  ctx.fillStyle = light
  if (corner === "tr" || corner === "br") {
    ctx.fillRect(x + size - 4, y, 4, size)
  }
  if (corner === "bl" || corner === "br") {
    ctx.fillRect(x, y + size - 4, size, 4)
  }
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const { base, dark } = MODERN_PALETTE.wall

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 창문 프레임
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8)

  // 유리
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
  gradient.addColorStop(0, "#87ceeb")
  gradient.addColorStop(1, "#4fc3f7")
  ctx.fillStyle = gradient
  ctx.fillRect(x + 6, y + 6, size - 12, size - 12)

  // 반사
  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.fillRect(x + 8, y + 8, 6, size - 16)

  // 프레임 디테일
  ctx.strokeStyle = dark
  ctx.lineWidth = 1
  ctx.strokeRect(x + 4, y + 4, size - 8, size - 8)
  ctx.beginPath()
  ctx.moveTo(x + size / 2, y + 4)
  ctx.lineTo(x + size / 2, y + size - 4)
  ctx.stroke()
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const { base, dark } = MODERN_PALETTE.wall
  const { wood_dark } = MODERN_PALETTE.furniture

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 문
  ctx.fillStyle = wood_dark
  ctx.fillRect(x + 4, y, size - 8, size)

  // 문 패널
  ctx.strokeStyle = "#6b5344"
  ctx.lineWidth = 1
  ctx.strokeRect(x + 8, y + 4, size - 16, 10)
  ctx.strokeRect(x + 8, y + 18, size - 16, size - 22)

  // 손잡이
  ctx.fillStyle = "#ffd700"
  ctx.beginPath()
  ctx.arc(x + size - 10, y + size / 2, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawSolidWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const { base, dark, shadow } = MODERN_PALETTE.wall

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 벽돌 패턴
  ctx.strokeStyle = dark
  ctx.lineWidth = 0.5
  for (let row = 0; row < 4; row++) {
    const ly = y + row * 8
    ctx.beginPath()
    ctx.moveTo(x, ly)
    ctx.lineTo(x + size, ly)
    ctx.stroke()

    const offset = row % 2 === 0 ? 0 : size / 2
    ctx.beginPath()
    ctx.moveTo(x + offset, ly)
    ctx.lineTo(x + offset, ly + 8)
    ctx.stroke()
  }

  ctx.fillStyle = shadow
  ctx.fillRect(x, y + size - 2, size, 2)
}

// 가구 타일 함수들
function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: string
): void {
  const { wood_light, wood_dark, metal } = MODERN_PALETTE.furniture

  if (part.startsWith("top")) {
    // 책상 상판
    ctx.fillStyle = wood_light
    ctx.fillRect(x, y + size / 2, size, size / 2)

    // 하이라이트
    ctx.fillStyle = "rgba(255,255,255,0.3)"
    ctx.fillRect(x, y + size / 2, size, 4)

    // 테두리
    ctx.strokeStyle = wood_dark
    ctx.lineWidth = 1
    ctx.strokeRect(x, y + size / 2, size, size / 2)
  } else {
    // 책상 다리
    ctx.fillStyle = metal
    ctx.fillRect(x + 4, y, 4, size)
    ctx.fillRect(x + size - 8, y, 4, size)

    // 다리 하이라이트
    ctx.fillStyle = "rgba(255,255,255,0.2)"
    ctx.fillRect(x + 4, y, 1, size)
    ctx.fillRect(x + size - 8, y, 1, size)
  }
}

function drawChair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const { fabric, fabric_light, metal } = MODERN_PALETTE.furniture

  // 좌석
  ctx.fillStyle = variant === 0 ? fabric : fabric_light
  ctx.fillRect(x + 6, y + 14, size - 12, size - 18)

  // 등받이
  ctx.fillStyle = variant === 0 ? fabric : fabric_light
  ctx.fillRect(x + 8, y + 4, size - 16, 12)

  // 다리
  ctx.fillStyle = metal
  ctx.fillRect(x + 8, y + size - 4, 4, 4)
  ctx.fillRect(x + size - 12, y + size - 4, 4, 4)

  // 바퀴
  ctx.fillStyle = "#333"
  ctx.beginPath()
  ctx.arc(x + 10, y + size - 1, 2, 0, Math.PI * 2)
  ctx.arc(x + size - 10, y + size - 1, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawSofa(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: "left" | "middle" | "right"
): void {
  const { fabric, fabric_light } = MODERN_PALETTE.furniture

  // 좌석
  ctx.fillStyle = fabric
  ctx.fillRect(x, y + 12, size, size - 16)

  // 쿠션
  ctx.fillStyle = fabric_light
  ctx.fillRect(x + 2, y + 14, size - 4, 8)

  // 팔걸이
  if (part === "left") {
    ctx.fillStyle = fabric
    ctx.fillRect(x, y + 4, 8, size - 8)
  } else if (part === "right") {
    ctx.fillStyle = fabric
    ctx.fillRect(x + size - 8, y + 4, 8, size - 8)
  }

  // 등받이
  ctx.fillStyle = fabric
  ctx.fillRect(x, y + 4, size, 10)

  // 다리
  ctx.fillStyle = "#333"
  ctx.fillRect(x + 4, y + size - 4, 4, 4)
  ctx.fillRect(x + size - 8, y + size - 4, 4, 4)
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: "round" | "square"
): void {
  const { wood_light, wood_dark } = MODERN_PALETTE.furniture

  if (shape === "round") {
    // 원형 테이블
    ctx.fillStyle = wood_light
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = wood_dark
    ctx.lineWidth = 2
    ctx.stroke()

    // 중앙 다리
    ctx.fillStyle = wood_dark
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, 4, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // 사각 테이블
    ctx.fillStyle = wood_light
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8)

    ctx.strokeStyle = wood_dark
    ctx.lineWidth = 2
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8)

    // 다리
    ctx.fillStyle = wood_dark
    ctx.fillRect(x + 6, y + 6, 3, 3)
    ctx.fillRect(x + size - 9, y + 6, 3, 3)
    ctx.fillRect(x + 6, y + size - 9, 3, 3)
    ctx.fillRect(x + size - 9, y + size - 9, 3, 3)
  }
}

function drawBookshelf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: "top" | "bottom"
): void {
  const { wood_dark } = MODERN_PALETTE.furniture

  ctx.fillStyle = wood_dark
  ctx.fillRect(x + 2, y, size - 4, size)

  // 선반
  ctx.fillStyle = "#6b5344"
  ctx.fillRect(x + 4, y + 8, size - 8, 2)
  ctx.fillRect(x + 4, y + 20, size - 8, 2)

  // 책들
  const bookColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"]
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = bookColors[i]
    ctx.fillRect(x + 5 + i * 5, y + 10, 4, 8)
    ctx.fillRect(x + 5 + i * 5, y + 22, 4, 8)
  }
}

function drawCabinet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: "top" | "bottom"
): void {
  const { white, metal } = MODERN_PALETTE.furniture

  ctx.fillStyle = white
  ctx.fillRect(x + 2, y, size - 4, size)

  // 문
  ctx.strokeStyle = "#ccc"
  ctx.lineWidth = 1
  ctx.strokeRect(x + 4, y + 2, size / 2 - 5, size - 4)
  ctx.strokeRect(x + size / 2 + 1, y + 2, size / 2 - 5, size - 4)

  // 손잡이
  ctx.fillStyle = metal
  ctx.fillRect(x + size / 2 - 4, y + size / 2 - 2, 2, 4)
  ctx.fillRect(x + size / 2 + 2, y + size / 2 - 2, 2, 4)
}

function drawWhiteboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // 프레임
  ctx.fillStyle = "#888"
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4)

  // 화이트보드 표면
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8)

  // 글자 표시
  ctx.fillStyle = "#333"
  ctx.fillRect(x + 8, y + 8, size - 16, 2)
  ctx.fillRect(x + 8, y + 14, size - 20, 2)
  ctx.fillRect(x + 8, y + 20, size - 18, 2)
}

function drawMonitor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // 모니터 프레임
  ctx.fillStyle = "#333"
  ctx.fillRect(x + 4, y + 4, size - 8, size - 12)

  // 화면
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
  gradient.addColorStop(0, "#4fc3f7")
  gradient.addColorStop(1, "#0288d1")
  ctx.fillStyle = gradient
  ctx.fillRect(x + 6, y + 6, size - 12, size - 18)

  // 스탠드
  ctx.fillStyle = "#555"
  ctx.fillRect(x + size / 2 - 4, y + size - 8, 8, 4)
  ctx.fillRect(x + size / 2 - 6, y + size - 4, 12, 4)
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  plantSize: "large" | "small"
): void {
  const pot = "#8b4513"
  const leaf = "#2ecc71"
  const leafDark = "#27ae60"

  if (plantSize === "large") {
    // 큰 화분
    ctx.fillStyle = pot
    ctx.fillRect(x + 8, y + 20, size - 16, 12)

    // 흙
    ctx.fillStyle = "#5d4037"
    ctx.fillRect(x + 10, y + 20, size - 20, 3)

    // 잎
    ctx.fillStyle = leaf
    ctx.beginPath()
    ctx.arc(x + size / 2, y + 12, 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = leafDark
    ctx.beginPath()
    ctx.arc(x + size / 2 - 4, y + 8, 6, 0, Math.PI * 2)
    ctx.arc(x + size / 2 + 4, y + 8, 6, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // 작은 화분
    ctx.fillStyle = pot
    ctx.fillRect(x + 10, y + 22, size - 20, 8)

    ctx.fillStyle = leaf
    ctx.beginPath()
    ctx.arc(x + size / 2, y + 18, 6, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: "floor" | "desk"
): void {
  const { metal, metal_light } = MODERN_PALETTE.furniture
  const { warning } = MODERN_PALETTE.accent

  if (type === "floor") {
    // 스탠드
    ctx.fillStyle = metal
    ctx.fillRect(x + size / 2 - 2, y + 10, 4, size - 14)

    // 베이스
    ctx.fillRect(x + size / 2 - 6, y + size - 4, 12, 4)

    // 램프 갓
    ctx.fillStyle = warning
    ctx.beginPath()
    ctx.moveTo(x + size / 2 - 8, y + 10)
    ctx.lineTo(x + size / 2 + 8, y + 10)
    ctx.lineTo(x + size / 2 + 4, y + 2)
    ctx.lineTo(x + size / 2 - 4, y + 2)
    ctx.closePath()
    ctx.fill()
  } else {
    // 데스크 램프
    ctx.fillStyle = metal
    ctx.fillRect(x + size / 2 - 4, y + size - 6, 8, 6)

    // 암
    ctx.fillRect(x + size / 2 - 1, y + 10, 2, size - 16)

    // 램프 헤드
    ctx.fillStyle = metal_light
    ctx.beginPath()
    ctx.arc(x + size / 2, y + 10, 6, 0, Math.PI, true)
    ctx.fill()

    // 빛
    ctx.fillStyle = "rgba(255, 235, 59, 0.3)"
    ctx.beginPath()
    ctx.arc(x + size / 2, y + 12, 8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawOfficeItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  item: string
): void {
  const { metal, white, black } = MODERN_PALETTE.furniture

  switch (item) {
    case "trash":
      ctx.fillStyle = metal
      ctx.fillRect(x + 8, y + 8, size - 16, size - 12)
      ctx.fillStyle = "#555"
      ctx.fillRect(x + 10, y + 10, size - 20, size - 16)
      break

    case "printer":
      ctx.fillStyle = white
      ctx.fillRect(x + 4, y + 12, size - 8, size - 16)
      ctx.fillStyle = black
      ctx.fillRect(x + 6, y + 14, size - 12, 6)
      ctx.fillStyle = "#ccc"
      ctx.fillRect(x + 8, y + 8, size - 16, 4)
      break

    case "coffee-machine":
      ctx.fillStyle = black
      ctx.fillRect(x + 6, y + 8, size - 12, size - 12)
      ctx.fillStyle = "#8b4513"
      ctx.fillRect(x + 10, y + 18, size - 20, 8)
      ctx.fillStyle = "#e74c3c"
      ctx.fillRect(x + size - 10, y + 12, 4, 4)
      break

    case "water-cooler":
      ctx.fillStyle = "#87ceeb"
      ctx.fillRect(x + 8, y + 4, size - 16, 12)
      ctx.fillStyle = white
      ctx.fillRect(x + 6, y + 16, size - 12, size - 20)
      ctx.fillStyle = "#3498db"
      ctx.fillRect(x + size / 2 - 2, y + 20, 4, 4)
      break
  }
}

// 장식 타일 함수들
function drawRug(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  col: number,
  row: number
): void {
  const { base, light, dark, pattern } = MODERN_PALETTE.carpet

  ctx.fillStyle = base
  ctx.fillRect(x, y, size, size)

  // 패턴
  ctx.fillStyle = pattern
  if ((col + row) % 2 === 0) {
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8)
  }

  // 테두리
  if (col === 0) {
    ctx.fillStyle = dark
    ctx.fillRect(x, y, 4, size)
  }
  if (col === 2) {
    ctx.fillStyle = dark
    ctx.fillRect(x + size - 4, y, 4, size)
  }
  if (row === 0) {
    ctx.fillStyle = dark
    ctx.fillRect(x, y, size, 4)
  }
  if (row === 2) {
    ctx.fillStyle = dark
    ctx.fillRect(x, y + size - 4, size, 4)
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  // 프레임
  ctx.fillStyle = "#8b4513"
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8)

  // 그림
  const colors =
    variant === 0
      ? ["#3498db", "#2ecc71", "#f1c40f"]
      : ["#e74c3c", "#9b59b6", "#1abc9c"]
  ctx.fillStyle = colors[0]
  ctx.fillRect(x + 6, y + 6, size - 12, size - 12)

  // 간단한 풍경
  ctx.fillStyle = colors[1]
  ctx.fillRect(x + 6, y + size / 2, size - 12, size / 2 - 6)
  ctx.fillStyle = colors[2]
  ctx.beginPath()
  ctx.arc(x + size - 10, y + 12, 4, 0, Math.PI * 2)
  ctx.fill()
}

function drawClock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // 시계 테두리
  ctx.fillStyle = "#333"
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, 0, Math.PI * 2)
  ctx.fill()

  // 시계 면
  ctx.fillStyle = "#fff"
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 6, 0, Math.PI * 2)
  ctx.fill()

  // 바늘
  ctx.strokeStyle = "#333"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + size / 2, y + size / 2)
  ctx.lineTo(x + size / 2, y + 10)
  ctx.stroke()

  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + size / 2, y + size / 2)
  ctx.lineTo(x + size - 10, y + size / 2)
  ctx.stroke()

  // 중심점
  ctx.fillStyle = "#e74c3c"
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawPoster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const bgColor = variant === 0 ? "#e74c3c" : "#3498db"

  ctx.fillStyle = bgColor
  ctx.fillRect(x + 4, y + 2, size - 8, size - 4)

  // 텍스트 라인
  ctx.fillStyle = "#fff"
  ctx.fillRect(x + 8, y + 8, size - 16, 3)
  ctx.fillRect(x + 8, y + 14, size - 20, 2)
  ctx.fillRect(x + 8, y + 20, size - 18, 2)

  // 테두리
  ctx.strokeStyle = "#333"
  ctx.lineWidth = 1
  ctx.strokeRect(x + 4, y + 2, size - 8, size - 4)
}

function drawSign(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const { primary } = MODERN_PALETTE.accent

  // 배경
  ctx.fillStyle = primary
  ctx.fillRect(x + 2, y + 8, size - 4, size - 16)

  // 텍스트
  ctx.fillStyle = "#fff"
  ctx.font = "bold 8px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("EXIT", x + size / 2, y + size / 2 + 2)

  // 테두리
  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 1
  ctx.strokeRect(x + 4, y + 10, size - 8, size - 20)
}

function drawCorkboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // 프레임
  ctx.fillStyle = "#8b4513"
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4)

  // 코르크
  ctx.fillStyle = "#d2691e"
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8)

  // 질감
  ctx.fillStyle = "rgba(0,0,0,0.1)"
  for (let i = 0; i < 10; i++) {
    const px = x + 4 + Math.random() * (size - 8)
    const py = y + 4 + Math.random() * (size - 8)
    ctx.fillRect(px, py, 2, 2)
  }

  // 핀과 메모
  ctx.fillStyle = "#ff0000"
  ctx.beginPath()
  ctx.arc(x + 10, y + 10, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#ffeb3b"
  ctx.fillRect(x + 8, y + 12, 8, 8)
}

// 특수 타일 함수들
function drawSpawnPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const { primary, primaryLight } = MODERN_PALETTE.accent

  // 링
  ctx.strokeStyle = primaryLight
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = primary
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 8, 0, Math.PI * 2)
  ctx.stroke()

  // 중심
  ctx.fillStyle = primaryLight
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  // 화살표
  ctx.fillStyle = primary
  ctx.beginPath()
  ctx.moveTo(x + size / 2, y + 4)
  ctx.lineTo(x + size / 2 - 4, y + 10)
  ctx.lineTo(x + size / 2 + 4, y + 10)
  ctx.closePath()
  ctx.fill()
}

function drawInteractiveZone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const { secondary } = MODERN_PALETTE.accent

  ctx.fillStyle = "rgba(108, 92, 231, 0.3)"
  ctx.fillRect(x, y, size, size)

  ctx.strokeStyle = secondary
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.strokeRect(x + 2, y + 2, size - 4, size - 4)
  ctx.setLineDash([])

  // E 아이콘
  ctx.fillStyle = secondary
  ctx.font = "bold 12px sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("E", x + size / 2, y + size / 2 + 4)
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // 포탈 효과
  const gradient = ctx.createRadialGradient(
    x + size / 2,
    y + size / 2,
    0,
    x + size / 2,
    y + size / 2,
    size / 2
  )
  gradient.addColorStop(0, "#9b59b6")
  gradient.addColorStop(0.5, "#8e44ad")
  gradient.addColorStop(1, "rgba(142, 68, 173, 0)")

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.fill()

  // 소용돌이
  ctx.strokeStyle = "#bb8fce"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 1.5)
  ctx.stroke()
}

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const { primary } = MODERN_PALETTE.accent

  ctx.fillStyle = "rgba(0, 206, 201, 0.3)"
  ctx.fillRect(x, y, size, size)

  ctx.strokeStyle = primary
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: "left" | "middle" | "right" | "full"
): void {
  const gradient = ctx.createLinearGradient(x, y, x, y + size)
  gradient.addColorStop(0, "rgba(0,0,0,0.3)")
  gradient.addColorStop(1, "rgba(0,0,0,0)")

  ctx.fillStyle = gradient

  if (type === "full") {
    ctx.fillRect(x, y, size, size)
  } else if (type === "left") {
    ctx.fillRect(x, y, size / 2, size)
  } else if (type === "right") {
    ctx.fillRect(x + size / 2, y, size / 2, size)
  } else {
    ctx.fillRect(x, y, size, size / 2)
  }
}

function drawCollisionMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
  ctx.fillRect(x, y, size, size)

  ctx.strokeStyle = "#ff0000"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + size, y + size)
  ctx.moveTo(x + size, y)
  ctx.lineTo(x, y + size)
  ctx.stroke()
}

// 자연 타일 함수들
function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  part: "top" | "trunk"
): void {
  const { base, light, dark } = MODERN_PALETTE.grass

  if (part === "top") {
    // 나뭇잎
    ctx.fillStyle = base
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = light
    ctx.beginPath()
    ctx.arc(x + size / 2 - 4, y + size / 2 - 4, size / 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.arc(x + size / 2 + 4, y + size / 2 + 4, size / 4, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // 줄기
    ctx.fillStyle = "#8b4513"
    ctx.fillRect(x + size / 2 - 4, y, 8, size)

    ctx.fillStyle = "#6b3410"
    ctx.fillRect(x + size / 2 - 4, y, 2, size)
  }
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const { base, light, dark } = MODERN_PALETTE.grass

  ctx.fillStyle = base
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size - 8, size / 2 - 4, Math.PI, 0)
  ctx.fill()

  ctx.fillStyle = variant === 0 ? light : dark
  ctx.beginPath()
  ctx.arc(x + size / 2 - 6, y + size - 10, 6, 0, Math.PI * 2)
  ctx.arc(x + size / 2 + 6, y + size - 10, 6, 0, Math.PI * 2)
  ctx.fill()
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const colors = variant === 0 ? ["#e74c3c", "#f1c40f"] : ["#9b59b6", "#3498db"]

  // 줄기
  ctx.fillStyle = "#27ae60"
  ctx.fillRect(x + size / 2 - 1, y + size / 2, 2, size / 2)

  // 잎
  ctx.fillStyle = "#2ecc71"
  ctx.beginPath()
  ctx.ellipse(x + size / 2 - 4, y + size - 8, 4, 2, -0.5, 0, Math.PI * 2)
  ctx.fill()

  // 꽃잎
  ctx.fillStyle = colors[0]
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5
    const px = x + size / 2 + Math.cos(angle) * 6
    const py = y + size / 2 - 4 + Math.sin(angle) * 6
    ctx.beginPath()
    ctx.arc(px, py, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // 중심
  ctx.fillStyle = colors[1]
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2 - 4, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  const color = variant === 0 ? "#7f8c8d" : "#95a5a6"

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x + 4, y + size - 4)
  ctx.lineTo(x + 8, y + 8)
  ctx.lineTo(x + size / 2, y + 4)
  ctx.lineTo(x + size - 8, y + 10)
  ctx.lineTo(x + size - 4, y + size - 4)
  ctx.closePath()
  ctx.fill()

  // 하이라이트
  ctx.fillStyle = "rgba(255,255,255,0.3)"
  ctx.beginPath()
  ctx.moveTo(x + 8, y + 10)
  ctx.lineTo(x + size / 2, y + 6)
  ctx.lineTo(x + size / 2, y + 12)
  ctx.closePath()
  ctx.fill()

  // 그림자
  ctx.fillStyle = "rgba(0,0,0,0.2)"
  ctx.beginPath()
  ctx.moveTo(x + size - 8, y + 12)
  ctx.lineTo(x + size - 4, y + size - 4)
  ctx.lineTo(x + size / 2 + 4, y + size - 4)
  ctx.closePath()
  ctx.fill()
}

function drawFence(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  direction: "horizontal" | "vertical"
): void {
  ctx.fillStyle = "#8b4513"

  if (direction === "horizontal") {
    // 가로 빔
    ctx.fillRect(x, y + size / 2 - 2, size, 4)
    ctx.fillRect(x, y + size / 2 + 6, size, 4)

    // 기둥
    ctx.fillRect(x + 4, y + 4, 4, size - 8)
    ctx.fillRect(x + size - 8, y + 4, 4, size - 8)
  } else {
    // 세로 빔
    ctx.fillRect(x + size / 2 - 2, y, 4, size)
    ctx.fillRect(x + size / 2 + 6, y, 4, size)

    // 기둥
    ctx.fillRect(x + 4, y + 4, size - 8, 4)
    ctx.fillRect(x + 4, y + size - 8, size - 8, 4)
  }
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: number
): void {
  ctx.fillStyle = variant === 0 ? "#d4a76a" : "#c4975a"
  ctx.fillRect(x, y, size, size)

  // 자갈 텍스처
  ctx.fillStyle = "rgba(0,0,0,0.1)"
  for (let i = 0; i < 8; i++) {
    const px = x + Math.random() * (size - 4)
    const py = y + Math.random() * (size - 4)
    ctx.beginPath()
    ctx.arc(px + 2, py + 2, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBench(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // 좌석
  ctx.fillStyle = "#8b4513"
  ctx.fillRect(x + 2, y + 12, size - 4, 8)

  // 등받이
  ctx.fillRect(x + 4, y + 4, size - 8, 4)

  // 다리
  ctx.fillStyle = "#5d3a1a"
  ctx.fillRect(x + 6, y + 20, 4, 8)
  ctx.fillRect(x + size - 10, y + 20, 4, 8)

  // 하이라이트
  ctx.fillStyle = "rgba(255,255,255,0.2)"
  ctx.fillRect(x + 2, y + 12, size - 4, 2)
}

function drawStreetLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  // 기둥
  ctx.fillStyle = "#333"
  ctx.fillRect(x + size / 2 - 2, y + 8, 4, size - 12)

  // 베이스
  ctx.fillRect(x + size / 2 - 6, y + size - 4, 12, 4)

  // 램프
  ctx.fillStyle = "#555"
  ctx.fillRect(x + size / 2 - 8, y + 4, 16, 6)

  // 빛
  ctx.fillStyle = "#ffeb3b"
  ctx.fillRect(x + size / 2 - 6, y + 6, 12, 2)

  // 글로우 효과
  const gradient = ctx.createRadialGradient(
    x + size / 2,
    y + 8,
    0,
    x + size / 2,
    y + 8,
    12
  )
  gradient.addColorStop(0, "rgba(255, 235, 59, 0.3)")
  gradient.addColorStop(1, "rgba(255, 235, 59, 0)")
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x + size / 2, y + 8, 12, 0, Math.PI * 2)
  ctx.fill()
}
