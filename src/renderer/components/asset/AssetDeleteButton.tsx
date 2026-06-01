import React from 'react'
import { Trash2 } from 'lucide-react'

type AssetDeleteButtonProps = {
  assetId: string;
  deleteAsset: (id: string) => Promise<void>;
};

export default function AssetDeleteButton({
  assetId,
  deleteAsset
}: AssetDeleteButtonProps) {
  return (
    <button
      onClick={() => deleteAsset(assetId)}
      className="w-full mt-6 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 hover:border-rose-100 text-slate-400 font-bold text-[12px] transition-premium flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
    >
      <Trash2 className="w-3.5 h-3.5" />
      <span>移出素材库</span>
    </button>
  )
}
