/**
 * Editor Commands Hook
 *
 * 에디터 명령어 처리 및 실행
 * 파싱된 명령어를 받아 적절한 동작 수행
 */

import { useCallback, useMemo } from "react"
import type { SpaceRole } from "@prisma/client"
import { useEditorStore } from "../stores/editorStore"
import type { ParsedEditorCommand, GridPosition, CommandExecutionResult } from "../types/editor.types"
import {
  canExecuteCommand,
  generateHelpText,
  getCommandById,
  EDITOR_ALLOWED_ROLES,
} from "@/config/editor-commands"
import {
  getAssetByAlias,
  getAssetsByCategory,
  searchAssets,
  formatAssetList,
  isPairObject,
  getCategoryIdByName,
} from "@/config"

// ============================================
// Types
// ============================================

export interface UseEditorCommandsOptions {
  /** 현재 사용자의 공간 역할 */
  userRole: SpaceRole
  /** 현재 캐릭터 위치 (그리드 좌표) */
  characterPosition: GridPosition
  /** 캐릭터가 바라보는 방향 */
  characterDirection: "up" | "down" | "left" | "right"
  /** 사용자 ID (배치자 기록용) */
  userId: string
  /** 시스템 메시지 출력 콜백 */
  onSystemMessage?: (message: string, type: "info" | "success" | "warning" | "error") => void
}

