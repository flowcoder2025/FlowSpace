export {
  // Types
  type AvatarType,
  type AvatarConfig,
  type ClassicAvatarConfig,
  type CustomAvatarConfig,
  type ClassicColorId,
  type CustomCharacterId,
  type ClassicColorMeta,
  type CustomCharacterMeta,

  // Constants
  CLASSIC_COLORS,
  CUSTOM_CHARACTERS,
  CLASSIC_COLOR_META,
  CUSTOM_CHARACTER_META,

  // Functions
  parseAvatarString,
  serializeAvatarConfig,
  getTextureKey,
  getAnimationPrefix,
  isCustomCharacter,
  getCustomCharacterMeta,
  getClassicColorMeta,
  isValidAvatarString,
  normalizeAvatarString,
  getLegacyAvatarColor,
  getSafeAvatarString,
} from "./config"
