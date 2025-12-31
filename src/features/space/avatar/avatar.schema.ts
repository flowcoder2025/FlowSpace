/**
 * Avatar Configuration Schema
 *
 * 캐릭터 커스터마이징 데이터 구조 정의
 * @see /docs/roadmap/CHARACTER.md
 */

import { z } from "zod"

// ============================================
// Skin Tone (피부 톤)
// ============================================
export const SkinToneSchema = z.enum(["light", "medium", "dark"])
export type SkinTone = z.infer<typeof SkinToneSchema>

// ============================================
// Hair (헤어)
// ============================================
export const HairStyleSchema = z.enum(["basic", "short", "long"])
export type HairStyle = z.infer<typeof HairStyleSchema>

export const HairColorSchema = z.enum(["black", "brown", "blonde"])
export type HairColor = z.infer<typeof HairColorSchema>

// ============================================
// Top (상의)
// ============================================
export const TopStyleSchema = z.enum(["tshirt"])
export type TopStyle = z.infer<typeof TopStyleSchema>

export const TopColorSchema = z.enum(["white", "navy", "red"])
export type TopColor = z.infer<typeof TopColorSchema>

// ============================================
// Bottom (하의)
// ============================================
export const BottomStyleSchema = z.enum(["pants"])
export type BottomStyle = z.infer<typeof BottomStyleSchema>

export const BottomColorSchema = z.enum(["black", "blue"])
export type BottomColor = z.infer<typeof BottomColorSchema>

// ============================================
// Shoes (신발) - Optional
// ============================================
export const ShoesStyleSchema = z.enum(["sneakers"])
export type ShoesStyle = z.infer<typeof ShoesStyleSchema>

export const ShoesColorSchema = z.enum(["white", "black"])
export type ShoesColor = z.infer<typeof ShoesColorSchema>

// ============================================
// Accessory (악세서리) - Optional
// ============================================
export const AccessoryTypeSchema = z.enum(["none", "glasses", "hat"])
export type AccessoryType = z.infer<typeof AccessoryTypeSchema>

export const AccessoryColorSchema = z.enum(["black", "brown"])
export type AccessoryColor = z.infer<typeof AccessoryColorSchema>

export const AccessorySchema = z.object({
  type: AccessoryTypeSchema,
  color: AccessoryColorSchema.optional(),
})
export type Accessory = z.infer<typeof AccessorySchema>

// ============================================
// Animation Preset
// ============================================
export const AnimPresetSchema = z.enum(["classic", "smooth"])
export type AnimPreset = z.infer<typeof AnimPresetSchema>

// ============================================
// Avatar Config (메인 스키마)
// ============================================
export const AvatarConfigSchema = z.object({
  /** 스키마 버전 (향후 마이그레이션용) */
  version: z.literal(1),

  // 필수 외형
  skinTone: SkinToneSchema,
  hairStyle: HairStyleSchema,
  hairColor: HairColorSchema,
  topStyle: TopStyleSchema,
  topColor: TopColorSchema,
  bottomStyle: BottomStyleSchema,
  bottomColor: BottomColorSchema,

  // 옵션
  shoesStyle: ShoesStyleSchema.optional(),
  shoesColor: ShoesColorSchema.optional(),
  accessory: AccessorySchema.optional(),

  // 렌더링/애니메이션
  animPreset: AnimPresetSchema.optional(),
})

export type AvatarConfig = z.infer<typeof AvatarConfigSchema>

// ============================================
// Default Values
// ============================================
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 1,
  skinTone: "medium",
  hairStyle: "basic",
  hairColor: "black",
  topStyle: "tshirt",
  topColor: "navy",
  bottomStyle: "pants",
  bottomColor: "black",
}

// ============================================
// Utility Functions
// ============================================

/**
 * AvatarConfig 유효성 검사
 */
export function isValidAvatarConfig(value: unknown): value is AvatarConfig {
  return AvatarConfigSchema.safeParse(value).success
}

/**
 * 안전하게 AvatarConfig 가져오기 (유효하지 않으면 기본값)
 */
export function getSafeAvatarConfig(value: unknown): AvatarConfig {
  const result = AvatarConfigSchema.safeParse(value)
  return result.success ? result.data : DEFAULT_AVATAR_CONFIG
}

/**
 * 텍스처 키 생성 (캐싱용)
 * @example "avatar-v1-abc123"
 */
export function generateAvatarTextureKey(config: AvatarConfig): string {
  const str = JSON.stringify(config)
  const hash = simpleHash(str)
  return `avatar-v${config.version}-${hash}`
}

/**
 * 간단한 해시 함수 (텍스처 키용)
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8)
}