export interface UseEditorCommandsReturn {
  /** 에디터 사용 가능 여부 */
  canUseEditor: boolean
  /** 명령어 실행 함수 */
  executeCommand: (command: ParsedEditorCommand) => Promise<CommandExecutionResult>
  /** 도움말 텍스트 */
  helpText: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * 캐릭터 방향 기준 앞 타일 좌표 계산
 */
function getPositionInFront(
  position: GridPosition,
  direction: "up" | "down" | "left" | "right"
): GridPosition {
  switch (direction) {
    case "up":
      return { x: position.x, y: position.y - 1 }
    case "down":
      return { x: position.x, y: position.y + 1 }
    case "left":
      return { x: position.x - 1, y: position.y }
    case "right":
      return { x: position.x + 1, y: position.y }
  }
}

// ============================================
// Hook Implementation
// ============================================

export function useEditorCommands(options: UseEditorCommandsOptions): UseEditorCommandsReturn {
  const {
    userRole,
    characterPosition,
    characterDirection,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId,
    onSystemMessage,
  } = options

  // Store actions
  const {
    toggleEditor,
    selectAsset,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setTool: _setTool,
    setPairPhase,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setPairFirstPosition,
    togglePanel,
    setCategory,
    setSearchQuery,
    placeObject,
    deleteObject,
    updateObject,
    undo,
    redo,
    copyObject,
    pasteObject,
    mode,
    objects,
    clipboard,
  } = useEditorStore()

  // 에디터 사용 가능 여부
  const canUseEditor = useMemo(
    () => EDITOR_ALLOWED_ROLES.includes(userRole),
    [userRole]
  )

  // 도움말 텍스트
  const helpText = useMemo(
    () => generateHelpText(userRole),
    [userRole]
  )

  // 메시지 출력 헬퍼
  const notify = useCallback(
    (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
      onSystemMessage?.(message, type)
    },
    [onSystemMessage]
  )

  // 명령어 실행
  const executeCommand = useCallback(
    async (command: ParsedEditorCommand): Promise<CommandExecutionResult> => {
      const { commandId, args } = command

      // 권한 체크
      if (!canExecuteCommand(commandId, userRole)) {
        return {
          success: false,
          message: "이 명령어를 사용할 권한이 없습니다.",
          errorCode: "PERMISSION_DENIED",
        }
      }

      // 명령어 설정 조회
      const cmdConfig = getCommandById(commandId)
      if (!cmdConfig) {
        return {
          success: false,
          message: "알 수 없는 명령어입니다.",
          errorCode: "UNKNOWN_COMMAND",
        }
      }

      try {
        // 명령어별 처리
        switch (commandId) {
          // ========== Basic Commands ==========

          case "editor": {
            toggleEditor()
            const isNowActive = !mode.isActive
            // 에디터 활성화 시 패널도 함께 열기
            if (isNowActive) {
              togglePanel()
            }
            notify(
              isNowActive ? "에디터 모드가 활성화되었습니다. ESC로 종료" : "에디터 모드가 비활성화되었습니다.",
              "info"
            )
            return {
              success: true,
              message: isNowActive ? "에디터 활성화" : "에디터 비활성화",
            }
          }

          case "create": {
            if (!args.assetName) {
              return {
                success: false,
                message: "에셋 이름을 입력해주세요. 예: @생성 의자",
                errorCode: "MISSING_ASSET_NAME",
              }
            }

            // 에셋 조회 (별칭 또는 이름으로)
            const asset = getAssetByAlias(args.assetName)
            if (!asset) {
              notify(`'${args.assetName}' 에셋을 찾을 수 없습니다.`, "warning")
              return {
                success: false,
                message: `'${args.assetName}' 에셋을 찾을 수 없습니다. @검색으로 검색해보세요.`,
                errorCode: "ASSET_NOT_FOUND",
              }
            }

            // 배치 위치 결정 (명시적 좌표 또는 캐릭터 앞)
            const targetPosition = args.coordinates || getPositionInFront(characterPosition, characterDirection)

            // 페어 오브젝트 여부 확인
            if (isPairObject(asset.id)) {
              // 페어 배치 시작
              selectAsset(asset)
              setPairPhase("placing_first")
              notify(
                `'${asset.name}' 시작 위치를 클릭하거나 Enter로 확인하세요.`,
                "info"
              )
              return {
                success: true,
                message: "페어 오브젝트 배치 시작",
                data: { asset, phase: "placing_first" },
              }
            }

            // 일반 오브젝트 배치
            const placedObject = await placeObject({
              assetId: asset.id,
              position: targetPosition,
            })

            if (placedObject) {
              notify(`'${asset.name}'을(를) (${targetPosition.x}, ${targetPosition.y})에 배치했습니다.`, "success")
              return {
                success: true,
                message: `${asset.name} 배치 완료`,
                data: { object: placedObject },
              }
            } else {
              return {
                success: false,
                message: "오브젝트 배치에 실패했습니다.",
                errorCode: "PLACE_FAILED",
              }
            }
          }

          case "delete": {
            // 캐릭터 앞 타일에 있는 오브젝트 찾기
            const frontPosition = getPositionInFront(characterPosition, characterDirection)
            const objectsArray = Array.from(objects.values())
            const targetObject = objectsArray.find(
              (obj) => obj.position.x === frontPosition.x && obj.position.y === frontPosition.y
            )

            if (!targetObject) {
              notify("삭제할 오브젝트가 없습니다.", "warning")
              return {
                success: false,
                message: "캐릭터 앞에 오브젝트가 없습니다.",
                errorCode: "NO_OBJECT_TO_DELETE",
              }
            }

            const deleted = await deleteObject(targetObject.id)
            if (deleted) {
              notify("오브젝트가 삭제되었습니다.", "success")
              return {
                success: true,
                message: "오브젝트 삭제 완료",
                data: { objectId: targetObject.id },
              }
            } else {
              return {
                success: false,
                message: "오브젝트 삭제에 실패했습니다.",
                errorCode: "DELETE_FAILED",
              }
            }
          }

          case "list": {
            let listMessage: string

            if (args.category) {
              // 카테고리별 목록
              const categoryId = getCategoryIdByName(args.category) || args.category
              const categoryAssets = getAssetsByCategory(categoryId)

              if (categoryAssets.length === 0) {
                listMessage = `'${args.category}' 카테고리에 에셋이 없습니다.`
              } else {
                listMessage = formatAssetList(categoryAssets, args.category)
              }
            } else {
              // 전체 목록 (카테고리 요약)
              listMessage = "[배치 가능 에셋]\n카테고리: 바닥, 벽/구조물, 가구, 장식, 상호작용\n상세 목록: @목록 <카테고리명>"
            }

            // 에디터 패널 열기
            togglePanel()
            if (args.category) {
              setCategory(getCategoryIdByName(args.category) || args.category)
            }

            notify(listMessage, "info")
            return {
              success: true,
              message: listMessage,
            }
          }

          // ========== Extended Commands ==========

          case "rotate": {
            // 마지막 배치한 오브젝트 또는 선택된 오브젝트 회전
            const objectsArray = Array.from(objects.values())
            const lastObject = objectsArray[objectsArray.length - 1]

            if (!lastObject) {
              notify("회전할 오브젝트가 없습니다.", "warning")
              return {
                success: false,
                message: "회전할 오브젝트가 없습니다.",
                errorCode: "NO_OBJECT_TO_ROTATE",
              }
            }

            const newRotation = ((lastObject.rotation + 90) % 360) as 0 | 90 | 180 | 270
            const rotated = await updateObject({
              id: lastObject.id,
              rotation: newRotation,
            })

            if (rotated) {
              notify(`오브젝트를 ${newRotation}도로 회전했습니다.`, "success")
              return {
                success: true,
                message: `회전: ${newRotation}도`,
                data: { rotation: newRotation },
              }
            } else {
              return {
                success: false,
                message: "회전에 실패했습니다.",
                errorCode: "ROTATE_FAILED",
              }
            }
          }

          case "undo": {
            undo()
            notify("마지막 작업을 취소했습니다.", "info")
            return {
              success: true,
              message: "Undo 완료",
            }
          }

          case "redo": {
            redo()
            notify("작업을 다시 실행했습니다.", "info")
            return {
              success: true,
              message: "Redo 완료",
            }
          }

          case "search": {
            if (!args.keyword) {
              return {
                success: false,
                message: "검색어를 입력해주세요. 예: @검색 나무",
                errorCode: "MISSING_KEYWORD",
              }
            }

            const results = searchAssets(args.keyword)
            if (results.length === 0) {
              notify(`'${args.keyword}' 검색 결과가 없습니다.`, "warning")
              return {
                success: false,
                message: "검색 결과 없음",
                errorCode: "NO_SEARCH_RESULTS",
              }
            }

            const searchResultMessage = formatAssetList(results, `검색: ${args.keyword}`)

            // 패널 열고 검색어 설정
            togglePanel()
            setSearchQuery(args.keyword)

            notify(searchResultMessage, "info")
            return {
              success: true,
              message: searchResultMessage,
              data: { results },
            }
          }

          // ========== Advanced Commands ==========

          case "copy": {
            const frontPosition = getPositionInFront(characterPosition, characterDirection)
            const objectsArray = Array.from(objects.values())
            const targetObject = objectsArray.find(
              (obj) => obj.position.x === frontPosition.x && obj.position.y === frontPosition.y
            )

            if (!targetObject) {
              notify("복사할 오브젝트가 없습니다.", "warning")
              return {
                success: false,
                message: "캐릭터 앞에 오브젝트가 없습니다.",
                errorCode: "NO_OBJECT_TO_COPY",
              }
            }

            copyObject(targetObject.id)
            notify("오브젝트가 클립보드에 복사되었습니다.", "success")
            return {
              success: true,
              message: "복사 완료",
              data: { objectId: targetObject.id },
            }
          }

          case "paste": {
            if (!clipboard) {
              notify("클립보드가 비어있습니다. 먼저 @복사를 실행하세요.", "warning")
              return {
                success: false,
                message: "클립보드가 비어있습니다.",
                errorCode: "CLIPBOARD_EMPTY",
              }
            }

            const pastePosition = getPositionInFront(characterPosition, characterDirection)
            const pasted = await pasteObject(pastePosition)

            if (pasted) {
              notify(`오브젝트를 (${pastePosition.x}, ${pastePosition.y})에 붙여넣었습니다.`, "success")
              return {
                success: true,
                message: "붙여넣기 완료",
                data: { object: pasted },
              }
            } else {
              return {
                success: false,
                message: "붙여넣기에 실패했습니다.",
                errorCode: "PASTE_FAILED",
              }
            }
          }

          case "select": {
            if (!args.radius) {
              return {
                success: false,
                message: "반경을 입력해주세요. 예: @선택 반경 3",
                errorCode: "MISSING_RADIUS",
              }
            }

            // 반경 내 오브젝트 선택 (추후 구현)
            notify(`반경 ${args.radius} 타일 내 오브젝트 선택 (구현 예정)`, "info")
            return {
              success: true,
              message: `반경 ${args.radius} 선택`,
              data: { radius: args.radius },
            }
          }

          case "edit": {
            if (!args.objectId) {
              return {
                success: false,
                message: "오브젝트 ID를 입력해주세요. 예: @수정 portal-1",
                errorCode: "MISSING_OBJECT_ID",
              }
            }

            const targetObj = objects.get(args.objectId)
            if (!targetObj) {
              notify(`'${args.objectId}' 오브젝트를 찾을 수 없습니다.`, "warning")
              return {
                success: false,
                message: "오브젝트를 찾을 수 없습니다.",
                errorCode: "OBJECT_NOT_FOUND",
              }
            }

            // 수정 모드 진입 (추후 구현)
            notify(`'${args.objectId}' 오브젝트 수정 모드 (구현 예정)`, "info")
            return {
              success: true,
              message: "수정 모드 진입",
              data: { object: targetObj },
            }
          }

          default:
            return {
              success: false,
              message: "지원하지 않는 명령어입니다.",
              errorCode: "UNSUPPORTED_COMMAND",
            }
        }
      } catch (error) {
        console.error("Editor command execution error:", error)
        return {
          success: false,
          message: "명령어 실행 중 오류가 발생했습니다.",
          errorCode: "EXECUTION_ERROR",
        }
      }
    },
    [
      userRole,
      characterPosition,
      characterDirection,
      mode,
      objects,
      clipboard,
      notify,
      toggleEditor,
      selectAsset,
      setPairPhase,
      togglePanel,
      setCategory,
      setSearchQuery,
      placeObject,
      deleteObject,
      updateObject,
      undo,
      redo,
      copyObject,
      pasteObject,
    ]
  )

  return {
    canUseEditor,
    executeCommand,
    helpText,
  }
}
