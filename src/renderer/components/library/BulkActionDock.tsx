import React from 'react'
import { Plus, Trash2, Check } from 'lucide-react'

type BulkActionDockProps = {
  bulkSelectedAssetIds: string[];
  setBulkActionType: (type: 'add' | 'remove' | null) => void;
  handleBulkConfirmAi: () => void;
  clearBulkSelectedAssetIds: () => void;
};

export default function BulkActionDock({
  bulkSelectedAssetIds,
  setBulkActionType,
  handleBulkConfirmAi,
  clearBulkSelectedAssetIds
}: BulkActionDockProps) {
  if (bulkSelectedAssetIds.length === 0) return null

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-premium border border-slate-800 flex items-center gap-6 animate-in slide-in-from-bottom duration-300 z-40 text-[12.5px] font-sans">
      <div className="flex items-center gap-2">
        <span className="w-5.5 h-5.5 rounded-full bg-brand-500 flex items-center justify-center font-bold text-[11px] text-white">
          {bulkSelectedAssetIds.length}
        </span>
        <span className="font-semibold text-slate-200">个素材已被选中</span>
      </div>

      <div className="h-4 w-px bg-slate-800" />

      {/* Bulk actions triggers */}
      <div className="flex gap-2">
        <button
          onClick={() => setBulkActionType('add')}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>批量打标签</span>
        </button>
        <button
          onClick={() => setBulkActionType('remove')}
          className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>批量删标签</span>
        </button>
        <button
          onClick={handleBulkConfirmAi}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]"
        >
          <Check className="w-3.5 h-3.5" />
          <span>批量确认 AI</span>
        </button>
      </div>

      <div className="h-4 w-px bg-slate-800" />

      <button
        onClick={clearBulkSelectedAssetIds}
        className="px-3 py-2 text-slate-400 hover:text-white font-bold transition-colors cursor-pointer text-[11.5px]"
      >
        取消选择
      </button>
    </div>
  )
}
