import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Maximize2,
  Globe,
  Layers,
  Calendar,
  FolderOpen,
  ExternalLink
} from 'lucide-react'
import { Asset, AssetTagRelation } from '../../stores/asset.store'
import { projectAssetDetailDisplay } from '../../../shared/workflows/asset-display.workflow'
import type { AssetTaggingModelId } from '../../../shared/workflows/asset-tagging.workflow'
import type { AppSettings } from '../../../shared/types/settings.types'
import AssetTagPanel from './AssetTagPanel'
import { ColorPalettePanel } from '../color/ColorPalettePanel'
import TagSuggestionPanel from '../tag/TagSuggestionPanel'
import AssetOriginalViewerModal from './AssetOriginalViewerModal'

// Decoupled sub-panels
import AssetCaptionPanel from './AssetCaptionPanel'
import AssetPromptReversePanel from './AssetPromptReversePanel'
import AssetDeleteButton from './AssetDeleteButton'

type AssetInspectorDrawerProps = {
  selectedAsset: Asset;
  assetRelations: Record<string, AssetTagRelation[]>;
  settings: AppSettings;
  activeModelLocal: any;
  promptReverseLoading: boolean;
  promptReverseError: any;
  
  // Setters needed by outer shell
  setSelectedAsset: (asset: Asset | null) => void;
  
  // Handlers
  handleRunPromptReverse: (options?: { promptTemplateId?: string; promptTemplateText?: string }) => Promise<void>;
  updateAssetCaption: (id: string, caption: string) => Promise<void>;
  resetAssetCaptionEdited: (id: string) => Promise<void>;
  generateAiSuggestions: (id: string, engines: readonly AssetTaggingModelId[]) => Promise<{ success: boolean; error?: string }>;
  generateDeepAnalysis: (id: string) => Promise<void>;
  confirmAiTag: (relId: string, assetId: string) => Promise<void>;
  rejectAiTag: (relId: string, assetId: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
};

export default function AssetInspectorDrawer({
  selectedAsset,
  assetRelations,
  settings,
  activeModelLocal,
  promptReverseLoading,
  promptReverseError,
  setSelectedAsset,
  handleRunPromptReverse,
  updateAssetCaption,
  resetAssetCaptionEdited,
  generateAiSuggestions,
  generateDeepAnalysis,
  confirmAiTag,
  rejectAiTag,
  deleteAsset
}: AssetInspectorDrawerProps) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const assetDisplay = projectAssetDetailDisplay(selectedAsset)

  return (
    <div className="w-80 border border-slate-200 rounded-2xl bg-white shadow-premium flex flex-col h-full shrink-0 overflow-hidden animate-in slide-in-from-right duration-300 relative select-none">
      {/* Dismiss button */}
      <button
        onClick={() => setSelectedAsset(null)}
        className="absolute top-4 right-4 z-10 w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Details header */}
      <div className="shrink-0 border-b border-slate-100 p-6 pb-4">
        <h3 className="text-[14px] font-bold text-slate-800 pr-8">素材详细分析</h3>
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {/* Mini Image Preview */}
        <div className="mt-5 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative group/view">
          <img
            src={assetDisplay.previewSrc}
            alt={assetDisplay.titleLabel}
            className="w-full h-auto object-cover max-h-48"
          />
          {/* Direct Open File button */}
          <button
            onClick={() => setIsViewModalOpen(true)}
            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/view:opacity-100 transition-premium flex items-center justify-center text-white text-[12px] font-bold gap-1 cursor-pointer w-full border-none outline-none"
          >
            <Maximize2 className="w-4 h-4" />
            <span>查看大图</span>
          </button>
        </div>

      <div className="mt-5 space-y-5">
        {/* Details Specs */}
        <div className="space-y-1">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">资源名称</span>
          <h4 className="text-[13px] font-bold text-slate-700 leading-snug">{assetDisplay.titleLabel}</h4>
        </div>

        <div className="space-y-3.5 text-[11.5px] border-t border-slate-50 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>来源网站:</span>
            </span>
            <span className="text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {assetDisplay.sourceSiteLabel}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>图片规格:</span>
            </span>
            <span className="text-slate-700 font-bold">
              {assetDisplay.imageSpecLabel}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>文件大小:</span>
            </span>
            <span className="text-slate-700 font-bold">
              {assetDisplay.fileSizeLabel}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>下载日期:</span>
            </span>
            <span className="text-slate-700 font-bold">
              {assetDisplay.createdDateLabel}
            </span>
          </div>
        </div>

        {/* Path details */}
        <div className="space-y-3 border-t border-slate-50 pt-4 text-[11.5px]">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>本地存储目录:</span>
            </span>
            <code className="text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-500 font-mono select-text break-all">
              {selectedAsset.filePath}
            </code>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>原始来源 URL:</span>
            </span>
            <a
              href={selectedAsset.sourcePageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-lg text-brand-500 font-mono hover:underline flex items-center justify-between gap-1 break-all"
            >
              <span className="truncate">{selectedAsset.sourcePageUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* Tag system controls */}
        <div className="border-t border-slate-50 pt-4">
          <AssetTagPanel assetId={selectedAsset.id} />
        </div>

        {/* 色卡分析 Section */}
        <div className="border-t border-slate-100 pt-4">
          <ColorPalettePanel asset={selectedAsset} />
        </div>

        {/* 画面描述 Section */}
        <AssetCaptionPanel
          selectedAsset={selectedAsset}
          updateAssetCaption={updateAssetCaption}
          resetAssetCaptionEdited={resetAssetCaptionEdited}
          generateAiSuggestions={generateAiSuggestions}
        />

        {/* 自动标签建议 Panel */}
        <div className="border-t border-slate-50 pt-4">
          <TagSuggestionPanel key={selectedAsset.id} assetId={selectedAsset.id} />
        </div>

      </div>

      {/* 高级反推 Section */}
      <AssetPromptReversePanel
        selectedAsset={selectedAsset}
        settings={settings}
        activeModelLocal={activeModelLocal}
        promptReverseLoading={promptReverseLoading}
        promptReverseError={promptReverseError}
        handleRunPromptReverse={handleRunPromptReverse}
        setSelectedAsset={setSelectedAsset}
      />

      {/* Delete Asset */}
      <AssetDeleteButton
        assetId={selectedAsset.id}
        deleteAsset={deleteAsset}
      />
      </div>

      {isViewModalOpen && createPortal(
        <AssetOriginalViewerModal
          asset={selectedAsset}
          onClose={() => setIsViewModalOpen(false)}
        />,
        document.body
      )}
    </div>
  )
}
