/**
 * Procedural Tile System
 * Generates tile textures programmatically using Phaser Graphics API
 */
import * as Phaser from "phaser"

// Tile configuration
export const TILE_CONFIG = {
  SIZE: 32, // Must match MAP_CONFIG.TILE_SIZE
  VARIANTS: {
    floor: 4, // Number of floor variations
    wall: 2, // Number of wall variations
    accent: 3, // Number of accent variations
  },
}

// Tile type definitions
export type TileType = "floor" | "wall" | "accent" | "spawn" | "carpet" | "plant"

// Tile color palette
export const TILE_PALETTE = {
  // Floor colors (dark theme)
  floor: {
    base: 0x2d3436,
    light: 0x353b3d,
    dark: 0x252a2c,
    grid: 0x3d4147,
  },
  // Wall colors
  wall: {
    base: 0x636e72,
    light: 0x74838a,
    dark: 0x4a5256,
    top: 0x7f8c8d,
  },
  // Accent colors (primary color based)
  accent: {
    base: 0x00cec9,
    light: 0x00ded9,
    dark: 0x00a8a8,
    glow: 0x55efc4,
  },
  // Carpet colors
  carpet: {
    base: 0x6c5ce7,
    light: 0x7c6cf7,
    dark: 0x5c4cd7,
    pattern: 0x8b7cf8,
  },
  // Plant/decoration colors
  plant: {
    pot: 0x8b4513,
    soil: 0x3d2817,
    leaf: 0x00b894,
    leafDark: 0x009874,
  },
}

/**
 * Generate all tile textures for the game
 */
export function generateAllTileTextures(scene: Phaser.Scene): void {
  // Generate floor tiles with variations
  for (let i = 0; i < TILE_CONFIG.VARIANTS.floor; i++) {
    generateFloorTexture(scene, `tile-floor-${i}`, i)
  }

  // Generate wall tiles
  for (let i = 0; i < TILE_CONFIG.VARIANTS.wall; i++) {
    generateWallTexture(scene, `tile-wall-${i}`, i)
  }

  // Generate accent tiles
  for (let i = 0; i < TILE_CONFIG.VARIANTS.accent; i++) {
    generateAccentTexture(scene, `tile-accent-${i}`, i)
  }

  // Generate special tiles
  generateSpawnTexture(scene, "tile-spawn")
  generateCarpetTexture(scene, "tile-carpet")
  generatePlantTexture(scene, "tile-plant")
}

/**
 * Generate floor tile texture with subtle variation
 */
function generateFloorTexture(scene: Phaser.Scene, key: string, variant: number): void {
  if (scene.textures.exists(key)) return

  const size = TILE_CONFIG.SIZE
  const graphics = scene.add.graphics()
  const { base, light, dark, grid } = TILE_PALETTE.floor

  // Base color with slight variation based on variant
  const baseColor = Phaser.Display.Color.IntegerToColor(base)
  const variantOffset = (variant - 1.5) * 8
  const adjustedColor = Phaser.Display.Color.GetColor(
    Math.max(0, Math.min(255, baseColor.red + variantOffset)),
    Math.max(0, Math.min(255, baseColor.green + variantOffset)),
    Math.max(0, Math.min(255, baseColor.blue + variantOffset))
  )

  // Draw base tile
  graphics.fillStyle(adjustedColor, 1)
  graphics.fillRect(0, 0, size, size)

  // Add subtle corner shadows for depth
  graphics.fillStyle(dark, 0.3)
  graphics.fillRect(0, 0, 2, size)
  graphics.fillRect(0, 0, size, 2)

  // Add subtle corner highlights
  graphics.fillStyle(light, 0.2)
  graphics.fillRect(size - 2, 0, 2, size)
  graphics.fillRect(0, size - 2, size, 2)

  // Add grid lines
  graphics.lineStyle(1, grid, 0.3)
  graphics.strokeRect(0.5, 0.5, size - 1, size - 1)

  // Add random subtle details based on variant
  if (variant === 1 || variant === 3) {
    // Small dot pattern
    graphics.fillStyle(light, 0.15)
    graphics.fillCircle(size * 0.25, size * 0.25, 2)
    graphics.fillCircle(size * 0.75, size * 0.75, 2)
  }

  if (variant === 2) {
    // Subtle scratch marks
    graphics.lineStyle(1, dark, 0.2)
    graphics.lineBetween(size * 0.3, size * 0.2, size * 0.7, size * 0.3)
  }

  // Generate texture from graphics
  graphics.generateTexture(key, size, size)
  graphics.destroy()
}

