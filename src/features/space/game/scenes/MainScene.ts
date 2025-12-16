/**
 * Main Game Scene
 * Handles map rendering, player movement, and camera
 *
 * @version 2.0.0 - 고품질 타일맵 시스템 적용
 */
import * as Phaser from "phaser"
import { MAP_CONFIG } from "../config"
import {
  eventBridge,
  GameEvents,
  type PlayerPosition,
  type ChatFocusPayload,
} from "../events"
import {
  createCharacterAnimationsFromSpritesheet,
  getAnimationKey,
  CHARACTER_CONFIG,
} from "../sprites"
import { TileMapSystem } from "../tiles"
import {
  InteractiveObject,
  createInteractiveObjects,
  type InteractiveObjectConfig,
} from "../objects"

// Development mode flag for debug logs
const IS_DEV = process.env.NODE_ENV === "development"

// Avatar color type - must match CHARACTER_CONFIG.COLORS keys
type AvatarColor =
  | "default"
  | "red"
  | "green"
  | "purple"
  | "orange"
  | "pink"
  | "yellow"
  | "blue"

export class MainScene extends Phaser.Scene {
  // 타일맵 시스템
  private tileMapSystem!: TileMapSystem
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null

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
  private interactiveObjects: InteractiveObject[] = []
  private nearbyObject: InteractiveObject | null = null
  private remotePlayers: Map<string, Phaser.GameObjects.Container> = new Map()
  private remotePlayerSprites: Map<string, Phaser.GameObjects.Sprite> =
    new Map()
  private remotePlayerShadows: Map<string, Phaser.GameObjects.Ellipse> =
    new Map()
  private remotePlayerNames: Map<string, Phaser.GameObjects.Text> = new Map()
  // Track failed remote player additions to prevent infinite retry loops
  private failedRemotePlayers: Map<
    string,
    { timestamp: number; retryCount: number }
  > = new Map()
  private readonly MAX_RETRY_COUNT = 3
  private readonly RETRY_COOLDOWN_MS = 5000
  private playerDirection: "up" | "down" | "left" | "right" = "down"
  private isMoving = false
  private isJumping = false
  private jumpCooldown = false
  private isChatActive = false // 채팅 활성화 시 게임 입력 차단
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
  private handleLocalProfileUpdate!: (data: unknown) => void
  private handleRemoteProfileUpdate!: (data: unknown) => void
  private handleChatFocusChanged!: (data: unknown) => void

  // Jump configuration
  private readonly JUMP_HEIGHT = 20
  private readonly JUMP_DURATION = 400
  private readonly JUMP_COOLDOWN = 100

  constructor() {
    super({ key: "MainScene" })
  }

  init(data: {
    playerId: string
    nickname: string
    avatarColor?: AvatarColor
  }) {
    this.playerId = data.playerId || "local-player"
    this.playerNickname = data.nickname || "Player"
    this.playerAvatarColor = data.avatarColor || "default"

    // 타일맵 시스템 초기화
    this.tileMapSystem = new TileMapSystem(this)
  }

  preload() {
    // 타일셋 텍스처 생성 (새로운 시스템)
    this.tileMapSystem.generateTextures()

    // Add load error handler for debugging
    this.load.on("loaderror", (fileObj: Phaser.Loader.File) => {
      console.error(
        `[MainScene] Failed to load: ${fileObj.key} from ${fileObj.url}`
      )
    })

    // Load character sprite sheets from static PNG files
    const colors: AvatarColor[] = [
      "default",
      "red",
      "green",
      "purple",
      "orange",
      "pink",
      "yellow",
      "blue",
    ]
    colors.forEach((color) => {
      const textureKey = `character-${color}`
      this.load.spritesheet(
        textureKey,
        `/assets/game/sprites/character-${color}.png`,
        {
          frameWidth: CHARACTER_CONFIG.WIDTH,
          frameHeight: CHARACTER_CONFIG.HEIGHT,
        }
      )
    })

    // Log when loading completes
    this.load.on("complete", () => {
      console.log("[MainScene] All assets loaded successfully")
    })
  }

