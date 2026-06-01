import React from 'react'
import { Check, Maximize2 } from 'lucide-react'
import { Asset } from '../../stores/asset.store'

type AssetWaterfallGridProps = {
  filteredAssets: Asset[];
  selectedAsset: Asset | null;
  bulkSelectedAssetIds: string[];
  setSelectedAsset: (asset: Asset) => void;
  toggleBulkSelectedAssetId: (assetId: string) => void;
};

export default function AssetWaterfallGrid({
  filteredAssets,
  selectedAsset,
  bulkSelectedAssetIds,
  setSelectedAsset,
  toggleBulkSelectedAssetId
}: AssetWaterfallGridProps) {
  return (
    <>
      {filteredAssets.length > 0 ? (
        <div className="waterfall-grid flex-1">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAsset?.id === asset.id
            const isChecked = bulkSelectedAssetIds.includes(asset.id)
            
            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`waterfall-item group rounded-2xl overflow-hidden border p-3 bg-white shadow-premium hover:shadow-card-hover transition-premium cursor-pointer relative ${
                  isSelected
                    ? 'border-brand-500 ring-2 ring-brand-500/10'
                    : 'border-slate-100'
                } ${isChecked ? 'ring-2 ring-brand-500/25 border-brand-400 bg-brand-50/5' : ''}`}
              >
                {/* Thumbnail and absolute overlays */}
                <div className="rounded-xl overflow-hidden bg-slate-50 relative aspect-auto">
                  <img
                    src={asset.thumbnailPath}
                    alt={asset.title}
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-premium"
                  />
                  
                  {/* Website Source Stamp Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur text-[9.5px] font-bold text-slate-500 shadow-sm">
                    {asset.sourceSiteName}
                  </div>

                  {/* Bulk Selection Checkbox Overlay */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleBulkSelectedAssetId(asset.id)
                    }}
                    className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-brand-500 border-brand-500 text-white scale-105 shadow-md shadow-brand-500/20'
                        : 'bg-white/90 border-slate-300 backdrop-blur opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-white hover:border-slate-400'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Material Card Details */}
                <div className="mt-3.5 space-y-2">
                  <h4 className="text-[12.5px] font-bold text-slate-700 leading-snug line-clamp-1">
                    {asset.title}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-slate-50 border border-slate-100 text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                    {asset.tags.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400">
                        +{asset.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium">
          <Maximize2 className="w-9 h-9 stroke-[1.5]" />
          <span className="text-[12px] font-medium">没有找到符合搜索条件的素材资产</span>
          <p className="text-[10.5px] text-slate-400 font-medium">请调整上面的关键词搜索、左侧过滤器或重置条件重试。</p>
        </div>
      )}
    </>
  )
}
