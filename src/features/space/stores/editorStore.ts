/**
 * Editor Zustand Store
 *
 * 맵 에디터 전역 상태 관리
 * - 에디터 모드 상태
 * - 배치된 오브젝트 캐시
 * - 히스토리 (Undo/Redo)
 * - 클립보드
 */

import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type {
  EditorStore,
  EditorStoreState,
  EditorModeState,
  EditorPanelState,
  EditorTool,
  PairPlacementPhase,
  AreaPlacementPhase,
  PlacedObject,
  HistoryEntry,
  CreateObjectInput,
  UpdateObjectInput,
  ObjectPlaceEvent,
  ObjectDeleteEvent,
  ObjectUpdateEvent,
  GridPosition,
} from "../types/editor.types"
import type { AssetMetadata } from "@/config/asset-registry"
import { EDITOR_CONFIG } from "@/config/editor-config"

// ============================================
// Initial State
// ============================================

const initialModeState: EditorModeState = {
  isActive: false,
  selectedTool: "select",
  selectedAsset: null,
  pairPhase: "idle",
  pairFirstPosition: null,
  // 🆕 영역 배치 초기값
  areaPhase: "idle",
  areaStartPosition: null,
  areaEndPosition: null,
}

const initialPanelState: EditorPanelState = {
  isOpen: false,
  selectedCategory: null,
  searchQuery: "",
}

const initialState: EditorStoreState = {
  mode: initialModeState,
  panel: initialPanelState,
  objects: new Map(),
  history: [],
  historyIndex: -1,
  clipboard: null,
  isLoading: false,
  error: null,
}

// ============================================
// Store Implementation
// ============================================

