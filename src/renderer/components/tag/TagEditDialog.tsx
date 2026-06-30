import React, { useState, useEffect } from 'react'
import { X, Plus, AlertCircle, Trash2 } from 'lucide-react'
import { useAssetStore, Tag } from '../../stores/asset.store'
import {
  ASSET_TAG_PRESET_COLORS,
  ASSET_TAG_TYPES,
  CUSTOM_ASSET_TAG_COLOR_CLASS,
  DEFAULT_ASSET_TAG_COLOR_CLASS
} from '../../../shared/workflows/asset-tagging.workflow'

interface TagEditDialogProps {
  tag?: Tag | null // If null, we are in "Create" mode
  isOpen: boolean
  onClose: () => void
}

export default function TagEditDialog({ tag, isOpen, onClose }: TagEditDialogProps) {
  const { createTag, updateTag, tags } = useAssetStore()

  const [name, setName] = useState('')
  const [type, setType] = useState('custom')
  const [color, setColor] = useState(DEFAULT_ASSET_TAG_COLOR_CLASS)
  const [description, setDescription] = useState('')
  const [shorthand, setShorthand] = useState('')
  const [parentId, setParentId] = useState('')
  const [isCategory, setIsCategory] = useState(false)
  
  const [aliasInput, setAliasInput] = useState('')
  const [aliases, setAliases] = useState<string[]>([])
  const [error, setError] = useState('')

  // Load tag data on open
  useEffect(() => {
    if (isOpen) {
      setError('')
      if (tag) {
        setName(tag.name)
        setType(tag.type)
        setColor(tag.color)
        setDescription(tag.description || '')
        setShorthand(tag.shorthand || '')
        setParentId(tag.parentId || '')
        setIsCategory(tag.isCategory)
        setAliases(tag.aliases || [])
      } else {
        // Reset for create mode
        setName('')
        setType('custom')
        setColor(CUSTOM_ASSET_TAG_COLOR_CLASS)
        setDescription('')
        setShorthand('')
        setParentId('')
        setIsCategory(false)
        setAliases([])
      }
    }
  }, [tag, isOpen])

  if (!isOpen) return null

  // Candidates for parent tags (exclude self and categories only)
  const potentialParents = tags.filter(
    (t) => t.isCategory && (!tag || t.id !== tag.id)
  )

  const handleAddAlias = () => {
    const trimmed = aliasInput.trim()
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed])
      setAliasInput('')
    }
  }

  const handleRemoveAlias = (val: string) => {
    setAliases(aliases.filter((x) => x !== val))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('标签名称不能为空')
      return
    }

    try {
      if (tag) {
        // Update mode
        await updateTag(tag.id, {
          name: trimmedName,
          type,
          color,
          description,
          shorthand,
          parentId: parentId || undefined,
          isCategory,
          aliases // Note: Handled by store/IPC
        })

        // Save aliases in separate table dynamically if aliases modified
        const removed = tag.aliases.filter(x => !aliases.includes(x))
        const added = aliases.filter(x => !tag.aliases.includes(x))
        
        const api = (window as any).electronAPI
        if (api) {
          for (const item of added) {
            await api.tagCreateAlias(tag.id, item)
          }
          for (const item of removed) {
            await api.tagRemoveAlias(tag.id, item)
          }
        }
      } else {
        // Create mode
        const created = await createTag({
          name: trimmedName,
          type,
          color,
          description,
          shorthand,
          parentId: parentId || undefined,
          isCategory
        })

        const api = (window as any).electronAPI
        if (api && created) {
          for (const item of aliases) {
            await api.tagCreateAlias(created.id, item)
          }
        }
      }
      onClose()
    } catch (err) {
      console.error('[Dialog] Save tag failed:', err)
      setError(String(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm select-none">
      <div className="w-[450px] bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-[14px] font-bold text-slate-800">
            {tag ? '编辑标签参数' : '新建自定义标签'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-[12px] font-sans">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-start gap-2 text-[11px] font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider">标签名称 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：极简主义..."
              className="w-full px-4 py-2 border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl outline-none font-medium text-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type Field */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 uppercase tracking-wider">类型分类</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer"
              >
                {ASSET_TAG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Is Category Toggle */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="inline-flex items-center gap-2 cursor-pointer pb-2.5">
                <input
                  type="checkbox"
                  checked={isCategory}
                  onChange={(e) => setIsCategory(e.target.checked)}
                  className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4 border-slate-200"
                />
                <span className="font-semibold text-slate-600">设为大类 (Category)</span>
              </label>
            </div>
          </div>

          {/* Preset Color Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider">色彩配置</label>
            <div className="grid grid-cols-4 gap-2">
              {ASSET_TAG_PRESET_COLORS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setColor(item.value)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold text-center border transition-all ${
                    color === item.value
                      ? 'ring-2 ring-brand-500/20 border-brand-500 font-extrabold scale-[1.03]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle ${item.value.split(' ')[0]}`} />
                  <span className="align-middle text-slate-600">{item.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Shorthand field */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 uppercase tracking-wider">缩写/英文代号</label>
              <input
                type="text"
                value={shorthand}
                onChange={(e) => setShorthand(e.target.value)}
                placeholder="例如：minimal"
                className="w-full px-4 py-2 border border-slate-200 focus:border-brand-500 rounded-xl outline-none font-semibold text-slate-700"
              />
            </div>

            {/* Parent ID selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 uppercase tracking-wider">归属父级分类</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-slate-600 font-semibold cursor-pointer"
              >
                <option value="">无父级(顶层大类)</option>
                {potentialParents.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wider">描述说明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="标签含义或设计风格特点备注..."
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 focus:border-brand-500 rounded-xl outline-none font-medium text-slate-700"
            />
          </div>

          {/* Aliases List Field */}
          <div className="space-y-1.5 border-t border-slate-50 pt-3">
            <label className="font-bold text-slate-500 uppercase tracking-wider">标签别名管理</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddAlias()
                  }
                }}
                placeholder="例如：现代极简、无印风..."
                className="flex-1 px-4 py-1.5 border border-slate-200 focus:border-brand-500 rounded-xl outline-none font-medium"
              />
              <button
                type="button"
                onClick={handleAddAlias}
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto px-1 py-1">
              {aliases.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-0.5 rounded-lg text-[10.5px] bg-slate-50 border border-slate-200 text-slate-500 font-semibold inline-flex items-center gap-1"
                >
                  <span>{item}</span>
                  <X
                    onClick={() => handleRemoveAlias(item)}
                    className="w-3 h-3 hover:bg-slate-200 rounded cursor-pointer"
                  />
                </span>
              ))}
              {aliases.length === 0 && (
                <span className="text-[10px] text-slate-400 font-medium italic">无配置别名，输入别名有助搜索</span>
              )}
            </div>
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
            onClick={handleSave}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-[12px] shadow shadow-brand-500/10 transition-premium"
          >
            保存并应用
          </button>
        </div>

      </div>
    </div>
  )
}
