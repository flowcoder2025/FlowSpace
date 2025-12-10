"use client"

import { useState, useEffect } from "react"
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
// Component
// ============================================
export function SpaceSettingsModal({
  open,
  onOpenChange,
  spaceId,
  currentNickname,
  currentAvatar,
  onSave,
}: SpaceSettingsModalProps) {
  const [nickname, setNickname] = useState(currentNickname)
  const [avatar, setAvatar] = useState(currentAvatar)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setNickname(currentNickname)
      setAvatar(currentAvatar)
      setError(null)
      setHasChanges(false)
    }
  }, [open, currentNickname, currentAvatar])

  // Track changes
  useEffect(() => {
    setHasChanges(nickname !== currentNickname || avatar !== currentAvatar)
  }, [nickname, avatar, currentNickname, currentAvatar])

  const handleSave = () => {
    setError(null)

    const trimmedNickname = nickname.trim()

    if (!trimmedNickname) {
      setError("참가자명을 입력해주세요")
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
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-md">
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
              onChange={(e) => setNickname(e.target.value)}
              placeholder="공간에서 사용할 이름"
              maxLength={20}
            />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            저장
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
