import React from 'react'
import { X, Sparkles, User, Database, Compass, EyeOff } from 'lucide-react'

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
  // Determine standard pill colors if colorClass is not specified
  const getTypeColors = (t: string) => {
    const maps: Record<string, string> = {
      style: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      usage: 'bg-blue-50 text-blue-700 border border-blue-200',
      layout: 'bg-amber-50 text-amber-700 border border-amber-200',
      scene: 'bg-rose-50 text-rose-700 border border-rose-200',
      source: 'bg-slate-100 text-slate-700 border border-slate-200',
      ai: 'bg-purple-50 text-purple-700 border border-purple-200',
      custom: 'bg-pink-50 text-pink-700 border border-pink-200'
    }
    return maps[t] || maps.custom
  }

  const baseColors = colorClass || getTypeColors(type)
  const isAi = source.startsWith('ai_') || source === 'ai'
  const isPending = status === 'pending'
  const isRejected = status === 'rejected'

  if (isRejected) return null

  // Format source label nicely
  const getSourceLabel = (src: string) => {
    if (src === 'manual') return '用户手动'
    if (src === 'ai_wd_tagger') return 'WD Tagger AI'
    if (src === 'ai_florence') return 'Florence-2 AI'
    if (src === 'ai_joycaption') return 'JoyCaption AI'
    if (src === 'ai_qwen_vl') return 'Qwen2.5-VL AI'
    if (src === 'filename') return '文件名解析'
    if (src === 'website') return '网页抓取'
    return src
  }

  return (
    <div className="relative group/chip inline-block select-none">
      <button
        onClick={onClick}
        disabled={!onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
          onClick ? 'hover:scale-[1.02] active:scale-95 cursor-pointer' : 'cursor-default'
        } ${isPending ? 'bg-white/80 text-slate-500 border border-dashed border-slate-300' : baseColors} ${
          confidence < 0.6 && isPending ? 'opacity-60' : 'opacity-100'
        }`}
      >
        {/* Render Type icon */}
        {isAi && (
          <Sparkles className={`w-3 h-3 ${isPending ? 'text-purple-400' : 'text-purple-600 animate-pulse'}`} />
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
      {showHoverTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl bg-slate-900/95 backdrop-blur text-white shadow-xl opacity-0 scale-95 group-hover/chip:opacity-100 group-hover/chip:scale-100 pointer-events-none transition-all duration-200 ease-out font-sans">
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
              {isAi ? (
                <Sparkles className="w-3 h-3 text-purple-400" />
              ) : (
                <User className="w-3 h-3 text-slate-400" />
              )}
              <span>来源: <span className="font-bold text-slate-200">{getSourceLabel(source)}</span></span>
            </div>

            {isAi && modelName && (
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-slate-400" />
                <span className="truncate">模型: <span className="font-bold font-mono text-slate-300">{modelName}</span></span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center font-bold text-[7px] text-slate-400">%</div>
              <span>置信度: <span className="font-bold text-slate-200">{(confidence * 100).toFixed(0)}%</span></span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[7px]">S</div>
              <span>状态: <span className={`font-bold ${isPending ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                {isPending ? '待确认' : '已确认'}
              </span></span>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95"></div>
        </div>
      )}
    </div>
  )
}
