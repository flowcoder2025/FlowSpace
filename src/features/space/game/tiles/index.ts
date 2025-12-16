// 새 타일맵 시스템 (권장)
export { TileMapSystem } from "./TileSystem"
export { TILESET_CONFIG, TILE_INDEX } from "./TileSystem"
export { MAP_CONFIG } from "./MapData"
export type { MapData, SpawnPoint, InteractiveZone } from "./MapData"

// 레거시 호환 (deprecated)
export {
  TILE_CONFIG,
  TILE_PALETTE,
  generateAllTileTextures,
  getRandomFloorKey,
  getRandomWallKey,
  getRandomAccentKey,
} from "./TileSystem"
export type { TileType } from "./TileSystem"
