import React, { useState } from 'react'
import { Plus, Globe, Trash2, KeyRound, Loader2, Sparkles, CheckSquare } from 'lucide-react'
import { useSiteStore, Site } from '../stores/site.store'

export default function Sites() {
  const { sites, addSite, deleteSite, startLogin, completeLogin } = useSiteStore()
  const [showModal, setShowModal] = useState(false)
  
  // Keep local indicator states for UX feedback
  const [startingId, setStartingId] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [searchUrlTemplate, setSearchUrlTemplate] = useState('')
  const [requiresAuth, setRequiresAuth] = useState(true)
  const [notes, setNotes] = useState('')

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !baseUrl) return
    await addSite({
      name,
      baseUrl,
      searchUrlTemplate: searchUrlTemplate || `${baseUrl}/search?q={{keyword}}`,
      requiresAuth,
      notes
    })
    setShowModal(false)
    setName('')
    setBaseUrl('')
    setSearchUrlTemplate('')
    setRequiresAuth(true)
    setNotes('')
  }

  const handleStartLogin = async (id: string) => {
    setStartingId(id)
    await startLogin(id)
    setStartingId(null)
  }

  const handleCompleteLogin = async (id: string) => {
    setCompletingId(id)
    await completeLogin(id)
    setCompletingId(null)
  }

  const getStatusBadge = (status: Site['authStatus']) => {
    switch (status) {
      case 'logged':
        return <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">已登录</span>
      case 'unlogged':
        return <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">未登录</span>
      case 'expired':
        return <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1">已过期</span>
      case 'reauth':
        return <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">需要重登</span>
      case 'logging_in':
        return <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 animate-pulse">正在登录...</span>
    }
  }

  return (
    <div className="space-y-6 flex-1 flex flex-col select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-slate-400 text-[12px] font-medium">配置您需要搜索、爬取图片素材的网站源，并维护独立登录态。</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[12.5px] shadow-lg shadow-brand-500/15 transition-premium flex items-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>配置新网站</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sites.map((site) => (
          <div
            key={site.id}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-premium hover:shadow-card-hover transition-premium flex flex-col justify-between min-h-[190px] group relative"
          >
            {/* Top Row */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                  <Globe className="w-5 h-5 stroke-[1.8]" />
                </div>
                {getStatusBadge(site.authStatus)}
              </div>
              <div className="space-y-1">
                <h4 className="text-[13.5px] font-bold text-slate-700">{site.name}</h4>
                <p className="text-[10.5px] text-slate-400 font-medium truncate">{site.baseUrl}</p>
                {site.notes && <p className="text-[11.5px] text-slate-400 font-medium line-clamp-1 mt-1">{site.notes}</p>}
              </div>
            </div>

            {/* Bottom Row Actions */}
            <div className="flex items-center gap-2 mt-6 border-t border-slate-50 pt-4">
              {site.requiresAuth ? (
                site.authStatus === 'logging_in' ? (
                  /* Glowing complete authorization trigger button */
                  <button
                    onClick={() => handleCompleteLogin(site.id)}
                    disabled={completingId !== null}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-[11.5px] transition-premium flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 animate-pulse"
                  >
                    {completingId === site.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>抓取会话数据中...</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>我已完成登录</span>
                      </>
                    )}
                  </button>
                ) : (
                  /* Launch Chrome trigger button */
                  <button
                    onClick={() => handleStartLogin(site.id)}
                    disabled={startingId !== null || completingId !== null}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-slate-100 text-white disabled:text-slate-400 font-semibold text-[11.5px] transition-premium flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/5"
                  >
                    {startingId === site.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>启动 Chrome 中...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{site.authStatus === 'logged' ? '重新登录网站' : '登录网站授权'}</span>
                      </>
                    )}
                  </button>
                )
              ) : (
                <span className="flex-1 text-[11px] font-semibold text-slate-400 text-center py-1.5 bg-slate-50 rounded-lg">
                  无需用户登录授权
                </span>
              )}

              <button
                onClick={() => deleteSite(site.id)}
                className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-premium"
                title="删除配置"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Site Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-[460px] rounded-2xl bg-white border border-slate-100 shadow-premium p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <h3 className="text-[14.5px] font-bold text-slate-700">配置新素材源网站</h3>
              <p className="text-[11px] text-slate-400 font-medium">配置新网站抓取规则，可指定搜索 URL 模板。</p>
            </div>

            <form onSubmit={handleAddSite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-bold text-slate-500">网站名称</label>
                <input
                  type="text"
                  placeholder="e.g. Pinterest"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11.5px] font-bold text-slate-500">网站根域名 (Base URL)</label>
                <input
                  type="url"
                  placeholder="https://pinterest.com"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11.5px] font-bold text-slate-500">搜索 URL 模板</label>
                  <span className="text-[9.5px] text-slate-400 font-medium flex items-center gap-0.5">
                    使用 <code className="bg-slate-100 px-1 py-0.5 rounded">{"{{keyword}}"}</code> 占位符
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="https://pinterest.com/search/pins/?q={{keyword}}"
                  value={searchUrlTemplate}
                  onChange={(e) => setSearchUrlTemplate(e.target.value)}
                  className="w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-slate-700">需要手动登录</span>
                  <span className="text-[10px] text-slate-400 font-medium">使用 Playwright 多开窗口手动登录并保存 storageState</span>
                </div>
                <input
                  type="checkbox"
                  checked={requiresAuth}
                  onChange={(e) => setRequiresAuth(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11.5px] font-bold text-slate-500">备注</label>
                <textarea
                  placeholder="e.g. 包含丰富的插画、壁纸和UI素材"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-[12.5px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-medium resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-semibold text-[12.5px] transition-premium border border-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[12.5px] transition-premium shadow-md shadow-brand-500/10"
                >
                  保存配置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
