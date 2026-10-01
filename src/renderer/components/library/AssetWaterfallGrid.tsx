import React from 'react'
import { Check, Loader2, AlertCircle, AlertTriangle, SearchX, PackageOpen, RefreshCw } from 'lucide-react'
import { projectAssetLibraryCardDisplay } from '../../../shared/workflows/asset-display.workflow'
import type { AssetDiscoveryMatch } from '../../../shared/workflows/asset-discovery.workflow'
import type { Asset, AssetLoadStatus } from '../../stores/asset.store'

type AssetWaterfallGridProps = {
  matches: readonly AssetDiscoveryMatch<Asset>[];
  selectedAsset: Asset | null;
  bulkSelectedAssetIds: string[];
  setSelectedAsset: (asset: Asset) => void;
  toggleBulkSelectedAssetId: (assetId: string) => void;
  assetLoadStatus?: AssetLoadStatus;
  assetLoadError?: string | null;
  hasLoadedAssets?: boolean;
  isFiltered?: boolean;
  onRetry?: () => void;
  onClearFilters?: () => void;
  onQuickLook?: (asset: Asset) => void;
  registerCardTrigger?: (assetId: string, element: HTMLElement | null) => void;
};

export default function AssetWaterfallGrid({
  matches,
  selectedAsset,
  bulkSelectedAssetIds,
  setSelectedAsset,
  toggleBulkSelectedAssetId,
  assetLoadStatus = 'ready',
  assetLoadError = null,
  hasLoadedAssets = true,
  isFiltered = false,
  onRetry,
  onClearFilters,
  registerCardTrigger,
  onQuickLook
}: AssetWaterfallGridProps) {
  if (!hasLoadedAssets && (assetLoadStatus === 'loading' || assetLoadStatus === 'idle')) {
    return (
      <div
        role="status"
        aria-label="正在读取素材列表"
        className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium"
      >
        <Loader2 className="w-9 h-9 stroke-[2] animate-spin text-brand-500" />
        <span className="text-[13px] font-bold text-slate-700">正在读取素材列表...</span>
        <p className="text-[11px] text-slate-400 font-medium">正在读取素材数据，请稍候</p>
      </div>
    )
  }

  if (!hasLoadedAssets && assetLoadStatus === 'error') {
    return (
      <div
        role="alert"
        aria-label="素材库加载失败"
        className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-rose-200 bg-white rounded-2xl shadow-premium"
      >
        <AlertCircle className="w-9 h-9 stroke-[2] text-rose-500" />
        <span className="text-[13px] font-bold text-rose-700">素材库加载失败</span>
        <p className="text-[11px] text-slate-500 font-medium max-w-sm text-center">
          {assetLoadError || '素材服务连接异常，请检查并重试'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label="重试加载素材库"
            className="mt-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[11.5px] font-bold shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重试加载</span>
          </button>
        )}
      </div>
    )
  }

  // When assets exist (matches > 0), always show cards even while refreshing or on refresh error
  if (matches.length > 0) {
    return (
      <>
        {assetLoadStatus === 'loading' && (
          <div
            role="status"
            aria-label="正在刷新素材库"
            className="mb-4 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-[11.5px] font-semibold"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500 shrink-0" />
            <span>正在刷新素材数据...</span>
          </div>
        )}
        {assetLoadStatus === 'error' && (
          <div
            role="alert"
            aria-label="素材库刷新失败"
            className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11.5px] font-medium"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{assetLoadError || '刷新素材库失败'}。已保留此前已加载内容。</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                aria-label="重试刷新素材库"
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-[11px] font-bold cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>重试刷新</span>
              </button>
            )}
          </div>
        )}
        <div className="waterfall-grid flex-1">
          {matches.map((match) => {
            const asset = match.asset
            const isSelected = selectedAsset?.id === asset.id
            const isChecked = bulkSelectedAssetIds.includes(asset.id)
            const cardDisplay = projectAssetLibraryCardDisplay(asset)

            return (
              <div
                key={asset.id}
                data-asset-id={asset.id}
                data-current={isSelected}
                data-checked={isChecked}
                className="waterfall-item workspace-asset-card group relative overflow-hidden"
              >
                {/* Card Open Inspector Control */}
                <button
                  type="button"
                  id={`asset-card-open-${asset.id}`}
                  data-asset-id={asset.id}
                  ref={(el) => registerCardTrigger?.(asset.id, el)}
                  aria-label={`查看素材详情：${cardDisplay.titleLabel}`}
                  onClick={() => setSelectedAsset(asset)}
                  onDoubleClick={() => onQuickLook?.(asset)}
                  onKeyDown={event => {
                    if (event.key === ' ' && onQuickLook && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) {
                      event.preventDefault()
                      event.stopPropagation()
                      onQuickLook(asset)
                    }
                  }}
                  className="w-full text-left bg-transparent border-0 p-0 m-0 cursor-pointer block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  {/* Thumbnail and absolute overlays */}
                  <div className="asset-media relative overflow-hidden">
                    <img
                      src={cardDisplay.previewSrc}
                      alt={cardDisplay.titleLabel}
                      className="w-full h-auto object-contain"
                    />

                    {/* Website Source Stamp Badge */}
                    <div className="asset-source-label">
                      {cardDisplay.sourceSiteLabel}
                    </div>
                  </div>

                  {/* Material Card Details */}
                  <div className="mt-3.5 space-y-2">
                    <h4 className="text-[12.5px] font-bold text-slate-700 leading-snug line-clamp-1">
                      {cardDisplay.titleLabel}
                    </h4>
                    {match.explanation && (
                      <div
                        className="flex flex-wrap gap-1"
                        aria-label="为何命中"
                      >
                        {match.explanation.evidence.map((evidence, index) => (
                          <span
                            key={`${evidence.kind}-${index}`}
                            className="max-w-full truncate rounded bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-600"
                            title={evidence.label}
                          >
                            {evidence.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {cardDisplay.tagPreview.visibleTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[9.5px] font-semibold bg-slate-50 border border-slate-100 text-slate-500"
                        >
                          {tag}
                        </span>
                      ))}
                      {cardDisplay.tagPreview.hasOverflow && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400">
                          {cardDisplay.tagPreview.overflowLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Bulk Selection Checkbox Overlay - Sibling control, NOT nested */}
                <button
                  type="button"
                  role="checkbox"
                  id={`asset-card-select-${asset.id}`}
                  data-asset-id={asset.id}
                  aria-checked={isChecked}
                  aria-label={`选择素材：${cardDisplay.titleLabel}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBulkSelectedAssetId(asset.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.stopPropagation()
                    }
                  }}
                  className={`absolute top-[22px] left-[22px] z-10 w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:opacity-100 motion-reduce:transition-none ${
                    isChecked
                      ? 'bg-brand-500 border-brand-500 text-white scale-105 shadow-md shadow-brand-500/20 opacity-100'
                      : 'bg-white/90 border-slate-300 backdrop-blur opacity-0 group-hover:opacity-100 hover:scale-105 hover:bg-white hover:border-slate-400'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // When matches === 0:
  // If loading or idle, do NOT misreport as empty library or no matches!
  if (assetLoadStatus === 'loading' || assetLoadStatus === 'idle') {
    return (
      <div
        role="status"
        aria-label="正在刷新素材库"
        className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium"
      >
        <Loader2 className="w-9 h-9 stroke-[2] animate-spin text-brand-500" />
        <span className="text-[13px] font-bold text-slate-700">正在刷新素材数据...</span>
        <p className="text-[11px] text-slate-400 font-medium">正在获取最新素材列表，请稍候</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label="刷新素材库"
            className="mt-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11.5px] font-bold shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>刷新素材库</span>
          </button>
        )}
      </div>
    )
  }

  if (assetLoadStatus === 'error') {
    return (
      <div
        role="alert"
        aria-label="素材库刷新失败"
        className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-amber-200 bg-white rounded-2xl shadow-premium"
      >
        <AlertTriangle className="w-9 h-9 stroke-[2] text-amber-500" />
        <span className="text-[13px] font-bold text-amber-800">刷新素材库失败</span>
        <p className="text-[11px] text-slate-600 font-medium max-w-sm text-center">
          {assetLoadError || '刷新素材库失败，请重试'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label="重试刷新素材库"
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11.5px] font-bold shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重试刷新</span>
          </button>
        )}
      </div>
    )
  }

  // Only when assetLoadStatus is 'ready' do we definitively render filtered vs unfiltered empty
  if (assetLoadStatus === 'ready') {
    if (isFiltered) {
      return (
        <div
          role="region"
          aria-label="筛选无匹配素材"
          className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium"
        >
          <SearchX className="w-9 h-9 stroke-[1.5] text-slate-400" />
          <span className="text-[13px] font-bold text-slate-700">没有找到符合筛选条件的素材资产</span>
          <p className="text-[11px] text-slate-400 font-medium max-w-sm text-center">
            请调整搜索关键词、网站来源或标签筛选条件。
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              aria-label="清除所有筛选条件"
              className="mt-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[11.5px] font-bold shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              清除所有筛选
            </button>
          )}
        </div>
      )
    }

    return (
      <div
        role="region"
        aria-label="素材库为空"
        className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium"
      >
        <PackageOpen className="w-9 h-9 stroke-[1.5] text-slate-400" />
        <span className="text-[13px] font-bold text-slate-700">素材库暂无素材</span>
        <p className="text-[11px] text-slate-400 font-medium max-w-sm text-center">
          当前本地素材库为空，收录或导入素材后将在此处展示。
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label="刷新素材库"
            className="mt-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11.5px] font-bold shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>刷新素材库</span>
          </button>
        )}
      </div>
    )
  }

  // Fallback indeterminate state for any other non-ready status
  return (
    <div
      role="status"
      aria-label="正在刷新素材库"
      className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-32 border-2 border-dashed border-slate-200 bg-white rounded-2xl shadow-premium"
    >
      <Loader2 className="w-9 h-9 stroke-[2] animate-spin text-brand-500" />
      <span className="text-[13px] font-bold text-slate-700">正在刷新素材数据...</span>
      <p className="text-[11px] text-slate-400 font-medium">正在获取最新素材列表，请稍候</p>
    </div>
  )
}
