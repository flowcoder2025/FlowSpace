/**
 * Procedural Character Sprite Generator
 * Creates pixel-art style character sprites using CanvasTexture
 *
 * NOTE: Uses CanvasTexture (HTML5 Canvas 2D) instead of graphics.generateTexture()
 * for consistent behavior across development and production environments.
 * WebGL-based graphics.generateTexture() is unstable in production builds.
 */
import * as Phaser from "phaser"

// Development mode flag for debug logs
const IS_DEV = process.env.NODE_ENV === "development"

// Character sprite configuration
export const CHARACTER_CONFIG = {
  WIDTH: 24,
  HEIGHT: 32,
  FRAME_COUNT: 4, // Frames per animation
  COLORS: {
    default: { body: "#00cec9", outline: "#00a8a8" },
    red: { body: "#e74c3c", outline: "#c0392b" },
    green: { body: "#2ecc71", outline: "#27ae60" },
    purple: { body: "#9b59b6", outline: "#8e44ad" },
    orange: { body: "#e67e22", outline: "#d35400" },
    pink: { body: "#fd79a8", outline: "#e84393" },
    yellow: { body: "#fdcb6e", outline: "#f39c12" },
    blue: { body: "#3498db", outline: "#2980b9" },
  } as Record<string, { body: string; outline: string }>,
}

// Animation keys
export const ANIM_KEYS = {
  IDLE_DOWN: "idle-down",
  IDLE_UP: "idle-up",
  IDLE_LEFT: "idle-left",
  IDLE_RIGHT: "idle-right",
  WALK_DOWN: "walk-down",
  WALK_UP: "walk-up",
  WALK_LEFT: "walk-left",
  WALK_RIGHT: "walk-right",
}

/**
 * Generate character sprite sheet texture using CanvasTexture
 * Uses HTML5 Canvas 2D API directly for environment-independent rendering
 */
export function generateCharacterTexture(
  scene: Phaser.Scene,
  textureKey: string,
  colorKey: string = "default"
): boolean {
  const { WIDTH, HEIGHT, FRAME_COUNT, COLORS } = CHARACTER_CONFIG
  const color = COLORS[colorKey] || COLORS.default

  // Total sheet size: 4 directions x 4 frames = 16 frames
  const sheetWidth = WIDTH * FRAME_COUNT
  const sheetHeight = HEIGHT * 4 // 4 directions

  try {
    // Remove existing texture if present
    if (scene.textures.exists(textureKey)) {
      scene.textures.remove(textureKey)
    }

    // Create CanvasTexture - this uses HTML5 Canvas directly, not WebGL
    const canvasTexture = scene.textures.createCanvas(textureKey, sheetWidth, sheetHeight)

    if (!canvasTexture) {
      console.error(`[CharacterSprite] Failed to create canvas texture: ${textureKey}`)
      return false
    }

    // Get the canvas context for drawing
    const canvas = canvasTexture.getCanvas()
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      console.error(`[CharacterSprite] Failed to get canvas context: ${textureKey}`)
      return false
    }

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, sheetWidth, sheetHeight)

    // Draw frames for each direction
    const directions = ["down", "left", "right", "up"]
    directions.forEach((direction, dirIndex) => {
      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        const x = frame * WIDTH
        const y = dirIndex * HEIGHT
        drawCharacterFrameCanvas(ctx, x, y, color, direction, frame)
      }
    })

    // Refresh the texture to apply changes
    canvasTexture.refresh()

    // Get the texture and add frame data
    const texture = scene.textures.get(textureKey)

    if (!texture) {
      console.error(`[CharacterSprite] Texture not found after creation: ${textureKey}`)
      return false
    }

    // Add frames to the texture for sprite sheet slicing
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        const frameName = `${textureKey}_${dir}_${frame}`
        // Only add if not already exists
        if (!texture.has(frameName)) {
          texture.add(
            frameName,
            0, // sourceIndex - 0 for single-image textures
            frame * WIDTH,
            dir * HEIGHT,
            WIDTH,
            HEIGHT
          )
        }
      }
    }

    if (IS_DEV) {
      console.log(`[CharacterSprite] Generated CanvasTexture with frames: ${textureKey}`)
    }
    return true
  } catch (error) {
    console.error(`[CharacterSprite] Error generating texture ${textureKey}:`, error)
    return false
  }
}

