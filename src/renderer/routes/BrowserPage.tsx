import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Search,
  ChevronRight,
  Compass,
  LayoutDashboard
} from 'lucide-react'
import { useBrowserStore } from '../stores/browser.store'
import { useSiteStore } from '../stores/site.store'
import BrowserViewport from '../components/browser/BrowserViewport'

export default function BrowserPage() {
  const navigate = useNavigate()
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
    stop
  } = useBrowserStore()

  const [urlInput, setUrlInput] = useState('')
  const [isLeftOpen, setIsLeftOpen] = useState(false)

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
    console.log('[BrowserPage] sites list changed:', sites.map(s => s.id), 'activeSiteId:', activeSiteId)
    if (sites.length > 0 && !activeSiteId) {
      const firstSite = sites[0]
      console.log('[BrowserPage] Triggering default loadUrl for first site:', firstSite.baseUrl, firstSite.id)
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

  return (
    <div className="flex-1 flex h-full select-none overflow-hidden p-4 bg-slate-50 relative">
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
            {/* Back to Home Button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-premium text-[12.5px] font-bold active:scale-95 border border-slate-200 shadow-sm shrink-0"
              title="返回系统主页"
            >
              <LayoutDashboard className="w-4 h-4 text-brand-500" />
              <span>返回主页</span>
            </button>

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
    </div>
  )
}
