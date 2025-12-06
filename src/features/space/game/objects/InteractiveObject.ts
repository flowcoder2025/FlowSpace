/**
 * Interactive Object System
 * Objects that players can interact with (E key)
 */
import Phaser from "phaser"

// Interaction types
export type InteractionType = "info" | "portal" | "npc" | "item" | "door"

// Interactive object configuration
export interface InteractiveObjectConfig {
  id: string
  x: number // tile coordinates
  y: number // tile coordinates
  type: InteractionType
  label: string // Interaction prompt label
  data?: Record<string, unknown> // Custom data for the interaction
}

// Object visual configuration
export const OBJECT_CONFIG = {
  INTERACTION_RADIUS: 48, // pixels
  PROMPT_OFFSET_Y: -40,
  COLORS: {
    info: { base: 0x3498db, glow: 0x5dade2 }, // Blue
    portal: { base: 0x9b59b6, glow: 0xbb8fce }, // Purple
    npc: { base: 0xe67e22, glow: 0xf39c12 }, // Orange
    item: { base: 0x27ae60, glow: 0x58d68d }, // Green
    door: { base: 0x95a5a6, glow: 0xbdc3c7 }, // Gray
  },
}

/**
 * Interactive Object class
 * Represents an object that players can interact with
 */
export class InteractiveObject extends Phaser.GameObjects.Container {
  public readonly objectId: string
  public readonly interactionType: InteractionType
  public readonly label: string
  public readonly customData: Record<string, unknown>

  private baseSprite!: Phaser.GameObjects.Graphics
  private glowSprite!: Phaser.GameObjects.Graphics
  private promptText!: Phaser.GameObjects.Text
  private interactionZone!: Phaser.GameObjects.Zone
  private isPlayerNearby = false
  private glowTween?: Phaser.Tweens.Tween

  constructor(
    scene: Phaser.Scene,
    config: InteractiveObjectConfig,
    tileSize: number
  ) {
    const pixelX = config.x * tileSize + tileSize / 2
    const pixelY = config.y * tileSize + tileSize / 2

    super(scene, pixelX, pixelY)

    this.objectId = config.id
    this.interactionType = config.type
    this.label = config.label
    this.customData = config.data || {}

    this.createVisuals(tileSize)
    this.createInteractionZone(tileSize)
    this.createPrompt()

    scene.add.existing(this)
    this.setDepth(0.5) // Between floor and player
  }

  private createVisuals(tileSize: number) {
    const colors = OBJECT_CONFIG.COLORS[this.interactionType]
    const size = tileSize - 8

    // Create glow effect (rendered first, behind base)
    this.glowSprite = this.scene.add.graphics()
    this.drawObjectShape(this.glowSprite, colors.glow, size + 6, 0.3)
    this.add(this.glowSprite)

    // Create base sprite
    this.baseSprite = this.scene.add.graphics()
    this.drawObjectShape(this.baseSprite, colors.base, size, 1)
    this.add(this.baseSprite)
  }

