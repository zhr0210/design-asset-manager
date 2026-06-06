import React, { useState, useEffect } from 'react'
import { X, HelpCircle, Merge } from 'lucide-react'
import { projectAssetTagPicker } from '../../../shared/workflows/asset-tagging.workflow'
import { useAssetStore } from '../../stores/asset.store'

interface TagMergeDialogProps {
  isOpen: boolean
  onClose: () => void
  initialSourceTagId?: string
}

export default function TagMergeDialog({
  isOpen,
  onClose,
  initialSourceTagId = ''
}: TagMergeDialogProps) {
  const { tags, mergeTags } = useAssetStore()
  const [sourceTagId, setSourceTagId] = useState('')
  const [targetTagId, setTargetTagId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSourceTagId(initialSourceTagId)
      setTargetTagId('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen, initialSourceTagId])

  if (!isOpen) return null

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!sourceTagId || !targetTagId) {
      setError('必须选择要合并的源标签和目标标签')
      return
    }

    if (sourceTagId === targetTagId) {
      setError('源标签和目标标签不能是同一个')
      return
    }

    try {
      await mergeTags(sourceTagId, targetTagId)
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      console.error('[Dialog] Tag merge failed:', err)
      setError(String(err))
    }
  }

  const sourceTagOptions = projectAssetTagPicker(tags).options
  const targetTagOptions = projectAssetTagPicker(tags, { excludeTagIds: [sourceTagId] }).options

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm select-none">
      <div className="w-[420px] bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-[13.5px] font-bold text-slate-800 flex items-center gap-1.5">
            <Merge className="w-4.5 h-4.5 text-brand-500" />
            <span>合并去重标签</span>
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleMerge} className="p-6 space-y-4 text-[12px] font-sans">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[11px] font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-[11px] font-bold text-center">
              标签合并成功！正在刷新...
            </div>
          )}

          {/* Merge Warnings Panel */}
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl flex gap-2.5 leading-relaxed text-[11px] font-medium">
            <HelpCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 mb-0.5">合并操作说明：</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-0.5">
                <li>所有原先打有 <b>源标签</b> 的素材，都会自动变更为 <b>目标标签</b>；</li>
                <li><b>源标签</b> 的所有别名、关系等都会转移并并入 <b>目标标签</b>；</li>
                <li>合并完成后，<b>源标签</b> 将被<b>永久删除</b>且无法撤销。</li>
              </ul>
            </div>
          </div>

          {/* Source Tag Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider">选择源标签 (将被合并并删除)</label>
            <select
              value={sourceTagId}
              onChange={(e) => {
                setSourceTagId(e.target.value)
                if (targetTagId === e.target.value) {
                  setTargetTagId('')
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer"
            >
              <option value="">点击选择源标签...</option>
              {sourceTagOptions.map((option) => (
                <option key={option.tag.id} value={option.tag.id}>
                  {option.mergeOptionLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Target Tag Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider">选择目标标签 (将被合并并保留)</label>
            <select
              value={targetTagId}
              onChange={(e) => setTargetTagId(e.target.value)}
              disabled={!sourceTagId}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">点击选择目标标签...</option>
              {targetTagOptions.map((option) => (
                <option key={option.tag.id} value={option.tag.id}>
                  {option.mergeOptionLabel}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 font-bold text-[12px] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleMerge}
            disabled={!sourceTagId || !targetTagId || sourceTagId === targetTagId}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-[12px] shadow shadow-brand-500/10 transition-premium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认合并并清退源标签
          </button>
        </div>

      </div>
    </div>
  )
}
