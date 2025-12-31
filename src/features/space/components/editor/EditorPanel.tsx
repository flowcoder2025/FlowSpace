/**
 * Editor Panel Component
 *
 * 에디터 에셋 팔레트 패널
 * - 카테고리 탭
 * - 에셋 그리드
 * - 검색 기능
 */

"use client"

import { useState, useMemo, useCallback } from "react"
import { X, Search, Grid3X3, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getSortedCategories,
  getAssetsByCategory,
  searchAssets,
  ASSET_REGISTRY,
  type AssetMetadata,
} from "@/config"
import { useEditorStore } from "../../stores/editorStore"

// ============================================
// Types
// ============================================

export interface EditorPanelProps {
  /** 패널 닫기 콜백 */
  onClose?: () => void
  /** 에셋 선택 콜백 */
  onAssetSelect?: (asset: AssetMetadata) => void
  /** 추가 클래스명 */
  className?: string
}

type ViewMode = "grid" | "list"

// ============================================
// Component
// ============================================

export function EditorPanel({
  onClose,
  onAssetSelect,
  className,
}: EditorPanelProps) {
  // Store
  const selectedAsset = useEditorStore((state) => state.mode.selectedAsset)
  const selectedCategory = useEditorStore((state) => state.panel.selectedCategory)
  const searchQuery = useEditorStore((state) => state.panel.searchQuery)
  const setCategory = useEditorStore((state) => state.setCategory)
  const setSearchQuery = useEditorStore((state) => state.setSearchQuery)
  const selectAsset = useEditorStore((state) => state.selectAsset)
  const togglePanel = useEditorStore((state) => state.togglePanel)

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Derived data
  const categories = useMemo(() => getSortedCategories(), [])

  const filteredAssets = useMemo(() => {
    if (searchQuery.trim()) {
      return searchAssets(searchQuery)
    }
    if (selectedCategory) {
      return getAssetsByCategory(selectedCategory)
    }
    return ASSET_REGISTRY
  }, [searchQuery, selectedCategory])

  // Handlers
  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      setCategory(categoryId)
      setSearchQuery("")
    },
    [setCategory, setSearchQuery]
  )

  const handleAssetClick = useCallback(
    (asset: AssetMetadata) => {
      selectAsset(asset)
      onAssetSelect?.(asset)
    },
    [selectAsset, onAssetSelect]
  )

  const handleClose = useCallback(() => {
    togglePanel()
    onClose?.()
  }, [togglePanel, onClose])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
      if (e.target.value.trim()) {
        setCategory(null)
      }
    },
    [setSearchQuery, setCategory]
  )

  return (
    <div
      className={cn(
        "flex h-full w-72 flex-col rounded-lg border border-border/50 bg-background/95 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h3 className="text-sm font-semibold">맵 에디터</h3>
        <div className="flex items-center gap-1">
          {/* View Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            aria-label={viewMode === "grid" ? "리스트 보기" : "그리드 보기"}
          >
            {viewMode === "grid" ? (
              <List className="size-4" />
            ) : (
              <Grid3X3 className="size-4" />
            )}
          </Button>
          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={handleClose}
            aria-label="에디터 닫기"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border/50 px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="에셋 검색..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/50 px-2 py-2">
        <CategoryTab
          label="전체"
          icon="📦"
          isActive={!selectedCategory && !searchQuery}
          onClick={() => handleCategorySelect(null)}
        />
        {categories.map((cat) => (
          <CategoryTab
            key={cat.id}
            label={cat.name}
            icon={cat.icon}
            isActive={selectedCategory === cat.id}
            onClick={() => handleCategorySelect(cat.id)}
          />
        ))}
      </div>

      {/* Asset Grid/List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredAssets.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery
                ? `'${searchQuery}' 검색 결과 없음`
                : "에셋이 없습니다"}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-3 gap-2">
              {filteredAssets.map((asset) => (
                <AssetGridItem
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAsset?.id === asset.id}
                  onClick={() => handleAssetClick(asset)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredAssets.map((asset) => (
                <AssetListItem
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAsset?.id === asset.id}
                  onClick={() => handleAssetClick(asset)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer - Selected Asset Info */}
      {selectedAsset && (
        <div className="border-t border-border/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded bg-muted text-lg">
              {getCategoryIcon(selectedAsset.categoryId)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{selectedAsset.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedAsset.requiresPair && (
                  <span className="mr-1 rounded bg-primary/20 px-1 text-primary">
                    페어
                  </span>
                )}
                {selectedAsset.description || `@생성 ${selectedAsset.aliases[0]}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

interface CategoryTabProps {
  label: string
  icon: string
  isActive: boolean
  onClick: () => void
}

function CategoryTab({ label, icon, isActive, onClick }: CategoryTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 hover:bg-muted"
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

interface AssetItemProps {
  asset: AssetMetadata
  isSelected: boolean
  onClick: () => void
}

function AssetGridItem({ asset, isSelected, onClick }: AssetItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
        isSelected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-transparent bg-muted/30 hover:bg-muted/50"
      )}
      title={asset.description}
    >
      {/* Thumbnail or Icon */}
      <div className="flex size-12 items-center justify-center rounded bg-muted/50 text-2xl">
        {asset.thumbnail ? (
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="size-full rounded object-cover"
            onError={(e) => {
              // Fallback to category icon on error
              e.currentTarget.style.display = "none"
              e.currentTarget.nextElementSibling?.classList.remove("hidden")
            }}
          />
        ) : null}
        <span className={asset.thumbnail ? "hidden" : ""}>
          {getCategoryIcon(asset.categoryId)}
        </span>
      </div>
      {/* Name */}
      <span className="w-full truncate text-center text-xs">
        {asset.name}
      </span>
      {/* Pair Badge */}
      {asset.requiresPair && (
        <span className="rounded bg-primary/20 px-1 text-[10px] text-primary">
          페어
        </span>
      )}
    </button>
  )
}

function AssetListItem({ asset, isSelected, onClick }: AssetItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all",
        isSelected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-transparent bg-muted/30 hover:bg-muted/50"
      )}
      title={asset.description}
    >
      {/* Icon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted/50 text-lg">
        {getCategoryIcon(asset.categoryId)}
      </div>
      {/* Info */}
      <div className="flex-1 overflow-hidden text-left">
        <p className="truncate text-sm">{asset.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          @생성 {asset.aliases[0]}
        </p>
      </div>
      {/* Pair Badge */}
      {asset.requiresPair && (
        <span className="shrink-0 rounded bg-primary/20 px-1 text-[10px] text-primary">
          페어
        </span>
      )}
    </button>
  )
}

// ============================================
// Helpers
// ============================================

function getCategoryIcon(categoryId: string): string {
  const iconMap: Record<string, string> = {
    floor: "🏠",
    wall: "🧱",
    furniture: "🪑",
    decoration: "🌳",
    interactive: "⚡",
  }
  return iconMap[categoryId] || "📦"
}
