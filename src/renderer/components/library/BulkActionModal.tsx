import React from 'react'
import TagSelector from '../tag/TagSelector'

type BulkActionModalProps = {
  bulkActionType: 'add' | 'remove' | null;
  bulkActionTags: string[];
  setBulkActionTags: React.Dispatch<React.SetStateAction<string[]>>;
  setBulkActionType: (type: 'add' | 'remove' | null) => void;
  executeBulkAction: () => void;
};

export default function BulkActionModal({
  bulkActionType,
  bulkActionTags,
  setBulkActionTags,
  setBulkActionType,
  executeBulkAction
}: BulkActionModalProps) {
  if (!bulkActionType) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-[450px] animate-in zoom-in-95 duration-200 bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <TagSelector
          title={bulkActionType === 'add' ? '批量添加标签关联' : '批量移除标签关联'}
          selectedTagIds={bulkActionTags}
          onToggleTag={(tagId) => {
            setBulkActionTags((prev) =>
              prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId]
            )
          }}
          onClose={() => {
            setBulkActionType(null)
            setBulkActionTags([])
          }}
        />
        {/* Modal actions footer inside Selector */}
        <div className="bg-slate-50/50 px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            onClick={() => {
              setBulkActionType(null)
              setBulkActionTags([])
            }}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={executeBulkAction}
            disabled={bulkActionTags.length === 0}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-[11px] shadow-sm disabled:opacity-50 transition-premium cursor-pointer"
          >
            确认执行批量修改 ({bulkActionTags.length} 个标签)
          </button>
        </div>
      </div>
    </div>
  )
}
