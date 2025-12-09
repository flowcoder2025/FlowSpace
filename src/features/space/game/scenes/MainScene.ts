/**
 * Main Game Scene
 * Handles map rendering, player movement, and camera
 */
import * as Phaser from "phaser"
import { MAP_CONFIG } from "../config"
import { eventBridge, GameEvents, type PlayerPosition } from "../events"
import {
  createCharacterAnimationsFromSpritesheet,
  getAnimationKey,
  CHARACTER_CONFIG,
} from "../sprites"
import {
  generateAllTileTextures,
  getRandomFloorKey,
  getRandomWallKey,
  getRandomAccentKey,
  TILE_CONFIG,
} from "../tiles"
import {
  InteractiveObject,
  createInteractiveObjects,
  type InteractiveObjectConfig,
} from "../objects"

// Development mode flag for debug logs
const IS_DEV = process.env.NODE_ENV === "development"

// Avatar color type - must match CHARACTER_CONFIG.COLORS keys
type AvatarColor = "default" | "red" | "green" | "purple" | "orange" | "pink" | "yellow" | "blue"

export class MainScene extends Phaser.Scene {
  private playerContainer!: Phaser.GameObjects.Container
  private playerSprite!: Phaser.GameObjects.Sprite
  private playerShadow!: Phaser.GameObjects.Ellipse
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  private spaceKey!: Phaser.Input.Keyboard.Key
  private interactKey!: Phaser.Input.Keyboard.Key
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private interactiveObjects: InteractiveObject[] = []
  private nearbyObject: InteractiveObject | null = null
  private remotePlayers: Map<string, Phaser.GameObjects.Container> = new Map()
  private remotePlayerSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()
  private remotePlayerShadows: Map<string, Phaser.GameObjects.Ellipse> = new Map()
  private remotePlayerNames: Map<string, Phaser.GameObjects.Text> = new Map()
  // Track failed remote player additions to prevent infinite retry loops
  private failedRemotePlayers: Map<string, { timestamp: number; retryCount: number }> = new Map()
  private readonly MAX_RETRY_COUNT = 3
  private readonly RETRY_COOLDOWN_MS = 5000
  private playerDirection: "up" | "down" | "left" | "right" = "down"
  private isMoving = false
  private isJumping = false
  private jumpCooldown = false
  private playerId: string = ""
  private playerNickname: string = ""
  private playerAvatarColor: AvatarColor = "default"
  private nicknameText!: Phaser.GameObjects.Text
  private isSceneActive = false

