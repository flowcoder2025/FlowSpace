/**
 * React-Phaser Event Bridge
 * Enables communication between React components and Phaser game
 */

type EventCallback = (...args: unknown[]) => void

class EventBridge {
  private events: Map<string, Set<EventCallback>> = new Map()

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args))
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}

// Singleton instance
export const eventBridge = new EventBridge()

// Event types for type safety
export const GameEvents = {
  // Player events
  PLAYER_MOVED: "player:moved",
  PLAYER_JOINED: "player:joined",
  PLAYER_LEFT: "player:left",
  PLAYER_JUMPED: "player:jumped",

  // Game state events
  GAME_READY: "game:ready",
  GAME_ERROR: "game:error",

  // Interaction events
  OBJECT_INTERACT: "object:interact",

  // External player events (for multiplayer)
  REMOTE_PLAYER_UPDATE: "remote:player:update",
  REMOTE_PLAYER_JOIN: "remote:player:join",
  REMOTE_PLAYER_LEAVE: "remote:player:leave",
  REMOTE_PLAYER_JUMPED: "remote:player:jumped",

  // Profile update events (닉네임/아바타 핫 업데이트)
  LOCAL_PROFILE_UPDATE: "local:profile:update",
  REMOTE_PROFILE_UPDATE: "remote:profile:update",

  // Chat events (채팅 모드 전환)
  CHAT_FOCUS_CHANGED: "chat:focusChanged",

  // 🎨 Editor events (맵 에디터)
  EDITOR_MODE_CHANGED: "editor:modeChanged",
  EDITOR_ASSET_SELECTED: "editor:assetSelected",
  EDITOR_CANVAS_CLICK: "editor:canvasClick",
  EDITOR_PLACE_OBJECT: "editor:placeObject",
  EDITOR_DELETE_OBJECT: "editor:deleteObject",

  // 🎮 Mobile joystick events (모바일 조이스틱)
  JOYSTICK_MOVE: "joystick:move",
  JOYSTICK_STOP: "joystick:stop",
} as const

// Player position type
export interface PlayerPosition {
  id: string
  x: number
  y: number
  direction: "up" | "down" | "left" | "right"
  isMoving: boolean
}

// Chat focus payload type
export interface ChatFocusPayload {
  isActive: boolean
}

// 🎨 Editor payload types
export interface EditorModePayload {
  isActive: boolean
  selectedAssetId?: string | null
}

export interface EditorAssetPayload {
  assetId: string | null
  assetName?: string
}

export interface EditorCanvasClickPayload {
  gridX: number
  gridY: number
  worldX: number
  worldY: number
}

export interface EditorPlaceObjectPayload {
  assetId: string
  gridX: number
  gridY: number
  rotation?: number
}

// 🎮 Joystick payload types (모바일 조이스틱)
export interface JoystickMovePayload {
  /** X 방향 (-1 ~ 1, 왼쪽 ~ 오른쪽) */
  x: number
  /** Y 방향 (-1 ~ 1, 위 ~ 아래) */
  y: number
  /** 입력 강도 (0 ~ 1) */
  force: number
}
