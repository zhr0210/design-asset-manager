import React, { useState, useEffect } from 'react'
import { useAssetStore } from '../stores/asset.store'
import { useSettingsStore } from '../stores/settings.store'

// Presentational & panel components
import LibrarySidebar from '../components/library/LibrarySidebar'
import LibraryToolbar from '../components/library/LibraryToolbar'
import AssetWaterfallGrid from '../components/library/AssetWaterfallGrid'
import AssetInspectorDrawer from '../components/asset/AssetInspectorDrawer'
import BulkActionDock from '../components/library/BulkActionDock'
import BulkActionModal from '../components/library/BulkActionModal'
import { LIBRARY_TAG_GROUP_TITLES } from '../components/library/library-labels'

// Custom hooks
import { useActivePromptModel } from '../hooks/useActivePromptModel'
import { usePromptReverse } from '../hooks/usePromptReverse'

export default function Library() {
  const {
    assets,
    tags,
    selectedAsset,
    searchQuery,
    filterSite,
    activeTagSearchQueries,
    bulkSelectedAssetIds,
    setSelectedAsset,
    setSearchQuery,
    setFilterSite,
    addActiveTagSearchQuery,
    removeActiveTagSearchQuery,
    clearActiveTagSearchQueries,
    toggleBulkSelectedAssetId,
    clearBulkSelectedAssetIds,
    batchAddTagsToAssets,
    batchRemoveTagsFromAssets,
    confirmAiTag,
    rejectAiTag,
    deleteAsset,
    loadAssets,
    loadTags,
    filterTag,
    setFilterTag,
    includePending,
    setIncludePending,
    assetRelations,
    updateAssetCaption,
    resetAssetCaptionEdited,
    generateMockAiSuggestions,
    generateDeepAnalysis
  } = useAssetStore()

  // Collapsible filters drawer state
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Bulk actions popover states
  const [bulkActionType, setBulkActionType] = useState<'add' | 'remove' | null>(null)
  const [bulkActionTags, setBulkActionTags] = useState<string[]>([])

  // Caption and OCR states
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [tempCaption, setTempCaption] = useState('')
  const [copiedOcr, setCopiedOcr] = useState(false)

  // Settings & active model hooks
  const { settings, loadSettings } = useSettingsStore()

  const {
    activeModel: activeModelLocal
  } = useActivePromptModel(settings)

  const {
    run: runPromptReverseAction,
    loading: promptReverseLoading,
    error: promptReverseError
  } = usePromptReverse(selectedAsset?.id)

  const handleRunPromptReverse = async (options?: { promptTemplateId?: string; promptTemplateText?: string }) => {
    if (!selectedAsset) return
    const latestSettings = useSettingsStore.getState().settings
    const backendMode = latestSettings.promptReverseSettings?.backendMode ?? 'llama-openai'
    if (backendMode === 'native-qwen3vl') {
      if (!activeModelLocal) return
      await runPromptReverseAction(selectedAsset.id, activeModelLocal.id, activeModelLocal.localPath, options)
      return
    }

    await runPromptReverseAction(
      selectedAsset.id,
      latestSettings.promptReverseSettings?.selectedExternalModel || latestSettings.promptReverseSettings?.selectedExternalBackendId || backendMode,
      '',
      options
    )
  }

  // Reset editing states on asset change
  useEffect(() => {
    setIsEditingCaption(false)
    setCopiedOcr(false)
  }, [selectedAsset?.id])

  // Refresh tags and assets list on load
  useEffect(() => {
    loadAssets()
    loadTags()
    loadSettings()
  }, [])

  // Filter computation logic (Local search keyword + Dropdown site filtering)
  const filteredAssets = assets.filter((asset) => {
    const matchSearch = searchQuery
      ? asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true

    const matchSite = filterSite ? asset.sourceSiteId === filterSite : true

    return matchSearch && matchSite
  })

  // Extract unique site options for dropdown filter
  const uniqueSites = Array.from(
    new Map(assets.map((item) => [item.sourceSiteId, item.sourceSiteName])).entries()
  )

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterSite('')
    clearActiveTagSearchQueries()
  }

  // Bulk operation execute logic
  const executeBulkAction = async () => {
    if (bulkActionTags.length === 0) return

    try {
      if (bulkActionType === 'add') {
        await batchAddTagsToAssets(bulkSelectedAssetIds, bulkActionTags, {
          source: 'manual',
          status: 'confirmed'
        })
      } else if (bulkActionType === 'remove') {
        await batchRemoveTagsFromAssets(bulkSelectedAssetIds, bulkActionTags)
      }
      setBulkActionType(null)
      setBulkActionTags([])
      clearBulkSelectedAssetIds()
    } catch (e) {
      alert(`批量操作失败: ${e}`)
    }
  }

  // Bulk confirm pending AI tags on highlighted assets
  const handleBulkConfirmAi = async () => {
    const api = (window as any).electronAPI
    if (!api) return

    try {
      for (const assetId of bulkSelectedAssetIds) {
        const res = await api.assetTagListByAsset(assetId)
        if (res.success) {
          const pending = res.relations.filter((r: any) => r.status === 'pending')
          for (const rel of pending) {
            await api.assetTagConfirmAi(rel.id)
          }
        }
      }
      await loadAssets()
      clearBulkSelectedAssetIds()
      alert('批量采纳 AI 标签建议成功')
    } catch (e) {
      alert(`批量采纳失败: ${e}`)
    }
  }

  // Group database tags for left panel sidebar navigation
  const groupedSidebarTags: Record<string, typeof tags> = {}
  for (const tag of tags) {
    if (tag.usageCount > 0) {
      if (!groupedSidebarTags[tag.type]) {
        groupedSidebarTags[tag.type] = []
      }
      groupedSidebarTags[tag.type].push(tag)
    }
  }

  return (
    <div className="flex-1 flex h-full relative overflow-hidden select-none">
      
      {/* Left panel category sidebar navigation */}
      <LibrarySidebar
        selectedAsset={selectedAsset}
        assetsCount={assets.length}
        activeTagSearchQueries={activeTagSearchQueries}
        groupedSidebarTags={groupedSidebarTags}
        groupTitles={LIBRARY_TAG_GROUP_TITLES}
        clearActiveTagSearchQueries={clearActiveTagSearchQueries}
        addActiveTagSearchQuery={addActiveTagSearchQuery}
        removeActiveTagSearchQuery={removeActiveTagSearchQuery}
      />

      {/* Main feed panel */}
      <div className={`scrollbar-none flex-1 flex flex-col space-y-4 h-full overflow-y-auto pr-1 ${selectedAsset ? 'mr-[344px]' : ''}`}>
        
        {/* Search & filtering header options bar */}
        <div className={`fixed top-[2.5vh] z-30 ${selectedAsset ? 'left-[2.75rem] right-[23.5rem]' : 'left-[18.25rem] right-8'}`}>
          <LibraryToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showFilterPanel={showFilterPanel}
            setShowFilterPanel={setShowFilterPanel}
            filterSite={filterSite}
            setFilterSite={setFilterSite}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            includePending={includePending}
            setIncludePending={setIncludePending}
            uniqueSites={uniqueSites}
            tags={tags}
            activeTagSearchQueries={activeTagSearchQueries}
            handleClearFilters={handleClearFilters}
          />
        </div>

        {/* Gallery Masonry view */}
        <div className={showFilterPanel ? 'pt-36' : 'pt-20'}>
          <AssetWaterfallGrid
            filteredAssets={filteredAssets}
            selectedAsset={selectedAsset}
            bulkSelectedAssetIds={bulkSelectedAssetIds}
            setSelectedAsset={setSelectedAsset}
            toggleBulkSelectedAssetId={toggleBulkSelectedAssetId}
          />
        </div>
      </div>

      {/* Right slides details inspector drawer */}
      {selectedAsset && (
        <div className="fixed right-8 top-[2.5vh] z-40 h-[95vh] max-h-[95vh] shrink-0">
          <AssetInspectorDrawer
            selectedAsset={selectedAsset}
            assetRelations={assetRelations}
            settings={settings}
            activeModelLocal={activeModelLocal}
            promptReverseLoading={promptReverseLoading}
            promptReverseError={promptReverseError}
            setSelectedAsset={setSelectedAsset}
            handleRunPromptReverse={handleRunPromptReverse}
            updateAssetCaption={updateAssetCaption}
            resetAssetCaptionEdited={resetAssetCaptionEdited}
            generateMockAiSuggestions={generateMockAiSuggestions}
            generateDeepAnalysis={generateDeepAnalysis}
            confirmAiTag={confirmAiTag}
            rejectAiTag={rejectAiTag}
            deleteAsset={deleteAsset}
          />
        </div>
      )}

      {/* Floaty Bulk Operations Dock */}
      <BulkActionDock
        bulkSelectedAssetIds={bulkSelectedAssetIds}
        setBulkActionType={setBulkActionType}
        handleBulkConfirmAi={handleBulkConfirmAi}
        clearBulkSelectedAssetIds={clearBulkSelectedAssetIds}
      />

      {/* Bulk Modification Modal Overlay */}
      <BulkActionModal
        bulkActionType={bulkActionType}
        bulkActionTags={bulkActionTags}
        setBulkActionTags={setBulkActionTags}
        setBulkActionType={setBulkActionType}
        executeBulkAction={executeBulkAction}
      />

    </div>
  )
}
