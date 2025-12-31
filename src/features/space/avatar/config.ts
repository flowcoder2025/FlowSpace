/**
 * Avatar/Character Configuration
 *
 * Supports two types of characters:
 * 1. Classic (procedural): Color-based characters (4x4 grid, 24x32 frames)
 * 2. Custom: AI-generated characters (8x4 grid, 176x192 frames)
 */

// ============================================
// Types
// ============================================

export type AvatarType = "classic" | "custom"

export interface ClassicAvatarConfig {
  type: "classic"
  colorId: ClassicColorId
}

export interface CustomAvatarConfig {
  type: "custom"
  characterId: CustomCharacterId
}

export type AvatarConfig = ClassicAvatarConfig | CustomAvatarConfig

// Classic color IDs
export const CLASSIC_COLORS = [
  "default",
  "red",
  "green",
  "purple",
  "orange",
  "pink",
  "yellow",
  "blue",
] as const

export type ClassicColorId = (typeof CLASSIC_COLORS)[number]

// Custom character IDs
export const CUSTOM_CHARACTERS = ["office_male"] as const

export type CustomCharacterId = (typeof CUSTOM_CHARACTERS)[number]

// ============================================
// Character Metadata
// ============================================

export interface ClassicColorMeta {
  id: ClassicColorId
  name: string
  displayColor: string // Tailwind class
}

export interface CustomCharacterMeta {
  id: CustomCharacterId
  name: string
  description: string
  previewUrl: string
  spriteUrl: string
  frameWidth: number
  frameHeight: number
  columns: number // 8 for 8x4 grid
  rows: number // 4 for 4 directions
}

// Classic colors metadata
export const CLASSIC_COLOR_META: ClassicColorMeta[] = [
  { id: "default", name: "기본", displayColor: "bg-teal-500" },
  { id: "red", name: "빨강", displayColor: "bg-red-500" },
  { id: "green", name: "초록", displayColor: "bg-green-500" },
  { id: "purple", name: "보라", displayColor: "bg-purple-500" },
  { id: "orange", name: "주황", displayColor: "bg-orange-500" },
  { id: "pink", name: "분홍", displayColor: "bg-pink-500" },
  { id: "yellow", name: "노랑", displayColor: "bg-yellow-500" },
  { id: "blue", name: "파랑", displayColor: "bg-blue-500" },
]

// Custom characters metadata
export const CUSTOM_CHARACTER_META: CustomCharacterMeta[] = [
  {
    id: "office_male",
    name: "직장인 남성",
    description: "정장을 입은 사무직 남성 캐릭터",
    previewUrl: "/assets/game/sprites/characters/char_office_male.png",
    spriteUrl: "/assets/game/sprites/characters/char_office_male.png",
    frameWidth: 176,
    frameHeight: 192,
    columns: 8,
    rows: 4,
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * Parse avatar string to AvatarConfig
 * Legacy format: "default", "red", etc. (color only)
 * New format: "classic:default", "custom:office_male"
 */
export function parseAvatarString(avatar: string): AvatarConfig {
  // Check new format first
  if (avatar.includes(":")) {
    const [type, id] = avatar.split(":")

    if (type === "custom" && CUSTOM_CHARACTERS.includes(id as CustomCharacterId)) {
      return { type: "custom", characterId: id as CustomCharacterId }
    }

    if (type === "classic" && CLASSIC_COLORS.includes(id as ClassicColorId)) {
      return { type: "classic", colorId: id as ClassicColorId }
    }
  }

  // Legacy format: assume it's a classic color
  if (CLASSIC_COLORS.includes(avatar as ClassicColorId)) {
    return { type: "classic", colorId: avatar as ClassicColorId }
  }

  // Default fallback
  return { type: "classic", colorId: "default" }
}

/**
 * Serialize AvatarConfig to string for storage/transmission
 */
export function serializeAvatarConfig(config: AvatarConfig): string {
  if (config.type === "classic") {
    return `classic:${config.colorId}`
  }
  return `custom:${config.characterId}`
}

/**
 * Get texture key for Phaser based on avatar config
 */
export function getTextureKey(config: AvatarConfig): string {
  if (config.type === "classic") {
    return `character-${config.colorId}`
  }
  return `character-custom-${config.characterId}`
}

/**
 * Get animation prefix for Phaser based on avatar config
 */
export function getAnimationPrefix(config: AvatarConfig): string {
  if (config.type === "classic") {
    return config.colorId
  }
  return `custom-${config.characterId}`
}

/**
 * Check if avatar config uses 8x4 spritesheet (custom characters)
 */
export function isCustomCharacter(config: AvatarConfig): config is CustomAvatarConfig {
  return config.type === "custom"
}

/**
 * Get character metadata for custom character
 */
export function getCustomCharacterMeta(
  characterId: CustomCharacterId
): CustomCharacterMeta | undefined {
  return CUSTOM_CHARACTER_META.find((meta) => meta.id === characterId)
}

/**
 * Get classic color metadata
 */
export function getClassicColorMeta(colorId: ClassicColorId): ClassicColorMeta | undefined {
  return CLASSIC_COLOR_META.find((meta) => meta.id === colorId)
}

/**
 * Validate avatar string
 */
export function isValidAvatarString(avatar: string): boolean {
  const config = parseAvatarString(avatar)

  if (config.type === "classic") {
    return CLASSIC_COLORS.includes(config.colorId)
  }

  return CUSTOM_CHARACTERS.includes(config.characterId)
}

/**
 * Normalize avatar string to new format
 * Converts legacy "default" to "classic:default"
 * Preserves new format as-is
 */
export function normalizeAvatarString(avatar: string): string {
  if (!avatar) return "classic:default"

  // Already in new format
  if (avatar.includes(":")) {
    // Validate and return
    const config = parseAvatarString(avatar)
    return serializeAvatarConfig(config)
  }

  // Legacy format - convert to new
  if (CLASSIC_COLORS.includes(avatar as ClassicColorId)) {
    return `classic:${avatar}`
  }

  // Invalid - return default
  return "classic:default"
}

/**
 * Get legacy avatar color for backwards compatibility
 * Custom characters return "default" as fallback
 */
export function getLegacyAvatarColor(avatar: string): ClassicColorId {
  const config = parseAvatarString(avatar)

  if (config.type === "classic") {
    return config.colorId
  }

  // Custom characters don't have a legacy color, return default
  return "default"
}

/**
 * Get safe avatar string (validates and normalizes)
 * Use this instead of getSafeAvatarColor for new avatar system
 */
export function getSafeAvatarString(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "classic:default"
  }

  return normalizeAvatarString(value)
}
