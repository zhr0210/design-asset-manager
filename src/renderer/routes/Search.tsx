import React from 'react'
import { Search as SearchIcon, Globe, Download, Clock, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useSearchStore } from '../stores/search.store'
import { useSiteStore } from '../stores/site.store'
import { useDownloadStore } from '../stores/download.store'
import {
  DownloadSearchActionDisplay,
  projectDownloadSearchActionDisplay
} from '../../shared/workflows/download-status.workflow'

export default function Search() {
  const sites = useSiteStore((s) => s.sites)
  const { siteId, keyword, searching, results, setSiteId, setKeyword, search } = useSearchStore()
  const { enqueueDownload, tasks } = useDownloadStore()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    search()
  }

  // Check if an item is already inside the download queue
  const getTaskStatus = (url: string) => {
    const matched = tasks.find((t) => t.downloadUrl === url)
    return matched ? matched.status : null
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col select-none">
      {/* Search Header Controls */}
      <div className="glass-panel p-5 rounded-2xl shadow-premium bg-white/80">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          {/* Site Selector */}
          <div className="md:w-60 relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[12.5px] font-semibold bg-white border border-slate-200 focus:border-brand-500 rounded-xl outline-none transition-premium cursor-pointer text-slate-700 appearance-none"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.authStatus === 'logged' ? '已授权' : '公共免登'})
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Input */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="输入灵感关键词，例如: Abstract 3D, Minimalist UI, Cyberpunk Graphic..."
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
            />
          </div>

          {/* Search Action */}
          <button
            type="submit"
            disabled={searching || !keyword.trim()}
            className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-semibold text-[12.5px] transition-premium shadow-md shadow-brand-500/10 flex items-center justify-center gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在提取页面图片...</span>
              </>
            ) : (
              <>
                <SearchIcon className="w-4 h-4 stroke-[2.5]" />
                <span>立即抓取素材</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Grid Results Content */}
      <div className="flex-1 flex flex-col">
        {searching ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-24">
            <Loader2 className="w-8 h-8 stroke-[1.5] text-brand-500 animate-spin" />
            <span className="text-[12.5px] font-medium">Playwright 正在拉取目标网站并智能分析图片节点...</span>
          </div>
        ) : results.length > 0 ? (
          <div className="waterfall-grid">
            {results.map((item) => {
              const status = getTaskStatus(item.imageUrl || '')
              const actionDisplay = projectDownloadSearchActionDisplay(status)
              return (
                <div
                  key={item.id}
                  className="waterfall-item group rounded-2xl overflow-hidden border border-slate-100 bg-white p-3 shadow-premium hover:shadow-card-hover transition-premium"
                >
                  <div className="rounded-xl overflow-hidden bg-slate-50 relative group/img cursor-zoom-in">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-premium"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 transition-premium" />
                    
                    {/* Size and badge */}
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/50 text-white font-bold text-[9px] shadow-sm tracking-wide">
                      {item.width && item.height ? `${item.width} x ${item.height}` : '自适应'}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-[12.5px] font-bold text-slate-700 leading-snug line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                        {item.sourceSite}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          enqueueDownload({
                            title: item.title || 'Scraped Image',
                            sourceSite: item.sourceSite,
                            sourcePageUrl: item.sourcePageUrl,
                            downloadUrl: item.imageUrl || '',
                            thumbnailUrl: item.thumbnailUrl
                          })
                        }
                        disabled={actionDisplay.disabled}
                        className={`flex-1 py-2 px-3 rounded-lg font-bold text-[11.5px] transition-premium flex items-center justify-center gap-1.5 ${actionDisplay.buttonClass}`}
                      >
                        <SearchDownloadActionIcon actionDisplay={actionDisplay} />
                        <span>{actionDisplay.label}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-24 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium">
            <ImageIcon className="w-8 h-8 stroke-[1.5]" />
            <span className="text-[12px] font-medium">这里将展示智能抓取的页面素材图片结果</span>
            <p className="text-[10.5px] text-slate-400 font-medium">请在顶部选择网站，输入您需要的分类或创意词，点击“立即抓取”。</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SearchDownloadActionIcon({ actionDisplay }: { actionDisplay: DownloadSearchActionDisplay }) {
  if (actionDisplay.iconKey === 'image') return <ImageIcon className="w-3.5 h-3.5" />
  if (actionDisplay.iconKey === 'clock') return <Clock className="w-3.5 h-3.5 animate-pulse" />
  return <Download className="w-3.5 h-3.5" />
}
