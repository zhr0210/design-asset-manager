import React from 'react'
import { X, Filter, Sliders, Tag as TagIcon, Compass, Sparkles, Database } from 'lucide-react'
import { projectAssetLibraryTagFilterChips, type AssetLibraryTagFilterIconKey } from '../../../shared/workflows/asset-tagging.workflow'
import { useAssetStore } from '../../stores/asset.store'

export default function TagFilterBar() {
  const { activeTagSearchQueries, removeActiveTagSearchQuery, clearActiveTagSearchQueries } = useAssetStore()

  if (activeTagSearchQueries.length === 0) return null

  const chips = projectAssetLibraryTagFilterChips(activeTagSearchQueries)

  return (
    <div className="glass-panel p-3.5 rounded-2xl shadow-premium bg-white/80 flex items-center justify-between gap-4 font-sans select-none animate-in slide-in-from-top-3 duration-200">
      <div className="flex items-center gap-2.5 flex-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider pl-1 mr-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>当前筛选:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const Icon = getTagFilterIcon(chip.iconKey)
            return (
              <div
                key={chip.query}
                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-xl text-[11px] font-semibold border shadow-sm ${
                  chip.toneClassName
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="opacity-60 scale-90">{chip.typeLabel}:</span>
                <span className="font-bold">{chip.valueLabel}</span>
                <button
                  type="button"
                  onClick={() => removeActiveTagSearchQuery(chip.query)}
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

function getTagFilterIcon(iconKey: AssetLibraryTagFilterIconKey) {
  if (iconKey === 'tag') return TagIcon
  if (iconKey === 'compass') return Compass
  if (iconKey === 'sparkles') return Sparkles
  if (iconKey === 'database') return Database
  return Sliders
}
