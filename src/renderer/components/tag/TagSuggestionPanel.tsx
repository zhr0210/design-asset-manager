import React, { useState } from 'react'
import { Sparkles, Check, X, RefreshCw, Terminal, Eye, Brain, ChevronDown, Layers } from 'lucide-react'
import { useAssetStore, AssetTagRelation } from '../../stores/asset.store'

interface TagSuggestionPanelProps {
  assetId: string
}

const TYPE_LABEL_MAP: Record<string, { type: string, model: string }> = {
  design: { type: "商业设计图 (DESIGN)", model: "Florence-2 & CLIP" },
  ui: { type: "界面截图 (UI)", model: "Florence-2" },
  document: { type: "文档大图 (DOCUMENT)", model: "Florence-2" },
  anime: { type: "动漫原画 (ANIME)", model: "WD Tagger" },
  illustration: { type: "手绘插画 (ILLUSTRATION)", model: "RAM++" },
  photo: { type: "摄影照片 (PHOTO)", model: "RAM++" },
  product: { type: "商品展示 (PRODUCT)", model: "RAM++" },
  unknown: { type: "未知类别 (UNKNOWN)", model: "Rule-based Fallback" }
}

const PIPELINE_MAP: Record<string, string[]> = {
  anime: ["wd_tagger"],
  illustration: ["ram", "design_rule"],
  photo: ["ram", "design_rule"],
  product: ["ram", "design_rule"],
  design: ["ram", "florence2", "design_rule"],
  ui: ["ram", "florence2", "design_rule"],
  document: ["ram", "florence2", "design_rule"],
  unknown: ["ram", "design_rule"]
}

const BASE_LAYER_MODELS = {
  ram: { name: "RAM++ 通用标签", desc: "通用图像与多标签泛用推理，建议大多数素材开启。" }
}

const ENHANCED_LAYER_MODELS = {
  florence2: { name: "Florence-2 画面描述 / 设计语义", desc: "图片场景详细描述、设计图语义复判。" },
  design_rule: { name: "DesignRule 设计规则", desc: "排版、版式、比例、来源、设计用途规则辅助。" },
  wd_tagger: { name: "WD Tagger 动漫标签", desc: "二次元 / 动漫 / 角色特征提取，仅动漫素材建议开启。" },
  clip: { name: "CLIP Classifier 设计词典分类", desc: "零样本分类与自定义设计词典匹配。" }
}

const MODEL_DISPLAY_NAMES: Record<string, { name: string, desc: string }> = {
  ram: { name: "RAM++", desc: "通用画风与多标签反推" },
  florence2: { name: "Florence-2", desc: "图片场景详细描述" },
  wd_tagger: { name: "WD Tagger", desc: "二次元/动漫特征提取" },
  clip: { name: "CLIP Classifier", desc: "零样本特征分类器" },
  design_rule: { name: "DesignRule", desc: "排版与版式规则辅助" }
}

