import React, { useState } from 'react'
import { Sparkles, Check, X, RefreshCw, Brain, ChevronDown, Layers } from 'lucide-react'
import { useAssetStore } from '../../stores/asset.store'
import {
  createAssetTaggingPlan,
  projectAssetTaggingCategoryOptions,
  projectAssetTaggingModelSelectionSections,
  projectAssetTaggingPanelDisplay,
  projectAssetTaggingSuggestionReviewItems,
  toggleAssetTaggingModelSelection,
  type AssetTaggingScanState,
  type AssetTaggingModelId
} from '../../../shared/workflows/asset-tagging.workflow'

interface TagSuggestionPanelProps {
  assetId: string
}

export default function TagSuggestionPanel({ assetId }: TagSuggestionPanelProps) {
  const api = (window as any).electronAPI
  const selectedAsset = useAssetStore((s) => s.selectedAsset)
  const assetRelations = useAssetStore((s) => s.assetRelations)
  const { confirmAiTag, rejectAiTag, generateAiSuggestions } = useAssetStore()

  const [scanningState, setScanningState] = useState<AssetTaggingScanState>('idle')
  const [detectedType, setDetectedType] = useState<string>('')
  const [customModels, setCustomModels] = useState<AssetTaggingModelId[]>([])
  const [taggingError, setTaggingError] = useState<string | null>(null)

  // Load custom categories or routing on mount and change
  React.useEffect(() => {
    setDetectedType('')
    if (!selectedAsset) return

    let active = true
    const fetchRealRoute = async () => {
      try {
        if (api && (api as any).assetsGetCustomCategory) {
          const customRes = await (api as any).assetsGetCustomCategory(selectedAsset.id)
          if (active && customRes && customRes.success && customRes.category) {
            setDetectedType(customRes.category)
            return
          }
        }

        if (api && (api as any).aiRoutingPreview) {
          const routeRes = await (api as any).aiRoutingPreview(selectedAsset.filePath)
          if (active && routeRes && routeRes.routing_result) {
            const realType = routeRes.routing_result.asset_type
            setDetectedType(realType)
          }
        }
      } catch (e) {
        // Silent catch to prevent UI warnings when offline
      }
    }
    fetchRealRoute()

    return () => {
      active = false
    }
  }, [assetId, selectedAsset?.filePath])

  // Automatically update checked models checklist based on category pipeline defaults
  React.useEffect(() => {
    setCustomModels(createAssetTaggingPlan(detectedType).modelsToRun)
  }, [detectedType])

  const relations = assetRelations[assetId] || []
  const suggestionReviewItems = React.useMemo(
    () => projectAssetTaggingSuggestionReviewItems(relations),
    [relations]
  )
  const modelSelectionSections = React.useMemo(
    () => projectAssetTaggingModelSelectionSections(),
    []
  )
  const categoryOptions = React.useMemo(
    () => projectAssetTaggingCategoryOptions(),
    []
  )
  const panelDisplay = projectAssetTaggingPanelDisplay({
    scanState: scanningState,
    category: detectedType,
    selectedModels: customModels
  })

  if (!selectedAsset) return null

  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value
    setDetectedType(newCategory)
    try {
      if (api && (api as any).assetsSaveCustomCategory) {
        await (api as any).assetsSaveCustomCategory(selectedAsset.id, newCategory)
      }
    } catch (err) {
      console.error('[UI] Failed to save custom category override:', err)
    }
  }

  const handleModelToggle = (model: AssetTaggingModelId) => {
    setCustomModels((previousModels) => toggleAssetTaggingModelSelection(previousModels, model))
  }

  const triggerAiTagging = async () => {
    setTaggingError(null)
    setScanningState('routing')
    
    try {
      setScanningState('tagging')
      const result = await generateAiSuggestions(assetId, customModels)
      if (!result.success) {
        setTaggingError(result.error || '真实 AI 打标不可用。')
        return
      }
      setScanningState('completed')
      await new Promise(resolve => setTimeout(resolve, 800))
    } catch (e: any) {
      setTaggingError(e?.message || String(e))
    } finally {
      setScanningState('idle')
    }
  }

  return (
    <div className="space-y-4 font-sans text-[12px] border-t border-slate-100 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
          <span>AI 视觉特征分析</span>
        </span>
        
        <button
          type="button"
          disabled={panelDisplay.submitDisabled}
          onClick={triggerAiTagging}
          className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${panelDisplay.isScanning ? 'animate-spin' : ''}`} />
          <span>{panelDisplay.submitLabel}</span>
        </button>
      </div>

      {taggingError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] font-semibold text-amber-700">
          {taggingError}
        </div>
      )}

      {/* Premium Category Overwrite and Selector */}
      {!panelDisplay.isScanning && (
        <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2.5">
            {/* Category Dropdown Selector */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Brain className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-slate-500 font-semibold truncate">预估视觉分类：</span>
              </div>
              <div className="relative shrink-0">
                <select
                  disabled={panelDisplay.isScanning}
                  value={detectedType || 'unknown'}
                  onChange={handleCategoryChange}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 hover:border-purple-300 text-purple-700 font-bold rounded-xl shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-300 transition-all text-[11px]"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value} className="font-semibold text-slate-700">
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Model Selection Frosted-glass Grid Checklist */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 space-y-3">
              {modelSelectionSections.map((section) => (
                <div key={section.code}>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Layers className={`w-3 h-3 ${section.iconTone === 'purple' ? 'text-purple-400' : 'text-indigo-400'}`} />
                    <span>{section.title}</span>
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {section.items.map((model) => {
                    const modelId = model.id
                    const isChecked = customModels.includes(modelId)
                    return (
                      <div
                        key={model.id}
                        onClick={() => !panelDisplay.isScanning && handleModelToggle(modelId)}
                        className={`flex flex-col p-2 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                          isChecked
                            ? "bg-purple-500/[0.04] border-purple-200/90 text-purple-700 font-bold"
                            : "bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10.5px]">{model.name}</span>
                          <div
                            className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-purple-600 border-purple-600 text-white"
                                : "border-slate-300"
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[4.5]" />}
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">{model.desc}</span>
                      </div>
                    )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress visualizer during scan */}
      {panelDisplay.isScanning && (
        <div className="mt-1 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 border text-[11px] font-semibold bg-white/40 border-purple-500/20 text-purple-700 shadow-md shadow-purple-500/5 backdrop-blur-md">
            {!panelDisplay.progressComplete ? (
              <RefreshCw className="w-4 h-4 animate-spin text-purple-500 shrink-0" />
            ) : (
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <Check className="w-3 h-3 stroke-[3.5]" />
              </div>
            )}
            
            <span className="leading-relaxed leading-none transition-all duration-300">
              {panelDisplay.progressLabel}
            </span>
          </div>
        </div>
      )}

      {/* Suggested Pending Tags list */}
      {suggestionReviewItems.length > 0 && (
        <div className="space-y-2 bg-purple-50/20 border border-purple-100/50 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" />
            <span>AI 标签推荐 (待确认)</span>
          </span>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestionReviewItems.map((item) => (
              <div
                key={item.id}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-dashed border-purple-200 shadow-sm"
              >
                <span>{item.tagName}</span>
                <span className="text-[8px] bg-purple-100 text-purple-800 px-1 rounded ml-0.5">
                  {item.confidenceLabel}
                </span>
                
                {/* Accept AI tag button */}
                <button
                  type="button"
                  onClick={() => confirmAiTag(item.id, assetId)}
                  className="w-4.5 h-4.5 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                  title={item.confirmAction.label}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </button>

                {/* Reject AI tag button */}
                <button
                  type="button"
                  onClick={() => rejectAiTag(item.id, assetId)}
                  className="w-4.5 h-4.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                  title={item.rejectAction.label}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestionReviewItems.length === 0 && (
        <div className="p-3 border border-dashed border-slate-200 bg-white text-center rounded-xl text-[10.5px] text-slate-400 font-medium">
          {panelDisplay.emptySuggestionLabel}
        </div>
      )}
    </div>
  )
}
