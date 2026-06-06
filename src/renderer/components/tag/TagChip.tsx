import React from 'react'
import { X, Sparkles, User, Database, Compass, EyeOff } from 'lucide-react'
import { projectAssetTagChipDisplay, getAssetTagColorClass } from '../../../shared/workflows/asset-tagging.workflow'

export interface TagChipProps {
  name: string
  type?: string
  colorClass?: string
  source?: string
  confidence?: number
  status?: string
  modelName?: string
  onRemove?: () => void
  onClick?: () => void
  showHoverTooltip?: boolean
}

export default function TagChip({
  name,
  type = 'custom',
  colorClass,
  source = 'manual',
  confidence = 1.0,
  status = 'confirmed',
  modelName,
  onRemove,
  onClick,
  showHoverTooltip = true
}: TagChipProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{
    left: number
    top: number
    placement: 'above' | 'below'
  } | null>(null)

  const baseColors = colorClass || getAssetTagColorClass(type)
  const chipDisplay = projectAssetTagChipDisplay({
    type,
    source,
    confidence,
    status,
    modelName
  })

  if (chipDisplay.hidden) return null

  const showTooltip = () => {
    if (!buttonRef.current || !showHoverTooltip) return

    const rect = buttonRef.current.getBoundingClientRect()
    const tooltipWidth = 192
    const viewportPadding = 12
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, viewportPadding + tooltipWidth / 2),
      window.innerWidth - viewportPadding - tooltipWidth / 2
    )
    const placement = rect.top > 150 ? 'above' : 'below'
    setTooltipPosition({
      left,
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      placement
    })
  }

  return (
    <div
      className="relative inline-block select-none"
      onMouseEnter={showTooltip}
      onMouseLeave={() => setTooltipPosition(null)}
      onFocus={showTooltip}
      onBlur={() => setTooltipPosition(null)}
    >
      <button
        ref={buttonRef}
        onClick={onClick}
        disabled={!onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
          onClick ? 'hover:scale-[1.02] active:scale-95 cursor-pointer' : 'cursor-default'
        } ${chipDisplay.isPending ? 'bg-white/80 text-slate-500 border border-dashed border-slate-300' : baseColors} ${chipDisplay.opacityClass}`}
      >
        {/* Render Type icon */}
        {chipDisplay.isAi && (
          <Sparkles className={`w-3 h-3 ${chipDisplay.iconToneClass}`} />
        )}
        
        <span>{name}</span>

        {/* Delete trigger */}
        {onRemove && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="w-3.5 h-3.5 rounded-full hover:bg-black/10 inline-flex items-center justify-center text-current/80 cursor-pointer ml-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}
      </button>

      {/* Premium metadata hover tooltip */}
      {showHoverTooltip && tooltipPosition && (
        <div
          className="fixed z-[9999] w-48 p-3 rounded-xl bg-slate-900/95 backdrop-blur text-white shadow-xl pointer-events-none transition-all duration-150 ease-out font-sans"
          style={{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            transform:
              tooltipPosition.placement === 'above'
                ? 'translate(-50%, -100%)'
                : 'translate(-50%, 0)'
          }}
        >
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
              <span className="font-bold text-slate-300 uppercase tracking-wide">标签详情</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase">
                {type}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-slate-400" />
              <span>分类: <span className="font-bold text-brand-300">{type}</span></span>
            </div>

            <div className="flex items-center gap-1.5">
              {chipDisplay.isAi ? (
                <Sparkles className="w-3 h-3 text-purple-400" />
              ) : (
                <User className="w-3 h-3 text-slate-400" />
              )}
              <span>来源: <span className="font-bold text-slate-200">{chipDisplay.sourceLabel}</span></span>
            </div>

            {chipDisplay.isAi && chipDisplay.modelName && (
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-slate-400" />
                <span className="truncate">模型: <span className="font-bold font-mono text-slate-300">{chipDisplay.modelName}</span></span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center font-bold text-[7px] text-slate-400">%</div>
              <span>置信度: <span className="font-bold text-slate-200">{chipDisplay.confidenceLabel}</span></span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[7px]">S</div>
              <span>状态: <span className={`font-bold ${chipDisplay.statusToneClass}`}>
                {chipDisplay.statusLabel}
              </span></span>
            </div>
          </div>
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              tooltipPosition.placement === 'above'
                ? 'top-full -mt-1 border-t-slate-900/95'
                : 'bottom-full -mb-1 border-b-slate-900/95'
            }`}
          ></div>
        </div>
      )}
    </div>
  )
}