/**
 * Generate wall tile texture with 3D effect
 */
function generateWallTexture(scene: Phaser.Scene, key: string, variant: number): void {
  if (scene.textures.exists(key)) return

  const size = TILE_CONFIG.SIZE
  const graphics = scene.add.graphics()
  const { base, light, dark, top } = TILE_PALETTE.wall

  // Draw base wall
  graphics.fillStyle(base, 1)
  graphics.fillRect(0, 0, size, size)

  // Add 3D depth effect
  // Top face (lighter)
  graphics.fillStyle(top, 1)
  graphics.fillRect(0, 0, size, 8)

  // Left shadow
  graphics.fillStyle(dark, 1)
  graphics.fillRect(0, 0, 4, size)

  // Right highlight
  graphics.fillStyle(light, 0.5)
  graphics.fillRect(size - 4, 0, 4, size)

  // Bottom shadow
  graphics.fillStyle(dark, 0.7)
  graphics.fillRect(0, size - 4, size, 4)

  // Add brick pattern for variant 1
  if (variant === 1) {
    graphics.lineStyle(1, dark, 0.4)
    // Horizontal lines
    graphics.lineBetween(4, size * 0.33, size - 4, size * 0.33)
    graphics.lineBetween(4, size * 0.66, size - 4, size * 0.66)
    // Vertical lines (offset pattern)
    graphics.lineBetween(size * 0.5, 8, size * 0.5, size * 0.33)
    graphics.lineBetween(size * 0.25, size * 0.33, size * 0.25, size * 0.66)
    graphics.lineBetween(size * 0.75, size * 0.33, size * 0.75, size * 0.66)
    graphics.lineBetween(size * 0.5, size * 0.66, size * 0.5, size - 4)
  }

  // Outer border
  graphics.lineStyle(1, dark, 0.6)
  graphics.strokeRect(0.5, 0.5, size - 1, size - 1)

  graphics.generateTexture(key, size, size)
  graphics.destroy()
}

/**
 * Generate accent tile texture with glow effect
 */
