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
} as const

// Player position type
export interface PlayerPosition {
  id: string
  x: number
  y: number
  direction: "up" | "down" | "left" | "right"
  isMoving: boolean
}
