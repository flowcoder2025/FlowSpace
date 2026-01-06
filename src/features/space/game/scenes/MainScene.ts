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
  type EditorModePayload,
  type EditorCanvasClickPayload,
  type JoystickMovePayload,
} from "../events"
import {
  createCharacterAnimationsFromSpritesheet,
  createCharacterAnimationsFrom8x4Spritesheet,
  getAnimationKey,
  CHARACTER_CONFIG,
} from "../sprites"
import {
  type AvatarConfig,
  type ClassicColorId,
  parseAvatarString,
  getTextureKey,
  getAnimationPrefix,
  isCustomCharacter,
  CLASSIC_COLORS,
  CUSTOM_CHARACTER_META,
} from "../../avatar"
import { TileMapSystem } from "../tiles"
import {
  InteractiveObject,
  createInteractiveObjects,
  type InteractiveObjectConfig,
} from "../objects"
import { getAssetById } from "@/config/asset-registry"

// Development mode flag for debug logs
const IS_DEV = process.env.NODE_ENV === "development"

// Legacy avatar color type (for backwards compatibility)
type AvatarColor = ClassicColorId

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
  // 🔄 Store avatar configs for remote players (for animation updates)
  private remotePlayerAvatarConfigs: Map<string, AvatarConfig> = new Map()
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
  private playerBaseScale = 1 // Base scale for custom character sprites
  private isChatActive = false // 채팅 활성화 시 게임 입력 차단
  private isEditorActive = false // 🎨 에디터 모드 활성화 시 클릭 → 배치
  // 🎮 조이스틱 입력 상태
  private joystickInput: { x: number; y: number; force: number } = { x: 0, y: 0, force: 0 }
  private playerId: string = ""
  private playerNickname: string = ""
  private playerAvatarColor: AvatarColor = "default" // Legacy, kept for compatibility
  private playerAvatarConfig: AvatarConfig = { type: "classic", colorId: "default" }
  private playerAnimPrefix: string = "default" // Animation prefix for getAnimationKey
  private nicknameText!: Phaser.GameObjects.Text
  private isSceneActive = false

  // Queue for pending remote player events (received before scene is ready)
  private pendingRemotePlayerEvents: Array<{
    type: "join" | "update" | "leave"
    data: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string; avatarConfig?: AvatarConfig }
  }> = []

  // Event handler references for cleanup
  private handleRemotePlayerUpdate!: (data: unknown) => void
  private handleRemotePlayerJoin!: (data: unknown) => void
  private handleRemotePlayerLeave!: (data: unknown) => void
  private handleRemotePlayerJump!: (data: unknown) => void
  private handleLocalProfileUpdate!: (data: unknown) => void
  private handleRemoteProfileUpdate!: (data: unknown) => void
  private handleChatFocusChanged!: (data: unknown) => void
  private handleEditorModeChanged!: (data: unknown) => void // 🎨 에디터 모드 이벤트
  private handleEditorPlaceObject!: (data: unknown) => void // 🎨 오브젝트 배치 이벤트
  private handleJoystickMove!: (data: unknown) => void // 🎮 조이스틱 이동 이벤트
  private handleJoystickStop!: (data: unknown) => void // 🎮 조이스틱 정지 이벤트

  // 🎨 배치된 오브젝트 관리
  private placedObjects: Map<string, Phaser.GameObjects.Container> = new Map()

  // 🎨 좌표 표시 UI (에디터 모드)
  private coordinateDisplay!: Phaser.GameObjects.Container
  private coordinateText!: Phaser.GameObjects.Text
  private coordinateBg!: Phaser.GameObjects.Rectangle

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
    avatarColor?: AvatarColor // Legacy support
    avatar?: string // New format: "classic:default" or "custom:office_male"
  }) {
    this.playerId = data.playerId || "local-player"
    this.playerNickname = data.nickname || "Player"

    // Parse avatar configuration (support both legacy and new format)
    if (data.avatar) {
      this.playerAvatarConfig = parseAvatarString(data.avatar)
    } else if (data.avatarColor) {
      this.playerAvatarConfig = { type: "classic", colorId: data.avatarColor }
    } else {
      this.playerAvatarConfig = { type: "classic", colorId: "default" }
    }

    // Keep legacy field for backwards compatibility
    this.playerAvatarColor = isCustomCharacter(this.playerAvatarConfig)
      ? "default"
      : this.playerAvatarConfig.colorId

    // Set animation prefix
    this.playerAnimPrefix = getAnimationPrefix(this.playerAvatarConfig)

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

    // Load classic character sprite sheets (4x4 grid, 24x32 frames)
    CLASSIC_COLORS.forEach((color) => {
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

    // Load custom character sprite sheets (8x4 grid, variable frame size)
    CUSTOM_CHARACTER_META.forEach((charMeta) => {
      const textureKey = `character-custom-${charMeta.id}`
      this.load.spritesheet(textureKey, charMeta.spriteUrl, {
        frameWidth: charMeta.frameWidth,
        frameHeight: charMeta.frameHeight,
      })
    })

    // Log when loading completes
    this.load.on("complete", () => {
      console.log("[MainScene] All assets loaded successfully")
    })
  }

  create() {
    // Classic character animations setup (4x4 grid)
    CLASSIC_COLORS.forEach((color) => {
      const textureKey = `character-${color}`
      if (!this.textures.exists(textureKey)) {
        console.error(`[MainScene] Character texture not loaded: ${textureKey}`)
        return
      }
      createCharacterAnimationsFromSpritesheet(this, textureKey, color)
    })

    // Custom character animations setup (8x4 grid)
    CUSTOM_CHARACTER_META.forEach((charMeta) => {
      const textureKey = `character-custom-${charMeta.id}`
      if (!this.textures.exists(textureKey)) {
        console.error(`[MainScene] Custom character texture not loaded: ${textureKey}`)
        return
      }

      // 🔍 DEBUG: Log texture info
      const texture = this.textures.get(textureKey)
      const source = texture.getSourceImage()
      console.log(`[MainScene] 🔍 Texture "${textureKey}":`, {
        sourceWidth: source.width,
        sourceHeight: source.height,
        expectedFrameW: charMeta.frameWidth,
        expectedFrameH: charMeta.frameHeight,
        expectedCols: charMeta.columns,
        expectedRows: charMeta.rows,
        frameNames: texture.getFrameNames(),
        frameTotal: texture.frameTotal,
      })

      createCharacterAnimationsFrom8x4Spritesheet(this, textureKey, `custom-${charMeta.id}`)
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

    // 🎨 Setup coordinate display for editor mode
    this.setupCoordinateDisplay()

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

    // Get texture key and animation prefix based on avatar config
    const textureKey = getTextureKey(this.playerAvatarConfig)
    const animPrefix = getAnimationPrefix(this.playerAvatarConfig)

    // Determine frame size for shadow positioning
    let frameHeight = CHARACTER_CONFIG.HEIGHT
    if (isCustomCharacter(this.playerAvatarConfig)) {
      const customConfig = this.playerAvatarConfig // TypeScript narrowing
      const charMeta = CUSTOM_CHARACTER_META.find((m) => m.id === customConfig.characterId)
      frameHeight = charMeta?.frameHeight ?? CHARACTER_CONFIG.HEIGHT
    }

    // Create player shadow
    this.playerShadow = this.add.ellipse(
      startX,
      startY + frameHeight / 2,
      CHARACTER_CONFIG.WIDTH - 4,
      8,
      0x000000,
      0.3
    )
    this.playerShadow.setDepth(3)

    // Create player sprite
    if (IS_DEV) {
      const textureExists = this.textures.exists(textureKey)
      console.log(
        `[MainScene] Creating player sprite: key=${textureKey}, exists=${textureExists}, type=${this.playerAvatarConfig.type}`
      )
    }

    this.playerSprite = this.add.sprite(0, 0, textureKey)
    this.playerSprite.setOrigin(0.5, 0.5)

    // Scale down custom characters to match classic character size
    if (isCustomCharacter(this.playerAvatarConfig)) {
      const customConfig = this.playerAvatarConfig // TypeScript narrowing
      const charMeta = CUSTOM_CHARACTER_META.find((m) => m.id === customConfig.characterId)
      if (charMeta) {
        // Scale to match classic character height (32px)
        const scale = CHARACTER_CONFIG.HEIGHT / charMeta.frameHeight
        this.playerSprite.setScale(scale)
        this.playerBaseScale = scale // Store for jump animation reset
      }
    } else {
      this.playerBaseScale = 1 // Classic characters use scale 1
    }

    // Create container
    this.playerContainer = this.add.container(startX, startY, [
      this.playerSprite,
    ])
    this.playerContainer.setDepth(5) // 가구 위, 장식 아래

    // Play initial idle animation
    const idleAnim = getAnimationKey("down", false, animPrefix)
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

    // 🎨 에디터 모드 클릭 핸들러 (캔버스 클릭 → 배치 좌표 전송)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.isEditorActive) return

      // 월드 좌표 (카메라 스크롤 반영)
      const worldX = pointer.worldX
      const worldY = pointer.worldY

      // 그리드 좌표 계산
      const mapConfig = this.tileMapSystem.getMapConfig()
      const TILE_SIZE = mapConfig.TILE_SIZE
      const gridX = Math.floor(worldX / TILE_SIZE)
      const gridY = Math.floor(worldY / TILE_SIZE)

      if (IS_DEV) {
        console.log(
          `[MainScene] Editor click: grid(${gridX}, ${gridY}), world(${worldX.toFixed(0)}, ${worldY.toFixed(0)})`
        )
      }

      // 에디터 캔버스 클릭 이벤트 전송
      const clickPayload: EditorCanvasClickPayload = {
        gridX,
        gridY,
        worldX,
        worldY,
      }
      eventBridge.emit(GameEvents.EDITOR_CANVAS_CLICK, clickPayload)
    })
  }

  private jump() {
    if (this.isJumping || this.jumpCooldown) return

    this.isJumping = true
    const baseScale = this.playerBaseScale

    this.tweens.add({
      targets: this.playerSprite,
      y: -this.JUMP_HEIGHT,
      scaleX: baseScale * 1.1,
      scaleY: baseScale * 0.9,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.playerSprite,
          y: 0,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: this.JUMP_DURATION / 2,
          ease: "Quad.easeIn",
          onComplete: () => {
            this.isJumping = false
            this.jumpCooldown = true

            this.tweens.add({
              targets: this.playerSprite,
              scaleX: baseScale * 1.15,
              scaleY: baseScale * 0.85,
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

  /**
   * 🎨 에디터 모드용 좌표 표시 UI 설정
   * 마우스 커서 위치에 그리드 좌표를 실시간으로 표시
   */
  private setupCoordinateDisplay() {
    // 좌표 텍스트 생성
    this.coordinateText = this.add.text(0, 0, "(0, 0)", {
      fontSize: "11px",
      fontFamily: "monospace",
      color: "#ffffff",
      padding: { x: 6, y: 3 },
    })
    this.coordinateText.setOrigin(0, 0)

    // 배경 사각형 생성 (텍스트 크기에 맞춤)
    const textBounds = this.coordinateText.getBounds()
    this.coordinateBg = this.add.rectangle(
      0,
      0,
      textBounds.width + 4,
      textBounds.height + 2,
      0x000000,
      0.75
    )
    this.coordinateBg.setOrigin(0, 0)

    // 컨테이너로 묶기
    this.coordinateDisplay = this.add.container(0, 0, [
      this.coordinateBg,
      this.coordinateText,
    ])
    this.coordinateDisplay.setDepth(1000) // 모든 것 위에 표시
    this.coordinateDisplay.setScrollFactor(0) // 카메라 스크롤 무시 (화면 고정)
    this.coordinateDisplay.setVisible(false) // 초기에는 숨김

    // 마우스 이동 이벤트 핸들러
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isEditorActive) {
        this.coordinateDisplay.setVisible(false)
        return
      }

      // 그리드 좌표 계산
      const mapConfig = this.tileMapSystem.getMapConfig()
      const TILE_SIZE = mapConfig.TILE_SIZE
      const gridX = Math.floor(pointer.worldX / TILE_SIZE)
      const gridY = Math.floor(pointer.worldY / TILE_SIZE)

      // 좌표 텍스트 업데이트
      this.coordinateText.setText(`(${gridX}, ${gridY})`)

      // 배경 크기 업데이트
      const newBounds = this.coordinateText.getBounds()
      this.coordinateBg.setSize(newBounds.width + 4, newBounds.height + 2)

      // 화면 좌표로 위치 설정 (커서 오른쪽 아래)
      const offsetX = 15
      const offsetY = 15

      // 화면 경계 체크 (오른쪽/아래로 넘어가면 반대쪽에 표시)
      const displayWidth = newBounds.width + 4
      const displayHeight = newBounds.height + 2
      const screenWidth = this.cameras.main.width
      const screenHeight = this.cameras.main.height

      let posX = pointer.x + offsetX
      let posY = pointer.y + offsetY

      if (posX + displayWidth > screenWidth) {
        posX = pointer.x - displayWidth - 5
      }
      if (posY + displayHeight > screenHeight) {
        posY = pointer.y - displayHeight - 5
      }

      this.coordinateDisplay.setPosition(posX, posY)
      this.coordinateDisplay.setVisible(true)
    })

    // 마우스가 캔버스를 벗어나면 숨김
    this.input.on("pointerout", () => {
      this.coordinateDisplay.setVisible(false)
    })
  }

  private isSceneTrulyActive(): boolean {
    return this.isSceneActive && !!this.sys?.displayList
  }

  private setupMultiplayerEvents() {
    this.handleRemotePlayerUpdate = (data: unknown) => {
      const position = data as PlayerPosition & {
        avatarColor?: AvatarColor
        nickname?: string
        avatarConfig?: AvatarConfig
      }
      // 🔧 Fix: 씬이 완전히 종료 중이면 무시, 초기화 중이면 pending에 추가
      if (!this.isSceneActive) {
        return // 씬 완전 종료
      }
      if (!this.isSceneTrulyActive()) {
        this.pendingRemotePlayerEvents.push({ type: "update", data: position })
        return
      }
      this.updateRemotePlayer(position)
    }

    this.handleRemotePlayerJoin = (data: unknown) => {
      const position = data as PlayerPosition & {
        avatarColor?: AvatarColor
        nickname?: string
        avatarConfig?: AvatarConfig
      }
      // 🔧 Fix: 씬이 완전히 종료 중이면 무시, 초기화 중이면 pending에 추가
      if (!this.isSceneActive) {
        return // 씬 완전 종료
      }
      if (!this.isSceneTrulyActive()) {
        this.pendingRemotePlayerEvents.push({ type: "join", data: position })
        if (IS_DEV) {
          console.log("[MainScene] Queued remote player join (scene initializing):", position.id, position.nickname)
        }
        return
      }
      this.addRemotePlayer(position)
    }

    this.handleRemotePlayerLeave = (data: unknown) => {
      const { id } = data as { id: string }
      // 🔧 Fix: 씬이 완전히 종료 중이면 무시, 초기화 중이면 pending에 추가
      if (!this.isSceneActive) {
        return // 씬 완전 종료
      }
      if (!this.isSceneTrulyActive()) {
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

    // 🎨 에디터 모드 이벤트 핸들러
    this.handleEditorModeChanged = (data: unknown) => {
      const { isActive } = data as EditorModePayload
      this.isEditorActive = isActive
      if (IS_DEV) {
        console.log(
          `[MainScene] Editor mode changed: ${isActive ? "ACTIVE" : "INACTIVE"}`
        )
      }
    }

    // 🎨 오브젝트 배치 이벤트 핸들러
    this.handleEditorPlaceObject = (data: unknown) => {
      const { objectId, assetId, gridX, gridY } = data as {
        objectId: string
        assetId: string
        gridX: number
        gridY: number
        rotation?: number
      }

      // 씬이 비활성화 상태면 무시
      if (!this.isSceneTrulyActive()) {
        console.warn(`[MainScene] ⚠️ Scene not active, skipping object placement`)
        return
      }

      // 에셋 메타데이터 조회
      const assetMeta = getAssetById(assetId)

      // 타일 크기 가져오기
      const mapConfig = this.tileMapSystem.getMapConfig()
      const TILE_SIZE = mapConfig.TILE_SIZE

      // 에셋 크기 (타일 단위)
      const assetWidth = assetMeta?.size?.width ?? 1
      const assetHeight = assetMeta?.size?.height ?? 1

      // 월드 좌표 계산 (에셋 크기 반영)
      const worldX = gridX * TILE_SIZE + (TILE_SIZE * assetWidth) / 2
      const worldY = gridY * TILE_SIZE + (TILE_SIZE * assetHeight) / 2

      // 카테고리별 색상 매핑
      const categoryColors: Record<string, { fill: number; stroke: number; icon: string }> = {
        interactive: { fill: 0xfbbf24, stroke: 0xf59e0b, icon: "⚡" }, // 노란색
        furniture: { fill: 0xa3866a, stroke: 0x8b6f5c, icon: "🪑" },   // 갈색
        decoration: { fill: 0x4ade80, stroke: 0x22c55e, icon: "🌳" }, // 초록색
        wall: { fill: 0x9ca3af, stroke: 0x6b7280, icon: "🧱" },       // 회색
        floor: { fill: 0x60a5fa, stroke: 0x3b82f6, icon: "🏠" },      // 파란색
      }

      const category = assetMeta?.categoryId ?? "decoration"
      const colors = categoryColors[category] ?? categoryColors.decoration

      // 오브젝트 컨테이너 생성
      const container = this.add.container(worldX, worldY)
      container.setDepth(50 + gridY) // Y좌표 기반 깊이 (자연스러운 정렬)

      // 배경 사각형 (에셋 크기 반영)
      const bgWidth = TILE_SIZE * assetWidth - 4
      const bgHeight = TILE_SIZE * assetHeight - 4
      const background = this.add.rectangle(0, 0, bgWidth, bgHeight, colors.fill, 0.85)
      background.setStrokeStyle(2, colors.stroke)

      // 아이콘 표시
      const iconText = this.add.text(0, -4, colors.icon, {
        fontSize: assetWidth > 1 || assetHeight > 1 ? "18px" : "14px",
      })
      iconText.setOrigin(0.5, 0.5)

      // 에셋 이름 표시 (짧게)
      const displayName = assetMeta?.name ?? assetId
      const shortName = displayName.length > 4 ? displayName.slice(0, 4) : displayName
      const nameText = this.add.text(0, 8, shortName, {
        fontSize: "9px",
        fontFamily: "sans-serif",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      nameText.setOrigin(0.5, 0.5)

      // 컨테이너에 추가
      container.add([background, iconText, nameText])

      // 저장 (컨테이너로 저장)
      this.placedObjects.set(objectId, container)

      if (IS_DEV) {
        console.log(`[MainScene] 🎯 Object placed: ${assetId} (${category}) at grid(${gridX}, ${gridY}), size: ${assetWidth}x${assetHeight}`)
      }
    }

    // 🎮 조이스틱 이벤트 핸들러
    this.handleJoystickMove = (data: unknown) => {
      const { x, y, force } = data as JoystickMovePayload
      this.joystickInput = { x, y, force }
      if (IS_DEV) {
        console.log(`[MainScene] 🎮 Joystick move: x=${x.toFixed(2)}, y=${y.toFixed(2)}, force=${force.toFixed(2)}`)
      }
    }

    this.handleJoystickStop = () => {
      this.joystickInput = { x: 0, y: 0, force: 0 }
      if (IS_DEV) {
        console.log("[MainScene] 🎮 Joystick stop")
      }
    }

    eventBridge.on(GameEvents.REMOTE_PLAYER_UPDATE, this.handleRemotePlayerUpdate)
    eventBridge.on(GameEvents.REMOTE_PLAYER_JOIN, this.handleRemotePlayerJoin)
    eventBridge.on(GameEvents.REMOTE_PLAYER_LEAVE, this.handleRemotePlayerLeave)
    eventBridge.on(GameEvents.REMOTE_PLAYER_JUMPED, this.handleRemotePlayerJump)
    eventBridge.on(GameEvents.LOCAL_PROFILE_UPDATE, this.handleLocalProfileUpdate)
    eventBridge.on(GameEvents.REMOTE_PROFILE_UPDATE, this.handleRemoteProfileUpdate)
    eventBridge.on(GameEvents.CHAT_FOCUS_CHANGED, this.handleChatFocusChanged)
    eventBridge.on(GameEvents.EDITOR_MODE_CHANGED, this.handleEditorModeChanged)
    eventBridge.on(GameEvents.EDITOR_PLACE_OBJECT, this.handleEditorPlaceObject)
    eventBridge.on(GameEvents.JOYSTICK_MOVE, this.handleJoystickMove)
    eventBridge.on(GameEvents.JOYSTICK_STOP, this.handleJoystickStop)
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
    position: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string; avatarConfig?: AvatarConfig }
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
      // 🔄 새 아바타 시스템 지원 (avatarConfig 우선, 없으면 avatarColor 사용)
      let avatarConfig: AvatarConfig
      if (position.avatarConfig) {
        avatarConfig = position.avatarConfig
      } else {
        const avatarColor = position.avatarColor || "default"
        avatarConfig = { type: "classic", colorId: avatarColor }
      }

      const textureKey = getTextureKey(avatarConfig)
      const animPrefix = getAnimationPrefix(avatarConfig)

      // 커스텀 캐릭터 크기 결정
      let frameHeight = CHARACTER_CONFIG.HEIGHT
      if (isCustomCharacter(avatarConfig)) {
        const customConfig = avatarConfig
        const charMeta = CUSTOM_CHARACTER_META.find((m) => m.id === customConfig.characterId)
        frameHeight = charMeta?.frameHeight ?? CHARACTER_CONFIG.HEIGHT
      }

      const shadow = this.add.ellipse(
        position.x,
        position.y + frameHeight / 2,
        CHARACTER_CONFIG.WIDTH - 4,
        8,
        0x000000,
        0.3
      )
      shadow.setDepth(3)
      this.remotePlayerShadows.set(position.id, shadow)

      const sprite = this.add.sprite(0, 0, textureKey)
      sprite.setOrigin(0.5, 0.5)

      // 🔄 커스텀 캐릭터 스케일 조정
      if (isCustomCharacter(avatarConfig)) {
        const customConfig = avatarConfig
        const charMeta = CUSTOM_CHARACTER_META.find((m) => m.id === customConfig.characterId)
        if (charMeta) {
          const scale = CHARACTER_CONFIG.HEIGHT / charMeta.frameHeight
          sprite.setScale(scale)
        }
      }

      const container = this.add.container(position.x, position.y, [sprite])
      container.setDepth(5)
      this.remotePlayers.set(position.id, container)
      this.remotePlayerSprites.set(position.id, sprite)
      // 🔄 Store avatar config for animation updates
      this.remotePlayerAvatarConfigs.set(position.id, avatarConfig)

      // 🔧 Use getAnimationKey for correct format (classic vs custom)
      const idleAnim = getAnimationKey(
        (position.direction || "down") as "up" | "down" | "left" | "right",
        false,
        animPrefix
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
    position: PlayerPosition & { avatarColor?: AvatarColor; nickname?: string; avatarConfig?: AvatarConfig }
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
          // 🔄 Use stored avatar config for animation
          const storedConfig = this.remotePlayerAvatarConfigs.get(position.id)
          const animPrefix = storedConfig
            ? getAnimationPrefix(storedConfig)
            : position.avatarColor || "default"
          // 🔧 Use getAnimationKey for correct format (classic vs custom)
          const animKey = getAnimationKey(
            position.direction as "up" | "down" | "left" | "right",
            position.isMoving,
            animPrefix
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

    // Calculate base scale from stored avatar config
    let baseScale = 1
    const avatarConfig = this.remotePlayerAvatarConfigs.get(id)
    if (avatarConfig && isCustomCharacter(avatarConfig)) {
      const charMeta = CUSTOM_CHARACTER_META.find((m) => m.id === avatarConfig.characterId)
      if (charMeta) {
        baseScale = CHARACTER_CONFIG.HEIGHT / charMeta.frameHeight
      }
    }

    this.tweens.add({
      targets: sprite,
      y: -this.JUMP_HEIGHT,
      scaleX: baseScale * 1.1,
      scaleY: baseScale * 0.9,
      duration: this.JUMP_DURATION / 2,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: sprite,
          y: 0,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: this.JUMP_DURATION / 2,
          ease: "Quad.easeIn",
          onComplete: () => {
            this.tweens.add({
              targets: sprite,
              scaleX: baseScale * 1.15,
              scaleY: baseScale * 0.85,
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
    // 🔄 Clean up avatar config
    this.remotePlayerAvatarConfigs.delete(id)

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
          this.playerAnimPrefix
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

    // 🎮 조이스틱 입력 체크 (키보드보다 우선)
    const hasJoystickInput = this.joystickInput.force > 0.1

    if (hasJoystickInput) {
      // 조이스틱 입력 처리
      const { x: joyX, y: joyY, force } = this.joystickInput

      // 속도 계산 (force에 비례)
      const velocityX = joyX * PLAYER_SPEED * force
      const velocityY = joyY * PLAYER_SPEED * force

      playerBody.setVelocity(velocityX, velocityY)

      // 방향 결정 (더 큰 입력 축 기준)
      if (Math.abs(joyX) > Math.abs(joyY)) {
        newDirection = joyX < 0 ? "left" : "right"
      } else {
        newDirection = joyY < 0 ? "up" : "down"
      }
      moved = true
    } else {
      // 키보드 입력 처리 (기존 로직)
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

    const animKey = getAnimationKey(newDirection, moved, this.playerAnimPrefix)
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
    if (this.handleEditorModeChanged) {
      eventBridge.off(GameEvents.EDITOR_MODE_CHANGED, this.handleEditorModeChanged)
    }
    if (this.handleEditorPlaceObject) {
      eventBridge.off(GameEvents.EDITOR_PLACE_OBJECT, this.handleEditorPlaceObject)
    }
    if (this.handleJoystickMove) {
      eventBridge.off(GameEvents.JOYSTICK_MOVE, this.handleJoystickMove)
    }
    if (this.handleJoystickStop) {
      eventBridge.off(GameEvents.JOYSTICK_STOP, this.handleJoystickStop)
    }

    // 🎨 배치된 오브젝트 정리
    this.placedObjects.forEach((obj) => obj.destroy())
    this.placedObjects.clear()

    this.remotePlayers.forEach((container) => container.destroy())
    this.remotePlayers.clear()
    this.remotePlayerSprites.clear()
    this.remotePlayerShadows.forEach((shadow) => shadow.destroy())
    this.remotePlayerShadows.clear()
    this.remotePlayerNames.forEach((name) => name.destroy())
    this.remotePlayerNames.clear()
    this.remotePlayerAvatarConfigs.clear()
    this.failedRemotePlayers.clear()
  }
}
