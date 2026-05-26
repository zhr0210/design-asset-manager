import React, { useState } from 'react'
import { FolderOpen, Settings as SettingsIcon, Save, Trash2, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react'
import { useSettingsStore } from '../stores/settings.store'

export default function Settings() {
  const { settings, updateSettings, clearCache } = useSettingsStore()
  const [libraryPath, setLibraryPath] = useState(settings.libraryPath)
  const [concurrency, setConcurrency] = useState(settings.concurrency)
  const [delayInterval, setDelayInterval] = useState(settings.delayInterval)
  const [saveOriginalUrl, setSaveOriginalUrl] = useState(settings.saveOriginalUrl)
  const [autoThumbnail, setAutoThumbnail] = useState(settings.autoThumbnail)

  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [showClearedToast, setShowClearedToast] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    updateSettings({
      libraryPath,
      concurrency,
      delayInterval,
      saveOriginalUrl,
      autoThumbnail
    })
    setSaving(false)
    setShowSavedToast(true)
    setTimeout(() => setShowSavedToast(false), 2000)
  }

  const handleClearCache = async () => {
    setClearing(true)
    await clearCache()
    setClearing(false)
    setShowClearedToast(true)
    setTimeout(() => setShowClearedToast(false), 2000)
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col select-none">
      {/* Toast notifications */}
      {showSavedToast && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-[12.5px] shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>系统配置已成功保存</span>
        </div>
      )}

      {showClearedToast && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-slate-800 text-white font-semibold text-[12.5px] shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>系统浏览器缓存清理成功</span>
        </div>
      )}

      {/* Main Form Settings Panel */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Core parameters panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-premium p-6 space-y-6">
            <h3 className="text-[14px] font-bold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
              <SettingsIcon className="w-4.5 h-4.5 text-slate-400" />
              <span>下载与本地素材库偏好</span>
            </h3>

            {/* Folder Library Path */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500">本地素材库物理路径</label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <FolderOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={libraryPath}
                    onChange={(e) => setLibraryPath(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLibraryPath('G:\\DesignAssetManager\\library')}
                  className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[12.5px] transition-premium"
                >
                  浏览文件夹
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">抓取的原图与缩略图将默认存储在该本地目录下，支持多盘移动。</p>
            </div>

            {/* Concurrency Throttling Slider */}
            <div className="space-y-2 border-t border-slate-50 pt-5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-500">并发下载任务上限</label>
                <span className="text-[11.5px] font-extrabold text-brand-500 bg-brand-50 px-2 py-0.5 rounded">
                  {concurrency} 个并发
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500 focus:outline-none"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400 font-bold">
                <span>1 (单图下载模式)</span>
                <span>3 (默认并发)</span>
                <span>8 (高速下载模式)</span>
              </div>
            </div>

            {/* Request Delay Throttling */}
            <div className="space-y-2 border-t border-slate-50 pt-5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-500">反防盗爬虫请求延迟间隔</label>
                <span className="text-[11.5px] font-extrabold text-brand-500 bg-brand-50 px-2 py-0.5 rounded">
                  {delayInterval} 秒延迟
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={delayInterval}
                onChange={(e) => setDelayInterval(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500 focus:outline-none"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400 font-bold">
                <span>0 秒 (全速抓取)</span>
                <span>1.5 秒 (推荐防屏蔽)</span>
                <span>5 秒 (深度平缓检索)</span>
              </div>
            </div>
          </div>

          {/* Submits settings button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-[13px] transition-premium shadow-lg shadow-brand-500/15 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>正在保存系统偏好配置...</span>
              </>
            ) : (
              <>
                <Save className="w-4.5 h-4.5" />
                <span>保存配置并应用偏好</span>
              </>
            )}
          </button>
        </div>

        {/* Side utilities panel */}
        <div className="space-y-6">
          {/* Safe Check Card */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-premium p-6 space-y-4">
            <h4 className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-500" />
              <span>数据隔离与安全合规</span>
            </h4>
            <p className="text-[11.5px] text-slate-400 font-medium leading-relaxed">
              Design Asset Manager 严格遵循安全抓取条例。所有获取到的 Cookie 与 storageStates 均采用 Electron 的 <strong>safeStorage</strong> 进行独立隔离加密，拒绝明文保存，严禁任何数据上传。
            </p>
          </div>

          {/* System Cache Clear utility */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-premium p-6 space-y-4">
            <h4 className="text-[13px] font-bold text-slate-700 flex items-center gap-2 text-rose-500">
              <Trash2 className="w-4.5 h-4.5" />
              <span>缓存清理与安全重置</span>
            </h4>
            <p className="text-[11.5px] text-slate-400 font-medium leading-relaxed">
              清理由 Playwright 抓取与渲染页面时产生的临时文件、Cookies 记录与图像缓存。此操作不会删除您本地已入库的图片。
            </p>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearing}
              className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 hover:border-rose-100 text-slate-400 font-bold text-[12px] transition-premium flex items-center justify-center gap-2"
            >
              {clearing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在清理浏览器会话缓存...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>立即清理缓存数据</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
