/**
 * Config Module Exports
 *
 * 에디터 설정 모듈 통합 export
 */

// Editor Commands
export {
  type EditorCommandConfig,
  type EditorCommandCategory,
  EDITOR_COMMANDS,
  getCommandByAlias,
  getCommandById,
  canExecuteCommand,
  getCommandsByCategory,
  generateHelpText,
} from "./editor-commands"

// Asset Categories
export {
  type CategoryConfig,
  ASSET_CATEGORIES,
  getCategoryById,
  getSortedCategories,
  getCategoryIdByName,
} from "./asset-categories"

// Asset Registry
export {
  type AssetMetadata,
  type PairConfig,
  ASSET_REGISTRY,
  getAssetById,
  getAssetByAlias,
  getAssetsByCategory,
  searchAssets,
  isPairObject,
  getAllAssetIds,
  formatAssetList,
} from "./asset-registry"

// Editor Config
export {
  type EditorConfig,
  EDITOR_CONFIG,
  getConfigValue,
  getTileSize,
  isShortcutEnabled,
} from "./editor-config"
