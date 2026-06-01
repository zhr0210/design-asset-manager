import React from 'react'
import { X, Filter, Sliders, Tag as TagIcon, Compass, Sparkles, Database } from 'lucide-react'
import { useAssetStore } from '../../stores/asset.store'

export default function TagFilterBar() {
  const { activeTagSearchQueries, removeActiveTagSearchQuery, clearActiveTagSearchQueries } = useAssetStore()

  if (activeTagSearchQueries.length === 0) return null

  // Helper to format query label nicely
  const getQueryLabel = (q: string) => {
    const parts = q.split(':')
    if (parts.length < 2) return { type: '关键词', val: q, icon: Sliders }

    const key = parts[0].trim().toLowerCase()
    const val = parts.slice(1).join(':').trim()

    if (key === 'tag') {
      return { type: '标签', val, icon: TagIcon, bg: 'bg-brand-50 text-brand-700 border-brand-200' }
    }
    if (key === 'type') {
      const typeLabels: Record<string, string> = {
        style: '风格风格',
        color: '主色彩',
        usage: '素材用途',
        layout: '排版版式',
        scene: '适用场景',
        source: '来源渠道',
        ai: '智能打标',
        custom: '自定义'
      }
      return { type: '分类', val: typeLabels[val] || val, icon: Compass, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
    }
    if (key === 'source') {
      return { type: '来源', val, icon: Database, bg: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
    if (key === 'special') {
      if (val === 'untagged') {
        return { type: '条件', val: '无标签素材', icon: Sliders, bg: 'bg-rose-50 text-rose-700 border-rose-200' }
      }
      if (val === 'ai_pending') {
        return { type: '条件', val: 'AI待确认素材', icon: Sparkles, bg: 'bg-purple-50 text-purple-700 border-purple-200' }
      }
    }
    return { type: key, val, icon: Sliders, bg: 'bg-slate-50 text-slate-600 border-slate-200' }
  }

  return (
    <div className="glass-panel p-3.5 rounded-2xl shadow-premium bg-white/80 flex items-center justify-between gap-4 font-sans select-none animate-in slide-in-from-top-3 duration-200">
      <div className="flex items-center gap-2.5 flex-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider pl-1 mr-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>当前筛选:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTagSearchQueries.map((query) => {
            const info = getQueryLabel(query)
            const Icon = info.icon
            return (
              <div
                key={query}
                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-xl text-[11px] font-semibold border shadow-sm ${
                  info.bg || 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="opacity-60 scale-90">{info.type}:</span>
                <span className="font-bold">{info.val}</span>
                <button
                  type="button"
                  onClick={() => removeActiveTagSearchQuery(query)}
                  className="w-4 h-4 rounded-full hover:bg-black/10 text-current/80 inline-flex items-center justify-center cursor-pointer ml-1"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={clearActiveTagSearchQueries}
        className="px-3.5 py-1.5 text-[11px] font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 flex items-center gap-1 shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
        <span>清空筛选</span>
      </button>
    </div>
  )
}
