"use client"

/**
 * MediaSettingsModal
 *
 * 미디어 설정 모달 (음성/비디오)
 * - 탭 네비게이션
 * - 저장/취소/기본값 복원
 * - ESC로 닫기
 * - 반응형 크기
 */

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Settings, Mic, Video, RotateCcw } from "lucide-react"
import { AudioSettingsTab } from "./AudioSettingsTab"
import { VideoSettingsTab } from "./VideoSettingsTab"
import { useAudioSettings } from "../../hooks/useAudioSettings"
import { useVideoSettings } from "../../hooks/useVideoSettings"

export type MediaSettingsTab = "audio" | "video"

interface MediaSettingsModalProps {
  /** 모달 열림 상태 */
  open: boolean
  /** 모달 닫기 콜백 */
  onOpenChange: (open: boolean) => void
  /** 기본 탭 (드롭다운에서 진입 시 설정) */
  defaultTab?: MediaSettingsTab
  /** 📌 설정 적용 콜백 (모달 닫힐 때 호출, 비디오 설정 변경 시 카메라 재시작 등) */
  onApply?: () => void
}

export function MediaSettingsModal({
  open,
  onOpenChange,
  defaultTab = "audio",
  onApply,
}: MediaSettingsModalProps) {
  // 📌 모달이 열릴 때마다 defaultTab으로 초기화되도록 key를 사용하지 않고
  // 내부 상태를 관리. openedWithTab을 추적하여 열릴 때만 초기화
  const [activeTab, setActiveTab] = useState<MediaSettingsTab>(defaultTab)
  const [lastOpenState, setLastOpenState] = useState(false)

  const { resetToDefaults: resetAudioDefaults } = useAudioSettings()
  const { resetToDefaults: resetVideoDefaults } = useVideoSettings()

  // 모달이 닫혔다가 열릴 때 defaultTab으로 초기화
  // useEffect 대신 렌더링 중에 동기적으로 처리
  if (open && !lastOpenState) {
    // 모달이 방금 열림 - defaultTab으로 설정
    setActiveTab(defaultTab)
  }
  if (open !== lastOpenState) {
    setLastOpenState(open)
  }

  // 기본값 복원
  const handleResetDefaults = useCallback(() => {
    if (activeTab === "audio") {
      resetAudioDefaults()
    } else {
      resetVideoDefaults()
    }
  }, [activeTab, resetAudioDefaults, resetVideoDefaults])

  // 모든 설정 기본값 복원
  const handleResetAll = useCallback(() => {
    resetAudioDefaults()
    resetVideoDefaults()
  }, [resetAudioDefaults, resetVideoDefaults])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            음성 및 비디오 설정
          </DialogTitle>
          <DialogDescription className="sr-only">
            마이크, 스피커, 카메라 장치 및 고급 설정을 구성합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as MediaSettingsTab)}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Mic className="size-4" />
              음성
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="size-4" />
              비디오
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="mt-4">
            <AudioSettingsTab />
          </TabsContent>

          <TabsContent value="video" className="mt-4">
            <VideoSettingsTab />
          </TabsContent>
        </Tabs>

        {/* 하단 버튼 */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-2 size-4" />
            {activeTab === "audio" ? "음성" : "비디오"} 기본값
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="text-muted-foreground"
            >
              전체 초기화
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                // 📌 설정 적용 콜백 호출 (카메라 재시작 등)
                onApply?.()
                onOpenChange(false)
              }}
            >
              완료
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
