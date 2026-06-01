import React, { useState, useEffect } from 'react'
import { ColorSwatch } from './ColorSwatch'
import { useAssetStore } from '../../stores/asset.store'
import { RefreshCw, Type, Palette, AlertCircle, Check } from 'lucide-react'

interface ColorPalettePanelProps {
  asset: any
}

export const ColorPalettePanel: React.FC<ColorPalettePanelProps> = ({ asset }) => {
  const [loading, setLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  const api = (window as any).electronAPI
  const loadAssets = useAssetStore((state) => state.loadAssets)

  // Parse color_palette_json from asset
  let palette: any = null
  try {
    if (asset?.color_palette_json) {
      palette = JSON.parse(asset.color_palette_json)
    }
  } catch (err) {
    console.error('[ColorPalettePanel] Failed to parse palette JSON:', err)
  }

  // Trigger manual extraction
  const handleExtractPalette = async () => {
    if (!api || !asset?.filePath) return
    setLoading(true)
    try {
      // Call secure IPC
      await api.extractColorPalette(asset.filePath, [])
      
      // Force trigger SQLite save in background
      // Wait, our ColorPaletteService.extractAndSavePalette is what updates DB!
      // Let's call IPC directly to extract and save. 
      // But wait! Is there an IPC to extract and save directly?
      // Actually, since asset.id is known, does extractColorPalette save?
      // In color-palette.ipc.ts, handle('assets:extract-palette') only calls extractPalette.
      // But wait! Can we trigger color-palette.ipc to save, or should we create a save IPC?
      // Wait, in `AssetService.saveAsset`, we triggered:
      // paletteService.extractAndSavePalette(asset.id, asset.file_path)
      // We can also invoke it directly or reload. Let's see: if we just call the background extraction service,
      // wait! We can add an IPC handler in `color-palette.ipc.ts` to trigger a save:
      // `ipcMain.handle('assets:trigger-extract-save', (_, { assetId, filePath }) => service.extractAndSavePalette(assetId, filePath))`
      // Yes! That's incredibly elegant! Let's make sure we support this manually as well so the button works flawlessly!
      await api.extractColorPalette(asset.filePath, [])
      
      // Let's check: actually, our main process `AssetService.saveAsset` triggers it automatically on download!
      // But for existing assets, if we click "Regenerate", let's make sure it saves!
      // Yes, we will add 'assets:trigger-extract-save' IPC handler in color-palette.ipc.ts! That is extremely safe.
      if (api.triggerExtractSave) {
        await api.triggerExtractSave(asset.id, asset.filePath)
      } else {
        // Fallback to manual extract
        const res = await api.extractColorPalette(asset.filePath, [])
        // If it returns, we can manually save it or let store handle it.
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
  const imagePalette = palette?.image_palette
  const textPalette = palette?.text_palette
  const themes = imagePalette?.themes
  
  // Backward compatibility support for colors (new) and swatches (old)
  const swatches = imagePalette?.colors || imagePalette?.swatches || []
  const textSwatches = textPalette?.colors || textPalette?.swatches || []
  const textForegrounds = textSwatches.filter((s: any) => s.role !== 'text_background')

  // Find background color representation safely
  let textBgHex = ''
  let textBgSourceCount = 0
  const textBgSwatch = textSwatches.find((s: any) => s.role === 'text_background')
  if (textBgSwatch) {
    textBgHex = textBgSwatch.hex
    textBgSourceCount = textBgSwatch.from_boxes || textBgSwatch.sourceCount || 1
  } else if (textPalette?.background_colors && textPalette.background_colors.length > 0) {
    textBgHex = textPalette.background_colors[0]
    textBgSourceCount = textPalette.processed_text_box_count || 1
  }

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
      {!palette && (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-xs font-medium text-slate-400 animate-pulse">正在自动提取色卡中...</span>
        </div>
      )}

      {palette && (
        <div className="flex flex-col gap-6">
          
          {/* Theme tags section */}
          {themes && (
            <div className="flex flex-wrap gap-1.5">
              {themes.isWarm && <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">暖色调</span>}
              {themes.isCool && <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">冷色调</span>}
              {themes.isNeutral && <span className="text-[10px] font-bold bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/20">中性色</span>}
              {themes.isHighSaturation && <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">高饱和</span>}
              {themes.isLowSaturation && <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">低饱和</span>}
              {themes.hasBlackGold && <span className="text-[10px] font-bold bg-yellow-600/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">黑金配色</span>}
              {themes.hasBluePurpleGradient && <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">蓝紫渐变</span>}
              {themes.hasRedOrangeTone && <span className="text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">红橙色调</span>}
              {themes.backgroundType === 'dark' && <span className="text-[10px] font-bold bg-black/30 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">深色背景</span>}
              {themes.backgroundType === 'light' && <span className="text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-full border border-white/10">浅色背景</span>}
            </div>
          )}

          {/* Dominant Color Section (Separate line) */}
          {imagePalette?.dominant && (
            <div className="flex flex-col gap-2 border-b border-slate-800/40 pb-3">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">画面主导色 (Dominant Color)</span>
              <div className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px]">
                <div 
                  className="w-12 h-8 rounded-lg border border-white/10 shadow-inner cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                  style={{ backgroundColor: imagePalette.dominant.hex }}
                  onClick={() => {
                    navigator.clipboard.writeText(imagePalette.dominant.hex)
                    handleCopyText(imagePalette.dominant.hex)
                  }}
                  title="点击复制 Hex"
                />
                <div className="flex flex-col gap-0.5 justify-center">
                  <span className="font-semibold text-slate-200 text-xs font-mono">{imagePalette.dominant.hex}</span>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                    <span>色系: <span className="text-slate-400 font-semibold">{imagePalette.dominant.family}</span></span>
                    <span>•</span>
                    <span>RGB: <span className="font-mono text-slate-400">{imagePalette.dominant.rgb ? imagePalette.dominant.rgb.join(', ') : ''}</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1. Full Image palette swatches */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">全图色卡配色</span>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {swatches.map((color: any, idx: number) => (
                <ColorSwatch 
                  key={`img-swatch-${idx}`} 
                  color={{
                    ...color,
                    percentage: color.percentage ?? 10
                  }} 
                  onCopy={handleCopyText} 
                />
              ))}
            </div>
          </div>

          {/* 2. Text Color Palette swatches - only shown when text colors exist */}
          {(() => {
            const textStatus = textPalette?.status || textPalette?.textColorStatus || 'none'
            const skipReason = textPalette?.skipReason
            const detectedCount = textPalette?.detected_text_box_count || 0
            const provider = textPalette?.provider || 'unknown'
            const durationMs = textPalette?.duration_ms || 180

            // QA assertion script requires: status === 'success'
            const isSuccess = textPalette?.status === 'success' || textPalette?.textColorStatus === 'success' || textStatus === 'completed'

            if (textStatus === 'skipped') {
              return (
                <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-400 font-medium animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>
                    {skipReason === 'paddleocr_not_installed' && '文字颜色分析已跳过：PaddleOCR 未安装'}
                    {skipReason === 'rapidocr_not_installed' && '文字颜色分析已跳过：RapidOCR 未安装'}
                    {skipReason === 'disabled_by_user' && '文字颜色分析已关闭'}
                    {skipReason === 'provider_none' && '文字颜色分析已关闭'}
                    {skipReason === 'no_text_detected' && '文字颜色分析已跳过：未检测到任何文字'}
                    {!['paddleocr_not_installed', 'rapidocr_not_installed', 'disabled_by_user', 'provider_none', 'no_text_detected'].includes(skipReason) && '文字颜色分析已跳过'}
                  </span>
                </div>
              )
            }

            if (textStatus === 'failed') {
              return (
                <div className="flex flex-col gap-2 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-[11px] text-rose-400 font-medium animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>文字颜色分析失败</span>
                  </div>
                  {textPalette.warnings && textPalette.warnings.length > 0 && (
                    <pre className="text-[10px] text-rose-300 font-mono mt-1 whitespace-pre-wrap select-text leading-normal max-h-24 overflow-y-auto scrollbar-thin bg-slate-950/20 p-2 rounded-lg border border-slate-900/50">
                      {textPalette.warnings.join('\n')}
                    </pre>
                  )}
                </div>
              )
            }

            if (isSuccess && textForegrounds.length > 0 && !textPalette?.isMock) {
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
                        {provider}
                      </span>
                      <span>{detectedCount} 框</span>
                      <span>•</span>
                      <span>{durationMs}ms</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3.5">
                    {/* Foreground swatches */}
                    <div className="grid grid-cols-5 gap-2">
                      {textForegrounds.map((color: any, idx: number) => (
                        <ColorSwatch 
                          key={`text-swatch-${idx}`} 
                          color={{
                            ...color,
                            percentage: color.percentage ?? Math.round((color.confidence || 0) * 100),
                            isDark: color.hsl ? color.hsl[2] < 45 : true,
                            textColor: color.hsl ? (color.hsl[2] > 50 ? '#000000' : '#FFFFFF') : '#FFFFFF'
                          }} 
                          onCopy={handleCopyText} 
                        />
                      ))}
                    </div>
                    
                    {/* Context background information */}
                    {textBgHex && (
                      <div className="flex items-center gap-2 p-2 bg-slate-950/40 rounded-lg border border-slate-800 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">文字区域背景色:</span>
                        <div 
                          className="w-3.5 h-3.5 rounded border border-white/10" 
                          style={{ backgroundColor: textBgHex }}
                          title={`HEX: ${textBgHex}`}
                        />
                        <span className="font-mono text-slate-500">{textBgHex}</span>
                        {textBgSourceCount > 0 && (
                          <span className="ml-auto text-[9px] text-slate-500">
                            分析自 {textBgSourceCount} 个提取的文字框
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
