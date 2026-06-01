import React, { useState, useEffect } from 'react'
import { Sparkles, Edit2 } from 'lucide-react'
import { Asset } from '../../stores/asset.store'

type AssetCaptionPanelProps = {
  selectedAsset: Asset;
  updateAssetCaption: (id: string, caption: string) => Promise<void>;
  resetAssetCaptionEdited: (id: string) => Promise<void>;
  generateMockAiSuggestions: (id: string, engines: string[]) => Promise<void>;
};

export default function AssetCaptionPanel({
  selectedAsset,
  updateAssetCaption,
  resetAssetCaptionEdited,
  generateMockAiSuggestions
}: AssetCaptionPanelProps) {
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [tempCaption, setTempCaption] = useState('')
  const [isRegeneratingCaption, setIsRegeneratingCaption] = useState(false)

  // Reset internal states on asset transition
  useEffect(() => {
    setIsEditingCaption(false)
  }, [selectedAsset.id])

  return (
    <div className="border-t border-slate-100 pt-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>画面描述</span>
        </span>
        <div className="flex items-center gap-1.5">
          {selectedAsset.aiCaptionIsUserEdited === 1 && (
            <button
              onClick={async () => {
                await resetAssetCaptionEdited(selectedAsset.id)
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-all cursor-pointer"
              title="恢复为 AI 默认生成的描述"
            >
              恢复AI描述
            </button>
          )}
          <button
            onClick={async () => {
              setIsRegeneratingCaption(true)
              try {
                // Reset edited lock if any
                await resetAssetCaptionEdited(selectedAsset.id)
                // Trigger Florence-2 generation
                await generateMockAiSuggestions(selectedAsset.id, ['florence2'])
              } catch (e) {
                console.error(e)
              } finally {
                setIsRegeneratingCaption(false)
              }
            }}
            disabled={isRegeneratingCaption}
            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {isRegeneratingCaption ? '生成中...' : '重新生成'}
          </button>
        </div>
      </div>

      {isEditingCaption ? (
        <div className="space-y-2">
          <textarea
            value={tempCaption}
            onChange={(e) => setTempCaption(e.target.value)}
            className="w-full text-[11px] p-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-300 font-sans min-h-[60px]"
            placeholder="请输入画面描述..."
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setIsEditingCaption(false)}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={async () => {
                await updateAssetCaption(selectedAsset.id, tempCaption)
                setIsEditingCaption(false)
              }}
              className="px-2.5 py-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[10.5px] font-bold transition-all shadow-sm cursor-pointer"
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl space-y-2 relative group/caption">
          <p className="text-[11.5px] text-slate-600 leading-relaxed font-sans select-text whitespace-pre-wrap">
            {selectedAsset.aiCaption || (
              <span className="text-slate-400 italic">暂无画面描述。点击“重新生成”或“编辑”添加描述。</span>
            )}
          </p>

          <div className="flex flex-col gap-1 text-[9.5px] text-slate-400 border-t border-slate-100/50 pt-2 font-sans">
            <div className="flex items-center justify-between">
              <span>
                来源:{' '}
                {selectedAsset.aiCaptionIsUserEdited === 1 ? (
                  <span className="text-amber-600 font-bold">用户已编辑，AI不会自动覆盖</span>
                ) : selectedAsset.aiCaptionSource === 'ai_florence' ? (
                  <span className="text-indigo-600 font-bold">Florence-2</span>
                ) : (
                  '未知'
                )}
              </span>
              {selectedAsset.aiCaptionUpdatedAt && (
                <span>{new Date(selectedAsset.aiCaptionUpdatedAt).toLocaleString()}</span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setTempCaption(selectedAsset.aiCaption || '')
              setIsEditingCaption(true)
            }}
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-white shadow-sm border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all opacity-0 group-hover/caption:opacity-100 cursor-pointer"
            title="编辑描述"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
