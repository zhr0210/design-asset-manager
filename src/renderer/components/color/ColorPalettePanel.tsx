import React, { useState, useEffect } from 'react'
import { ColorSwatch } from './ColorSwatch'
import { useAssetStore } from '../../stores/asset.store'
import { RefreshCw, Type, Palette, AlertCircle, Check } from 'lucide-react'
import { createVisualAnalysisSnapshot } from '../../../shared/workflows/visual-analysis-snapshot.workflow'

interface ColorPaletteAsset {
  id: string
  filePath: string
  color_palette_json?: string
  aiOcrText?: string
  aiOcrSource?: string
  aiOcrUpdatedAt?: string
}

interface ColorPaletteApi {
  triggerExtractSave?: (assetId: string, filePath: string) => Promise<unknown>
  extractColorPalette?: (filePath: string, textBoxes: unknown[]) => Promise<unknown>
}

interface ColorPalettePanelProps {
  asset: ColorPaletteAsset
}

export const ColorPalettePanel: React.FC<ColorPalettePanelProps> = ({ asset }) => {
  const [loading, setLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  const api = (window as unknown as { electronAPI?: ColorPaletteApi }).electronAPI
  const loadAssets = useAssetStore((state) => state.loadAssets)

  const snapshot = createVisualAnalysisSnapshot({
    colorPaletteJson: asset?.color_palette_json,
    ocrText: asset?.aiOcrText,
    ocrSource: asset?.aiOcrSource,
    ocrUpdatedAt: asset?.aiOcrUpdatedAt
  })

  // Trigger manual extraction
  const handleExtractPalette = async () => {
    if (!api || !asset?.filePath) return
    setLoading(true)
    try {
      if (api.triggerExtractSave) {
        await api.triggerExtractSave(asset.id, asset.filePath)
      } else if (api.extractColorPalette) {
        await api.extractColorPalette(asset.filePath, [])
      } else {
        throw new Error('Color palette extraction API is unavailable')
      }
      
      triggerToast('色卡重构与分析成功')
      await loadAssets() // reload SQLite state
    } catch (err) {
      console.error('[ColorPalettePanel] Manual palette extraction failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const triggerToast = (text: string) => {
    setToastMessage(text)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleCopyText = (text: string) => {
    triggerToast(`已复制 HEX 色值: ${text}`)
  }

  // Retrieve swatches and themes
  const dominantColor = snapshot.dominantColor
  const themePills = snapshot.themePills
  const swatches = snapshot.imageSwatchesForDisplay
  const textColorPanel = snapshot.textColorPanel
  const textInsightSummary = snapshot.textInsightSummary

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-6 text-left select-none relative overflow-hidden">
      
      {/* Header section with options */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Palette className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold tracking-tight">色卡</h3>
        </div>
      </div>

      {/* No palette placeholder */}
      {!snapshot.hasPalette && (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-xs font-medium text-slate-400 animate-pulse">正在自动提取色卡中...</span>
        </div>
      )}

      {snapshot.hasPalette && (
        <div className="flex flex-col gap-6">
          
          {/* Theme tags section */}
          {themePills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {themePills.map((pill) => (
                <span key={pill.code} className={`text-[10px] font-bold ${pill.className}`}>
                  {pill.label}
                </span>
              ))}
            </div>
          )}

          {/* Dominant Color Section (Separate line) */}
          {dominantColor && (
            <div className="flex flex-col gap-2 border-b border-slate-800/40 pb-3">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">画面主导色 (Dominant Color)</span>
              <div className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px]">
                <div 
                  className="w-12 h-8 rounded-lg border border-white/10 shadow-inner cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                  style={{ backgroundColor: dominantColor.hex }}
                  onClick={() => {
                    navigator.clipboard.writeText(dominantColor.hex)
                    handleCopyText(dominantColor.hex)
                  }}
                  title="点击复制 Hex"
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <span className="font-semibold text-slate-200 text-xs font-mono">{dominantColor.hex}</span>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                    <span>色系: <span className="text-slate-400 font-semibold">{dominantColor.family}</span></span>
                    <span>•</span>
                    <span>RGB: <span className="font-mono text-slate-400">{dominantColor.rgbLabel}</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1. Full Image palette swatches */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">全图色卡配色</span>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {swatches.map((color, idx) => (
                <ColorSwatch
                  key={`img-swatch-${idx}`}
                  color={color}
                  onCopy={handleCopyText}
                />
              ))}
            </div>
          </div>

          {/* 2. Text Color Palette swatches - only shown when text colors exist */}
          {(() => {
            if (textColorPanel.state === 'skipped') {
              return (
                <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-400 font-medium animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>{textColorPanel.message}</span>
                </div>
              )
            }

            if (textColorPanel.state === 'failed') {
              return (
                <div className="flex flex-col gap-2 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-[11px] text-rose-400 font-medium animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{textColorPanel.message}</span>
                  </div>
                  {textColorPanel.warnings.length > 0 && (
                    <pre className="text-[10px] text-rose-300 font-mono mt-1 whitespace-pre-wrap select-text leading-normal max-h-24 overflow-y-auto scrollbar-thin bg-slate-950/20 p-2 rounded-lg border border-slate-900/50">
                      {textColorPanel.warnings.join('\n')}
                    </pre>
                  )}
                </div>
              )
            }

            if (textColorPanel.showTextPalette) {
              return (
                <div className="flex flex-col gap-3 border-t border-slate-800/60 pt-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold tracking-wider uppercase">文字设计配色</span>
                    </div>
                    {/* Display info: boxes count, provider, duration */}
                    <div className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-1.5 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/40 text-slate-400">
                        {textColorPanel.provider}
                      </span>
                      <span>{textColorPanel.detectedTextBoxCountLabel}</span>
                      <span>•</span>
                      <span>{textColorPanel.durationMsLabel}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3.5">
                    {/* Foreground swatches */}
                    <div className="grid grid-cols-5 gap-2">
                      {textColorPanel.foregroundSwatches.map((color, idx) => (
                        <ColorSwatch
                          key={`text-swatch-${idx}`}
                          color={color}
                          onCopy={handleCopyText}
                        />
                      ))}
                    </div>
                    
                    {/* Context background information */}
                    {textColorPanel.background && (
                      <div className="flex items-center gap-2 p-2 bg-slate-950/40 rounded-lg border border-slate-800 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">文字区域背景色:</span>
                        <div 
                          className="w-3.5 h-3.5 rounded border border-white/10" 
                          style={{ backgroundColor: textColorPanel.background.hex }}
                          title={`HEX: ${textColorPanel.background.hex}`}
                        />
                        <span className="font-mono text-slate-500">{textColorPanel.background.hex}</span>
                        {textColorPanel.background.sourceCount > 0 && (
                          <span className="ml-auto text-[9px] text-slate-500">
                            {textColorPanel.background.sourceCountLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            return null
          })()}

          {textInsightSummary.shouldShow && (
            <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-4">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Type className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold tracking-wider uppercase">文字分析摘要</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2">
                  <span className="block text-slate-500 font-semibold">OCR 文本</span>
                  <span className="font-mono text-slate-300">
                    {textInsightSummary.ocrTextLengthLabel}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2">
                  <span className="block text-slate-500 font-semibold">文字框</span>
                  <span className="font-mono text-slate-300">
                    {textInsightSummary.textBoxRatioLabel}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2">
                  <span className="block text-slate-500 font-semibold">可读性</span>
                  <span className="font-mono text-slate-300">{textInsightSummary.readabilityLabel}</span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-2">
                  <span className="block text-slate-500 font-semibold">来源</span>
                  <span className="font-mono text-slate-300 truncate block">{textInsightSummary.ocrSource}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-700/60 shadow-2xl flex items-center gap-2 animate-slide-up">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

    </div>
  )
}
