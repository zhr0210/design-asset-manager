import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, FolderOpen, Image as ImageIcon } from 'lucide-react'
import { useAssetStore } from '../stores/asset.store'
import { projectDashboardRecentAssetDisplays } from '../../shared/workflows/asset-display.workflow'
import { PageHeader, EmptyState, Notice } from '../components/ui/WorkspacePrimitives'

export default function Dashboard() {
  const assets = useAssetStore(state => state.assets)
  const hasLoadedAssets = useAssetStore(state => state.hasLoadedAssets)
  const recent = projectDashboardRecentAssetDisplays(assets, { limit: 4 })
  return <div className="ui-page ui-tool-page space-y-6">
    <PageHeader eyebrow="WORKSPACE OVERVIEW" title="继续你的创作" description="查看当前素材库与最近加载的素材。" actions={<Link to="/library" className="ui-button ui-button-primary"><FolderOpen size={16} />打开素材工作区</Link>} />
    <div className="ui-stat-grid">{[{ label: '已加载素材', value: hasLoadedAssets ? assets.length : '—' }].map(stat => <div className="ui-stat" key={stat.label}><span className="ui-meta">{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
    <div className="ui-section-heading"><span>最近加载的素材</span><Link to="/library" className="ui-button ui-button-ghost">查看全部<ArrowUpRight size={15} /></Link></div>
    {recent.length ? <div className="ui-grid">{recent.map(asset => <Link key={asset.id} to="/library" className="workspace-asset-card block p-2"><div className="asset-media"><img src={asset.previewSrc} alt={asset.titleLabel} className="w-full h-44 object-contain" /></div><h3 className="text-[12px] font-medium mt-3 px-1">{asset.titleLabel}</h3><p className="ui-meta mt-1 mb-2 px-1">{asset.fileSummaryLabel}</p></Link>)}</div> : <div className="ui-card"><EmptyState icon={<ImageIcon />} title="让灵感在这里相遇" description="前往素材工作区打开素材库。已加载的素材会显示在这里。" /></div>}

  </div>
}
