import React, { useState } from 'react'
import { Copy, Check, MoreVertical } from 'lucide-react'

export interface ColorSwatchData {
  hex: string
  rgb: [number, number, number]
  hsl: [number, number, number]
  percentage: number
  role: string
  family: string
  isDark: boolean
  textColor: string
  contrastWhite?: number
  contrastBlack?: number
}

interface ColorSwatchProps {
  color: ColorSwatchData
  onCopy?: (text: string) => void
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, onCopy }) => {
  const [hovered, setHovered] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

  const rgb = Array.isArray(color.rgb) ? color.rgb : [0, 0, 0]
  const hsl = Array.isArray(color.hsl) ? color.hsl : [0, 0, 0]

  const rgbStr = `rgb(${rgb.join(', ')})`
  const hslStr = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`
  const cssVarStr = `--color-${color.role || 'swatch'}: ${color.hex};`

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

  // Determine user friendly role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'background': return '主背景色'
      case 'primary': return '主色调'
      case 'secondary': return '辅助色'
      case 'accent': return '点缀色'
      default: return '配色'
    }
  }

  return (
    <div 
      className="relative group flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setShowOptions(false)
      }}
    >
      {/* Visual Swatch Card */}
      <div 
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
          {color.percentage}%
        </span>

        {/* Quick Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setShowOptions(!showOptions)
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
            onClick={(e) => handleCopy(rgbStr, 'RGB', e)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left"
          >
            <span>RGB</span>
            <Copy className="w-3 h-3 text-slate-500" />
          </button>
          <button 
            onClick={(e) => handleCopy(hslStr, 'HSL', e)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left"
          >
            <span>HSL</span>
            <Copy className="w-3 h-3 text-slate-500" />
          </button>
          <button 
            onClick={(e) => handleCopy(cssVarStr, 'CSS', e)}
            className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono rounded-lg text-amber-300 hover:bg-white/10 transition-all text-left"
          >
            <span>CSS 变量</span>
            <Copy className="w-3 h-3 text-amber-500/70" />
          </button>
        </div>
      )}

      {/* 2. Glassmorphism Tooltip Popover on Hover */}
      {hovered && !showOptions && (
        <div className="absolute z-20 bottom-24 bg-slate-950/85 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-3 flex flex-col gap-1 w-48 text-left animate-fade-in pointer-events-none select-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
            <span className="text-xs font-bold text-slate-100">{getRoleLabel(color.role)}</span>
            <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full">
              {color.percentage}%
            </span>
          </div>
          <div className="grid grid-cols-3 text-[10px] text-slate-400 gap-y-1 gap-x-2 font-mono">
            <span>HEX:</span>
            <span className="col-span-2 text-slate-200 text-right">{color.hex}</span>
            
            <span>RGB:</span>
            <span className="col-span-2 text-slate-200 text-right">{rgb.join(', ')}</span>
            
            <span>HSL:</span>
            <span className="col-span-2 text-slate-200 text-right">{hsl[0]}°, {hsl[1]}%, {hsl[2]}%</span>
            
            {color.contrastWhite !== undefined && color.contrastBlack !== undefined && (
              <>
                <span className="col-span-2">对比白/黑:</span>
                <span className="text-slate-200 text-right font-medium">
                  {color.contrastWhite}:{color.contrastBlack}
                </span>
              </>
            )}

            {(color as any).confidence !== undefined && (
              <>
                <span>置信度:</span>
                <span className="col-span-2 text-slate-200 text-right font-medium">
                  {Math.round((color as any).confidence * 100)}%
                </span>
              </>
            )}

            {(color as any).from_boxes !== undefined && (
              <>
                <span>文字框数:</span>
                <span className="col-span-2 text-slate-200 text-right font-medium">
                  {(color as any).from_boxes} 个
                </span>
              </>
            )}
          </div>
          <div className="mt-1.5 border-t border-white/5 pt-1.5 text-[9.5px] text-slate-500 italic text-center">
            点击复制 HEX 色值
          </div>
        </div>
      )}
    </div>
  )
}
