import React from 'react'
import { AnimatePresence } from 'motion/react'
import { PresencePanel } from '../ui/WorkspaceMotion'
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
  discoveryMode: 'lexical-only' | null;
  matchCount: number;
  aiPendingEnabled?: boolean;
  thumbnailSize?: number;
  onThumbnailSizeChange?: (size: number) => void;
};

export default function LibraryToolbar({
  searchQuery, setSearchQuery, showFilterPanel, setShowFilterPanel,
  filterSite, setFilterSite, filterTag, setFilterTag, includePending,
  setIncludePending, uniqueSites, tags, activeTagSearchQueries,
  handleClearFilters, discoveryMode, matchCount, aiPendingEnabled = true,
  thumbnailSize = 200, onThumbnailSizeChange
}: LibraryToolbarProps) {
  const filterCount = Number(Boolean(filterSite)) + Number(Boolean(filterTag)) + activeTagSearchQueries.length
  return <>
    <div className="library-searchbar">
      <Search className="self-center ml-2 shrink-0" aria-hidden="true" />
      <input className="workspace-search-input" type="text" aria-label="搜索素材" placeholder="搜索标题、文件名、标签或描述" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
      {searchQuery && <button className="ui-button ui-button-ghost px-2" aria-label="清除搜索" onClick={() => setSearchQuery('')}><X /></button>}
      <button type="button" className={`ui-button ${showFilterPanel ? 'ui-button-primary' : 'ui-button-ghost'}`} aria-expanded={showFilterPanel} aria-controls="library-filter-panel" onClick={() => setShowFilterPanel(!showFilterPanel)}>
        <Filter aria-hidden="true" />高级筛选{filterCount > 0 && <span>{filterCount}</span>}
      </button>
    </div>
    <AnimatePresence initial={false}>{showFilterPanel && <PresencePanel kind="disclosure" key="filters"><div id="library-filter-panel" className="ui-card mt-2 flex flex-wrap gap-3 p-3">
      <label className="ui-field flex-1"><span className="ui-label">来源</span><select aria-label="来源筛选" className="ui-input" value={filterSite} onChange={event => setFilterSite(event.target.value)}>
        <option value="">全部来源</option>{uniqueSites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
      <label className="ui-field flex-1"><span className="ui-label">标签</span><select aria-label="标签筛选" className="ui-input" value={filterTag} onChange={event => setFilterTag(event.target.value)}>
        <option value="">全部标签</option>{tags.map(tag => <option key={tag.id} value={tag.name}>{tag.name}</option>)}
      </select></label>
      {aiPendingEnabled && <label className="ui-meta flex items-center gap-2"><input type="checkbox" checked={includePending} onChange={event => setIncludePending(event.target.checked)} />包含未确认的 AI 建议</label>}
      <button className="ui-button ui-button-ghost self-end" onClick={handleClearFilters}>重置筛选</button>
    </div></PresencePanel>}</AnimatePresence>
    <div className="library-search-summary" role="status">
      <span>{matchCount} 个素材{filterCount > 0 ? ' · 已应用筛选' : ''}</span>
      <div className="flex items-center gap-4"><span>{discoveryMode === 'lexical-only' ? '本地关键词检索' : '原件比例预览'}</span>{onThumbnailSizeChange && <label className="flex items-center gap-2">缩略图<input aria-label="缩略图大小" type="range" min="160" max="280" step="20" value={thumbnailSize} onChange={event => onThumbnailSizeChange(Number(event.target.value))} className="w-20 accent-[var(--ui-accent)]" /></label>}</div>
    </div>
  </>
}
