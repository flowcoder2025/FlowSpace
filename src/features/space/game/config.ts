/**
 * Phaser Game Configuration
 */
import * as Phaser from "phaser"

// Map configuration
// 맵 크기를 넉넉하게 설정하여 모든 화면 크기에서 빈 공간 없이 표시
export const MAP_CONFIG = {
  TILE_SIZE: 32,
  MAP_WIDTH: 50,  // tiles (1600px) - 넓은 화면 지원
  MAP_HEIGHT: 35, // tiles (1120px) - 넓은 화면 지원
  PLAYER_SPEED: 160,
}

// Create Phaser game configuration
export function createGameConfig(
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[]
): Phaser.Types.Core.GameConfig {
  // 🔧 초기 크기 계산 - 컨테이너가 아직 레이아웃되지 않았을 경우 fallback
  // 실제 크기는 ResizeObserver에 의해 마운트 직후 조정됨
  const initialWidth = parent.clientWidth > 0 ? parent.clientWidth : window.innerWidth
  const initialHeight = parent.clientHeight > 0 ? parent.clientHeight : window.innerHeight

  return {
    type: Phaser.AUTO,
    parent,
    width: initialWidth,
    height: initialHeight,
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
    // Disable audio to prevent "Cannot suspend a closed AudioContext" error
    // This error occurs during HMR or component unmount in development
    audio: {
      disableWebAudio: true,
    },
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
