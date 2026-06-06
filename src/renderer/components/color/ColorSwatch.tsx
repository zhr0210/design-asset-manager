import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Check, MoreVertical } from 'lucide-react'
import type { VisualAnalysisImageSwatch } from '../../../shared/workflows/visual-analysis-snapshot.workflow'

interface ColorSwatchProps {
  color: VisualAnalysisImageSwatch
  onCopy?: (text: string) => void
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, onCopy }) => {
  const swatchRef = React.useRef<HTMLDivElement | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number
    top: number
    placement: 'above' | 'below'
  } | null>(null)

  const handleCopy = async (text: string, format: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(format)
      if (onCopy) onCopy(text)
      setTimeout(() => setCopiedFormat(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
    setShowOptions(false)
  }

  const showTooltip = () => {
    if (!swatchRef.current) return

    const rect = swatchRef.current.getBoundingClientRect()
    const tooltipWidth = 192
    const viewportPadding = 12
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, viewportPadding + tooltipWidth / 2),
      window.innerWidth - viewportPadding - tooltipWidth / 2
    )
    const placement = rect.top > 190 ? 'above' : 'below'
    setTooltipPosition({
      left,
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      placement
    })
  }

  return (
    <div 
      className="relative group flex flex-col items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={() => {
        setTooltipPosition(null)
        setShowOptions(false)
      }}
    >
      {/* Visual Swatch Card */}
      <div 
        ref={swatchRef}
        onClick={(e) => handleCopy(color.hex, 'HEX', e)}
        className="relative w-16 h-16 rounded-xl shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95 border border-white/10 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: color.hex }}
      >
        {/* Copy Feedback Overlay */}
        {copiedFormat === 'HEX' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
            <Check className="w-6 h-6 text-white animate-scale-up" />
          </div>
        )}

        {/* Small Details display on Swatch */}
        <span 
          className="absolute bottom-1 right-1.5 text-[9px] font-mono select-none"
          style={{ color: color.textColor, opacity: 0.6 }}
        >
          {color.percentageLabel}
        </span>

        {/* Quick Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setShowOptions(!showOptions)
            setTooltipPosition(null)
          }}
          className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-black/20 text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ color: color.textColor }}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* HEX text beneath swatch */}
      <span className="mt-1.5 text-xs font-mono font-medium text-slate-400 group-hover:text-slate-200 transition-colors select-all">
        {color.hex}
      </span>
      <span className="text-[10px] text-slate-500 font-sans">
        {color.family}
      </span>

      {/* 1. Extended Copy Actions Dropdown Popover */}
      {showOptions && (
        <div className="absolute z-30 bottom-20 right-0 w-44 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl p-1.5 flex flex-col gap-0.5 animate-scale-up text-left">
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
            复制颜色格式
          </div>
          <button 
            onClick={(e) => handleCopy(color.hex, 'HEX', e)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left"
          >
            <span>HEX ({color.hex})</span>
            <Copy className="w-3 h-3 text-slate-500" />
          </button>
          <button 
            onClick={(e) => handleCopy(color.rgbCopyValue, 'RGB', e)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left"
          >
            <span>RGB</span>
            <Copy className="w-3 h-3 text-slate-500" />
          </button>
          <button 
            onClick={(e) => handleCopy(color.hslCopyValue, 'HSL', e)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left"
          >
            <span>HSL</span>
            <Copy className="w-3 h-3 text-slate-500" />
          </button>
          <button 
            onClick={(e) => handleCopy(color.cssVariable, 'CSS', e)}
            className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono rounded-lg text-amber-300 hover:bg-white/10 transition-all text-left"
          >
            <span>CSS 变量</span>
            <Copy className="w-3 h-3 text-amber-500/70" />
          </button>
        </div>
      )}

      {/* 2. Glassmorphism Tooltip Popover on Hover */}
      {tooltipPosition && !showOptions && createPortal(
        <div
          className="fixed z-[9999] bg-slate-950/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-3 flex flex-col gap-1 w-48 text-left animate-fade-in pointer-events-none select-none"
          style={{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            transform:
              tooltipPosition.placement === 'above'
                ? 'translate(-50%, -100%)'
                : 'translate(-50%, 0)'
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
            <span className="text-xs font-bold text-slate-100">{color.roleLabel}</span>
            <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full">
              {color.percentageLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 text-[10px] text-slate-400 gap-y-1 gap-x-2 font-mono">
            <span>HEX:</span>
            <span className="col-span-2 text-slate-200 text-right">{color.hex}</span>
            
            <span>RGB:</span>
            <span className="col-span-2 text-slate-200 text-right">{color.rgbValueLabel}</span>
            
            <span>HSL:</span>
            <span className="col-span-2 text-slate-200 text-right">{color.hslValueLabel}</span>
            
            {color.contrastLabel && (
              <>
                <span className="col-span-2">对比白/黑:</span>
                <span className="text-slate-200 text-right font-medium">
                  {color.contrastLabel}
                </span>
              </>
            )}

            {color.confidenceLabel && (
              <>
                <span>置信度:</span>
                <span className="col-span-2 text-slate-200 text-right font-medium">
                  {color.confidenceLabel}
                </span>
              </>
            )}

            {color.textBoxesLabel && (
              <>
                <span>文字框数:</span>
                <span className="col-span-2 text-slate-200 text-right font-medium">
                  {color.textBoxesLabel}
                </span>
              </>
            )}
          </div>
          <div className="mt-1.5 border-t border-white/5 pt-1.5 text-[9.5px] text-slate-500 italic text-center">
            点击复制 HEX 色值
          </div>
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              tooltipPosition.placement === 'above'
                ? 'top-full -mt-1 border-t-slate-950/95'
                : 'bottom-full -mb-1 border-b-slate-950/95'
            }`}
          />
        </div>,
        document.body
      )}
    </div>
  )
}
