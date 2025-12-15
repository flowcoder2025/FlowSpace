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
// Avatar Options
// ============================================
const AVATAR_OPTIONS = [
  { id: "default", name: "Default", color: "bg-blue-500" },
  { id: "red", name: "Red", color: "bg-red-500" },
  { id: "green", name: "Green", color: "bg-green-500" },
  { id: "purple", name: "Purple", color: "bg-purple-500" },
  { id: "orange", name: "Orange", color: "bg-orange-500" },
  { id: "pink", name: "Pink", color: "bg-pink-500" },
] as const

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
  // Initial values come from props (key change resets component)
  const [nickname, setNickname] = useState(currentNickname)
  const [avatar, setAvatar] = useState(currentAvatar)
  const [error, setError] = useState<string | null>(null)

  // Derived state: has changes (no effect needed)
  const hasChanges = useMemo(
    () => nickname !== currentNickname || avatar !== currentAvatar,
    [nickname, avatar, currentNickname, currentAvatar]
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

    // Save to localStorage
    const participant: SpaceParticipant = {
      spaceId,
      nickname: trimmedNickname,
      avatar,
      lastVisit: Date.now(),
    }
    saveSpaceParticipant(participant)

    // Notify parent and close
    onSave(trimmedNickname, avatar)
  }

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

        {/* Avatar Selection */}
        <VStack gap="sm">
          <Label>아바타 색상</Label>
          <HStack gap="sm" className="flex-wrap">
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAvatar(opt.id)}
                className={`size-10 rounded-full transition-all ${opt.color} ${
                  avatar === opt.id
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={opt.name}
                aria-label={`${opt.name} 색상 선택`}
                aria-pressed={avatar === opt.id}
              />
            ))}
          </HStack>
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
