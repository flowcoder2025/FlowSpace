/**
 * Phaser Game Configuration
 */
import * as Phaser from "phaser"

// Map configuration
export const MAP_CONFIG = {
  TILE_SIZE: 32,
  MAP_WIDTH: 30,  // tiles
  MAP_HEIGHT: 20, // tiles
  PLAYER_SPEED: 160,
}

// Create Phaser game configuration
export function createGameConfig(
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[]
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: "#1a1a2e",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false, // Set to true to visualize collision boxes
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  }
}

// Color palette for procedural tiles
export const TILE_COLORS = {
  FLOOR: 0x2d3436,
  WALL: 0x636e72,
  ACCENT: 0x0984e3,
  PLAYER: 0x00cec9,
  OTHER_PLAYER: 0xfdcb6e,
}
