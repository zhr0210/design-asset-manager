import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Tag as TagIcon,
  Plus,
  Merge,
  Edit2,
  Trash2,
  Search,
  Sliders,
  Compass,
  AlertCircle,
  Cpu
} from 'lucide-react'
import { useAssetStore, Tag } from '../stores/asset.store'
import TagEditDialog from '../components/tag/TagEditDialog'
import TagMergeDialog from '../components/tag/TagMergeDialog'
import TagChip from '../components/tag/TagChip'
import {
  AssetTagManagerSortOrder,
  projectAssetTagManager,
  projectAssetTaggingComputeBanner
} from '../../shared/workflows/asset-tagging.workflow'

export default function TagManagerPage() {
  const { tags, deleteTag } = useAssetStore()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortOrder, setSortOrder] = useState<AssetTagManagerSortOrder>('usage')

  // Modals status
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [mergeSourceId, setMergeSourceId] = useState('')

  // AI Service & GPU Status state
  const [aiStatus, setAiStatus] = useState<any>(null)

  // Polling effect for GPU VRAM and queue stats
  useEffect(() => {
    const fetchStatus = async () => {
      const api = (window as any).electronAPI
      if (api && api.aiModelStatus) {
        try {
          const res = await api.aiModelStatus()
          if (res) {
            setAiStatus(res)
          }
        } catch (e) {
          console.error('Failed to fetch AI status:', e)
        }
      }
    }

    fetchStatus()
    const timer = setInterval(fetchStatus, 3000)
    return () => clearInterval(timer)
  }, [])

  const tagManagerProjection = React.useMemo(
    () => projectAssetTagManager(tags, { search, filterType, sortOrder }),
    [tags, search, filterType, sortOrder]
  )
  const computeBanner = React.useMemo(
    () => projectAssetTaggingComputeBanner({
      workerOffline: aiStatus?.offline,
      gpuDeviceName: aiStatus?.gpu_status?.device_name,
      gpuUtilizationPercent: aiStatus?.gpu_status?.utilization_percent,
      queuedTaskCount: aiStatus?.queue_stats?.queued
    }),
    [aiStatus]
  )

  const handleCreateNew = () => {
    setEditingTag(null)
    setIsEditOpen(true)
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setIsEditOpen(true)
  }

  const handleMerge = (tag: Tag) => {
    setMergeSourceId(tag.id)
    setIsMergeOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确认要永久删除标签 "${name}" 吗？这一操作不可恢复，已关联素材的关系将被解除。`)) {
      try {
        await deleteTag(id)
      } catch (err) {
        alert(`删除失败: ${err}`)
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 h-full overflow-y-auto pr-1 select-none font-sans pb-8">
      {/* Title section */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-brand-500" />
            <span>素材库标签管理中心 (Tag Studio)</span>
          </h2>
          <span className="text-slate-400 text-[11px] font-medium leading-none">
            统一配置风格、色彩、排版、主客体等维度多阶标签词汇，支持同义词别名聚合与合并清洗。
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setMergeSourceId('')
              setIsMergeOpen(true)
            }}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-[12px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Merge className="w-4 h-4 text-slate-500" />
            <span>合并去重</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="px-4.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-[12px] transition-premium flex items-center gap-1.5 cursor-pointer shadow shadow-brand-500/10"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>新建标签</span>
          </button>
        </div>
      </div>

      {/* Filter and control header bar */}
      <div className="glass-panel p-4 rounded-2xl shadow-premium bg-white/80 flex flex-col md:flex-row items-center gap-4 shrink-0">
        {/* Keywords Search */}
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索标签名称、英文缩写或别名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[12px] rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-premium font-semibold text-slate-700"
          />
        </div>

        {/* Type Filter */}
        <div className="w-full md:w-56 relative">
          <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[12px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none"
          >
            <option value="">全部类别类型</option>
            {tagManagerProjection.typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Orders Selector */}
        <div className="w-full md:w-48 relative">
          <Sliders className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'usage' | 'name')}
            className="w-full pl-10 pr-4 py-2.5 text-[12px] font-bold bg-white border border-slate-200 rounded-xl outline-none transition-premium cursor-pointer text-slate-600 appearance-none"
          >
            <option value="usage">按使用次数降序</option>
            <option value="name">按拼音名称排序</option>
          </select>
        </div>
      </div>

      {/* Spreadsheet / Table list content */}
      <div className="flex-1 bg-white border border-slate-100 rounded-2xl shadow-premium overflow-hidden flex flex-col min-h-[300px]">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                <th className="px-6 py-3.5 w-44">标签视觉形态</th>
                <th className="px-6 py-3.5 w-32">类别分类</th>
                <th className="px-6 py-3.5 w-32">英语别名/简写</th>
                <th className="px-6 py-3.5">中文别名数组</th>
                <th className="px-6 py-3.5 w-32">父级关系</th>
                <th className="px-6 py-3.5 w-24 text-center">使用频数</th>
                <th className="px-6 py-3.5 w-32 text-center">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[11.5px] text-slate-600 font-medium">
              {tagManagerProjection.rows.map((row) => (
                <tr
                  key={row.tag.id}
                  className="hover:bg-slate-50/50 transition-colors group/row"
                >
                  {/* Tag Chip column */}
                  <td className="px-6 py-3.5">
                    <TagChip
                      name={row.tag.name}
                      type={row.tag.type}
                      colorClass={row.tag.color}
                      source="manual"
                      status="confirmed"
                      showHoverTooltip={false}
                    />
                  </td>

                  {/* Category Type column */}
                  <td className="px-6 py-3.5 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                    {row.categoryLabel}
                  </td>

                  {/* Shorthand column */}
                  <td className="px-6 py-3.5 font-mono text-[10.5px] text-slate-400">
                    {row.shorthandLabel}
                  </td>

                  {/* Aliases array list */}
                  <td className="px-6 py-3.5 text-slate-400 truncate max-w-xs">
                    {row.aliasLabels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.aliasLabels.map((a) => (
                          <span key={a} className="bg-slate-100/80 px-1.5 py-0.5 rounded text-[9.5px] text-slate-500">
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-[10px] text-slate-300">{row.emptyAliasesLabel}</span>
                    )}
                  </td>

                  {/* Parent name column */}
                  <td className="px-6 py-3.5 font-semibold text-slate-500">
                    {row.isCategoryParent ? (
                      <span className="text-[9.5px] bg-brand-50 text-brand-600 border border-brand-100 px-1.5 py-0.5 rounded-md font-bold">
                        {row.parentLabel}
                      </span>
                    ) : (
                      row.parentLabel
                    )}
                  </td>

                  {/* Usage count column */}
                  <td className="px-6 py-3.5 text-center">
                    <span className={`px-2 py-0.5 font-extrabold text-[10.5px] rounded-md ${row.usageToneClass}`}>
                      {row.usageLabel}
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-80 group-hover/row:opacity-100 transition-opacity">
                      
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEdit(row.tag)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                        title="修改标签参数"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Merge Button */}
                      <button
                        onClick={() => handleMerge(row.tag)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                        title="此标签向其他标签合并"
                      >
                        <Merge className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete button (Avoid deleting pre-seeded system definitions if required, or allow with warnings) */}
                      <button
                        onClick={() => handleDelete(row.tag.id, row.tag.name)}
                        className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="彻底移除此标签"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {tagManagerProjection.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center text-slate-400 font-semibold flex-col gap-3">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 stroke-[1.5]" />
                      <span>{tagManagerProjection.emptyLabel}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Modals */}
      <TagEditDialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditingTag(null)
        }}
        tag={editingTag}
      />

      <TagMergeDialog
        isOpen={isMergeOpen}
        onClose={() => {
          setIsMergeOpen(false)
          setMergeSourceId('')
        }}
        initialSourceTagId={mergeSourceId}
      />

      {/* Lightweight AI算力 Status Banner */}
      <div className="glass-panel p-4 mt-6 rounded-2xl flex items-center justify-between font-sans border border-slate-100/50 bg-white/70 shadow-premium shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm shrink-0">
            <Cpu className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-black text-slate-700">{computeBanner.titleLabel}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${computeBanner.indicatorClass}`} />
              <span className="text-[9.5px] font-bold text-slate-400 leading-none">
                {computeBanner.statusLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-none">
              {computeBanner.detailLabel}
            </span>
          </div>
        </div>

        <Link
          to="/ai-console"
          className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 hover:border-purple-200 rounded-xl font-extrabold text-[11px] transition-premium flex items-center gap-1 cursor-pointer shadow shadow-purple-500/5 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>管理 AI 算力中心 →</span>
        </Link>
      </div>
    </div>
  )
}
