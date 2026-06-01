import React, { useState } from 'react'
import { Check, Search, Tag as TagIcon, X } from 'lucide-react'
import { useAssetStore, Tag } from '../../stores/asset.store'

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

  // Map category keys to human-friendly Chinese names
  const categoryNames: Record<string, string> = {
    style: '风格 (Style)',
    color: '色彩 (Color)',
    usage: '用途 (Usage)',
    layout: '版式 (Layout)',
    scene: '场景 (Scene)',
    source: '来源 (Source)',
    ai: 'AI 智能打标',
    custom: '用户自定义 (Custom)'
  }

  // Filter tags by search term
  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.aliases.some(a => a.toLowerCase().includes(search.toLowerCase()))
  )

  // Group tags by their type
  const groupedTags: Record<string, Tag[]> = {}
  for (const tag of filteredTags) {
    if (!groupedTags[tag.type]) {
      groupedTags[tag.type] = []
    }
    groupedTags[tag.type].push(tag)
  }

  // Define logical order for displaying categories
  const categoryOrder = ['style', 'color', 'usage', 'layout', 'scene', 'source', 'ai', 'custom']

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
        {categoryOrder.map((catKey) => {
          const catTags = groupedTags[catKey] || []
          if (catTags.length === 0) return null

          return (
            <div key={catKey} className="space-y-1.5">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">
                {categoryNames[catKey] || catKey}
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {catTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onToggleTag(tag.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
                        isSelected
                          ? 'bg-brand-50 text-brand-700 border-brand-300 shadow-sm font-bold scale-[1.01]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-brand-600 stroke-[2.5]" />}
                      <span>{tag.name}</span>
                      {tag.usageCount > 0 && (
                        <span className={`text-[8.5px] px-1 rounded font-bold ${
                          isSelected ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {tag.usageCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredTags.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-[11px] font-medium">
            没有匹配的标签，您可以尝试在详情面板中直接创建。
          </div>
        )}
      </div>
    </div>
  )
}
