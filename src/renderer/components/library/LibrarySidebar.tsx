import React from 'react'
import { Compass, Sliders, Sparkles } from 'lucide-react'
import { projectAssetLibrarySidebar, type AssetLibraryTagFilterIconKey } from '../../../shared/workflows/asset-tagging.workflow'
import { Asset, Tag } from '../../stores/asset.store'

type LibrarySidebarProps = {
  selectedAsset: Asset | null;
  assetsCount: number;
  tags: Tag[];
  activeTagSearchQueries: string[];
  clearActiveTagSearchQueries: () => void;
  addActiveTagSearchQuery: (query: string) => void;
  removeActiveTagSearchQuery: (query: string) => void;
};

export default function LibrarySidebar({
  selectedAsset,
  assetsCount,
  tags,
  activeTagSearchQueries,
  clearActiveTagSearchQueries,
  addActiveTagSearchQuery,
  removeActiveTagSearchQuery
}: LibrarySidebarProps) {
  const sidebarProjection = projectAssetLibrarySidebar(tags, { activeQueries: activeTagSearchQueries, assetsCount })

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
        
        {sidebarProjection.shortcuts.map((shortcut) => {
          const Icon = getLibraryFilterIcon(shortcut.iconKey)
          return (
            <button
              key={shortcut.code}
              onClick={shortcut.query ? () => addActiveTagSearchQuery(shortcut.query!) : clearActiveTagSearchQueries}
              className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                shortcut.isActive ? shortcut.activeClassName : shortcut.idleClassName
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className={`w-4 h-4 stroke-[1.8] ${shortcut.iconClassName}`} />
                <span>{shortcut.label}</span>
              </span>
              {shortcut.countLabel && (
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                  {shortcut.countLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Categories tags collection breakdown */}
      <div className="flex-1 space-y-4 pt-4 text-[12px] font-sans">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-2.5">
          标签维度词汇
        </span>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto px-0.5">
          {sidebarProjection.groups.map((group) => {
            return (
              <div key={group.typeKey} className="space-y-1">
                <h6 className="text-[9.5px] font-bold text-slate-400 px-2 uppercase tracking-wide">
                  {group.title}
                </h6>
                <div className="space-y-0.5 pl-1.5">
                  {group.items.map((item) => {
                    return (
                      <button
                        key={item.tag.id}
                        onClick={() => {
                          if (item.isActive) {
                            removeActiveTagSearchQuery(item.query)
                          } else {
                            addActiveTagSearchQuery(item.query)
                          }
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          item.isActive ? item.activeClassName : item.idleClassName
                        }`}
                      >
                        <span className="truncate pr-1">{item.label}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-1 rounded font-bold shrink-0">
                          {item.countLabel}
                        </span>
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

function getLibraryFilterIcon(iconKey: AssetLibraryTagFilterIconKey) {
  if (iconKey === 'sparkles') return Sparkles
  if (iconKey === 'sliders') return Sliders
  return Compass
}