export const useEditorStore = create<EditorStore>()(
  devtools(
    (set, get): EditorStore => ({
      // ==========================================
      // State
      // ==========================================
      ...initialState,

      // ==========================================
      // Mode Actions
      // ==========================================

      toggleEditor: () => {
        set((state) => ({
          mode: {
            ...state.mode,
            isActive: !state.mode.isActive,
            // 에디터 비활성화 시 상태 초기화
            ...(!state.mode.isActive
              ? {}
              : {
                  selectedTool: "select",
                  selectedAsset: null,
                  pairPhase: "idle",
                  pairFirstPosition: null,
                  // 🆕 영역 배치도 초기화
                  areaPhase: "idle",
                  areaStartPosition: null,
                  areaEndPosition: null,
                }),
          },
          panel: {
            ...state.panel,
            isOpen: !state.mode.isActive ? state.panel.isOpen : false,
          },
        }))
      },

      setTool: (tool: EditorTool) => {
        set((state) => ({
          mode: {
            ...state.mode,
            selectedTool: tool,
            // 도구 변경 시 페어/영역 배치 취소
            pairPhase: "idle",
            pairFirstPosition: null,
            areaPhase: "idle",
            areaStartPosition: null,
            areaEndPosition: null,
          },
        }))
      },

      selectAsset: (asset: AssetMetadata | null) => {
        set((state) => ({
          mode: {
            ...state.mode,
            selectedAsset: asset,
            selectedTool: asset ? "place" : "select",
            // 새 에셋 선택 시 페어/영역 배치 초기화
            pairPhase: "idle",
            pairFirstPosition: null,
            areaPhase: "idle",
            areaStartPosition: null,
            areaEndPosition: null,
          },
        }))
      },

      setPairPhase: (phase: PairPlacementPhase) => {
        set((state) => ({
          mode: {
            ...state.mode,
            pairPhase: phase,
          },
        }))
      },

      setPairFirstPosition: (position: GridPosition | null) => {
        set((state) => ({
          mode: {
            ...state.mode,
            pairFirstPosition: position,
          },
        }))
      },

      // 🆕 Area Placement Actions
      setAreaPhase: (phase: AreaPlacementPhase) => {
        set((state) => ({
          mode: {
            ...state.mode,
            areaPhase: phase,
          },
        }))
      },

      setAreaStartPosition: (position: GridPosition | null) => {
        set((state) => ({
          mode: {
            ...state.mode,
            areaStartPosition: position,
          },
        }))
      },

      setAreaEndPosition: (position: GridPosition | null) => {
        set((state) => ({
          mode: {
            ...state.mode,
            areaEndPosition: position,
          },
        }))
      },

      // ==========================================
      // Panel Actions
      // ==========================================

      togglePanel: () => {
        set((state) => ({
          panel: {
            ...state.panel,
            isOpen: !state.panel.isOpen,
          },
        }))
      },

      setCategory: (category: string | null) => {
        set((state) => ({
          panel: {
            ...state.panel,
            selectedCategory: category,
          },
        }))
      },

      setSearchQuery: (query: string) => {
        set((state) => ({
          panel: {
            ...state.panel,
            searchQuery: query,
          },
        }))
      },

      // ==========================================
      // Object Actions
      // ==========================================

      placeObject: async (input: CreateObjectInput): Promise<PlacedObject | null> => {
        const state = get()

        // 새 오브젝트 생성
        const newObject: PlacedObject = {
          id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          assetId: input.assetId,
          position: input.position,
          rotation: input.rotation ?? 0,
          linkedObjectId: input.linkedObjectId,
          bounds: input.bounds, // 🆕 영역 범위 (area 타입용)
          customData: input.customData,
          placedBy: "", // 실제 호출 시 설정
          placedAt: new Date(),
        }

        // 히스토리 엔트리 생성
        const historyEntry: HistoryEntry = {
          type: "place",
          objectId: newObject.id,
          previousState: null,
          newState: newObject,
          timestamp: new Date(),
        }

        // 상태 업데이트
        const newObjects = new Map(state.objects)
        newObjects.set(newObject.id, newObject)

        // 히스토리 추가 (현재 위치 이후 잘라내기)
        const newHistory = [
          ...state.history.slice(0, state.historyIndex + 1),
          historyEntry,
        ].slice(-EDITOR_CONFIG.history.maxUndoStack)

        set({
          objects: newObjects,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })

        return newObject
      },

      deleteObject: async (id: string): Promise<boolean> => {
        const state = get()
        const object = state.objects.get(id)

        if (!object) return false

        // 히스토리 엔트리 생성
        const historyEntry: HistoryEntry = {
          type: "delete",
          objectId: id,
          previousState: object,
          newState: null,
          timestamp: new Date(),
        }

        // 상태 업데이트
        const newObjects = new Map(state.objects)
        newObjects.delete(id)

        const newHistory = [
          ...state.history.slice(0, state.historyIndex + 1),
          historyEntry,
        ].slice(-EDITOR_CONFIG.history.maxUndoStack)

        set({
          objects: newObjects,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })

        return true
      },

      updateObject: async (input: UpdateObjectInput): Promise<PlacedObject | null> => {
        const state = get()
        const object = state.objects.get(input.id)

        if (!object) return null

        // 업데이트된 오브젝트
        const updatedObject: PlacedObject = {
          ...object,
          position: input.position ?? object.position,
          rotation: input.rotation ?? object.rotation,
          linkedObjectId: input.linkedObjectId ?? object.linkedObjectId,
          customData: input.customData ?? object.customData,
        }

        // 히스토리 엔트리 생성
        const historyEntry: HistoryEntry = {
          type: "update",
          objectId: input.id,
          previousState: object,
          newState: updatedObject,
          timestamp: new Date(),
        }

        // 상태 업데이트
        const newObjects = new Map(state.objects)
        newObjects.set(input.id, updatedObject)

        const newHistory = [
          ...state.history.slice(0, state.historyIndex + 1),
          historyEntry,
        ].slice(-EDITOR_CONFIG.history.maxUndoStack)

        set({
          objects: newObjects,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })

        return updatedObject
      },

      // ==========================================
      // History Actions
      // ==========================================

      undo: () => {
        const state = get()
        if (!get().canUndo()) return

        const entry = state.history[state.historyIndex]
        const newObjects = new Map(state.objects)

        // 액션 되돌리기
        switch (entry.type) {
          case "place":
            // 배치 취소 → 삭제
            newObjects.delete(entry.objectId)
            break
          case "delete":
            // 삭제 취소 → 복원
            if (entry.previousState) {
              newObjects.set(entry.objectId, entry.previousState)
            }
            break
          case "update":
          case "move":
          case "rotate":
            // 수정 취소 → 이전 상태로
            if (entry.previousState) {
              newObjects.set(entry.objectId, entry.previousState)
            }
            break
        }

        set({
          objects: newObjects,
          historyIndex: state.historyIndex - 1,
        })
      },

      redo: () => {
        const state = get()
        if (!get().canRedo()) return

        const entry = state.history[state.historyIndex + 1]
        const newObjects = new Map(state.objects)

        // 액션 다시 실행
        switch (entry.type) {
          case "place":
            // 배치 다시 실행
            if (entry.newState) {
              newObjects.set(entry.objectId, entry.newState)
            }
            break
          case "delete":
            // 삭제 다시 실행
            newObjects.delete(entry.objectId)
            break
          case "update":
          case "move":
          case "rotate":
            // 수정 다시 실행
            if (entry.newState) {
              newObjects.set(entry.objectId, entry.newState)
            }
            break
        }

        set({
          objects: newObjects,
          historyIndex: state.historyIndex + 1,
        })
      },

      canUndo: () => {
        const state = get()
        return state.historyIndex >= 0
      },

      canRedo: () => {
        const state = get()
        return state.historyIndex < state.history.length - 1
      },

      // ==========================================
      // Clipboard Actions
      // ==========================================

      copyObject: (id: string) => {
        const state = get()
        const object = state.objects.get(id)

        if (object) {
          set({ clipboard: { ...object } })
        }
      },

      pasteObject: async (position: GridPosition): Promise<PlacedObject | null> => {
        const state = get()
        if (!state.clipboard) return null

        // 클립보드 오브젝트를 새 위치에 복사
        return get().placeObject({
          assetId: state.clipboard.assetId,
          position,
          rotation: state.clipboard.rotation,
          customData: state.clipboard.customData,
        })
      },

      // ==========================================
      // Sync Actions (Socket.io)
      // ==========================================

      syncObjects: (objects: PlacedObject[]) => {
        const newObjectsMap = new Map<string, PlacedObject>()
        for (const obj of objects) {
          newObjectsMap.set(obj.id, obj)
        }

        set({
          objects: newObjectsMap,
          history: [],
          historyIndex: -1,
        })
      },

      handleRemotePlace: (event: ObjectPlaceEvent) => {
        const state = get()
        const newObjects = new Map(state.objects)
        newObjects.set(event.object.id, event.object)

        set({ objects: newObjects })
      },

      handleRemoteDelete: (event: ObjectDeleteEvent) => {
        const state = get()
        const newObjects = new Map(state.objects)
        newObjects.delete(event.objectId)

        set({ objects: newObjects })
      },

      handleRemoteUpdate: (event: ObjectUpdateEvent) => {
        const state = get()
        const newObjects = new Map(state.objects)
        newObjects.set(event.object.id, event.object)

        set({ objects: newObjects })
      },

      // ==========================================
      // Reset
      // ==========================================

      reset: () => {
        set(initialState)
      },
    }),
    { name: "editor-store" }
  )
)

