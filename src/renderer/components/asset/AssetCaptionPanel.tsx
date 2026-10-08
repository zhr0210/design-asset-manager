import React, { useState, useEffect } from 'react'
import { Sparkles, Edit2 } from 'lucide-react'
import { Asset } from '../../stores/asset.store'
import { projectAssetCaptionDisplay } from '../../../shared/workflows/asset-display.workflow'
import type { AssetTaggingModelId } from '../../../shared/workflows/asset-tagging.workflow'
import { useLibraryViewStore } from '../../stores/library-view.store'
import { normalizeDescriptionDraft } from '../../../shared/workflows/asset-description-draft.workflow'

type AssetCaptionPanelProps = {
  selectedAsset: Asset;
  updateAssetCaption: (id: string, caption: string, expectedCaption?: string) => Promise<void>;
  resetAssetCaptionEdited: (id: string) => Promise<void>;
  generateAiSuggestions: (id: string, engines: readonly AssetTaggingModelId[]) => Promise<{ success: boolean; error?: string }>;
  aiActionsEnabled?: boolean;
};

export default function AssetCaptionPanel({
  selectedAsset,
  updateAssetCaption,
  resetAssetCaptionEdited,
  generateAiSuggestions,
  aiActionsEnabled = true
}: AssetCaptionPanelProps) {
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const retained = useLibraryViewStore(state => state.descriptions[selectedAsset.id])
  const draft = normalizeDescriptionDraft(retained, selectedAsset.aiCaption || '')
  const dirty = draft.value !== draft.baseCaption
  const baselineChanged = draft.baseCaption !== (selectedAsset.aiCaption || '')
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [isRegeneratingCaption, setIsRegeneratingCaption] = useState(false)
  const captionDisplay = projectAssetCaptionDisplay(selectedAsset, { isRegenerating: isRegeneratingCaption })

  // Reset internal states on asset transition
  useEffect(() => {
    setIsEditingCaption(dirty); setError('')
  }, [selectedAsset.id])
  useEffect(() => { if (dirty) setIsEditingCaption(true) }, [dirty])

  return (
    <div className="border-t border-slate-100 pt-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>画面描述</span>
        </span>
        <div className="flex items-center gap-1.5">
          {captionDisplay.showRestoreAction && (
            <button
              onClick={async () => {
                await resetAssetCaptionEdited(selectedAsset.id)
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-all cursor-pointer"
              title={aiActionsEnabled ? '恢复为 AI 默认生成的描述' : '保留当前描述，并允许下次确认的 AI 分析更新描述'}
            >
              {aiActionsEnabled ? captionDisplay.restoreActionLabel : '允许 AI 更新'}
            </button>
          )}
          {aiActionsEnabled && <button
            onClick={async () => {
              setIsRegeneratingCaption(true)
              try {
                // Reset edited lock if any
                await resetAssetCaptionEdited(selectedAsset.id)
                // Trigger Florence-2 generation
                const result = await generateAiSuggestions(selectedAsset.id, ['florence2'])
                if (!result.success) {
                  console.warn('[AssetCaptionPanel] Real caption/tag worker unavailable:', result.error)
                }
              } catch (e) {
                console.error(e)
              } finally {
                setIsRegeneratingCaption(false)
              }
            }}
            disabled={isRegeneratingCaption}
            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {captionDisplay.regenerateActionLabel}
          </button>}
        </div>
      </div>

      {isEditingCaption ? (
        <div className="space-y-2">
          {baselineChanged && <div role="status">
            <p>描述已在另一界面变化。你的输入仍保留，保存前请核对当前内容。</p>
            <details><summary>查看当前已保存描述</summary><p className="whitespace-pre-wrap">{selectedAsset.aiCaption || '当前描述为空。'}</p></details>
            <button disabled={saving} onClick={() => { useLibraryViewStore.getState().setDescription(selectedAsset.id, { value: draft.value, baseCaption: selectedAsset.aiCaption || '' }); setError('') }}>核对后以当前描述为基准</button>
          </div>}
          <textarea
            aria-label="素材描述"
            maxLength={32000}
            value={draft.value}
            onChange={(e) => useLibraryViewStore.getState().setDescription(selectedAsset.id, { value: e.target.value, baseCaption: draft.baseCaption })}
            className="w-full text-[11px] p-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300 font-sans min-h-[60px]"
            placeholder="请输入画面描述..."
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              disabled={saving}
              onClick={() => { useLibraryViewStore.getState().setDescription(selectedAsset.id, { value: selectedAsset.aiCaption || '', baseCaption: selectedAsset.aiCaption || '' }); setIsEditingCaption(false); setError('') }}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={async () => {
                if (saving) return
                const scope = useLibraryViewStore.getState().scope
                setSaving(true); setError('')
                try {
                  await updateAssetCaption(selectedAsset.id, draft.value, draft.baseCaption)
                  if (useLibraryViewStore.getState().scope !== scope) return
                  useLibraryViewStore.getState().finishDescription(selectedAsset.id, draft.value, draft.baseCaption)
                  const current = useLibraryViewStore.getState().descriptions[selectedAsset.id]
                  if (current?.value === current?.baseCaption) setIsEditingCaption(false)
                } catch (caught) { if (useLibraryViewStore.getState().scope === scope) setError(caught instanceof Error ? caught.message : '描述未保存，输入仍保留。') }
                finally { setSaving(false) }
              }}
              disabled={!dirty || saving}
              className="px-2.5 py-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[10.5px] font-bold transition-all shadow-sm cursor-pointer"
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl space-y-2 relative group/caption">
          <p className="text-[11.5px] text-slate-600 leading-relaxed font-sans select-text whitespace-pre-wrap">
            {captionDisplay.hasCaption ? captionDisplay.captionText : (
              <span className="text-slate-400 italic">{aiActionsEnabled?captionDisplay.placeholderLabel:'暂无画面描述。点击编辑添加。'}</span>
            )}
          </p>

          <div className="flex flex-col gap-1 text-[9.5px] text-slate-400 border-t border-slate-100/50 pt-2 font-sans">
            <div className="flex items-center justify-between">
              <span>
                来源:{' '}
                <span className={captionDisplay.sourceToneClass}>{captionDisplay.sourceLabel}</span>
              </span>
              {captionDisplay.hasUpdatedAt && (
                <span>{captionDisplay.updatedAtLabel}</span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setIsEditingCaption(true)
            }}
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-white shadow-sm border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all opacity-0 group-hover/caption:opacity-100 cursor-pointer"
            title={captionDisplay.editActionLabel}
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
