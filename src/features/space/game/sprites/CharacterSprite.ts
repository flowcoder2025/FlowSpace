/**
 * Procedural Character Sprite Generator
 * Creates pixel-art style character sprites programmatically
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
    default: { body: 0x00cec9, outline: 0x00a8a8 },
    red: { body: 0xe74c3c, outline: 0xc0392b },
    green: { body: 0x2ecc71, outline: 0x27ae60 },
    purple: { body: 0x9b59b6, outline: 0x8e44ad },
    orange: { body: 0xe67e22, outline: 0xd35400 },
    pink: { body: 0xfd79a8, outline: 0xe84393 },
    yellow: { body: 0xfdcb6e, outline: 0xf39c12 },
    blue: { body: 0x3498db, outline: 0x2980b9 },
  } as Record<string, { body: number; outline: number }>,
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
 * Generate character sprite sheet texture and add frames immediately
 * This function both creates the texture AND adds the frame data
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
    // Create graphics for drawing
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false)

    // Draw frames for each direction
    const directions = ["down", "left", "right", "up"]
    directions.forEach((direction, dirIndex) => {
      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        const x = frame * WIDTH
        const y = dirIndex * HEIGHT
        drawCharacterFrame(graphics, x, y, color, direction, frame)
      }
    })

    // Generate texture from graphics
    graphics.generateTexture(textureKey, sheetWidth, sheetHeight)
    graphics.destroy()

    // Verify texture was created
    if (!scene.textures.exists(textureKey)) {
      console.error(`[CharacterSprite] Failed to generate texture: ${textureKey}`)
      return false
    }

    // Get the texture and add frame data immediately
    const texture = scene.textures.get(textureKey)

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
      console.log(`[CharacterSprite] Generated texture with frames: ${textureKey}`)
    }
    return true
  } catch (error) {
    console.error(`[CharacterSprite] Error generating texture ${textureKey}:`, error)
    return false
  }
}

/**
 * Draw a single character frame
 */
function drawCharacterFrame(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: { body: number; outline: number },
  direction: string,
  frame: number
): void {
  const { WIDTH, HEIGHT } = CHARACTER_CONFIG

  // Animation offset for walk cycle
  const walkOffset = frame % 2 === 1 ? 1 : 0
  const altWalk = frame === 1 || frame === 3

  // Clear area
  graphics.fillStyle(0x000000, 0)
  graphics.fillRect(x, y, WIDTH, HEIGHT)

  // Head (circle)
  const headX = x + WIDTH / 2
  const headY = y + 8
  const headRadius = 6

  // Body position with walk animation
  const bodyY = y + 14 + walkOffset

  // Draw outline/shadow first
  graphics.fillStyle(color.outline)

  // Head shadow
  graphics.fillCircle(headX, headY + 1, headRadius)

  // Body shadow (torso)
  graphics.fillRoundedRect(x + 4, bodyY + 1, WIDTH - 8, 12, 3)

  // Draw main body
  graphics.fillStyle(color.body)

  // Head
  graphics.fillCircle(headX, headY, headRadius)

  // Body (torso)
  graphics.fillRoundedRect(x + 5, bodyY, WIDTH - 10, 11, 2)

  // Legs with walk animation
  const legWidth = 5
  const legHeight = 8
  const legY = y + HEIGHT - legHeight - 2

  if (direction === "left" || direction === "right") {
    // Side view - legs animate differently
    const legOffset = altWalk ? 2 : -2
    graphics.fillStyle(color.outline)
    graphics.fillRoundedRect(x + 7, legY + legOffset, legWidth, legHeight, 1)
    graphics.fillRoundedRect(x + 12, legY - legOffset, legWidth, legHeight, 1)
  } else {
    // Front/back view
    const leftLegOffset = altWalk ? 1 : -1
    const rightLegOffset = altWalk ? -1 : 1

    graphics.fillStyle(color.outline)
    graphics.fillRoundedRect(x + 6, legY + leftLegOffset, legWidth, legHeight, 1)
    graphics.fillRoundedRect(x + 13, legY + rightLegOffset, legWidth, legHeight, 1)
  }

  // Eyes based on direction
  graphics.fillStyle(0xffffff)
  const eyeY = headY - 1

  if (direction === "down") {
    // Front facing - two eyes
    graphics.fillCircle(headX - 2, eyeY, 1.5)
    graphics.fillCircle(headX + 2, eyeY, 1.5)
    // Pupils
    graphics.fillStyle(0x2d3436)
    graphics.fillCircle(headX - 2, eyeY + 0.5, 0.8)
    graphics.fillCircle(headX + 2, eyeY + 0.5, 0.8)
  } else if (direction === "up") {
    // Back facing - no eyes, maybe hair/back detail
    graphics.fillStyle(color.outline)
    graphics.fillCircle(headX, headY - 2, 2)
  } else if (direction === "left") {
    // Left facing - one eye on left
    graphics.fillCircle(headX - 3, eyeY, 1.5)
    graphics.fillStyle(0x2d3436)
    graphics.fillCircle(headX - 3.5, eyeY + 0.5, 0.8)
  } else if (direction === "right") {
    // Right facing - one eye on right
    graphics.fillCircle(headX + 3, eyeY, 1.5)
    graphics.fillStyle(0x2d3436)
    graphics.fillCircle(headX + 3.5, eyeY + 0.5, 0.8)
  }
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
