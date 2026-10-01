import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'

type AssetDeleteButtonProps = {
  assetId: string;
  deleteAsset: (id: string) => Promise<void>;
};

export default function AssetDeleteButton({
  assetId,
  deleteAsset
}: AssetDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  if (confirming) {
    return (
      <div data-testid="asset-trash-review" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-900">
        <div className="font-bold">移到回收站？</div>
        <div className="mt-1 text-[10px] text-rose-700">素材记录、标签关系和受管原件会保留，可从 Library 回收站恢复。</div>
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await deleteAsset(assetId) } finally { setBusy(false) } }} className="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white disabled:opacity-50">确认移到回收站</button>
          <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-bold text-rose-800 disabled:opacity-50">取消</button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full mt-6 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 hover:border-rose-100 text-slate-400 font-bold text-[12px] transition-premium flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
    >
      <Trash2 className="w-3.5 h-3.5" />
      <span>移到回收站</span>
    </button>
  )
}
