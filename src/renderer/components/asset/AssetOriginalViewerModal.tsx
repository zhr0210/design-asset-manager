import { getWorkspaceClient } from '../../workspace-client'
import React, { useState, useRef } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FolderOpen,
  Copy,
  Check
} from 'lucide-react'
import { useModalFocus, trapModalTab } from '../ui/WorkspacePrimitives'
import { Asset } from '../../stores/asset.store'
import { projectAssetOriginalViewerDisplay } from '../../../shared/workflows/asset-display.workflow'

type AssetOriginalViewerModalProps = {
  asset: Asset;
  onClose: () => void;
  managedPreviewOnly?: boolean;
};

export default function AssetOriginalViewerModal({
  asset,
  onClose,
  managedPreviewOnly = false
}: AssetOriginalViewerModalProps) {
  const [scaleMode, setScaleMode] = useState<'fit' | 'custom'>('fit')
  const [scale, setScale] = useState<number>(1.0)
  const [realWidth, setRealWidth] = useState<number>(asset.width || 0)
  const [realHeight, setRealHeight] = useState<number>(asset.height || 0)
  const [copied, setCopied] = useState(false)
  const viewerDisplay = projectAssetOriginalViewerDisplay(asset, {
    realWidth,
    realHeight,
    scaleMode,
    scale
  })
  
  const modalRef = useRef<HTMLDivElement>(null)
  useModalFocus(modalRef)
  const viewportRef = useRef<HTMLDivElement>(null)

  // Handle image load to extract natural dimensions if missing in db
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!realWidth || !realHeight) {
      setRealWidth(img.naturalWidth)
      setRealHeight(img.naturalHeight)
    }
  }

  const handleZoomIn = () => {
    setScaleMode('custom')
    setScale(prev => Math.min(5.0, Number((prev + 0.1).toFixed(2))))
  }

  const handleZoomOut = () => {
    setScaleMode('custom')
    setScale(prev => Math.max(0.1, Number((prev - 0.1).toFixed(2))))
  }

  const handleResetZoom = () => {
    setScaleMode('custom')
    setScale(1.0)
  }

  const handleToggleFit = () => {
    if (scaleMode === 'fit') {
      setScaleMode('custom')
      setScale(1.0)
    } else {
      setScaleMode('fit')
    }
  }

  const copyPathToClipboard = () => {
    navigator.clipboard.writeText(asset.filePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label="快速查看" data-testid="asset-quick-look" tabIndex={-1} className="ui-quick-look" onKeyDown={event => {
      if (event.defaultPrevented) return
      if (event.key === 'Escape' || (event.key === ' ' && event.target === event.currentTarget)) {
        event.preventDefault(); event.stopPropagation(); onClose(); return
      }
      trapModalTab(event)
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === '+' || event.key === '=') { event.preventDefault(); handleZoomIn() }
      else if (event.key === '-') { event.preventDefault(); handleZoomOut() }
      else if (event.key === '0') { event.preventDefault(); handleResetZoom() }
    }}>
      
      {/* Top Header Bar */}
      <div className="ui-quick-look-toolbar">
        
        {/* Left Side: Metadata info */}
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-white max-w-[300px] md:max-w-[450px] truncate">
            {viewerDisplay.titleLabel}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">
            {viewerDisplay.metadataLabel}
          </span>
        </div>

        {/* Center: Interactive Toolbar Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            aria-label="缩小"
            title="缩小"
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Percentage */}
          <button
            onClick={handleResetZoom}
            title="重置为 100% 原始尺寸"
            className="px-2.5 h-8 text-[11px] font-bold hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors min-w-[55px] cursor-pointer"
          >
            {viewerDisplay.zoomLabel}
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            aria-label="放大"
            title="放大"
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Scale mode toggle */}
          <button
            onClick={handleToggleFit}
            title={viewerDisplay.fitToggleTitle}
            className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer"
          >
            {viewerDisplay.fitToggleIconKey === 'maximize' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{viewerDisplay.fitToggleLabel}</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{viewerDisplay.fitToggleLabel}</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Action utilities */}
        <div className="flex items-center gap-2.5">
          {!managedPreviewOnly && <button
            onClick={copyPathToClipboard}
            title="复制文件路径"
            className="w-9 h-9 rounded-xl border border-slate-800 hover:bg-slate-900 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>}
          
          {!managedPreviewOnly && <button
            disabled title="当前正式应用未提供此系统定位能力"
            className="w-9 h-9 rounded-xl border border-slate-800 hover:bg-slate-900 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
          </button>}

          <div className="w-[1px] h-6 bg-slate-800 mx-1" />

          <button
            title="关闭快速查看"
            aria-label="关闭快速查看"
            onClick={onClose}
            className="w-9 h-9 bg-slate-900 hover:bg-red-500 hover:text-white text-slate-400 rounded-xl flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Interactive Viewport Canvas */}
      <div 
        ref={viewportRef}
        className="flex-1 w-full overflow-auto flex bg-slate-950/40 p-10 relative select-none"
      >
        <div className="m-auto relative flex items-center justify-center">
          <img
            src={viewerDisplay.previewSrc}
            alt={viewerDisplay.titleLabel}
            onLoad={handleImageLoad}
            className="shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-lg transition-all duration-75 ease-out select-none border border-slate-800/40"
            style={{
              width: scaleMode === 'fit' ? 'auto' : `${realWidth * scale}px`,
              height: scaleMode === 'fit' ? 'auto' : `${realHeight * scale}px`,
              maxWidth: scaleMode === 'fit' ? '100%' : 'none',
              maxHeight: scaleMode === 'fit' ? 'calc(100vh - 12rem)' : 'none',
              objectFit: 'contain'
            }}
          />
        </div>
      </div>
    </div>
  )
}