function generateAccentTexture(scene: Phaser.Scene, key: string, variant: number): void {
  if (scene.textures.exists(key)) return

  const size = TILE_CONFIG.SIZE
  const graphics = scene.add.graphics()
  const { base, dark, glow } = TILE_PALETTE.accent
  const floor = TILE_PALETTE.floor.base

  // Draw floor base first
  graphics.fillStyle(floor, 1)
  graphics.fillRect(0, 0, size, size)

  // Draw accent pattern based on variant
  const padding = 6
  const innerSize = size - padding * 2

  if (variant === 0) {
    // Diamond pattern
    graphics.fillStyle(dark, 0.4)
    graphics.beginPath()
    graphics.moveTo(size / 2, padding)
    graphics.lineTo(size - padding, size / 2)
    graphics.lineTo(size / 2, size - padding)
    graphics.lineTo(padding, size / 2)
    graphics.closePath()
    graphics.fill()

    graphics.fillStyle(base, 0.6)
    graphics.beginPath()
    graphics.moveTo(size / 2, padding + 4)
    graphics.lineTo(size - padding - 4, size / 2)
    graphics.lineTo(size / 2, size - padding - 4)
    graphics.lineTo(padding + 4, size / 2)
    graphics.closePath()
    graphics.fill()
  } else if (variant === 1) {
    // Circle pattern
    graphics.fillStyle(dark, 0.3)
    graphics.fillCircle(size / 2, size / 2, innerSize / 2)

    graphics.fillStyle(base, 0.5)
    graphics.fillCircle(size / 2, size / 2, innerSize / 2 - 4)

    graphics.fillStyle(glow, 0.3)
    graphics.fillCircle(size / 2, size / 2, innerSize / 4)
  } else {
    // Corner accents
    graphics.fillStyle(base, 0.4)
    // Top-left
    graphics.fillTriangle(0, 0, 12, 0, 0, 12)
    // Top-right
    graphics.fillTriangle(size, 0, size - 12, 0, size, 12)
    // Bottom-left
    graphics.fillTriangle(0, size, 12, size, 0, size - 12)
    // Bottom-right
    graphics.fillTriangle(size, size, size - 12, size, size, size - 12)

    // Center glow
    graphics.fillStyle(glow, 0.2)
    graphics.fillCircle(size / 2, size / 2, 6)
  }

  // Grid line
  graphics.lineStyle(1, TILE_PALETTE.floor.grid, 0.3)
  graphics.strokeRect(0.5, 0.5, size - 1, size - 1)

  graphics.generateTexture(key, size, size)
  graphics.destroy()
}

/**
 * Generate spawn point tile texture
 */
function generateSpawnTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return

  const size = TILE_CONFIG.SIZE
  const graphics = scene.add.graphics()
  const floor = TILE_PALETTE.floor.base
  const accent = TILE_PALETTE.accent

  // Draw floor base
  graphics.fillStyle(floor, 1)
  graphics.fillRect(0, 0, size, size)

  // Draw spawn indicator rings
  graphics.lineStyle(2, accent.glow, 0.4)
  graphics.strokeCircle(size / 2, size / 2, size / 2 - 4)

  graphics.lineStyle(2, accent.base, 0.6)
  graphics.strokeCircle(size / 2, size / 2, size / 2 - 10)

  // Center dot
  graphics.fillStyle(accent.light, 0.8)
  graphics.fillCircle(size / 2, size / 2, 4)

  // Arrow indicators pointing inward
  graphics.fillStyle(accent.base, 0.5)
  // Top arrow
  graphics.fillTriangle(size / 2, 8, size / 2 - 4, 2, size / 2 + 4, 2)
  // Bottom arrow
  graphics.fillTriangle(size / 2, size - 8, size / 2 - 4, size - 2, size / 2 + 4, size - 2)
  // Left arrow
  graphics.fillTriangle(8, size / 2, 2, size / 2 - 4, 2, size / 2 + 4)
  // Right arrow
  graphics.fillTriangle(size - 8, size / 2, size - 2, size / 2 - 4, size - 2, size / 2 + 4)

  graphics.generateTexture(key, size, size)
  graphics.destroy()
}

/**
 * Generate carpet tile texture
 */
function generateCarpetTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return

  const size = TILE_CONFIG.SIZE
  const graphics = scene.add.graphics()
  const { base, light, dark, pattern } = TILE_PALETTE.carpet

  // Draw carpet base
  graphics.fillStyle(base, 1)
  graphics.fillRect(0, 0, size, size)

  // Add carpet texture pattern
  graphics.fillStyle(pattern, 0.3)
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      if ((x + y) % 8 === 0) {
        graphics.fillRect(x, y, 2, 2)
      }
    }
  }

  // Border/fringe effect
  graphics.fillStyle(dark, 0.5)
  graphics.fillRect(0, 0, size, 3)
  graphics.fillRect(0, size - 3, size, 3)
  graphics.fillRect(0, 0, 3, size)
  graphics.fillRect(size - 3, 0, 3, size)

  // Inner border
  graphics.fillStyle(light, 0.3)
  graphics.fillRect(3, 3, size - 6, 2)
  graphics.fillRect(3, size - 5, size - 6, 2)
  graphics.fillRect(3, 3, 2, size - 6)
  graphics.fillRect(size - 5, 3, 2, size - 6)

  graphics.generateTexture(key, size, size)
  graphics.destroy()
}