  private drawObjectShape(
    graphics: Phaser.GameObjects.Graphics,
    color: number,
    size: number,
    alpha: number
  ) {
    graphics.clear()

    switch (this.interactionType) {
      case "info":
        // Info sign - rounded rectangle with "i"
        graphics.fillStyle(color, alpha)
        graphics.fillRoundedRect(-size / 2, -size / 2, size, size, 4)
        if (alpha === 1) {
          graphics.fillStyle(0xffffff, 1)
          graphics.fillCircle(0, -size / 4, 3)
          graphics.fillRect(-2, -size / 8, 4, size / 2)
        }
        break

      case "portal":
        // Portal - swirling circle
        graphics.fillStyle(color, alpha)
        graphics.fillCircle(0, 0, size / 2)
        if (alpha === 1) {
          graphics.lineStyle(2, 0xffffff, 0.6)
          graphics.strokeCircle(0, 0, size / 3)
          graphics.strokeCircle(0, 0, size / 5)
        }
        break

      case "npc":
        // NPC - simple humanoid shape
        graphics.fillStyle(color, alpha)
        // Head
        graphics.fillCircle(0, -size / 3, size / 4)
        // Body
        graphics.fillRoundedRect(-size / 3, -size / 6, (size * 2) / 3, size / 2, 4)
        break

      case "item":
        // Item - star/diamond shape
        graphics.fillStyle(color, alpha)
        const points = []
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 === 0 ? size / 2 : size / 4
          const angle = (i * Math.PI) / 4 - Math.PI / 2
          points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          })
        }
        graphics.beginPath()
        graphics.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          graphics.lineTo(points[i].x, points[i].y)
        }
        graphics.closePath()
        graphics.fill()
        break

      case "door":
        // Door - rectangle with handle
        graphics.fillStyle(color, alpha)
        graphics.fillRoundedRect(-size / 3, -size / 2, (size * 2) / 3, size, 2)
        if (alpha === 1) {
          graphics.fillStyle(0x333333, 1)
          graphics.fillCircle(size / 6, 0, 3)
        }
        break
    }
  }

  private createInteractionZone(tileSize: number) {
    // Create invisible zone for collision detection
    this.interactionZone = this.scene.add.zone(0, 0, tileSize, tileSize)
    this.scene.physics.add.existing(this.interactionZone, true)
    this.add(this.interactionZone)
  }

  private createPrompt() {
    // Create interaction prompt (hidden by default)
    this.promptText = this.scene.add.text(
      0,
      OBJECT_CONFIG.PROMPT_OFFSET_Y,
      `[E] ${this.label}`,
      {
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 6, y: 4 },
      }
    )
    this.promptText.setOrigin(0.5, 1)
    this.promptText.setVisible(false)
    this.add(this.promptText)
  }

  /**
   * Check if player is within interaction range
   */
  public checkPlayerProximity(playerX: number, playerY: number): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY)
    const wasNearby = this.isPlayerNearby
    this.isPlayerNearby = distance <= OBJECT_CONFIG.INTERACTION_RADIUS

    // Show/hide prompt based on proximity
    if (this.isPlayerNearby && !wasNearby) {
      this.showPrompt()
    } else if (!this.isPlayerNearby && wasNearby) {
      this.hidePrompt()
    }

    return this.isPlayerNearby
  }

  /**
   * Show interaction prompt with animation
   */
  private showPrompt() {
    this.promptText.setVisible(true)
    this.promptText.setAlpha(0)
    this.promptText.setScale(0.8)

    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 1,
      scale: 1,
      duration: 150,
      ease: "Back.easeOut",
    })

    // Start glow animation
    this.startGlowAnimation()
  }

  /**
   * Hide interaction prompt
   */
  private hidePrompt() {
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 0,
      scale: 0.8,
      duration: 100,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.promptText.setVisible(false)
      },
    })

    // Stop glow animation
    this.stopGlowAnimation()
  }

  /**
   * Start pulsing glow animation
   */
  private startGlowAnimation() {
    if (this.glowTween) return

    this.glowTween = this.scene.tweens.add({
      targets: this.glowSprite,
      alpha: { from: 0.3, to: 0.7 },
      scale: { from: 1, to: 1.1 },
      duration: 600,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    })
  }

  /**
   * Stop glow animation
   */
  private stopGlowAnimation() {
    if (this.glowTween) {
      this.glowTween.stop()
      this.glowTween = undefined
    }

    this.glowSprite.setAlpha(0.3)
    this.glowSprite.setScale(1)
  }

  /**
   * Check if player can currently interact
   */
  public canInteract(): boolean {
    return this.isPlayerNearby
  }

  /**
   * Get interaction data
   */
  public getInteractionData(): {
    id: string
    type: InteractionType
    label: string
    data: Record<string, unknown>
  } {
    return {
      id: this.objectId,
      type: this.interactionType,
      label: this.label,
      data: this.customData,
    }
  }

  /**
   * Play interaction feedback animation
   */
  public playInteractionFeedback() {
    // Scale bounce effect
    this.scene.tweens.add({
      targets: this.baseSprite,
      scale: { from: 1, to: 1.2 },
      duration: 100,
      yoyo: true,
      ease: "Quad.easeOut",
    })

    // Flash effect
    const colors = OBJECT_CONFIG.COLORS[this.interactionType]
    this.scene.tweens.add({
      targets: this.glowSprite,
      alpha: 1,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        if (this.isPlayerNearby) {
          this.startGlowAnimation()
        }
      },
    })
  }

  /**
   * Clean up resources
   */
  public destroy(fromScene?: boolean) {
    this.stopGlowAnimation()
    super.destroy(fromScene)
  }
}

/**
 * Factory function to create interactive objects from config
 */
export function createInteractiveObjects(
  scene: Phaser.Scene,
  configs: InteractiveObjectConfig[],
  tileSize: number
): InteractiveObject[] {
  return configs.map((config) => new InteractiveObject(scene, config, tileSize))
}
