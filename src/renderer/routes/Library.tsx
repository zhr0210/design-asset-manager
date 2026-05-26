import React from 'react'
import {
  Search,
  Filter,
  Globe,
  Tag as TagIcon,
  X,
  ExternalLink,
  FolderOpen,
  Calendar,
  Layers,
  ChevronRight,
  Maximize2,
  Trash2
} from 'lucide-react'
import { useAssetStore, Asset } from '../stores/asset.store'

export default function Library() {
  const {
    assets,
    tags,
    selectedAsset,
    searchQuery,
    filterSite,
    filterTag,
    setSelectedAsset,
    setSearchQuery,
    setFilterSite,
    setFilterTag,
    deleteAsset
  } = useAssetStore()

  // Filter computation logic
  const filteredAssets = assets.filter((asset) => {
    const matchSearch =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchSite = filterSite ? asset.sourceSiteId === filterSite : true
    const matchTag = filterTag ? asset.tags.includes(filterTag) : true

    return matchSearch && matchSite && matchTag
  })

  // Extract unique site options for dropdown filter
  const uniqueSites = Array.from(
    new Map(assets.map((item) => [item.sourceSiteId, item.sourceSiteName])).entries()
  )

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterSite('')
    setFilterTag('')
  }

  return (
    <div className="flex-1 flex gap-8 h-full relative overflow-hidden select-none">
      {/* Left assets feed */}
      <div className="flex-1 flex flex-col space-y-6 h-full overflow-y-auto pr-1">
        {/* Filtering header bar */}
        <div className="glass-panel p-4 rounded-2xl shadow-premium bg-white/80 flex flex-col md:flex-row items-center gap-4">
          {/* Keyword Search */}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索本地资产标题或标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[12px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
            />
          </div>

          {/* Site Filter */}
          <div className="w-full md:w-44 relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[12px] font-semibold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none"
            >
              <option value="">全部网站来源</option>
              {uniqueSites.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div className="w-full md:w-44 relative">
            <TagIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[12px] font-semibold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none"
            >
              <option value="">全部标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters button */}
          {(searchQuery || filterSite || filterTag) && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-[12px] font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>重置筛选</span>
            </button>
          )}
        </div>

        {/* Gallery Masonry */}
        {filteredAssets.length > 0 ? (
          <div className="waterfall-grid">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`waterfall-item group rounded-2xl overflow-hidden border p-3 bg-white shadow-premium hover:shadow-card-hover transition-premium cursor-pointer ${
                  selectedAsset?.id === asset.id
                    ? 'border-brand-500 ring-2 ring-brand-500/10'
                    : 'border-slate-100'
                }`}
              >
                <div className="rounded-xl overflow-hidden bg-slate-50 relative aspect-auto">
                  <img
                    src={asset.thumbnailPath}
                    alt={asset.title}
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-premium"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur text-[9.5px] font-bold text-slate-500 shadow-sm">
                    {asset.sourceSiteName}
                  </div>
                </div>

                <div className="mt-3.5 space-y-2">
                  <h4 className="text-[12.5px] font-bold text-slate-700 leading-snug line-clamp-1">
                    {asset.title}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-slate-50 border border-slate-100 text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                    {asset.tags.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400">
                        +{asset.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium">
            <Maximize2 className="w-9 h-9 stroke-[1.5]" />
            <span className="text-[12px] font-medium">没有找到符合搜索条件的素材资产</span>
            <p className="text-[10.5px] text-slate-400 font-medium">请调整上面的关键词搜索或过滤器重试。</p>
          </div>
        )}
      </div>

      {/* Right slides details inspector drawer */}
      {selectedAsset && (
        <div className="w-80 border border-slate-200 rounded-2xl bg-white shadow-premium p-6 flex flex-col h-full shrink-0 overflow-y-auto animate-in slide-in-from-right duration-300 relative select-none">
          {/* Dismiss button */}
          <button
            onClick={() => setSelectedAsset(null)}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Details header */}
          <h3 className="text-[14px] font-bold text-slate-800 border-b border-slate-100 pb-3">素材详细分析</h3>

          {/* Mini Image Preview */}
          <div className="mt-5 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative group/view">
            <img
              src={selectedAsset.thumbnailPath}
              alt={selectedAsset.title}
              className="w-full h-auto object-cover max-h-48"
            />
            {/* Direct Open File button */}
            <a
              href={selectedAsset.thumbnailPath}
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/view:opacity-100 transition-premium flex items-center justify-center text-white text-[12px] font-bold gap-1"
            >
              <Maximize2 className="w-4 h-4" />
              <span>查看大图</span>
            </a>
          </div>

          <div className="mt-5 space-y-5 flex-1">
            {/* Details Specs */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">资源名称</span>
              <h4 className="text-[13px] font-bold text-slate-700 leading-snug">{selectedAsset.title}</h4>
            </div>

            <div className="space-y-3.5 text-[11.5px] border-t border-slate-50 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>来源网站:</span>
                </span>
                <span className="text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {selectedAsset.sourceSiteName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>图片规格:</span>
                </span>
                <span className="text-slate-700 font-bold">
                  {selectedAsset.width} x {selectedAsset.height} ({selectedAsset.fileType})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>文件大小:</span>
                </span>
                <span className="text-slate-700 font-bold">
                  {(selectedAsset.fileSize / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>下载日期:</span>
                </span>
                <span className="text-slate-700 font-bold">
                  {new Date(selectedAsset.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Path details */}
            <div className="space-y-3 border-t border-slate-50 pt-4 text-[11.5px]">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>本地存储目录:</span>
                </span>
                <code className="text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-500 font-mono select-text break-all">
                  {selectedAsset.filePath}
                </code>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>原始来源 URL:</span>
                </span>
                <a
                  href={selectedAsset.sourcePageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-lg text-brand-500 font-mono hover:underline flex items-center justify-between gap-1 break-all"
                >
                  <span className="truncate">{selectedAsset.sourcePageUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>

            {/* Tags section */}
            <div className="space-y-2.5 border-t border-slate-50 pt-4">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                <span>素材标签</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedAsset.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-brand-50 text-brand-600 border border-brand-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Delete Asset */}
          <button
            onClick={() => deleteAsset(selectedAsset.id)}
            className="w-full mt-6 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 hover:border-rose-100 text-slate-400 font-bold text-[12px] transition-premium flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>移出素材库</span>
          </button>
        </div>
      )}
    </div>
  )
}
