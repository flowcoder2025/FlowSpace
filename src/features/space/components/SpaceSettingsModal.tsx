"use client"

import { useState, useMemo } from "react"
import {
  Button,
  Input,
  Label,
  VStack,
  HStack,
  Text,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui"
import { saveSpaceParticipant, type SpaceParticipant } from "./ParticipantEntryModal"
import {
  type AvatarConfig,
  type ClassicColorId,
  type CustomCharacterId,
  CLASSIC_COLOR_META,
  CUSTOM_CHARACTER_META,
  parseAvatarString,
  serializeAvatarConfig,
} from "../avatar"

// ============================================
// Types
// ============================================
interface SpaceSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  currentNickname: string
  currentAvatar: string
  onSave: (nickname: string, avatar: string) => void
}

interface SettingsFormProps {
  spaceId: string
  currentNickname: string
  currentAvatar: string
  onSave: (nickname: string, avatar: string) => void
  onCancel: () => void
}

// ============================================
// Avatar Type Selection
// ============================================
type AvatarTypeTab = "classic" | "custom"

// ============================================
// Form Component (separated for key-based reset)
// ============================================
function SettingsForm({
  spaceId,
  currentNickname,
  currentAvatar,
  onSave,
  onCancel,
}: SettingsFormProps) {
  // Parse current avatar to determine initial state
  const initialConfig = useMemo(() => parseAvatarString(currentAvatar), [currentAvatar])
  const initialTab: AvatarTypeTab = initialConfig.type

  // Form state
  const [nickname, setNickname] = useState(currentNickname)
  const [avatarTab, setAvatarTab] = useState<AvatarTypeTab>(initialTab)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(initialConfig)
  const [error, setError] = useState<string | null>(null)

  // Serialize current avatar config for comparison
  const currentAvatarString = useMemo(
    () => serializeAvatarConfig(avatarConfig),
    [avatarConfig]
  )

  // Derived state: has changes
  const hasChanges = useMemo(
    () => nickname !== currentNickname || currentAvatarString !== currentAvatar,
    [nickname, currentAvatarString, currentNickname, currentAvatar]
  )

  const handleSave = () => {
    setError(null)

    const trimmedNickname = nickname.trim()

    if (!trimmedNickname) {
      setError("참가자명을 입력해주세요")
      return
    }

    if (trimmedNickname.includes(" ")) {
      setError("참가자명에 띄어쓰기를 사용할 수 없습니다")
      return
    }

    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      setError("참가자명은 2~20자 사이로 입력해주세요")
      return
    }

    // Serialize avatar config to string
    const avatarString = serializeAvatarConfig(avatarConfig)

    // Save to localStorage
    const participant: SpaceParticipant = {
      spaceId,
      nickname: trimmedNickname,
      avatar: avatarString,
      lastVisit: Date.now(),
    }
    saveSpaceParticipant(participant)

    // Notify parent and close
    onSave(trimmedNickname, avatarString)
  }

  const selectClassicColor = (colorId: ClassicColorId) => {
    setAvatarConfig({ type: "classic", colorId })
  }

  const selectCustomCharacter = (characterId: CustomCharacterId) => {
    setAvatarConfig({ type: "custom", characterId })
  }

  const isClassicSelected = (colorId: string) =>
    avatarConfig.type === "classic" && avatarConfig.colorId === colorId

  const isCustomSelected = (characterId: string) =>
    avatarConfig.type === "custom" && avatarConfig.characterId === characterId

  return (
    <>
      <ModalHeader>
        <ModalTitle>공간 설정</ModalTitle>
        <ModalDescription>
          이 공간에서 사용할 참가자 정보를 변경할 수 있습니다
        </ModalDescription>
      </ModalHeader>

      <VStack gap="lg" className="py-4">
        {/* Nickname Input */}
        <VStack gap="sm">
          <Label htmlFor="settings-nickname">참가자명</Label>
          <Input
            id="settings-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.replace(/\s/g, ""))}
            placeholder="공간에서 사용할 이름 (띄어쓰기 불가)"
            maxLength={20}
          />
          <Text size="xs" tone="muted">
            귓속말 기능을 위해 띄어쓰기 없이 입력해주세요
          </Text>
        </VStack>

        {/* Avatar Selection with Tabs */}
        <VStack gap="sm">
          <Label>캐릭터 선택</Label>

          {/* Tab Buttons */}
          <HStack gap="sm" className="w-full">
            <button
              type="button"
              onClick={() => {
                setAvatarTab("classic")
                if (avatarConfig.type !== "classic") {
                  setAvatarConfig({ type: "classic", colorId: "default" })
                }
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                avatarTab === "classic"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              클래식
            </button>
            <button
              type="button"
              onClick={() => {
                setAvatarTab("custom")
                if (avatarConfig.type !== "custom" && CUSTOM_CHARACTER_META.length > 0) {
                  setAvatarConfig({ type: "custom", characterId: CUSTOM_CHARACTER_META[0].id })
                }
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                avatarTab === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              커스텀
            </button>
          </HStack>

          {/* Classic Colors */}
          {avatarTab === "classic" && (
            <HStack gap="sm" className="flex-wrap pt-2">
              {CLASSIC_COLOR_META.map((colorMeta) => (
                <button
                  key={colorMeta.id}
                  type="button"
                  onClick={() => selectClassicColor(colorMeta.id)}
                  className={`size-10 rounded-full transition-all ${colorMeta.displayColor} ${
                    isClassicSelected(colorMeta.id)
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  title={colorMeta.name}
                  aria-label={`${colorMeta.name} 색상 선택`}
                  aria-pressed={isClassicSelected(colorMeta.id)}
                />
              ))}
            </HStack>
          )}

          {/* Custom Characters */}
          {avatarTab === "custom" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {CUSTOM_CHARACTER_META.map((charMeta) => {
                // Calculate scale to fit character in preview
                // Show full frame height, scale width proportionally
                const targetHeight = 80
                const scale = targetHeight / charMeta.frameHeight
                const scaledFrameWidth = charMeta.frameWidth * scale
                const scaledFrameHeight = charMeta.frameHeight * scale

                return (
                  <button
                    key={charMeta.id}
                    type="button"
                    onClick={() => selectCustomCharacter(charMeta.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                      isCustomSelected(charMeta.id)
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                    aria-pressed={isCustomSelected(charMeta.id)}
                  >
                    {/* Character Preview (first frame only) */}
                    <div
                      className="overflow-hidden"
                      style={{
                        width: Math.ceil(scaledFrameWidth),
                        height: Math.ceil(scaledFrameHeight),
                      }}
                    >
                      <div
                        style={{
                          width: charMeta.frameWidth * charMeta.columns * scale,
                          height: charMeta.frameHeight * charMeta.rows * scale,
                          backgroundImage: `url(${charMeta.spriteUrl})`,
                          backgroundPosition: "0 0",
                          backgroundSize: `${charMeta.frameWidth * charMeta.columns * scale}px ${charMeta.frameHeight * charMeta.rows * scale}px`,
                          imageRendering: "pixelated",
                        }}
                      />
                    </div>
                    <Text size="sm" className="font-medium">
                      {charMeta.name}
                    </Text>
                  </button>
                )
              })}

              {CUSTOM_CHARACTER_META.length === 0 && (
                <Text size="sm" tone="muted" className="col-span-2 text-center py-4">
                  커스텀 캐릭터가 없습니다
                </Text>
              )}
            </div>
          )}
        </VStack>

        {/* Error Message */}
        {error && (
          <Text size="sm" className="text-destructive">
            {error}
          </Text>
        )}

        {/* Change Notice */}
        {hasChanges && (
          <Text size="xs" tone="muted" className="text-center">
            변경사항을 저장하면 공간에 다시 연결됩니다
          </Text>
        )}
      </VStack>

      <ModalFooter>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges}>
          저장
        </Button>
      </ModalFooter>
    </>
  )
}

// ============================================
// Modal Component
// ============================================
export function SpaceSettingsModal({
  open,
  onOpenChange,
  spaceId,
  currentNickname,
  currentAvatar,
  onSave,
}: SpaceSettingsModalProps) {
  const handleSave = (nickname: string, avatar: string) => {
    onSave(nickname, avatar)
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-md">
        {/* Key를 사용하여 모달이 열릴 때마다 폼 상태 리셋 */}
        {open && (
          <SettingsForm
            key={`${spaceId}-${currentNickname}-${currentAvatar}-${open}`}
            spaceId={spaceId}
            currentNickname={currentNickname}
            currentAvatar={currentAvatar}
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </ModalContent>
    </Modal>
  )
}
