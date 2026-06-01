import React from 'react'
import { Compass, Sliders, Sparkles } from 'lucide-react'
import { Asset, Tag } from '../../stores/asset.store'

type LibrarySidebarProps = {
  selectedAsset: Asset | null;
  assetsCount: number;
  activeTagSearchQueries: string[];
  groupedSidebarTags: Record<string, Tag[]>;
  groupTitles: Record<string, string>;
  clearActiveTagSearchQueries: () => void;
  addActiveTagSearchQuery: (query: string) => void;
  removeActiveTagSearchQuery: (query: string) => void;
};

export default function LibrarySidebar({
  selectedAsset,
  assetsCount,
  activeTagSearchQueries,
  groupedSidebarTags,
  groupTitles,
  clearActiveTagSearchQueries,
  addActiveTagSearchQuery,
  removeActiveTagSearchQuery
}: LibrarySidebarProps) {
  return (
    <div
      className={`transition-all duration-300 ease-in-out flex flex-col h-full shrink-0 font-sans select-none ${
        selectedAsset
          ? 'w-0 opacity-0 p-0 border-0 mr-0 pointer-events-none overflow-hidden'
          : 'w-56 border border-slate-200 rounded-2xl bg-white shadow-premium p-4 mr-6 overflow-y-auto'
      }`}
    >
      {/* Shortcut filters */}
      <div className="space-y-1 pb-4 border-b border-slate-100 shrink-0 text-[12px] font-semibold text-slate-500">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2.5">
          标签智能过滤器
        </span>
        
        <button
          onClick={clearActiveTagSearchQueries}
          className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
            activeTagSearchQueries.length === 0
              ? 'bg-brand-50 text-brand-700 font-bold'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Compass className="w-4 h-4 stroke-[1.8]" />
            <span>全部素材资源</span>
          </span>
          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">{assetsCount}</span>
        </button>

        <button
          onClick={() => addActiveTagSearchQuery('special:untagged')}
          className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
            activeTagSearchQueries.includes('special:untagged')
              ? 'bg-rose-50 text-rose-700 font-bold border border-rose-100'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 stroke-[1.8] text-rose-400" />
            <span>无任何标签素材</span>
          </span>
        </button>

        <button
          onClick={() => addActiveTagSearchQuery('special:ai_pending')}
          className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
            activeTagSearchQueries.includes('special:ai_pending')
              ? 'bg-purple-50 text-purple-700 font-bold border border-purple-100'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 stroke-[1.8] text-purple-500 animate-pulse" />
            <span>AI 待确认标签</span>
          </span>
        </button>
      </div>

      {/* Categories tags collection breakdown */}
      <div className="flex-1 space-y-4 pt-4 text-[12px] font-sans">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2.5">
          标签维度词汇
        </span>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto px-0.5">
          {Object.entries(groupTitles).map(([typeKey, title]) => {
            const list = groupedSidebarTags[typeKey] || []
            if (list.length === 0) return null

            return (
              <div key={typeKey} className="space-y-1">
                <h6 className="text-[9.5px] font-bold text-slate-400 px-2 uppercase tracking-wide">
                  {title}
                </h6>
                <div className="space-y-0.5 pl-1.5">
                  {list.map((tag) => {
                    const tagQuery = `tag:${tag.name}`
                    const isActive = activeTagSearchQueries.includes(tagQuery)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          if (isActive) {
                            removeActiveTagSearchQuery(tagQuery)
                          } else {
                            addActiveTagSearchQuery(tagQuery)
                          }
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 font-bold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <span className="truncate pr-1">#{tag.name}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-1 rounded font-bold shrink-0">{tag.usageCount}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
