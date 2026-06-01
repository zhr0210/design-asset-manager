import React, { useState, useEffect, useRef } from 'react'
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
import { Asset } from '../../stores/asset.store'

type AssetOriginalViewerModalProps = {
  asset: Asset;
  onClose: () => void;
};

export default function AssetOriginalViewerModal({
  asset,
  onClose
}: AssetOriginalViewerModalProps) {
  const [scaleMode, setScaleMode] = useState<'fit' | 'custom'>('fit')
  const [scale, setScale] = useState<number>(1.0)
  const [realWidth, setRealWidth] = useState<number>(asset.width || 0)
  const [realHeight, setRealHeight] = useState<number>(asset.height || 0)
  const [copied, setCopied] = useState(false)
  
  const viewportRef = useRef<HTMLDivElement>(null)

  // Handle image load to extract natural dimensions if missing in db
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!realWidth || !realHeight) {
      setRealWidth(img.naturalWidth)
      setRealHeight(img.naturalHeight)
    }
  }

  // Handle zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '=' || e.key === '+') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0') {
        handleResetZoom()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [realWidth, realHeight])

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

  const openLocalFolder = () => {
    const api = (window as any).electronAPI
    if (api && typeof api.showItemInFolder === 'function') {
      api.showItemInFolder(asset.filePath)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-md animate-in fade-in duration-200 select-none">
      
      {/* Top Header Bar */}
      <div className="h-16 px-6 border-b border-slate-900 bg-slate-950 flex items-center justify-between text-slate-200">
        
        {/* Left Side: Metadata info */}
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-white max-w-[300px] md:max-w-[450px] truncate">
            {asset.title}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">
            {realWidth} × {realHeight} PX • {(asset.fileSize / 1024 / 1024).toFixed(2)} MB • {asset.fileType}
          </span>
        </div>

        {/* Center: Interactive Toolbar Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
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
            {scaleMode === 'fit' ? '自适应' : `${Math.round(scale * 100)}%`}
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            title="放大"
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Scale mode toggle */}
          <button
            onClick={handleToggleFit}
            title={scaleMode === 'fit' ? '切换到原图尺寸 (100%)' : '切换到自适应屏幕'}
            className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer"
          >
            {scaleMode === 'fit' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>100% 原图</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>适应屏幕</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Action utilities */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={copyPathToClipboard}
            title="复制文件路径"
            className="w-9 h-9 rounded-xl border border-slate-800 hover:bg-slate-900 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          
          <button
            onClick={openLocalFolder}
            title="在文件夹中显示"
            className="w-9 h-9 rounded-xl border border-slate-800 hover:bg-slate-900 flex items-center justify-center transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-slate-800 mx-1" />

          <button
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
            src={asset.fileUrl || asset.thumbnailPath}
            alt={asset.title}
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
