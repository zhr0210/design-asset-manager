import React from 'react'
import { Search, Filter, ChevronRight, X, Globe, Tag as TagIcon, Sparkles } from 'lucide-react'
import { Tag } from '../../stores/asset.store'

type LibraryToolbarProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showFilterPanel: boolean;
  setShowFilterPanel: (show: boolean) => void;
  filterSite: string;
  setFilterSite: (site: string) => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  includePending: boolean;
  setIncludePending: (pending: boolean) => void;
  uniqueSites: [string, string][];
  tags: Tag[];
  activeTagSearchQueries: string[];
  handleClearFilters: () => void;
};

export default function LibraryToolbar({
  searchQuery,
  setSearchQuery,
  showFilterPanel,
  setShowFilterPanel,
  filterSite,
  setFilterSite,
  filterTag,
  setFilterTag,
  includePending,
  setIncludePending,
  uniqueSites,
  tags,
  activeTagSearchQueries,
  handleClearFilters
}: LibraryToolbarProps) {
  return (
    <>
      {/* Search & filtering header options bar */}
      <div className="glass-panel p-4 rounded-2xl shadow-premium bg-white/80 flex flex-col md:flex-row items-center gap-4 shrink-0">
        {/* Keyword Search */}
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="在素材库中搜索标题，或输入标签语法检索 (例：tag:极简 type:style)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[11.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-semibold text-slate-700"
          />
        </div>

        {/* Filter Collapse Trigger Button */}
        <button
          type="button"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`px-4 py-2.5 rounded-xl border text-[11.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
            showFilterPanel
              ? 'bg-brand-50 text-brand-700 border-brand-300 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
          }`}
        >
          <Filter className="w-4 h-4 text-slate-500" />
          <span>高级筛选</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-90' : ''}`} />
        </button>

        {/* Reset button */}
        {(searchQuery || filterSite || filterTag || activeTagSearchQueries.length > 0) && (
          <button
            onClick={handleClearFilters}
            className="px-3.5 py-2.5 text-[11.5px] font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>重置筛选</span>
          </button>
        )}
      </div>

      {/* Collapsible drawer panel */}
      {showFilterPanel && (
        <div className="glass-panel p-4 rounded-2xl shadow-premium bg-white/90 border border-slate-100 flex flex-wrap gap-4 items-center shrink-0 animate-in slide-in-from-top duration-300">
          {/* Website source dropdown selector */}
          <div className="w-full md:w-56 relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[11.5px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none"
            >
              <option value="">全部网站来源</option>
              {uniqueSites.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag dropdown selector */}
          <div className="w-full md:w-56 relative">
            <TagIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[11.5px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none"
            >
              <option value="">全部已使用标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Include Pending AI tags checkbox */}
          <label className="flex items-center gap-2.5 px-4.5 py-2.5 bg-white/95 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-premium shadow-sm text-[11.5px] font-bold text-slate-600">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 stroke-[2]" />
              <span>包含 AI 待确认标签</span>
            </span>
          </label>
        </div>
      )}
    </>
  )
}
