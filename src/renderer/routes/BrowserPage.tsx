import React, { useEffect, useState } from 'react'
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Search,
  ScanLine,
  Download,
  Loader2,
  CheckSquare,
  Square,
  ExternalLink,
  Image as ImageIcon,
  Check,
  Compass,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useBrowserStore } from '../stores/browser.store'
import { useExtractorStore } from '../stores/extractor.store'
import { useSiteStore } from '../stores/site.store'
import { useDownloadStore } from '../stores/download.store'
import BrowserViewport from '../components/browser/BrowserViewport'

export default function BrowserPage() {
  const sites = useSiteStore((s) => s.sites)
  const loadSites = useSiteStore((s) => s.loadSites)

  const {
    currentUrl,
    pageTitle,
    canGoBack,
    canGoForward,
    isLoading,
    activeSiteId,
    loadUrl,
    goBack,
    goForward,
    reload,
    stop,
    setCurrentUrl
  } = useBrowserStore()

  const {
    extractedAssets,
    selectedAssetIds,
    isExtracting,
    extractError,
    scanCurrentPage,
    toggleSelectAsset,
    selectAll,
    selectNone
  } = useExtractorStore()

  const { enqueueDownload, tasks } = useDownloadStore()
  const [urlInput, setUrlInput] = useState('')
  const [isLeftOpen, setIsLeftOpen] = useState(false)
  const [isRightOpen, setIsRightOpen] = useState(false)

  // Load configured sites from database on mount
  useEffect(() => {
    if (loadSites) {
      loadSites()
    }
  }, [])

  // Sync address bar input when currentUrl changes
  useEffect(() => {
    setUrlInput(currentUrl)
  }, [currentUrl])

  // If no site is loaded, load the first one by default
  useEffect(() => {
    if (sites.length > 0 && !activeSiteId) {
      const firstSite = sites[0]
      loadUrl(firstSite.baseUrl, firstSite.id)
    }
  }, [sites, activeSiteId])

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return

    let formattedUrl = urlInput.trim()
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl
    }
    loadUrl(formattedUrl, activeSiteId || 'custom')
  }

  const handleDownloadSelected = async () => {
    const selected = extractedAssets.filter((a) => selectedAssetIds.includes(a.id))
    for (const asset of selected) {
      const targetUrl = asset.downloadUrl || asset.previewUrl || asset.thumbnailUrl
      if (!targetUrl) continue

      // Clean special characters from titles
      const cleanTitle = (asset.title || '提取素材').trim().substring(0, 100)

      await enqueueDownload({
        title: cleanTitle,
        sourceSite: asset.sourceSite,
        sourcePageUrl: asset.sourcePageUrl,
        downloadUrl: targetUrl,
        thumbnailUrl: asset.thumbnailUrl,
        // Custom arguments to be supported in download.store
        captureMethod: 'browser_extract',
        browserPageTitle: pageTitle || '素材浏览器页面'
      } as any)
    }
    selectNone()
  }

  // Check if an item is already inside the download queue
  const getTaskStatus = (url: string) => {
    const matched = tasks.find((t) => t.downloadUrl === url)
    return matched ? matched.status : null
  }

  return (
    <div className="flex-1 flex h-full select-none overflow-hidden pr-1 relative">
      {/* Left drawer hover handle */}
      {!isLeftOpen && (
        <div
          onMouseEnter={() => setIsLeftOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-16 rounded-r-xl bg-slate-200 hover:bg-brand-500 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-premium z-30 shadow-sm border border-l-0 border-slate-350/40"
          title="展开网站导航"
        >
          <ChevronRight className="w-3 h-3 stroke-[3]" />
        </div>
      )}

      {/* 1. Left Sidebar: Registered Sites Navigator */}
      <div
        onMouseLeave={() => setIsLeftOpen(false)}
        className={`h-full shrink-0 transition-all duration-300 ease-out overflow-hidden z-20 ${
          isLeftOpen ? 'w-56 opacity-100 mr-4' : 'w-0 opacity-0 mr-0'
        }`}
      >
        <div className="w-56 glass-panel p-4 rounded-2xl bg-white/95 shadow-premium flex flex-col h-full overflow-hidden border border-slate-200/50">
          <div className="flex items-center gap-2 mb-3.5 px-1 shrink-0">
            <Globe className="w-4 h-4 text-brand-500" />
            <h3 className="font-bold text-slate-800 text-[13px] tracking-wide">灵感网站导航</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {sites.map((site) => {
              const isSelected = site.id === activeSiteId
              return (
                <button
                  key={site.id}
                  onClick={() => loadUrl(site.baseUrl, site.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-premium text-[12px] font-semibold flex items-center justify-between border ${
                    isSelected
                      ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/10'
                      : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <span className="truncate mr-2">{site.name}</span>
                  {site.requiresAuth && (
                    <span
                      className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : site.authStatus === 'logged'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}
                    >
                      {site.authStatus === 'logged' ? '已登' : '未登'}
                    </span>
                  )}
                </button>
              )
            })}

            {sites.length === 0 && (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Compass className="w-6 h-6 mx-auto stroke-[1.5]" />
                <p className="text-[11px] font-semibold">暂无配置网站</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Column: Browser Viewport & Controls */}
      <div className="flex-1 flex flex-col gap-4 h-full min-w-0 overflow-hidden">
        {/* Navigation Toolbar */}
        <div className="glass-panel p-3.5 rounded-2xl bg-white/80 shadow-premium shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            {/* History Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={goBack}
                disabled={!canGoBack}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-premium border border-transparent active:scale-95 text-slate-600"
                title="后退"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                onClick={goForward}
                disabled={!canGoForward}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-premium border border-transparent active:scale-95 text-slate-600"
                title="前进"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                onClick={isLoading ? stop : reload}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-premium border border-transparent active:scale-95 text-slate-600"
                title={isLoading ? '停止' : '刷新'}
              >
                {isLoading ? <X className="w-4 h-4 stroke-[2.5]" /> : <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>
            </div>

            {/* Address Bar Form */}
            <form onSubmit={handleNavigate} className="flex-1 flex items-center relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="输入网址回车，或输入快捷网站..."
                className="w-full pl-10 pr-4 py-2 text-[12.5px] font-medium rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium bg-white/70"
              />
            </form>
          </div>

          {/* Active Webpage Title Bar */}
          {pageTitle && (
            <div className="flex items-center gap-2 px-1 text-[11.5px] font-semibold text-slate-500 border-t border-slate-100 pt-2 shrink-0 select-none">
              <span className="shrink-0 text-slate-400">当前网页:</span>
              <span className="truncate text-slate-700 font-bold">{pageTitle}</span>
            </div>
          )}
        </div>

        {/* Embedded Browser Mount Viewport */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          <BrowserViewport />
        </div>
      </div>

      {/* Right drawer hover handle */}
      {!isRightOpen && !isExtracting && (
        <div
          onMouseEnter={() => setIsRightOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-16 rounded-l-xl bg-slate-200 hover:bg-brand-500 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-premium z-30 shadow-sm border border-r-0 border-slate-350/40"
          title="展开素材识别"
        >
          <ChevronLeft className="w-3 h-3 stroke-[3]" />
        </div>
      )}

      {/* 3. Right Sidebar: Extracted Asset List & Operations */}
      <div
        onMouseLeave={() => setIsRightOpen(false)}
        className={`h-full shrink-0 transition-all duration-300 ease-out overflow-hidden z-20 ${
          isRightOpen || isExtracting ? 'w-72 opacity-100 ml-4' : 'w-0 opacity-0 ml-0'
        }`}
      >
        <div className="w-72 glass-panel p-4 rounded-2xl bg-white/95 shadow-premium flex flex-col h-full overflow-hidden border border-slate-200/50">
          {/* Header & Scan Button */}
          <div className="shrink-0 border-b border-slate-100 pb-3 mb-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-brand-500" />
                <h3 className="font-bold text-slate-800 text-[13px] tracking-wide">网页素材识别</h3>
              </div>
              {extractedAssets.length > 0 && (
                <span className="text-[10px] font-bold bg-brand-50 text-brand-600 border border-brand-100 px-2 py-0.5 rounded-full select-none">
                  {selectedAssetIds.length}/{extractedAssets.length} 项
                </span>
              )}
            </div>

            <button
              onClick={scanCurrentPage}
              disabled={isExtracting || isLoading}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-[12.5px] transition-premium shadow-md shadow-brand-500/10 flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在扫描 DOM 节点...</span>
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4 stroke-[2.5]" />
                  <span>扫描当前网页</span>
                </>
              )}
            </button>
          </div>

          {/* Extracted Asset Cards List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0 select-none">
            {isExtracting ? (
              <div className="text-center py-20 text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500 stroke-[1.5]" />
                <p className="text-[11.5px] font-semibold">正在提取大图、背景图以及 srcset 节点...</p>
              </div>
            ) : extractedAssets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {extractedAssets.map((asset) => {
                  const isChecked = selectedAssetIds.includes(asset.id)
                  const taskStatus = getTaskStatus(asset.downloadUrl || asset.previewUrl || asset.thumbnailUrl || '')
                  return (
                    <div
                      key={asset.id}
                      onClick={() => !taskStatus && toggleSelectAsset(asset.id)}
                      className={`group relative rounded-xl overflow-hidden border p-1.5 transition-premium bg-white ${
                        taskStatus
                          ? 'opacity-60 border-slate-100 cursor-default'
                          : isChecked
                          ? 'border-brand-500 ring-1 ring-brand-500 cursor-pointer shadow-md'
                          : 'border-slate-150 hover:border-slate-300 hover:shadow-card-hover cursor-pointer'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="aspect-square rounded-lg overflow-hidden bg-slate-50 relative">
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.title || 'Extracted'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-premium"
                        />
                        
                        {/* Dimensional overlay */}
                        {asset.width && asset.height && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-white font-bold text-[8px] tracking-wide select-none">
                            {asset.width}x{asset.height}
                          </span>
                        )}

                        {/* Top-left checkbox overlay */}
                        {!taskStatus && (
                          <div className="absolute top-1 left-1">
                            {isChecked ? (
                              <div className="w-4.5 h-4.5 rounded bg-brand-500 text-white flex items-center justify-center shadow-sm">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-4.5 h-4.5 rounded bg-black/25 hover:bg-black/40 border border-white/20 transition-premium" />
                            )}
                          </div>
                        )}

                        {/* Status tag */}
                        {taskStatus && (
                          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-[10px] font-bold text-white tracking-wide">
                            {taskStatus === 'completed' ? '已在库中' : '下载中...'}
                          </div>
                        )}
                      </div>

                      {/* Brief details */}
                      <div className="mt-1.5 px-0.5 flex flex-col gap-0.5 overflow-hidden">
                        <span className="text-[9px] text-slate-400 font-bold uppercase truncate tracking-wide">
                          {asset.fileType || 'JPG'}
                        </span>
                        {asset.title && (
                          <span className="text-[10px] font-semibold text-slate-700 truncate">
                            {asset.title}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl px-4 flex flex-col justify-center gap-2 bg-slate-50/50">
                <ImageIcon className="w-7 h-7 mx-auto stroke-[1.5] text-slate-350" />
                <p className="text-[11.5px] font-bold text-slate-500">这里是素材识别面板</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  在内嵌网页中浏览，然后点击上方的“扫描当前网页”按钮，即可把符合标准的高清图片提取到此处。
                </p>
              </div>
            )}
          </div>

          {/* Action Footer Button */}
          {extractedAssets.length > 0 && (
            <div className="shrink-0 border-t border-slate-100 pt-3 mt-3 space-y-2">
              <div className="flex items-center gap-2 justify-between text-[11px] font-bold text-slate-400 select-none px-1">
                <button onClick={selectAll} className="hover:text-brand-500 transition-premium">全选所有</button>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                <button onClick={selectNone} className="hover:text-brand-500 transition-premium">取消选择</button>
              </div>

              <button
                onClick={handleDownloadSelected}
                disabled={selectedAssetIds.length === 0}
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-[12.5px] transition-premium shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>加入下载队列 ({selectedAssetIds.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
