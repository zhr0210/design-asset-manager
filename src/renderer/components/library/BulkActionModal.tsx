import React from 'react'
import { ReviewSheet, Notice } from '../ui/WorkspacePrimitives'
import TagSelector from '../tag/TagSelector'

type BulkActionModalProps = {
  busy?: boolean;
  error?: string | null;
  bulkActionType: 'add' | 'remove' | null;
  bulkActionTags: string[];
  setBulkActionTags: React.Dispatch<React.SetStateAction<string[]>>;
  setBulkActionType: (type: 'add' | 'remove' | null) => void;
  executeBulkAction: () => void;
};

export default function BulkActionModal({
  busy = false, error = null,
  bulkActionType,
  bulkActionTags,
  setBulkActionTags,
  setBulkActionType,
  executeBulkAction
}: BulkActionModalProps) {
  if (!bulkActionType) return null

  return (
    <ReviewSheet label="批量编辑标签" busy={busy} onCancel={() => { setBulkActionType(null); setBulkActionTags([]) }}>
      <div className="ui-card">
        <fieldset disabled={busy} className="min-w-0"><TagSelector
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
        </fieldset>
        {error && <Notice tone="danger">{error}</Notice>}
        {/* Modal actions footer inside Selector */}
        <div className="bg-slate-50/50 px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            disabled={busy}
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
            disabled={busy || bulkActionTags.length === 0}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-[11px] shadow-sm disabled:opacity-50 transition-premium cursor-pointer"
          >
            确认执行批量修改 ({bulkActionTags.length} 个标签)
          </button>
        </div>
      </div>
    </ReviewSheet>
  )
}
