/**
 * TileSystem - 모던 오피스 타일맵 시스템
 * 고품질 타일셋 기반 맵 렌더링
 *
 * @version 2.0.0 - 프로시저럴 → 타일셋 기반으로 리팩토링
 */
import * as Phaser from "phaser"
import {
  generateTilesetTexture,
  TILESET_CONFIG,
  TILE_INDEX,
} from "./TilesetGenerator"
import {
  createModernOfficeMap,
  flattenLayerData,
  MAP_CONFIG,
  type MapData,
  type SpawnPoint,
  type InteractiveZone,
} from "./MapData"

// 타일 설정 (하위 호환성)
export const TILE_CONFIG = {
  SIZE: TILESET_CONFIG.TILE_SIZE,
  VARIANTS: {
    floor: 4,
    wall: 2,
    accent: 3,
  },
}

// 타일 팔레트 (레거시 호환)
export const TILE_PALETTE = {
  floor: {
    base: 0xc4a77d, // 나무 바닥
    light: 0xd4b78d,
    dark: 0xa48757,
    grid: 0xb09060,
  },
  wall: {
    base: 0xf0f0f0, // 밝은 벽
    light: 0xffffff,
    dark: 0xd8d8d8,
    top: 0xfafafa,
  },
  accent: {
    base: 0x00cec9, // primary color
    light: 0x55efc4,
    dark: 0x00a8a8,
    glow: 0x55efc4,
  },
  carpet: {
    base: 0x7c8798,
    light: 0x8c97a8,
    dark: 0x6c7788,
    pattern: 0x5c6778,
  },
  plant: {
    pot: 0x8b4513,
    soil: 0x5d4037,
    leaf: 0x2ecc71,
    leafDark: 0x27ae60,
  },
}

// 타일 타입 (레거시 호환)
export type TileType = "floor" | "wall" | "accent" | "spawn" | "carpet" | "plant"

/**
 * 타일맵 시스템 클래스
 */