  // Queue for pending remote player events (received before scene is ready)
  private pendingRemotePlayerEvents: Array<{
    type: "join" | "update" | "leave"
    data: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string }
  }> = []

  // Event handler references for cleanup
  private handleRemotePlayerUpdate!: (data: unknown) => void
  private handleRemotePlayerJoin!: (data: unknown) => void
  private handleRemotePlayerLeave!: (data: unknown) => void
  private handleRemotePlayerJump!: (data: unknown) => void

  // Jump configuration
  private readonly JUMP_HEIGHT = 20
  private readonly JUMP_DURATION = 400
  private readonly JUMP_COOLDOWN = 100

  constructor() {
    super({ key: "MainScene" })
  }

  init(data: { playerId: string; nickname: string; avatarColor?: AvatarColor }) {
    this.playerId = data.playerId || "local-player"
    this.playerNickname = data.nickname || "Player"
    this.playerAvatarColor = data.avatarColor || "default"
  }

  preload() {
    // Generate tile textures (procedural, can be done in preload)
    generateAllTileTextures(this)

    // Load character sprite sheets from static PNG files
    // This ensures consistent behavior across development and production environments
    const colors: AvatarColor[] = ["default", "red", "green", "purple", "orange", "pink", "yellow", "blue"]
    colors.forEach((color) => {
      const textureKey = `character-${color}`
      if (!this.textures.exists(textureKey)) {
        this.load.spritesheet(textureKey, `/assets/game/sprites/character-${color}.png`, {
          frameWidth: CHARACTER_CONFIG.WIDTH,
          frameHeight: CHARACTER_CONFIG.HEIGHT,
        })
      }
    })
  }

  create() {
    // Character textures are loaded from static PNG files in preload()
    // Now create animations for all loaded sprite sheets
    const colors: AvatarColor[] = ["default", "red", "green", "purple", "orange", "pink", "yellow", "blue"]

    colors.forEach((color) => {
      const textureKey = `character-${color}`

      // Verify texture was loaded successfully
      if (!this.textures.exists(textureKey)) {
        console.error(`[MainScene] Character texture not loaded: ${textureKey}`)
        return
      }

      // Create animations using spritesheet frame indices
      // Spritesheet layout: 4 frames per row, 4 rows (down, left, right, up)
      createCharacterAnimationsFromSpritesheet(this, textureKey, color)
    })

    // Create procedural tilemap
    this.createMap()

    // Create interactive objects
    this.createInteractiveObjects()

    // Create player
    this.createPlayer()

    // Setup input
    this.setupInput()

    // Setup camera
    this.setupCamera()

    // Mark scene as active
    this.isSceneActive = true

    // Listen for remote player events
    this.setupMultiplayerEvents()

    // Process any remote player events that arrived before scene was ready
    this.processPendingRemotePlayerEvents()

    // Emit game ready event after a frame delay to ensure Phaser scene is fully active
    // This prevents race conditions where GAME_READY is emitted before the scene can handle events
    this.time.delayedCall(0, () => {
      if (IS_DEV) {
        console.log("[MainScene] Emitting GAME_READY after scene is fully active")
      }
      eventBridge.emit(GameEvents.GAME_READY)
    })
  }

  private createMap() {
    const { MAP_WIDTH, MAP_HEIGHT } = MAP_CONFIG
    const TILE_SIZE = TILE_CONFIG.SIZE

    // Store tile texture assignments for consistent floor rendering
    const floorTileMap: string[][] = []
    for (let y = 0; y < MAP_HEIGHT; y++) {
      floorTileMap[y] = []
      for (let x = 0; x < MAP_WIDTH; x++) {
        floorTileMap[y][x] = getRandomFloorKey()
      }
    }

    // Create floor tiles using generated textures
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileX = x * TILE_SIZE + TILE_SIZE / 2
        const tileY = y * TILE_SIZE + TILE_SIZE / 2

        // Use procedurally generated floor texture
        this.add.image(tileX, tileY, floorTileMap[y][x]).setOrigin(0.5).setDepth(-2)
      }
    }

    // Create walls (boundary and some interior)
    this.walls = this.physics.add.staticGroup()

    // Boundary walls
    for (let x = 0; x < MAP_WIDTH; x++) {
      this.createWall(x, 0)
      this.createWall(x, MAP_HEIGHT - 1)
    }
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      this.createWall(0, y)
      this.createWall(MAP_WIDTH - 1, y)
    }

    // Interior walls (enhanced room layout)
    // Vertical wall with door gap
    for (let y = 3; y < 8; y++) {
      if (y !== 5) { // Door gap at y=5
        this.createWall(10, y)
      }
    }

    // Horizontal wall with door gap
    for (let x = 15; x < 22; x++) {
      if (x !== 18) { // Door gap at x=18
        this.createWall(x, 12)
      }
    }

    // Small meeting room walls
    for (let x = 24; x < 28; x++) {
      this.createWall(x, 5)
    }
    for (let y = 5; y < 10; y++) {
      if (y !== 7) { // Door gap
        this.createWall(24, y)
      }
    }

    // Add decorative elements
    // Accent tiles (entry points and special areas)
    this.createAccentTile(5, 5, 0) // Diamond accent
    this.createAccentTile(15, 8, 1) // Circle accent
    this.createAccentTile(25, 15, 2) // Corner accent

    // Spawn point indicator at center
    this.createSpawnPoint(Math.floor(MAP_WIDTH / 2), Math.floor(MAP_HEIGHT / 2))

    // Carpet areas
    this.createCarpetArea(3, 10, 4, 3) // Reception area
    this.createCarpetArea(25, 6, 2, 3) // Meeting room

    // Plants/decorations
    this.createPlant(2, 2)
    this.createPlant(MAP_WIDTH - 3, 2)
    this.createPlant(2, MAP_HEIGHT - 3)
    this.createPlant(MAP_WIDTH - 3, MAP_HEIGHT - 3)
    this.createPlant(12, 5)
    this.createPlant(26, 8)
  }

  private createWall(tileX: number, tileY: number) {
    const TILE_SIZE = TILE_CONFIG.SIZE
    const x = tileX * TILE_SIZE + TILE_SIZE / 2
    const y = tileY * TILE_SIZE + TILE_SIZE / 2

    // Use procedurally generated wall texture
    const wallKey = getRandomWallKey()
    this.add.image(x, y, wallKey).setOrigin(0.5).setDepth(-1)

    // Create invisible physics body
    const wall = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x000000, 0)
    this.physics.add.existing(wall, true)
    this.walls.add(wall)
  }

  private createAccentTile(tileX: number, tileY: number, variant: number = 0) {
    const TILE_SIZE = TILE_CONFIG.SIZE
    const x = tileX * TILE_SIZE + TILE_SIZE / 2
    const y = tileY * TILE_SIZE + TILE_SIZE / 2

    // Use procedurally generated accent texture
    const accentKey = `tile-accent-${variant % 3}`
    this.add.image(x, y, accentKey).setOrigin(0.5).setDepth(-1)
  }

  private createSpawnPoint(tileX: number, tileY: number) {
    const TILE_SIZE = TILE_CONFIG.SIZE
    const x = tileX * TILE_SIZE + TILE_SIZE / 2
    const y = tileY * TILE_SIZE + TILE_SIZE / 2

    // Use spawn texture
    this.add.image(x, y, "tile-spawn").setOrigin(0.5).setDepth(-1)
  }

  private createCarpetArea(startX: number, startY: number, width: number, height: number) {
    const TILE_SIZE = TILE_CONFIG.SIZE

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const x = (startX + dx) * TILE_SIZE + TILE_SIZE / 2
        const y = (startY + dy) * TILE_SIZE + TILE_SIZE / 2

        this.add.image(x, y, "tile-carpet").setOrigin(0.5).setDepth(-1)
      }
    }
  }

  private createPlant(tileX: number, tileY: number) {
    const TILE_SIZE = TILE_CONFIG.SIZE
    const x = tileX * TILE_SIZE + TILE_SIZE / 2
    const y = tileY * TILE_SIZE + TILE_SIZE / 2

    // Use plant texture (decorative, no collision)
    this.add.image(x, y, "tile-plant").setOrigin(0.5).setDepth(-1)
  }

  private createInteractiveObjects() {
    const TILE_SIZE = TILE_CONFIG.SIZE

    // Define interactive objects for this map
    const objectConfigs: InteractiveObjectConfig[] = [
      // Info sign at entrance
      {
        id: "info-welcome",
        x: 5,
        y: 3,
        type: "info",
        label: "환영 메시지",
        data: { message: "FLOW 메타버스에 오신 것을 환영합니다!" },
      },
      // Portal to another area
      {
        id: "portal-meeting",
        x: 13,
        y: 5,
        type: "portal",
        label: "회의실 이동",
        data: { destination: "meeting-room" },
      },
      // NPC guide
      {
        id: "npc-guide",
        x: 8,
        y: 10,
        type: "npc",
        label: "가이드 대화",
        data: { name: "가이드 봇", dialogue: ["안녕하세요!", "도움이 필요하시면 말씀해주세요."] },
      },
      // Collectible item
      {
        id: "item-badge",
        x: 20,
        y: 8,
        type: "item",
        label: "배지 획득",
        data: { itemId: "welcome-badge", itemName: "환영 배지" },
      },
      // Door to meeting room
      {
        id: "door-meeting",
        x: 18,
        y: 12,
        type: "door",
        label: "문 열기",
        data: { locked: false, targetRoom: "meeting-room" },
      },
    ]

    // Create interactive objects
    this.interactiveObjects = createInteractiveObjects(this, objectConfigs, TILE_SIZE)
  }

  private checkObjectInteraction() {
    // Reset nearby object
    this.nearbyObject = null

    // Check proximity to each interactive object
    for (const obj of this.interactiveObjects) {
      if (obj.checkPlayerProximity(this.playerContainer.x, this.playerContainer.y)) {
        this.nearbyObject = obj
        break // Only one object can be interacted with at a time
      }
    }
  }

  private triggerInteraction() {
    if (!this.nearbyObject || !this.nearbyObject.canInteract()) {
      return
    }

    const interactionData = this.nearbyObject.getInteractionData()

    // Play feedback animation
    this.nearbyObject.playInteractionFeedback()

    // Emit interaction event to React
    eventBridge.emit(GameEvents.OBJECT_INTERACT, {
      playerId: this.playerId,
      object: interactionData,
    })
  }

  private createPlayer() {
    const { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } = MAP_CONFIG

    // Start in center of map
    const startX = (MAP_WIDTH / 2) * TILE_SIZE
    const startY = (MAP_HEIGHT / 2) * TILE_SIZE

    // Create player shadow (rendered below the player)
    this.playerShadow = this.add.ellipse(
      startX,
      startY + CHARACTER_CONFIG.HEIGHT / 2,
      CHARACTER_CONFIG.WIDTH - 4,
      8,
      0x000000,
      0.3
    )
    this.playerShadow.setDepth(0)

    // Create player sprite (local coords 0,0 inside container)
    const textureKey = `character-${this.playerAvatarColor}`
    this.playerSprite = this.add.sprite(0, 0, textureKey)
    this.playerSprite.setOrigin(0.5, 0.5)

    // Create container to hold sprite (physics applied to container)
    this.playerContainer = this.add.container(startX, startY, [this.playerSprite])
    // Note: Don't call setSize() on container - it affects physics body positioning
    this.playerContainer.setDepth(1)

    // Play initial idle animation
    const idleAnim = getAnimationKey("down", false, this.playerAvatarColor)
    if (this.anims.exists(idleAnim)) {
      this.playerSprite.play(idleAnim)
    }

    // Add physics to container (NOT sprite)
    this.physics.add.existing(this.playerContainer)
    const playerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body

    // Physics body size (slightly smaller than sprite for better collision feel)
    const bodyWidth = CHARACTER_CONFIG.WIDTH - 8
    const bodyHeight = CHARACTER_CONFIG.HEIGHT - 8
    playerBody.setSize(bodyWidth, bodyHeight)

    // Center the body on the container
    // Container origin is center, body default position is top-left of container
    // So we need to offset by half the body size to center it
    playerBody.setOffset(-bodyWidth / 2, -bodyHeight / 2)
    playerBody.setCollideWorldBounds(true)

    // Add collision with walls
    this.physics.add.collider(this.playerContainer, this.walls)

    // Add nickname text above player
    this.nicknameText = this.add
      .text(startX, startY - CHARACTER_CONFIG.HEIGHT / 2 - 8, this.playerNickname, {
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#00000080",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(2)
  }

  private setupInput() {
    // Arrow keys
    this.cursors = this.input.keyboard!.createCursorKeys()

    // WASD keys
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    // Space key for jump
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // E key for interaction
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
  }

  private jump() {
    if (this.isJumping || this.jumpCooldown) return

    this.isJumping = true

    // Jump animation on SPRITE's local Y (independent from physics container)
    // Sprite starts at y=0 (local), jumps to y=-JUMP_HEIGHT, returns to y=0
    this.tweens.add({
      targets: this.playerSprite,
      y: -this.JUMP_HEIGHT,  // Local Y offset (relative to container)
      scaleX: 1.1,
      scaleY: 0.9,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      onComplete: () => {
        // Fall down animation
        this.tweens.add({
          targets: this.playerSprite,
          y: 0,  // Return to local origin
          scaleX: 1,
          scaleY: 1,
          duration: this.JUMP_DURATION / 2,
          ease: "Quad.easeIn",
          onComplete: () => {
            this.isJumping = false
            this.jumpCooldown = true

            // Landing effect - squash
            this.tweens.add({
              targets: this.playerSprite,
              scaleX: 1.15,
              scaleY: 0.85,
              duration: 50,
              yoyo: true,
              ease: "Quad.easeOut",
            })

            // Reset cooldown
            this.time.delayedCall(this.JUMP_COOLDOWN, () => {
              this.jumpCooldown = false
            })
          },
        })
      },
    })

    // Shadow animation (shrink while jumping)
    this.tweens.add({
      targets: this.playerShadow,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0.15,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      yoyo: true,
    })

    // Emit jump event for multiplayer sync
    eventBridge.emit(GameEvents.PLAYER_JUMPED, {
      id: this.playerId,
      x: this.playerContainer.x,
      y: this.playerContainer.y,
    })
  }

  private setupCamera() {
    const { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } = MAP_CONFIG

    // Set world bounds
    this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE)

    // Camera follows player container
    this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE)
    this.cameras.main.setZoom(1.5)
  }

  /**
   * Check if scene is truly active and can create game objects
   * This checks both our flag AND Phaser's internal displayList
   * (displayList becomes null when scene is destroyed, but this.add object still exists)
   */
  private isSceneTrulyActive(): boolean {
    return this.isSceneActive && !!this.sys?.displayList
  }

  private setupMultiplayerEvents() {
    // Store handler references for cleanup
    this.handleRemotePlayerUpdate = (data: unknown) => {
      const position = data as PlayerPosition & { avatarColor?: AvatarColor; nickname?: string }
      // Queue event if scene is not ready yet or being destroyed
      if (!this.isSceneTrulyActive()) {
        // Only queue if scene is still initializing (not shutting down)
        if (this.isSceneActive && !this.sys?.displayList) {
          // Scene is shutting down, ignore the event
          return
        }
        this.pendingRemotePlayerEvents.push({ type: "update", data: position })
        return
      }
      this.updateRemotePlayer(position)
    }

    this.handleRemotePlayerJoin = (data: unknown) => {
      const position = data as PlayerPosition & { avatarColor?: AvatarColor; nickname?: string }
      // Queue event if scene is not ready yet or being destroyed
      if (!this.isSceneTrulyActive()) {
        // Only queue if scene is still initializing (not shutting down)
        if (this.isSceneActive && !this.sys?.displayList) {
          // Scene is shutting down, ignore the event
          return
        }
        this.pendingRemotePlayerEvents.push({ type: "join", data: position })
        return
      }
      this.addRemotePlayer(position)
    }

    this.handleRemotePlayerLeave = (data: unknown) => {
      const { id } = data as { id: string }
      // Queue event if scene is not ready yet or being destroyed
      if (!this.isSceneTrulyActive()) {
        // Only queue if scene is still initializing (not shutting down)
        if (this.isSceneActive && !this.sys?.displayList) {
          // Scene is shutting down, ignore the event
          return
        }
        this.pendingRemotePlayerEvents.push({ type: "leave", data: { id } as PlayerPosition })
        return
      }
      this.removeRemotePlayer(id)
    }

    this.handleRemotePlayerJump = (data: unknown) => {
      const { id } = data as { id: string; x: number; y: number }
      // Skip if scene is not ready or being destroyed
      if (!this.isSceneTrulyActive()) return
      this.playRemotePlayerJump(id)
    }

    // Listen for remote player events
    eventBridge.on(GameEvents.REMOTE_PLAYER_UPDATE, this.handleRemotePlayerUpdate)
    eventBridge.on(GameEvents.REMOTE_PLAYER_JOIN, this.handleRemotePlayerJoin)
    eventBridge.on(GameEvents.REMOTE_PLAYER_LEAVE, this.handleRemotePlayerLeave)
    eventBridge.on(GameEvents.REMOTE_PLAYER_JUMPED, this.handleRemotePlayerJump)
  }

  private processPendingRemotePlayerEvents() {
    // Process all pending events now that scene is ready
    while (this.pendingRemotePlayerEvents.length > 0) {
      const event = this.pendingRemotePlayerEvents.shift()
      if (!event) continue

      switch (event.type) {
        case "join":
          this.addRemotePlayer(event.data)
          break
        case "update":
          this.updateRemotePlayer(event.data)
          break
        case "leave":
          this.removeRemotePlayer(event.data.id)
          break
      }
    }
  }

  private addRemotePlayer(position: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string }): boolean {
    // Safety check - verify scene is truly active (including Phaser's internal displayList)
    // This prevents TypeError when React Strict Mode destroys the first Phaser instance
    if (!this.isSceneTrulyActive()) {
      // Silently ignore if scene is shutting down (React Strict Mode can cause this)
      return false
    }
    if (this.remotePlayers.has(position.id)) {
      return true // Already exists, considered success
    }

    // Check if this player failed recently and is in cooldown
    const failedEntry = this.failedRemotePlayers.get(position.id)
    if (failedEntry) {
      const timeSinceFailure = Date.now() - failedEntry.timestamp
      if (failedEntry.retryCount >= this.MAX_RETRY_COUNT) {
        // Max retries exceeded, only retry after full cooldown
        if (timeSinceFailure < this.RETRY_COOLDOWN_MS) {
          return false // Still in cooldown, skip silently
        }
        // Cooldown passed, reset and allow retry
        this.failedRemotePlayers.delete(position.id)
      }
    }

    if (IS_DEV) {
      console.log(`[MainScene] Adding remote player: ${position.id}, nickname: ${position.nickname}`)
    }

    try {
      const avatarColor = position.avatarColor || "default"
      const textureKey = `character-${avatarColor}`

      // Create shadow (at ground level below container)
      const shadow = this.add.ellipse(
        position.x,
        position.y + CHARACTER_CONFIG.HEIGHT / 2,
        CHARACTER_CONFIG.WIDTH - 4,
        8,
        0x000000,
        0.3
      )
      shadow.setDepth(0)
      this.remotePlayerShadows.set(position.id, shadow)

      // Create sprite at local origin (0, 0) - will be placed inside container
      const sprite = this.add.sprite(0, 0, textureKey)
      sprite.setOrigin(0.5, 0.5)

      // Create container to hold sprite (position tween applied to container)
      const container = this.add.container(position.x, position.y, [sprite])
      container.setDepth(1)
      this.remotePlayers.set(position.id, container)
      this.remotePlayerSprites.set(position.id, sprite)

      // Play idle animation
      const idleAnim = getAnimationKey(position.direction || "down", false, avatarColor)
      if (this.anims?.exists(idleAnim)) {
        sprite.play(idleAnim)
      }

      // Create nickname text
      if (position.nickname) {
        const nameText = this.add
          .text(position.x, position.y - CHARACTER_CONFIG.HEIGHT / 2 - 8, position.nickname, {
            fontSize: "12px",
            color: "#ffffff",
            backgroundColor: "#00000080",
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5, 1)
          .setDepth(2)
        this.remotePlayerNames.set(position.id, nameText)
      }

      // Success - remove from failed list if present
      this.failedRemotePlayers.delete(position.id)
      if (IS_DEV) {
        console.log(`[MainScene] Remote player added: ${position.id}`)
      }
      return true
    } catch (error) {
      // Track this failure to prevent infinite retry loop
      const existing = this.failedRemotePlayers.get(position.id)
      const retryCount = existing ? existing.retryCount + 1 : 1
      this.failedRemotePlayers.set(position.id, {
        timestamp: Date.now(),
        retryCount,
      })

      // Scene might have been destroyed during execution - silently ignore
      // Only log if scene is still truly active (real error vs React Strict Mode cleanup)
      if (this.isSceneTrulyActive()) {
        console.warn(`[MainScene] Failed to add remote player (attempt ${retryCount}/${this.MAX_RETRY_COUNT}):`, error)
      }
      return false
    }
  }

  private updateRemotePlayer(position: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string }) {
    // Safety check - silently ignore if scene is not truly active (React Strict Mode cleanup)
    if (!this.isSceneTrulyActive()) {
      return
    }

    try {
      let container = this.remotePlayers.get(position.id)
      if (!container) {
        // Try to add the player - if it fails, skip this update entirely
        const success = this.addRemotePlayer(position)
        if (!success) {
          return // Player addition failed or in cooldown, skip update
        }
        container = this.remotePlayers.get(position.id)
        if (!container) {
          return // Still no container after add attempt, skip
        }
      }

      if (container && this.tweens) {
        // Smooth position interpolation on container (independent from sprite's local Y for jump)
        this.tweens.add({
          targets: container,
          x: position.x,
          y: position.y,
          duration: 100,
          ease: "Linear",
        })

        // Update shadow position
        const shadow = this.remotePlayerShadows.get(position.id)
        if (shadow) {
          this.tweens.add({
            targets: shadow,
            x: position.x,
            y: position.y + CHARACTER_CONFIG.HEIGHT / 2,
            duration: 100,
            ease: "Linear",
          })
        }

        // Update nickname position (account for sprite's local Y offset during jump)
        const sprite = this.remotePlayerSprites.get(position.id)
        const spriteYOffset = sprite ? sprite.y : 0
        const nameText = this.remotePlayerNames.get(position.id)
        if (nameText) {
          this.tweens.add({
            targets: nameText,
            x: position.x,
            y: position.y + spriteYOffset - CHARACTER_CONFIG.HEIGHT / 2 - 8,
            duration: 100,
            ease: "Linear",
          })
        }

        // Update animation on sprite (not container)
        if (sprite && this.anims) {
          const avatarColor = position.avatarColor || "default"
          const animKey = getAnimationKey(position.direction, position.isMoving, avatarColor)
          if (this.anims.exists(animKey) && sprite.anims.currentAnim?.key !== animKey) {
            sprite.play(animKey)
          }
        }
      }
    } catch (error) {
      // Silently ignore errors during scene shutdown (React Strict Mode cleanup)
      if (this.isSceneTrulyActive()) {
        console.warn("[MainScene] Failed to update remote player:", error)
      }
    }
  }

  private playRemotePlayerJump(id: string) {
    const sprite = this.remotePlayerSprites.get(id)
    const shadow = this.remotePlayerShadows.get(id)

    if (!sprite) {
      if (IS_DEV) {
        console.log(`[MainScene] Remote player sprite not found for jump: ${id}`)
      }
      return
    }

    // Jump animation on SPRITE's local Y (independent from container position)
    // Same approach as local player - sprite starts at y=0, jumps to y=-JUMP_HEIGHT, returns to y=0
    this.tweens.add({
      targets: sprite,
      y: -this.JUMP_HEIGHT,  // Local Y offset (relative to container)
      scaleX: 1.1,
      scaleY: 0.9,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      onComplete: () => {
        // Fall down animation
        this.tweens.add({
          targets: sprite,
          y: 0,  // Return to local origin
          scaleX: 1,
          scaleY: 1,
          duration: this.JUMP_DURATION / 2,
          ease: "Quad.easeIn",
          onComplete: () => {
            // Landing squash effect
            this.tweens.add({
              targets: sprite,
              scaleX: 1.15,
              scaleY: 0.85,
              duration: 50,
              yoyo: true,
              ease: "Quad.easeOut",
            })
          },
        })
      },
    })

    // Shadow animation (shrink while jumping)
    if (shadow) {
      this.tweens.add({
        targets: shadow,
        scaleX: 0.6,
        scaleY: 0.6,
        alpha: 0.15,
        duration: this.JUMP_DURATION / 2,
        ease: "Quad.easeOut",
        yoyo: true,
      })
    }

    if (IS_DEV) {
      console.log(`[MainScene] Remote player jumped: ${id}`)
    }
  }

  private removeRemotePlayer(id: string) {
    // Destroy container (also destroys contained sprite)
    const container = this.remotePlayers.get(id)
    if (container) {
      container.destroy()
      this.remotePlayers.delete(id)
    }

    // Remove sprite reference (sprite already destroyed with container)
    this.remotePlayerSprites.delete(id)

    const shadow = this.remotePlayerShadows.get(id)
    if (shadow) {
      shadow.destroy()
      this.remotePlayerShadows.delete(id)
    }

    const nameText = this.remotePlayerNames.get(id)
    if (nameText) {
      nameText.destroy()
      this.remotePlayerNames.delete(id)
    }

    // Clean up failed player tracking
    this.failedRemotePlayers.delete(id)
  }

  update() {
    const playerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body
    const { PLAYER_SPEED } = MAP_CONFIG

    // Reset velocity
    playerBody.setVelocity(0)

    let moved = false
    let newDirection = this.playerDirection

    // Horizontal movement
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      playerBody.setVelocityX(-PLAYER_SPEED)
      newDirection = "left"
      moved = true
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      playerBody.setVelocityX(PLAYER_SPEED)
      newDirection = "right"
      moved = true
    }

    // Vertical movement
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      playerBody.setVelocityY(-PLAYER_SPEED)
      newDirection = "up"
      moved = true
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      playerBody.setVelocityY(PLAYER_SPEED)
      newDirection = "down"
      moved = true
    }

    // Jump input (Space key)
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.jump()
    }

    // Interaction input (E key)
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.triggerInteraction()
    }

    // Check for nearby interactive objects
    this.checkObjectInteraction()

    // Normalize diagonal movement
    if (playerBody.velocity.x !== 0 && playerBody.velocity.y !== 0) {
      playerBody.velocity.normalize().scale(PLAYER_SPEED)
    }

    // Update animation based on direction and movement
    const animKey = getAnimationKey(newDirection, moved, this.playerAvatarColor)
    if (this.anims.exists(animKey) && this.playerSprite.anims.currentAnim?.key !== animKey) {
      this.playerSprite.play(animKey)
    }

    // Update shadow position (follows container horizontally, stays at ground level)
    const groundY = this.playerContainer.y + CHARACTER_CONFIG.HEIGHT / 2
    this.playerShadow.setPosition(this.playerContainer.x, groundY)

    // Update nickname text position (follows container, accounts for sprite's local Y offset during jump)
    const spriteJumpOffset = this.playerSprite.y // Sprite's local Y (negative during jump)
    this.nicknameText.setPosition(
      this.playerContainer.x,
      this.playerContainer.y + spriteJumpOffset - CHARACTER_CONFIG.HEIGHT / 2 - 8
    )

    // Emit position update if moved or direction changed
    if (moved || this.isMoving !== moved || this.playerDirection !== newDirection) {
      this.isMoving = moved
      this.playerDirection = newDirection

      const position: PlayerPosition = {
        id: this.playerId,
        x: this.playerContainer.x,
        y: this.playerContainer.y,
        direction: this.playerDirection,
        isMoving: this.isMoving,
      }

      eventBridge.emit(GameEvents.PLAYER_MOVED, position)
    }
  }

  shutdown() {
    // Mark scene as inactive first to prevent any pending events from being processed
    this.isSceneActive = false

    // Clean up event listeners using stored references
    if (this.handleRemotePlayerUpdate) {
      eventBridge.off(GameEvents.REMOTE_PLAYER_UPDATE, this.handleRemotePlayerUpdate)
    }
    if (this.handleRemotePlayerJoin) {
      eventBridge.off(GameEvents.REMOTE_PLAYER_JOIN, this.handleRemotePlayerJoin)
    }
    if (this.handleRemotePlayerLeave) {
      eventBridge.off(GameEvents.REMOTE_PLAYER_LEAVE, this.handleRemotePlayerLeave)
    }
    if (this.handleRemotePlayerJump) {
      eventBridge.off(GameEvents.REMOTE_PLAYER_JUMPED, this.handleRemotePlayerJump)
    }

    // Clean up remote players (containers destroy their children including sprites)
    this.remotePlayers.forEach((container) => container.destroy())
    this.remotePlayers.clear()
    this.remotePlayerSprites.clear() // Sprites already destroyed with containers
    this.remotePlayerShadows.forEach((shadow) => shadow.destroy())
    this.remotePlayerShadows.clear()
    this.remotePlayerNames.forEach((name) => name.destroy())
    this.remotePlayerNames.clear()
    this.failedRemotePlayers.clear() // Clear failed player tracking
  }
}