// ============================================
// Selector Hooks (성능 최적화용)
// ============================================

/**
 * 에디터 활성화 상태만 구독
 */
export const useEditorActive = () =>
  useEditorStore((state) => state.mode.isActive)

/**
 * 현재 선택된 도구만 구독
 */
export const useSelectedTool = () =>
  useEditorStore((state) => state.mode.selectedTool)

/**
 * 현재 선택된 에셋만 구독
 */
export const useSelectedAsset = () =>
  useEditorStore((state) => state.mode.selectedAsset)

/**
 * 페어 배치 상태만 구독
 */
export const usePairPlacement = () =>
  useEditorStore((state) => ({
    phase: state.mode.pairPhase,
    firstPosition: state.mode.pairFirstPosition,
  }))

/**
 * 🆕 영역 배치 상태만 구독
 */
export const useAreaPlacement = () =>
  useEditorStore((state) => ({
    phase: state.mode.areaPhase,
    startPosition: state.mode.areaStartPosition,
    endPosition: state.mode.areaEndPosition,
  }))

/**
 * 패널 상태만 구독
 */
export const useEditorPanel = () => useEditorStore((state) => state.panel)

/**
 * 배치된 오브젝트 배열로 반환
 */
export const usePlacedObjects = () =>
  useEditorStore((state) => Array.from(state.objects.values()))

/**
 * Undo/Redo 가능 여부
 */
export const useHistoryState = () =>
  useEditorStore((state) => ({
    canUndo: state.canUndo(),
    canRedo: state.canRedo(),
  }))
