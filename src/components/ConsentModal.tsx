"use client"

/**
 * ConsentModal
 *
 * 녹화 동의 모달 (Option A: 인라인 모달)
 * 같은 페이지에서 동의 → API 호출 → 세션 갱신
 */

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Text, VStack, HStack } from "@/components/ui"

interface ConsentModalProps {
  open: boolean
  onConsented: () => void
}

export function ConsentModal({ open, onConsented }: ConsentModalProps) {
  const { update: updateSession } = useSession()
  const [agreed, setAgreed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!agreed) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedToRecording: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "동의 처리에 실패했습니다")
      }

      // 세션 업데이트 (agreedToRecording 반영)
      await updateSession()

      // 동의 완료 콜백
      onConsented()
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  // 모달은 닫기 버튼 없이 (동의 필수)
  return (
    <Modal open={open} onOpenChange={() => {}}>
      <ModalContent preventClose className="max-w-md">
        <ModalHeader>
          <ModalTitle className="text-xl">
            서비스 이용 동의
          </ModalTitle>
          <ModalDescription>
            FlowSpace 서비스 이용을 위해 아래 내용에 동의해주세요
          </ModalDescription>
        </ModalHeader>

        <VStack gap="md" className="py-4">
          {/* 서비스 안내 */}
          <div className="rounded-lg bg-muted/50 p-4">
            <VStack gap="sm">
              <Text weight="medium" size="sm">
                FlowSpace 서비스 이용 안내
              </Text>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>2D 메타버스 공간에서 실시간 협업이 가능합니다</li>
                <li>음성/영상 통화, 화면공유 기능을 제공합니다</li>
                <li>공간 운영자는 활동을 녹화할 수 있습니다</li>
              </ul>
            </VStack>
          </div>

          {/* 녹화 정책 안내 */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <VStack gap="sm">
              <HStack gap="sm" align="center">
                <div className="size-2 rounded-full bg-red-500 animate-pulse" />
                <Text weight="medium" size="sm" className="text-primary">
                  녹화 정책 안내
                </Text>
              </HStack>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>공간 운영자가 화면공유 내용을 녹화할 수 있습니다</li>
                <li>녹화 시 화면에 <span className="font-mono text-red-500">REC</span> 표시가 나타납니다</li>
                <li>녹화 파일은 교육/기록/증빙 목적으로 활용됩니다</li>
              </ul>
            </VStack>
          </div>

          {/* 동의 체크박스 */}
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id="consent"
              checked={agreed}
              onCheckedChange={(checked: boolean) => setAgreed(checked)}
              className="mt-1"
            />
            <label
              htmlFor="consent"
              className="text-sm leading-relaxed cursor-pointer"
            >
              위 내용을 확인하였으며,{" "}
              <span className="font-medium text-primary">
                서비스 이용약관 및 녹화 정책
              </span>
              에 동의합니다. (필수)
            </label>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <Text size="sm" className="text-destructive">
                {error}
              </Text>
            </div>
          )}
        </VStack>

        <ModalFooter>
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!agreed || isLoading}
          >
            {isLoading ? "처리 중..." : "동의하고 계속하기"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default ConsentModal