  create() {
    // Character animations setup
    const colors: AvatarColor[] = [
      "default",
      "red",
      "green",
      "purple",
      "orange",
      "pink",
      "yellow",
      "blue",
    ]

    colors.forEach((color) => {
      const textureKey = `character-${color}`
      if (!this.textures.exists(textureKey)) {
        console.error(`[MainScene] Character texture not loaded: ${textureKey}`)
        return
      }
      createCharacterAnimationsFromSpritesheet(this, textureKey, color)
    })

    // 새로운 타일맵 시스템으로 맵 생성
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

    // Emit game ready event
    this.time.delayedCall(0, () => {
      if (IS_DEV) {
        console.log("[MainScene] Emitting GAME_READY after scene is fully active")
      }
      eventBridge.emit(GameEvents.GAME_READY)
    })
  }

  private createMap() {
    // 타일맵 생성
    const tilemap = this.tileMapSystem.createTilemap()

    if (!tilemap) {
      console.error("[MainScene] Failed to create tilemap")
      return
    }

    // 충돌 레이어 설정
    this.collisionLayer = this.tileMapSystem.setupCollisions()

    if (IS_DEV) {
      console.log(
        "[MainScene] Tilemap created:",
        tilemap.width,
        "x",
        tilemap.height
      )
    }
  }

  private createInteractiveObjects() {
    const mapConfig = this.tileMapSystem.getMapConfig()
    const TILE_SIZE = mapConfig.TILE_SIZE

    // 상호작용 오브젝트 정의
    const objectConfigs: InteractiveObjectConfig[] = [
      // 로비 안내
      {
        id: "info-welcome",
        x: 8,
        y: 8,
        type: "info",
        label: "환영 메시지",
        data: { message: "FLOW 메타버스에 오신 것을 환영합니다!" },
      },
      // 회의실 입구
      {
        id: "portal-meeting",
        x: 34,
        y: 15,
        type: "portal",
        label: "회의실 이동",
        data: { destination: "meeting-room" },
      },
      // 휴게 공간 안내
      {
        id: "info-lounge",
        x: 26,
        y: 26,
        type: "info",
        label: "휴게 공간",
        data: { message: "편하게 쉬어가세요! ☕" },
      },
      // 화이트보드 (공지)
      {
        id: "whiteboard-notice",
        x: 44,
        y: 7,
        type: "info",
        label: "공지사항",
        data: { message: "오늘 회의: 14:00 전략 회의" },
      },
      // NPC 가이드
      {
        id: "npc-guide",
        x: 16,
        y: 18,
        type: "npc",
        label: "가이드",
        data: {
          name: "가이드 봇",
          dialogue: ["안녕하세요!", "도움이 필요하시면 말씀해주세요."],
        },
      },
    ]

    this.interactiveObjects = createInteractiveObjects(
      this,
      objectConfigs,
      TILE_SIZE
    )
  }

  private checkObjectInteraction() {
    this.nearbyObject = null

    for (const obj of this.interactiveObjects) {
      if (
        obj.checkPlayerProximity(
          this.playerContainer.x,
          this.playerContainer.y
        )
      ) {
        this.nearbyObject = obj
        break
      }
    }
  }

  private triggerInteraction() {
    if (!this.nearbyObject || !this.nearbyObject.canInteract()) {
      return
    }

    const interactionData = this.nearbyObject.getInteractionData()
    this.nearbyObject.playInteractionFeedback()

    eventBridge.emit(GameEvents.OBJECT_INTERACT, {
      playerId: this.playerId,
      object: interactionData,
    })
  }

