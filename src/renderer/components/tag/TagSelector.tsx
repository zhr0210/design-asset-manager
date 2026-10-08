import React, { useState } from 'react'
import { Check, Search, Tag as TagIcon, X } from 'lucide-react'
import { projectAssetTagPicker } from '../../../shared/workflows/asset-tagging.workflow'
import { useAssetStore } from '../../stores/asset.store'

interface TagSelectorProps {
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
  onClose?: () => void
  title?: string
}

export default function TagSelector({
  selectedTagIds,
  onToggleTag,
  onClose,
  title = '选择标签'
}: TagSelectorProps) {
  const tags = useAssetStore((s) => s.tags)
  const [search, setSearch] = useState('')
  const tagPicker = projectAssetTagPicker(tags, { search })

  return (
    <div className="w-full flex flex-col h-96 bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden font-sans">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <span className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
          <TagIcon className="w-4 h-4 text-brand-500" />
          <span>{title}</span>
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 bg-slate-50/50 border-b border-slate-50 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索标签或别名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-[11px] font-semibold bg-white rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tagPicker.groups.map((group) => {
          return (
            <div key={group.categoryKey} className="space-y-1.5">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">
                {group.categoryLabel}
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((option) => {
                  const isSelected = selectedTagIds.includes(option.tag.id)
                  return (
                    <button
                      key={option.tag.id}
                      onClick={() => onToggleTag(option.tag.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
                        isSelected
                          ? 'bg-brand-50 text-brand-700 border-brand-300 shadow-sm font-bold scale-[1.01]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-brand-600 stroke-[2.5]" />}
                      <span>{option.tag.name}</span>
                      {option.showUsageCount && (
                        <span className={`text-[8.5px] px-1 rounded font-bold ${
                          isSelected ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {option.usageLabel}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {tagPicker.options.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-[11px] font-medium">
            {tagPicker.emptyLabel}
          </div>
        )}
      </div>
    </div>
  )
}