/**
 * Generate plant/pot decoration tile texture
 */
function generatePlantTexture(scene: Phaser.Scene, key: string): void {
  if (scene.textures.exists(key)) return

  const size = TILE_CONFIG.SIZE
  const graphics = scene.add.graphics()
  const floor = TILE_PALETTE.floor.base
  const { pot, soil, leaf, leafDark } = TILE_PALETTE.plant

  // Draw floor base
  graphics.fillStyle(floor, 1)
  graphics.fillRect(0, 0, size, size)

  // Draw pot
  const potWidth = 16
  const potHeight = 12
  const potX = (size - potWidth) / 2
  const potY = size - potHeight - 4

  // Pot body (trapezoid)
  graphics.fillStyle(pot, 1)
  graphics.beginPath()
  graphics.moveTo(potX, potY)
  graphics.lineTo(potX + potWidth, potY)
  graphics.lineTo(potX + potWidth - 2, potY + potHeight)
  graphics.lineTo(potX + 2, potY + potHeight)
  graphics.closePath()
  graphics.fill()

  // Pot rim
  graphics.fillRect(potX - 2, potY - 2, potWidth + 4, 4)

  // Soil
  graphics.fillStyle(soil, 1)
  graphics.fillRect(potX + 2, potY, potWidth - 4, 4)

  // Draw leaves using simple triangles (Phaser Graphics compatible)
  const centerX = size / 2
  const leafBaseY = potY - 2

  // Main leaves (diamond/leaf shapes using triangles)
  graphics.fillStyle(leaf, 1)

  // Left leaf (two triangles forming a leaf shape)
  graphics.fillTriangle(
    centerX, leafBaseY,
    centerX - 10, leafBaseY - 10,
    centerX - 6, leafBaseY - 16
  )
  graphics.fillTriangle(
    centerX, leafBaseY,
    centerX - 6, leafBaseY - 16,
    centerX - 2, leafBaseY - 8
  )

  // Right leaf
  graphics.fillTriangle(
    centerX, leafBaseY,
    centerX + 10, leafBaseY - 10,
    centerX + 6, leafBaseY - 16
  )
  graphics.fillTriangle(
    centerX, leafBaseY,
    centerX + 6, leafBaseY - 16,
    centerX + 2, leafBaseY - 8
  )

  // Center leaf (taller)
  graphics.fillStyle(leafDark, 1)
  graphics.fillTriangle(
    centerX, leafBaseY,
    centerX - 3, leafBaseY - 12,
    centerX, leafBaseY - 18
  )
  graphics.fillTriangle(
    centerX, leafBaseY,
    centerX, leafBaseY - 18,
    centerX + 3, leafBaseY - 12
  )

  // Grid line
  graphics.lineStyle(1, TILE_PALETTE.floor.grid, 0.3)
  graphics.strokeRect(0.5, 0.5, size - 1, size - 1)

  graphics.generateTexture(key, size, size)
  graphics.destroy()
}

/**
 * Get a random floor texture key
 */
export function getRandomFloorKey(): string {
  const variant = Math.floor(Math.random() * TILE_CONFIG.VARIANTS.floor)
  return `tile-floor-${variant}`
}

/**
 * Get a random wall texture key
 */
export function getRandomWallKey(): string {
  const variant = Math.floor(Math.random() * TILE_CONFIG.VARIANTS.wall)
  return `tile-wall-${variant}`
}

/**
 * Get a random accent texture key
 */
export function getRandomAccentKey(): string {
  const variant = Math.floor(Math.random() * TILE_CONFIG.VARIANTS.accent)
  return `tile-accent-${variant}`
}