  private createPlayer() {
    // 스폰 포인트에서 시작
    const spawnPoint = this.tileMapSystem.getDefaultSpawnPoint()
    const spawnPos = this.tileMapSystem.spawnToPixel(spawnPoint)

    const startX = spawnPos.x
    const startY = spawnPos.y

    // Create player shadow
    this.playerShadow = this.add.ellipse(
      startX,
      startY + CHARACTER_CONFIG.HEIGHT / 2,
      CHARACTER_CONFIG.WIDTH - 4,
      8,
      0x000000,
      0.3
    )
    this.playerShadow.setDepth(3)

    // Create player sprite
    const textureKey = `character-${this.playerAvatarColor}`

    if (IS_DEV) {
      const textureExists = this.textures.exists(textureKey)
      console.log(
        `[MainScene] Creating player sprite: key=${textureKey}, exists=${textureExists}`
      )
    }

    this.playerSprite = this.add.sprite(0, 0, textureKey)
    this.playerSprite.setOrigin(0.5, 0.5)

    // Create container
    this.playerContainer = this.add.container(startX, startY, [
      this.playerSprite,
    ])
    this.playerContainer.setDepth(5) // 가구 위, 장식 아래

    // Play initial idle animation
    const idleAnim = getAnimationKey("down", false, this.playerAvatarColor)
    if (this.anims.exists(idleAnim)) {
      this.playerSprite.play(idleAnim)
    }

    // Add physics to container
    this.physics.add.existing(this.playerContainer)
    const playerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body

    const bodyWidth = CHARACTER_CONFIG.WIDTH - 8
    const bodyHeight = CHARACTER_CONFIG.HEIGHT - 8
    playerBody.setSize(bodyWidth, bodyHeight)
    playerBody.setOffset(-bodyWidth / 2, -bodyHeight / 2)
    playerBody.setCollideWorldBounds(true)

    // 충돌 레이어와 충돌 설정
    if (this.collisionLayer) {
      this.physics.add.collider(this.playerContainer, this.collisionLayer)
    }

    // Add nickname text
    this.nicknameText = this.add
      .text(
        startX,
        startY - CHARACTER_CONFIG.HEIGHT / 2 - 8,
        this.playerNickname,
        {
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "#00000080",
          padding: { x: 4, y: 2 },
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(6)
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()

    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    )
  }

  private jump() {
    if (this.isJumping || this.jumpCooldown) return

    this.isJumping = true

    this.tweens.add({
      targets: this.playerSprite,
      y: -this.JUMP_HEIGHT,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.playerSprite,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: this.JUMP_DURATION / 2,
          ease: "Quad.easeIn",
          onComplete: () => {
            this.isJumping = false
            this.jumpCooldown = true

            this.tweens.add({
              targets: this.playerSprite,
              scaleX: 1.15,
              scaleY: 0.85,
              duration: 50,
              yoyo: true,
              ease: "Quad.easeOut",
            })

            this.time.delayedCall(this.JUMP_COOLDOWN, () => {
              this.jumpCooldown = false
            })
          },
        })
      },
    })

    this.tweens.add({
      targets: this.playerShadow,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0.15,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      yoyo: true,
    })

    eventBridge.emit(GameEvents.PLAYER_JUMPED, {
      id: this.playerId,
      x: this.playerContainer.x,
      y: this.playerContainer.y,
    })
  }

  private setupCamera() {
    const worldBounds = this.tileMapSystem.getWorldBounds()

    this.physics.world.setBounds(0, 0, worldBounds.width, worldBounds.height)

    this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, worldBounds.width, worldBounds.height)
    this.cameras.main.setZoom(1.2)
  }

  private isSceneTrulyActive(): boolean {
    return this.isSceneActive && !!this.sys?.displayList
  }

  private setupMultiplayerEvents() {
    this.handleRemotePlayerUpdate = (data: unknown) => {
      const position = data as PlayerPosition & {
        avatarColor?: AvatarColor
        nickname?: string
      }
      if (!this.isSceneTrulyActive()) {
        if (this.isSceneActive && !this.sys?.displayList) {
          return
        }
        this.pendingRemotePlayerEvents.push({ type: "update", data: position })
        return
      }
      this.updateRemotePlayer(position)
    }

    this.handleRemotePlayerJoin = (data: unknown) => {
      const position = data as PlayerPosition & {
        avatarColor?: AvatarColor
        nickname?: string
      }
      if (!this.isSceneTrulyActive()) {
        if (this.isSceneActive && !this.sys?.displayList) {
          return
        }
        this.pendingRemotePlayerEvents.push({ type: "join", data: position })
        return
      }
      this.addRemotePlayer(position)
    }

    this.handleRemotePlayerLeave = (data: unknown) => {
      const { id } = data as { id: string }
      if (!this.isSceneTrulyActive()) {
        if (this.isSceneActive && !this.sys?.displayList) {
          return
        }
        this.pendingRemotePlayerEvents.push({
          type: "leave",
          data: { id } as PlayerPosition,
        })
        return
      }
      this.removeRemotePlayer(id)
    }

    this.handleRemotePlayerJump = (data: unknown) => {
      const { id } = data as { id: string; x: number; y: number }
      if (!this.isSceneTrulyActive()) return
      this.playRemotePlayerJump(id)
    }

    this.handleLocalProfileUpdate = (data: unknown) => {
      const { nickname, avatarColor } = data as {
        nickname: string
        avatarColor: AvatarColor
      }
      if (!this.isSceneTrulyActive()) return
      this.updateLocalProfile(nickname, avatarColor)
    }

    this.handleRemoteProfileUpdate = (data: unknown) => {
      const { id, nickname, avatarColor } = data as {
        id: string
        nickname: string
        avatarColor: AvatarColor
      }
      if (!this.isSceneTrulyActive()) return
      this.updateRemoteProfile(id, nickname, avatarColor)
    }

    this.handleChatFocusChanged = (data: unknown) => {
      const { isActive } = data as ChatFocusPayload
      this.isChatActive = isActive
      if (IS_DEV) {
        console.log(
          `[MainScene] Chat focus changed: ${isActive ? "ACTIVE" : "INACTIVE"}`
        )
      }
    }

    eventBridge.on(GameEvents.REMOTE_PLAYER_UPDATE, this.handleRemotePlayerUpdate)
    eventBridge.on(GameEvents.REMOTE_PLAYER_JOIN, this.handleRemotePlayerJoin)
    eventBridge.on(GameEvents.REMOTE_PLAYER_LEAVE, this.handleRemotePlayerLeave)
    eventBridge.on(GameEvents.REMOTE_PLAYER_JUMPED, this.handleRemotePlayerJump)
    eventBridge.on(GameEvents.LOCAL_PROFILE_UPDATE, this.handleLocalProfileUpdate)
    eventBridge.on(GameEvents.REMOTE_PROFILE_UPDATE, this.handleRemoteProfileUpdate)
    eventBridge.on(GameEvents.CHAT_FOCUS_CHANGED, this.handleChatFocusChanged)
  }

  private processPendingRemotePlayerEvents() {
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

  private addRemotePlayer(
    position: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string }
  ): boolean {
    if (!this.isSceneTrulyActive()) {
      return false
    }
    if (this.remotePlayers.has(position.id)) {
      return true
    }

    const failedEntry = this.failedRemotePlayers.get(position.id)
    if (failedEntry) {
      const timeSinceFailure = Date.now() - failedEntry.timestamp
      if (failedEntry.retryCount >= this.MAX_RETRY_COUNT) {
        if (timeSinceFailure < this.RETRY_COOLDOWN_MS) {
          return false
        }
        this.failedRemotePlayers.delete(position.id)
      }
    }

    if (IS_DEV) {
      console.log(
        `[MainScene] Adding remote player: ${position.id}, nickname: ${position.nickname}`
      )
    }

    try {
      const avatarColor = position.avatarColor || "default"
      const textureKey = `character-${avatarColor}`

      const shadow = this.add.ellipse(
        position.x,
        position.y + CHARACTER_CONFIG.HEIGHT / 2,
        CHARACTER_CONFIG.WIDTH - 4,
        8,
        0x000000,
        0.3
      )
      shadow.setDepth(3)
      this.remotePlayerShadows.set(position.id, shadow)

      const sprite = this.add.sprite(0, 0, textureKey)
      sprite.setOrigin(0.5, 0.5)

      const container = this.add.container(position.x, position.y, [sprite])
      container.setDepth(5)
      this.remotePlayers.set(position.id, container)
      this.remotePlayerSprites.set(position.id, sprite)

      const idleAnim = getAnimationKey(
        position.direction || "down",
        false,
        avatarColor
      )
      if (this.anims?.exists(idleAnim)) {
        sprite.play(idleAnim)
      }

      if (position.nickname) {
        const nameText = this.add
          .text(
            position.x,
            position.y - CHARACTER_CONFIG.HEIGHT / 2 - 8,
            position.nickname,
            {
              fontSize: "12px",
              color: "#ffffff",
              backgroundColor: "#00000080",
              padding: { x: 4, y: 2 },
            }
          )
          .setOrigin(0.5, 1)
          .setDepth(6)
        this.remotePlayerNames.set(position.id, nameText)
      }

      this.failedRemotePlayers.delete(position.id)
      if (IS_DEV) {
        console.log(`[MainScene] Remote player added: ${position.id}`)
      }
      return true
    } catch (error) {
      const existing = this.failedRemotePlayers.get(position.id)
      const retryCount = existing ? existing.retryCount + 1 : 1
      this.failedRemotePlayers.set(position.id, {
        timestamp: Date.now(),
        retryCount,
      })

      if (this.isSceneTrulyActive()) {
        console.warn(
          `[MainScene] Failed to add remote player (attempt ${retryCount}/${this.MAX_RETRY_COUNT}):`,
          error
        )
      }
      return false
    }
  }

  private updateRemotePlayer(
    position: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string }
  ) {
    if (!this.isSceneTrulyActive()) {
      return
    }

    try {
      let container = this.remotePlayers.get(position.id)
      if (!container) {
        const success = this.addRemotePlayer(position)
        if (!success) {
          return
        }
        container = this.remotePlayers.get(position.id)
        if (!container) {
          return
        }
      }

      if (container && this.tweens) {
        this.tweens.add({
          targets: container,
          x: position.x,
          y: position.y,
          duration: 100,
          ease: "Linear",
        })

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

        if (sprite && this.anims) {
          const avatarColor = position.avatarColor || "default"
          const animKey = getAnimationKey(
            position.direction,
            position.isMoving,
            avatarColor
          )
          if (
            this.anims.exists(animKey) &&
            sprite.anims.currentAnim?.key !== animKey
          ) {
            sprite.play(animKey)
          }
        }
      }
    } catch (error) {
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

    this.tweens.add({
      targets: sprite,
      y: -this.JUMP_HEIGHT,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: sprite,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: this.JUMP_DURATION / 2,
          ease: "Quad.easeIn",
          onComplete: () => {
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
    const container = this.remotePlayers.get(id)
    if (container) {
      container.destroy()
      this.remotePlayers.delete(id)
    }

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

    this.failedRemotePlayers.delete(id)
  }

  private updateLocalProfile(nickname: string, avatarColor: AvatarColor) {
    if (IS_DEV) {
      console.log(
        `[MainScene] Updating local profile: ${nickname} (${avatarColor})`
      )
    }

    this.playerNickname = nickname
    this.playerAvatarColor = avatarColor

    if (this.nicknameText) {
      this.nicknameText.setText(nickname)
    }

    const textureKey = `character-${avatarColor}`
    if (this.textures.exists(textureKey) && this.playerSprite) {
      this.playerSprite.setTexture(textureKey)
      const animKey = getAnimationKey(
        this.playerDirection,
        this.isMoving,
        avatarColor
      )
      if (this.anims.exists(animKey)) {
        this.playerSprite.play(animKey)
      }
    }
  }

  private updateRemoteProfile(
    id: string,
    nickname: string,
    avatarColor: AvatarColor
  ) {
    if (IS_DEV) {
      console.log(
        `[MainScene] Updating remote profile: ${id} → ${nickname} (${avatarColor})`
      )
    }

    const nameText = this.remotePlayerNames.get(id)
    if (nameText) {
      nameText.setText(nickname)
    }

    const sprite = this.remotePlayerSprites.get(id)
    if (sprite) {
      const textureKey = `character-${avatarColor}`
      if (this.textures.exists(textureKey)) {
        sprite.setTexture(textureKey)
        const currentAnim = sprite.anims.currentAnim
        if (currentAnim) {
          const parts = currentAnim.key.split("-")
          const isWalk = parts[0] === "walk"
          const direction = parts[1] as "up" | "down" | "left" | "right"
          const animKey = getAnimationKey(direction, isWalk, avatarColor)
          if (this.anims.exists(animKey)) {
            sprite.play(animKey)
          }
        }
      }
    }
  }

  update() {
    const playerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body
    const { PLAYER_SPEED } = MAP_CONFIG

    // 채팅 활성화 시 게임 입력 차단
    if (this.isChatActive) {
      if (this.isMoving) {
        playerBody.setVelocity(0)
        this.isMoving = false
        const idleAnim = getAnimationKey(
          this.playerDirection,
          false,
          this.playerAvatarColor
        )
        if (
          this.anims.exists(idleAnim) &&
          this.playerSprite.anims.currentAnim?.key !== idleAnim
        ) {
          this.playerSprite.play(idleAnim)
        }
        const position: PlayerPosition = {
          id: this.playerId,
          x: this.playerContainer.x,
          y: this.playerContainer.y,
          direction: this.playerDirection,
          isMoving: false,
        }
        eventBridge.emit(GameEvents.PLAYER_MOVED, position)
      }
      return
    }

    playerBody.setVelocity(0)

    let moved = false
    let newDirection = this.playerDirection

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      playerBody.setVelocityX(-PLAYER_SPEED)
      newDirection = "left"
      moved = true
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      playerBody.setVelocityX(PLAYER_SPEED)
      newDirection = "right"
      moved = true
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      playerBody.setVelocityY(-PLAYER_SPEED)
      newDirection = "up"
      moved = true
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      playerBody.setVelocityY(PLAYER_SPEED)
      newDirection = "down"
      moved = true
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.jump()
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.triggerInteraction()
    }

    this.checkObjectInteraction()

    if (playerBody.velocity.x !== 0 && playerBody.velocity.y !== 0) {
      playerBody.velocity.normalize().scale(PLAYER_SPEED)
    }

    const animKey = getAnimationKey(newDirection, moved, this.playerAvatarColor)
    if (
      this.anims.exists(animKey) &&
      this.playerSprite.anims.currentAnim?.key !== animKey
    ) {
      this.playerSprite.play(animKey)
    }

    const groundY = this.playerContainer.y + CHARACTER_CONFIG.HEIGHT / 2
    this.playerShadow.setPosition(this.playerContainer.x, groundY)

    const spriteJumpOffset = this.playerSprite.y
    this.nicknameText.setPosition(
      this.playerContainer.x,
      this.playerContainer.y + spriteJumpOffset - CHARACTER_CONFIG.HEIGHT / 2 - 8
    )

    if (
      moved ||
      this.isMoving !== moved ||
      this.playerDirection !== newDirection
    ) {
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
    this.isSceneActive = false

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
    if (this.handleLocalProfileUpdate) {
      eventBridge.off(GameEvents.LOCAL_PROFILE_UPDATE, this.handleLocalProfileUpdate)
    }
    if (this.handleRemoteProfileUpdate) {
      eventBridge.off(GameEvents.REMOTE_PROFILE_UPDATE, this.handleRemoteProfileUpdate)
    }
    if (this.handleChatFocusChanged) {
      eventBridge.off(GameEvents.CHAT_FOCUS_CHANGED, this.handleChatFocusChanged)
    }

    this.remotePlayers.forEach((container) => container.destroy())
    this.remotePlayers.clear()
    this.remotePlayerSprites.clear()
    this.remotePlayerShadows.forEach((shadow) => shadow.destroy())
    this.remotePlayerShadows.clear()
    this.remotePlayerNames.forEach((name) => name.destroy())
    this.remotePlayerNames.clear()
    this.failedRemotePlayers.clear()
  }
}
