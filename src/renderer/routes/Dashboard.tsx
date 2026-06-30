import React from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Image as ImageIcon,
  Globe,
  DownloadCloud,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { useAssetStore } from '../stores/asset.store'
import { useSiteStore } from '../stores/site.store'
import { useDownloadStore } from '../stores/download.store'
import { projectDownloadTaskSummaryDisplay } from '../../shared/workflows/download-status.workflow'
import { projectDashboardRecentAssetDisplays } from '../../shared/workflows/asset-display.workflow'

export default function Dashboard() {
  const assets = useAssetStore((s) => s.assets)
  const sites = useSiteStore((s) => s.sites)
  const tasks = useDownloadStore((s) => s.tasks)
  const downloadSummary = projectDownloadTaskSummaryDisplay(tasks)

  const stats = [
    {
      label: '本地素材总数',
      value: assets.length,
      icon: ImageIcon,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/10'
    },
    {
      label: '已配置网站数',
      value: sites.length,
      icon: Globe,
      color: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/10'
    },
    {
      label: '今日已完成下载',
      value: downloadSummary.completedCount,
      icon: DownloadCloud,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/10'
    },
    {
      label: '活跃下载任务',
      value: downloadSummary.activeCount,
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/10'
    }
  ]

  const recentAssetDisplays = projectDashboardRecentAssetDisplays(assets, { limit: 4 })

  return (
    <div className="space-y-8 select-none flex-1 flex flex-col">
      {/* Welcome Banner */}
      <div className="glass-panel p-8 rounded-2xl flex items-center justify-between shadow-premium bg-white/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-600 text-[10.5px] font-bold tracking-wide flex items-center gap-1 uppercase">
              <Sparkles className="w-3 h-3" /> MVP Alpha
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">下午好，视觉主理人</h2>
          <p className="text-slate-400 text-[12.5px] font-medium max-w-xl">
            Design Asset Manager 已就绪。您可以轻松管理网站授权、一键抓取素材图片并自动索引归入您的本地工作流。
          </p>
        </div>
        <Link
          to="/search"
          className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[13px] shadow-lg shadow-brand-500/25 transition-premium flex items-center gap-2"
        >
          <span>去抓取素材</span>
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </Link>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl bg-white border border-slate-100 shadow-premium flex items-center justify-between hover:shadow-card-hover transition-premium`}
            >
              <div className="space-y-1">
                <span className="text-slate-400 text-[11.5px] font-semibold">{stat.label}</span>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white ${stat.shadow} shadow-lg`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Assets & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Recent Assets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-bold text-slate-700">最近加入的素材</h3>
            <Link
              to="/library"
              className="text-[12px] font-semibold text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1"
            >
              <span>查看全部素材库</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentAssetDisplays.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {recentAssetDisplays.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-premium hover:shadow-card-hover transition-premium p-3"
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 relative">
                    <img
                      src={asset.previewSrc}
                      alt={asset.titleLabel}
                      className="w-full h-full object-cover group-hover:scale-105 transition-premium"
                    />
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur text-[9.5px] font-bold text-slate-600 shadow-sm">
                      {asset.sourceSiteLabel}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <h4 className="text-[12.5px] font-bold text-slate-700 truncate">{asset.titleLabel}</h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>{asset.fileSummaryLabel}</span>
                      <span>{asset.createdDateLabel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-white gap-3 shadow-premium">
              <ImageIcon className="w-8 h-8 stroke-[1.5]" />
              <span className="text-[12px] font-medium">本地素材库为空，快去抓取第一张素材吧！</span>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-bold text-slate-700 px-1">站点快捷动作</h3>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-premium p-6 space-y-4">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-premium border border-transparent hover:border-slate-100"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[12.5px] font-bold text-slate-700">{site.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate">{site.baseUrl}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                    site.authStatus === 'logged'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {site.authStatus === 'logged' ? '已授权' : '未登录'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
