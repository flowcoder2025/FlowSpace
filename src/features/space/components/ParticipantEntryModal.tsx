"use client"

import { useState } from "react"
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
} from "@/components/ui"

// ============================================
// Types
// ============================================
export interface SpaceParticipant {
  spaceId: string
  nickname: string
  avatar: string
  lastVisit: number
}

interface ParticipantEntryModalProps {
  open: boolean
  spaceId: string
  spaceName: string
  defaultNickname?: string
  onComplete: (participant: { nickname: string; avatar: string }) => void
}

interface ParticipantFormProps {
  spaceId: string
  spaceName: string
  defaultNickname: string
  onComplete: (participant: { nickname: string; avatar: string }) => void
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
// Storage Helpers
// ============================================
const STORAGE_KEY_PREFIX = "space-participant-"

export function getSpaceParticipant(spaceId: string): SpaceParticipant | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${spaceId}`)
    if (stored) {
      return JSON.parse(stored) as SpaceParticipant
    }
  } catch (error) {
    console.warn("[ParticipantEntry] Failed to read from localStorage:", error)
  }
  return null
}

export function saveSpaceParticipant(participant: SpaceParticipant): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${participant.spaceId}`,
      JSON.stringify(participant)
    )
  } catch (error) {
    console.warn("[ParticipantEntry] Failed to save to localStorage:", error)
  }
}

// ============================================
// Form Component (separated for key-based reset)
// ============================================
function ParticipantForm({
  spaceId,
  spaceName,
  defaultNickname,
  onComplete,
}: ParticipantFormProps) {
  const [nickname, setNickname] = useState(defaultNickname)
  const [avatar, setAvatar] = useState("default")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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

    // Notify parent
    onComplete({ nickname: trimmedNickname, avatar })
  }

  return (
    <>
      <ModalHeader>
        <ModalTitle>공간 입장</ModalTitle>
        <ModalDescription>
          <span className="font-medium text-foreground">{spaceName}</span>
          에서 사용할 참가자명을 입력해주세요
        </ModalDescription>
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <VStack gap="lg" className="pt-4">
          {/* Nickname Input */}
          <VStack gap="sm">
            <Label htmlFor="participant-nickname">참가자명</Label>
            <Input
              id="participant-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="공간에서 사용할 이름"
              maxLength={20}
              autoFocus
            />
            <Text size="xs" tone="muted">
              이 공간에서 다른 참가자에게 표시되는 이름입니다
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
                  className={`size-12 rounded-full transition-all ${opt.color} ${
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

          {/* Submit Button */}
          <Button type="submit" className="w-full">
            입장하기
          </Button>
        </VStack>
      </form>
    </>
  )
}

// ============================================
// Modal Component
// ============================================
export function ParticipantEntryModal({
  open,
  spaceId,
  spaceName,
  defaultNickname = "",
  onComplete,
}: ParticipantEntryModalProps) {
  return (
    <Modal open={open} onOpenChange={() => {}}>
      <ModalContent className="sm:max-w-md" preventClose>
        {/* Key를 사용하여 모달이 열릴 때마다 폼 상태 리셋 */}
        {open && (
          <ParticipantForm
            key={`${spaceId}-${open}`}
            spaceId={spaceId}
            spaceName={spaceName}
            defaultNickname={defaultNickname}
            onComplete={onComplete}
          />
        )}
      </ModalContent>
    </Modal>
  )
}