export default function TagSuggestionPanel({ assetId }: TagSuggestionPanelProps) {
  const api = (window as any).electronAPI
  const selectedAsset = useAssetStore((s) => s.selectedAsset)
  const assetRelations = useAssetStore((s) => s.assetRelations)
  const { confirmAiTag, rejectAiTag, generateMockAiSuggestions } = useAssetStore()

  const [scanningState, setScanningState] = useState<'idle' | 'routing' | 'classified' | 'tagging' | 'completed'>('idle')
  const [detectedType, setDetectedType] = useState<string>('')
  const [customModels, setCustomModels] = useState<string[]>([])

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
    if (detectedType && PIPELINE_MAP[detectedType]) {
      setCustomModels(PIPELINE_MAP[detectedType])
    } else {
      setCustomModels(["ram", "clip"])
    }
  }, [detectedType])

  if (!selectedAsset) return null

  // Filter pending relations for this asset and deduplicate by tag name
  const relations = assetRelations[assetId] || []
  const pendingSuggestions = React.useMemo(() => {
    const pending = relations.filter((r) => r.status === 'pending')
    const seen = new Set<string>()
    return pending.filter((r) => {
      const name = r.tag_name.toLowerCase().trim()
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [relations])

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

  const handleModelToggle = (model: string) => {
    setCustomModels((prev) => {
      if (prev.includes(model)) {
        return prev.filter((m) => m !== model)
      } else {
        return [...prev, model]
      }
    })
  }

  const triggerAiTagging = async () => {
    setScanningState('routing')

    // Smooth step-by-step progress timers to emulate VisualRouter & model loading preheat
    const timer1 = setTimeout(() => setScanningState('classified'), 800)
    const timer2 = setTimeout(() => setScanningState('tagging'), 2000)
    
    try {
      // Pass user selected models
      await generateMockAiSuggestions(assetId, customModels)
      clearTimeout(timer1)
      clearTimeout(timer2)
      setScanningState('completed')
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (e) {
      console.error(e)
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setScanningState('idle')
    }
  }

  const scanning = scanningState !== 'idle'

  return (
    <div className="space-y-4 font-sans text-[12px] border-t border-slate-100 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
          <span>AI 视觉特征 analysis</span>
        </span>
        
        <button
          type="button"
          disabled={scanning || customModels.length === 0}
          onClick={triggerAiTagging}
          className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? '分析中...' : 'AI 智能打标'}</span>
        </button>
      </div>

      {/* Premium Category Overwrite and Selector */}
      {!scanning && (
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
                  disabled={scanning}
                  value={detectedType || 'unknown'}
                  onChange={handleCategoryChange}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 hover:border-purple-300 text-purple-700 font-bold rounded-xl shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-300 transition-all text-[11px]"
                >
                  {Object.entries(TYPE_LABEL_MAP).map(([key, item]) => (
                    <option key={key} value={key} className="font-semibold text-slate-700">
                      {item.type.split(" (")[0]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Model Selection Frosted-glass Grid Checklist */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 space-y-3">
              {/* Group 1: 基础标签层 */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-400" />
                  <span>第一组：基础标签层</span>
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {Object.entries(BASE_LAYER_MODELS).map(([key, model]) => {
                    const isChecked = customModels.includes(key)
                    return (
                      <div
                        key={key}
                        onClick={() => !scanning && handleModelToggle(key)}
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

              {/* Group 2: 专项增强层 */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  <span>第二组：专项增强层</span>
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {Object.entries(ENHANCED_LAYER_MODELS).map(([key, model]) => {
                    const isChecked = customModels.includes(key)
                    return (
                      <div
                        key={key}
                        onClick={() => !scanning && handleModelToggle(key)}
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
            </div>
          </div>
        </div>
      )}

      {/* Progress visualizer during scan */}
      {scanning && (
        <div className="mt-1 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 border text-[11px] font-semibold bg-white/40 border-purple-500/20 text-purple-700 shadow-md shadow-purple-500/5 backdrop-blur-md">
            {scanningState !== 'completed' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-purple-500 shrink-0" />
            ) : (
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <Check className="w-3 h-3 stroke-[3.5]" />
              </div>
            )}
            
            <span className="leading-relaxed leading-none transition-all duration-300">
              {scanningState === 'routing' && '🔍 正在使用 VisualRouter 进行智能类型判断...'}
              {scanningState === 'classified' && `👉 已识别/锁定类型: ${TYPE_LABEL_MAP[detectedType]?.type || detectedType.toUpperCase()}`}
              {scanningState === 'tagging' && `⚡ 正在启用 [${customModels.map(m => MODEL_DISPLAY_NAMES[m]?.name || m).join(', ')}] 模型生成标签建议...`}
              {scanningState === 'completed' && '智能标签建议已完成。'}
            </span>
          </div>
        </div>
      )}

      {/* Suggested Pending Tags list */}
      {pendingSuggestions.length > 0 && (
        <div className="space-y-2 bg-purple-50/20 border border-purple-100/50 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" />
            <span>AI 标签推荐 (待确认)</span>
          </span>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {pendingSuggestions.map((rel) => (
              <div
                key={rel.id}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-dashed border-purple-200 shadow-sm"
              >
                <span>{rel.tag_name}</span>
                <span className="text-[8px] bg-purple-100 text-purple-800 px-1 rounded ml-0.5">
                  {(rel.confidence * 100).toFixed(0)}%
                </span>
                
                {/* Accept AI tag button */}
                <button
                  type="button"
                  onClick={() => confirmAiTag(rel.id, assetId)}
                  className="w-4.5 h-4.5 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                  title="确认采纳此标签"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </button>

                {/* Reject AI tag button */}
                <button
                  type="button"
                  onClick={() => rejectAiTag(rel.id, assetId)}
                  className="w-4.5 h-4.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                  title="拒绝此标签"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingSuggestions.length === 0 && (
        <div className="p-3 border border-dashed border-slate-200 bg-white text-center rounded-xl text-[10.5px] text-slate-400 font-medium">
          该素材暂无 AI 智能标签建议。点击上方“AI 智能打标”生成推荐标签。
        </div>
      )}
    </div>
  )
}