export class TileMapSystem {
  private scene: Phaser.Scene
  private mapData: MapData
  private tilemap: Phaser.Tilemaps.Tilemap | null = null
  private tileset: Phaser.Tilemaps.Tileset | null = null
  private layers: Map<string, Phaser.Tilemaps.TilemapLayer> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.mapData = createModernOfficeMap()
  }

  /**
   * 타일셋 텍스처 생성 (preload 단계에서 호출)
   */
  generateTextures(): void {
    generateTilesetTexture(this.scene)
  }

  /**
   * 타일맵 생성 (create 단계에서 호출)
   */
  createTilemap(): Phaser.Tilemaps.Tilemap {
    const { width, height, tileSize } = this.mapData

    // 빈 타일맵 생성
    this.tilemap = this.scene.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: width,
      height: height,
    })

    // 타일셋 추가
    this.tileset = this.tilemap.addTilesetImage(
      "modern-office-tileset",
      "modern-office-tileset",
      tileSize,
      tileSize,
      0,
      0
    )

    if (!this.tileset) {
      console.error("Failed to create tileset")
      return this.tilemap
    }

    // 레이어 생성
    this.createLayers()

    return this.tilemap
  }

  /**
   * 레이어 생성
   */
  private createLayers(): void {
    if (!this.tilemap || !this.tileset) return

    for (const layerData of this.mapData.layers) {
      // 레이어 생성
      const layer = this.tilemap.createBlankLayer(
        layerData.name,
        this.tileset,
        0,
        0,
        this.mapData.width,
        this.mapData.height
      )

      if (!layer) continue

      // 타일 데이터 채우기
      for (let y = 0; y < this.mapData.height; y++) {
        for (let x = 0; x < this.mapData.width; x++) {
          const tileIndex = layerData.data[y][x]
          if (tileIndex >= 0) {
            layer.putTileAt(tileIndex, x, y)
          }
        }
      }

      // 가시성 설정
      layer.setVisible(layerData.visible)

      // 레이어 저장
      this.layers.set(layerData.name, layer)

      // 레이어별 깊이 설정
      this.setLayerDepth(layer, layerData.name)
    }
  }

  /**
   * 레이어 깊이 설정
   */
  private setLayerDepth(
    layer: Phaser.Tilemaps.TilemapLayer,
    name: string
  ): void {
    const depths: Record<string, number> = {
      ground: 0,
      walls: 1,
      furniture: 2,
      furniture_top: 10, // 플레이어 위
      decorations: 11,
      collision: -1, // 보이지 않음
    }
    layer.setDepth(depths[name] ?? 0)
  }

  /**
   * 충돌 설정
   */
  setupCollisions(): Phaser.Tilemaps.TilemapLayer | null {
    const collisionLayer = this.layers.get("collision")
    if (!collisionLayer) return null

    // 모든 타일에 충돌 설정
    collisionLayer.setCollisionByExclusion([-1])

    return collisionLayer
  }

  /**
   * 스폰 포인트 가져오기
   */
  getSpawnPoints(): SpawnPoint[] {
    return this.mapData.spawnPoints
  }

  /**
   * 기본 스폰 포인트 가져오기
   */
  getDefaultSpawnPoint(): SpawnPoint {
    return (
      this.mapData.spawnPoints.find((sp) => sp.isDefault) ||
      this.mapData.spawnPoints[0] || { x: 16, y: 30 }
    )
  }

  /**
   * 스폰 좌표를 픽셀 좌표로 변환
   */
  spawnToPixel(spawn: SpawnPoint): { x: number; y: number } {
    return {
      x: spawn.x * this.mapData.tileSize + this.mapData.tileSize / 2,
      y: spawn.y * this.mapData.tileSize + this.mapData.tileSize / 2,
    }
  }

  /**
   * 상호작용 영역 가져오기
   */
  getInteractiveZones(): InteractiveZone[] {
    return this.mapData.interactiveZones
  }

  /**
   * 월드 경계 가져오기
   */
  getWorldBounds(): { width: number; height: number } {
    return {
      width: this.mapData.width * this.mapData.tileSize,
      height: this.mapData.height * this.mapData.tileSize,
    }
  }

  /**
   * 타일맵 가져오기
   */
  getTilemap(): Phaser.Tilemaps.Tilemap | null {
    return this.tilemap
  }

  /**
   * 특정 레이어 가져오기
   */
  getLayer(name: string): Phaser.Tilemaps.TilemapLayer | undefined {
    return this.layers.get(name)
  }

  /**
   * 맵 설정 가져오기
   */
  getMapConfig() {
    return MAP_CONFIG
  }
}

// ===== 레거시 호환 함수들 =====

/**
 * 모든 타일 텍스처 생성 (레거시 호환)
 * @deprecated TileMapSystem.generateTextures() 사용 권장
 */
export function generateAllTileTextures(scene: Phaser.Scene): void {
  generateTilesetTexture(scene)
}

/**
 * 랜덤 바닥 타일 키 (레거시 호환)
 * @deprecated TileMapSystem 사용 권장
 */
export function getRandomFloorKey(): string {
  const variant = Math.floor(Math.random() * TILE_CONFIG.VARIANTS.floor)
  return `tile-floor-${variant}`
}

/**
 * 랜덤 벽 타일 키 (레거시 호환)
 * @deprecated TileMapSystem 사용 권장
 */
export function getRandomWallKey(): string {
  const variant = Math.floor(Math.random() * TILE_CONFIG.VARIANTS.wall)
  return `tile-wall-${variant}`
}

/**
 * 랜덤 액센트 타일 키 (레거시 호환)
 * @deprecated TileMapSystem 사용 권장
 */
export function getRandomAccentKey(): string {
  const variant = Math.floor(Math.random() * TILE_CONFIG.VARIANTS.accent)
  return `tile-accent-${variant}`
}

// 타일 인덱스 내보내기 (다른 모듈에서 사용)
export { TILE_INDEX, TILESET_CONFIG }