/**
 * Draw a single character frame using Canvas 2D API
 */
function drawCharacterFrameCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: { body: string; outline: string },
  direction: string,
  frame: number
): void {
  const { WIDTH, HEIGHT } = CHARACTER_CONFIG

  // Animation offset for walk cycle
  const walkOffset = frame % 2 === 1 ? 1 : 0
  const altWalk = frame === 1 || frame === 3

  // Head position
  const headX = x + WIDTH / 2
  const headY = y + 8
  const headRadius = 6

  // Body position with walk animation
  const bodyY = y + 14 + walkOffset

  // Draw outline/shadow first
  ctx.fillStyle = color.outline

  // Head shadow
  ctx.beginPath()
  ctx.arc(headX, headY + 1, headRadius, 0, Math.PI * 2)
  ctx.fill()

  // Body shadow (torso) - rounded rect
  drawRoundedRect(ctx, x + 4, bodyY + 1, WIDTH - 8, 12, 3)
  ctx.fill()

  // Draw main body
  ctx.fillStyle = color.body

  // Head
  ctx.beginPath()
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
  ctx.fill()

  // Body (torso) - rounded rect
  drawRoundedRect(ctx, x + 5, bodyY, WIDTH - 10, 11, 2)
  ctx.fill()

  // Legs with walk animation
  const legWidth = 5
  const legHeight = 8
  const legY = y + HEIGHT - legHeight - 2

  ctx.fillStyle = color.outline

  if (direction === "left" || direction === "right") {
    // Side view - legs animate differently
    const legOffset = altWalk ? 2 : -2
    drawRoundedRect(ctx, x + 7, legY + legOffset, legWidth, legHeight, 1)
    ctx.fill()
    drawRoundedRect(ctx, x + 12, legY - legOffset, legWidth, legHeight, 1)
    ctx.fill()
  } else {
    // Front/back view
    const leftLegOffset = altWalk ? 1 : -1
    const rightLegOffset = altWalk ? -1 : 1

    drawRoundedRect(ctx, x + 6, legY + leftLegOffset, legWidth, legHeight, 1)
    ctx.fill()
    drawRoundedRect(ctx, x + 13, legY + rightLegOffset, legWidth, legHeight, 1)
    ctx.fill()
  }

  // Eyes based on direction
  const eyeY = headY - 1

  if (direction === "down") {
    // Front facing - two eyes
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(headX - 2, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(headX + 2, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()
    // Pupils
    ctx.fillStyle = "#2d3436"
    ctx.beginPath()
    ctx.arc(headX - 2, eyeY + 0.5, 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(headX + 2, eyeY + 0.5, 0.8, 0, Math.PI * 2)
    ctx.fill()
  } else if (direction === "up") {
    // Back facing - no eyes, maybe hair/back detail
    ctx.fillStyle = color.outline
    ctx.beginPath()
    ctx.arc(headX, headY - 2, 2, 0, Math.PI * 2)
    ctx.fill()
  } else if (direction === "left") {
    // Left facing - one eye on left
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(headX - 3, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#2d3436"
    ctx.beginPath()
    ctx.arc(headX - 3.5, eyeY + 0.5, 0.8, 0, Math.PI * 2)
    ctx.fill()
  } else if (direction === "right") {
    // Right facing - one eye on right
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(headX + 3, eyeY, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#2d3436"
    ctx.beginPath()
    ctx.arc(headX + 3.5, eyeY + 0.5, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Helper function to draw rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Create animations for a character sprite
 * Assumes frames were already added via generateCharacterTexture()
 */
export function createCharacterAnimations(
  scene: Phaser.Scene,
  textureKey: string,
  animPrefix: string = ""
): boolean {
  const { FRAME_COUNT } = CHARACTER_CONFIG
  const prefix = animPrefix ? `${animPrefix}-` : ""

  // Verify texture exists using the correct method
  if (!scene.textures.exists(textureKey)) {
    console.error(`[CharacterSprite] Cannot create animations - texture not found: ${textureKey}`)
    return false
  }

  // Get texture and verify frames exist
  const texture = scene.textures.get(textureKey)
  const firstFrameName = `${textureKey}_0_0`
  if (!texture.has(firstFrameName)) {
    console.error(`[CharacterSprite] Cannot create animations - frames not found for: ${textureKey}`)
    console.error(`[CharacterSprite] Expected frame: ${firstFrameName}`)
    return false
  }

  const directions = [
    { key: "down", row: 0 },
    { key: "left", row: 1 },
    { key: "right", row: 2 },
    { key: "up", row: 3 },
  ]

  let animationsCreated = 0

  directions.forEach(({ key, row }) => {
    // Idle animation (single frame)
    const idleKey = `${prefix}idle-${key}`
    if (!scene.anims.exists(idleKey)) {
      const idleAnim = scene.anims.create({
        key: idleKey,
        frames: [{ key: textureKey, frame: `${textureKey}_${row}_0` }],
        frameRate: 1,
        repeat: -1,
      })
      if (idleAnim) animationsCreated++
    }

    // Walk animation (4 frames)
    const walkKey = `${prefix}walk-${key}`
    if (!scene.anims.exists(walkKey)) {
      const frames = []
      for (let i = 0; i < FRAME_COUNT; i++) {
        frames.push({ key: textureKey, frame: `${textureKey}_${row}_${i}` })
      }

      const walkAnim = scene.anims.create({
        key: walkKey,
        frames,
        frameRate: 8,
        repeat: -1,
      })
      if (walkAnim) animationsCreated++
    }
  })

  if (IS_DEV) {
    console.log(`[CharacterSprite] Created ${animationsCreated} animations for: ${textureKey}`)
  }
  return true
}

/**
 * Get animation key based on direction and movement state
 */
export function getAnimationKey(
  direction: "up" | "down" | "left" | "right",
  isMoving: boolean,
  prefix: string = ""
): string {
  const pre = prefix ? `${prefix}-` : ""
  const action = isMoving ? "walk" : "idle"
  return `${pre}${action}-${direction}`
}

/**
 * Create animations for a character from a loaded spritesheet
 * Uses frame indices (0-15) from the spritesheet loaded via this.load.spritesheet()
 *
 * Spritesheet layout (96x128, 4x4 frames):
 * Row 0 (frames 0-3): down
 * Row 1 (frames 4-7): left
 * Row 2 (frames 8-11): right
 * Row 3 (frames 12-15): up
 */
export function createCharacterAnimationsFromSpritesheet(
  scene: Phaser.Scene,
  textureKey: string,
  animPrefix: string = ""
): boolean {
  const { FRAME_COUNT } = CHARACTER_CONFIG
  const prefix = animPrefix ? `${animPrefix}-` : ""

  // Verify texture exists
  if (!scene.textures.exists(textureKey)) {
    console.error(`[CharacterSprite] Cannot create animations - texture not found: ${textureKey}`)
    return false
  }

  const directions = [
    { key: "down", startFrame: 0 },
    { key: "left", startFrame: 4 },
    { key: "right", startFrame: 8 },
    { key: "up", startFrame: 12 },
  ]

  let animationsCreated = 0

  directions.forEach(({ key, startFrame }) => {
    // Idle animation (single frame)
    const idleKey = `${prefix}idle-${key}`
    if (!scene.anims.exists(idleKey)) {
      const idleAnim = scene.anims.create({
        key: idleKey,
        frames: [{ key: textureKey, frame: startFrame }],
        frameRate: 1,
        repeat: -1,
      })
      if (idleAnim) animationsCreated++
    }

    // Walk animation (4 frames)
    const walkKey = `${prefix}walk-${key}`
    if (!scene.anims.exists(walkKey)) {
      const frames = []
      for (let i = 0; i < FRAME_COUNT; i++) {
        frames.push({ key: textureKey, frame: startFrame + i })
      }

      const walkAnim = scene.anims.create({
        key: walkKey,
        frames,
        frameRate: 8,
        repeat: -1,
      })
      if (walkAnim) animationsCreated++
    }
  })

  if (IS_DEV) {
    console.log(`[CharacterSprite] Created ${animationsCreated} animations for: ${textureKey}`)
  }
  return true
}
