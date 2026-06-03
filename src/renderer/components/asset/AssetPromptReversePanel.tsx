import React, { useState, useEffect } from 'react'
import { Sparkles, Loader2, Check, Copy, Settings } from 'lucide-react'
import { Asset } from '../../stores/asset.store'
import type { AppSettings } from '../../../shared/types/settings.types'
import { useSettingsStore } from '../../stores/settings.store'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS } from '../../../shared/constants/prompt-templates.constants'

type AssetPromptReversePanelProps = {
  selectedAsset: Asset;
  settings: AppSettings;
  activeModelLocal: any;
  promptReverseLoading: boolean;
  promptReverseError: any;
  handleRunPromptReverse: (options?: { promptTemplateId?: string; promptTemplateText?: string }) => Promise<void>;
  setSelectedAsset: (asset: Asset | null) => void;
};

export default function AssetPromptReversePanel({
  selectedAsset,
  settings,
  activeModelLocal,
  promptReverseLoading,
  promptReverseError,
  handleRunPromptReverse,
  setSelectedAsset
}: AssetPromptReversePanelProps) {
  const [showEnglishPrompt, setShowEnglishPrompt] = useState(true)
  const [copiedPromptField, setCopiedPromptField] = useState<string | null>(null)
  
  const [ggufModels, setGgufModels] = useState<any[]>([])
  const [nativeModels, setNativeModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [startingServer, setStartingServer] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState(settings.promptReverseTemplates?.[0]?.id ?? '')

  const promptBackendMode = settings.promptReverseSettings?.backendMode ?? 'llama-openai'

  // Load available models on mount and when settings change
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const api = (window as any).electronAPI
        if (api) {
          const [gguf, native] = await Promise.all([
            api.llamaRuntimeListLocalModels ? api.llamaRuntimeListLocalModels() : [],
            api.aiModelList ? api.aiModelList() : []
          ])
          if (active) {
            setGgufModels(gguf || [])
            setNativeModels(native || [])
          }
        }
      } catch (e) {
        console.error('Failed to load models list', e)
      } finally {
        if (active) setLoadingModels(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [settings])

  // Reset copied states on asset transition
  useEffect(() => {
    setCopiedPromptField(null)
  }, [selectedAsset.id])

  useEffect(() => {
    if (!selectedCustomTemplateId && settings.promptReverseTemplates?.[0]?.id) {
      setSelectedCustomTemplateId(settings.promptReverseTemplates[0].id)
    }
  }, [selectedCustomTemplateId, settings.promptReverseTemplates])

  const dropdownOptions = [
    ...ggufModels
      .filter(m => m.isDownloaded)
      .map(m => ({
        value: `gguf:${m.id}`,
        label: `${m.name}`,
        isDownloaded: true,
        model: m,
        type: 'gguf' as const
      })),
    ...nativeModels
      .filter(m => m.isDownloaded)
      .map(m => ({
        value: `native:${m.id}`,
        label: `${m.displayName} (Native)`,
        isDownloaded: true,
        model: m,
        type: 'native' as const
      }))
  ]

  const activeValue = promptBackendMode === 'llama-openai'
    ? `gguf:${ggufModels.find(m => m.filename === settings.promptReverseSettings?.selectedExternalModel)?.id || ''}`
    : `native:${settings.selectedPromptModelId || ''}`

  const selectedOption = dropdownOptions.find(o => o.value === activeValue) || dropdownOptions[0]

  const buildGgufSettings = (model: any): AppSettings => {
    const backends = settings.aiBackends ?? []
    const llamaBackend = backends.find((backend) => backend.id === 'llama-local-openai')
    const nextBackend = {
      ...(llamaBackend ?? {
        id: 'llama-local-openai',
        name: 'Llama 本地量化模型服务',
        type: 'llama-openai' as const,
        baseUrl: 'http://127.0.0.1:8080/v1',
        apiKey: 'local',
        timeoutMs: 120000,
        priority: 50,
        notes: '适用于 llama.cpp / llama-server 暴露的 OpenAI-compatible API。'
      }),
      enabled: true,
      type: 'llama-openai' as const,
      defaultModel: model.filename,
      capabilities: {
        ...(llamaBackend?.capabilities ?? {}),
        chat: true,
        vision: true,
        embeddings: false,
        jsonOutput: true,
        modelList: true,
        modelManagement: false
      }
    }
    const nextBackends = backends.some((backend) => backend.id === nextBackend.id)
      ? backends.map((backend) => backend.id === nextBackend.id ? nextBackend : backend)
      : [nextBackend, ...backends]

    return {
      ...settings,
      aiBackends: nextBackends,
      promptReverseSettings: {
        ...(settings.promptReverseSettings ?? {
          maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
          maxImageSize: 1024,
          temperature: 0.6,
          topP: 0.9
        }),
        backendMode: 'llama-openai' as const,
        selectedExternalBackendId: 'llama-local-openai',
        selectedExternalModel: model.filename
      }
    }
  }

  useEffect(() => {
    if (loadingModels || promptBackendMode !== 'native-qwen3vl') return
    const preferredGguf = ggufModels.find((model) => model.isDownloaded && model.id === 'qwen3-vl-2b-instruct-q4-k-m')
      ?? ggufModels.find((model) => model.isDownloaded)
    if (!preferredGguf) return

    const api = (window as any).electronAPI
    if (!api?.settingsSave) return
    void api.settingsSave(buildGgufSettings(preferredGguf)).then(async () => {
      const { loadSettings } = useSettingsStore.getState()
      await loadSettings()
    }).catch((error: any) => {
      console.error('Failed to switch prompt reverse route to GGUF/Llama', error)
    })
  }, [ggufModels, loadingModels, promptBackendMode])

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const api = (window as any).electronAPI
    if (!api) return

    const option = dropdownOptions.find(o => o.value === val)
    if (!option) return

    if (option.type === 'gguf') {
      await api.settingsSave(buildGgufSettings(option.model))
    } else {
      const nextSettings = {
        ...settings,
        selectedPromptModelId: option.model.id,
        promptReverseSettings: {
          ...(settings.promptReverseSettings ?? {
            maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
            maxImageSize: 1024,
            temperature: 0.6,
            topP: 0.9
          }),
          backendMode: 'native-qwen3vl' as const
        }
      }
      await api.settingsSave(nextSettings)
    }
    const { loadSettings } = useSettingsStore.getState()
    await loadSettings()
  }

  const handleRun = async (templateOptions?: { promptTemplateId?: string; promptTemplateText?: string }) => {
    setServerError(null)
    const api = (window as any).electronAPI
    if (!api) return

    if (!selectedOption) {
      alert('请先选择一个模型！')
      return
    }

    if (!selectedOption.isDownloaded) {
      alert('请先前往 AI 控制台配置或下载该模型！')
      return
    }

    if (selectedOption.type === 'gguf') {
      try {
        setStartingServer(true)
        await api.settingsSave(buildGgufSettings(selectedOption.model))
        const { loadSettings } = useSettingsStore.getState()
        await loadSettings()
        const status = await api.llamaRuntimeGetStatus()
        const targetModelPath = selectedOption.model.modelPath

        const pathNormalize = (p: string) => p.replace(/\\/g, '/').toLowerCase()
        const isRunningCorrectModel = status.phase === 'complete' && 
          status.serverPid && 
          status.modelPath && 
          pathNormalize(status.modelPath) === pathNormalize(targetModelPath)

        if (!isRunningCorrectModel) {
          if (status.serverPid) {
            await api.llamaRuntimeStopServer()
          }
          const startRes = await api.llamaRuntimeStartServer({ modelPath: targetModelPath })
          if (startRes.phase !== 'complete') {
            throw new Error(startRes.error?.message || 'Llama 本地服务启动超时，请确认依赖完整。')
          }
        }
      } catch (err: any) {
        setServerError(`Llama 本地量化模型启动失败: ${err.message || err}`)
        setStartingServer(false)
        return
      } finally {
        setStartingServer(false)
      }
    }

    await handleRunPromptReverse(templateOptions)
  }

  const selectedCustomTemplate = settings.promptReverseTemplates?.find((template) => template.id === selectedCustomTemplateId)

  const handleCustomRun = async () => {
    if (!selectedCustomTemplate) {
      alert('请先在 AI 控制台添加自定义反推提示词模板。')
      return
    }
    await handleRun({
      promptTemplateId: selectedCustomTemplate.id,
      promptTemplateText: selectedCustomTemplate.content
    })
  }

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      {/* Title */}
      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
        <span>图片反推</span>
      </span>

      {/* Model Selection Dropdown */}
      <div className="space-y-1 bg-slate-50/50 border border-slate-100 p-2.5 rounded-2xl select-none">
        <label className="text-[9.5px] font-bold text-slate-400 block uppercase tracking-wide">反推模型选择</label>
        {loadingModels ? (
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>正在检测本地模型...</span>
          </div>
        ) : (
          <select
            value={activeValue}
            onChange={handleModelChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand-500 cursor-pointer shadow-sm transition-all"
          >
            {dropdownOptions.length === 0 ? (
              <option value="">未找到可用模型</option>
            ) : (
              dropdownOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Custom Reverse */}
      <div className="space-y-2 rounded-2xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-900/50 dark:bg-brand-950/20">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10.5px] font-extrabold text-brand-700 dark:text-brand-300">自定义反推</div>
            <div className="text-[9.5px] font-semibold text-slate-400">使用 AI 控制台中保存的自定义提示词模板</div>
          </div>
          <Sparkles className="h-4 w-4 text-brand-500" />
        </div>
        <select
          value={selectedCustomTemplateId}
          onChange={(event) => setSelectedCustomTemplateId(event.target.value)}
          className="w-full rounded-xl border border-brand-100 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand-500 dark:border-brand-900 dark:bg-slate-950 dark:text-slate-200"
        >
          {settings.promptReverseTemplates?.length ? (
            settings.promptReverseTemplates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))
          ) : (
            <option value="">暂无自定义模板</option>
          )}
        </select>
        {selectedCustomTemplate && (
          <div className="max-h-20 overflow-y-auto rounded-xl bg-white/80 p-2 text-[9.5px] font-semibold leading-4 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {selectedCustomTemplate.content}
          </div>
        )}
        <button
          type="button"
          onClick={handleCustomRun}
          disabled={!selectedCustomTemplate || promptReverseLoading || startingServer}
          className="w-full rounded-xl bg-brand-500 px-3 py-2 text-[11px] font-black text-white shadow-sm transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          使用自定义提示词反推
        </button>
      </div>

      {(() => {
        const status = selectedAsset.aiPromptStatus || 'not_started'

        if (startingServer) {
          return (
            <div className="rounded-2xl p-4 bg-brand-500/[0.02] border border-brand-500/10 flex flex-col items-center justify-center gap-3 text-center min-h-[140px] animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <div className="space-y-1">
                <p className="text-[11.5px] font-bold text-brand-700">⚡ 正在启动并加载本地量化引擎...</p>
                <p className="text-[9.5px] text-slate-400 font-medium">首次加载或切换模型需要加载显存，请耐心等待 (约数秒)</p>
              </div>
            </div>
          )
        }

        if (promptReverseLoading || status === 'running') {
          return (
            <div className="rounded-2xl p-4 bg-brand-500/[0.02] border border-brand-500/10 flex flex-col items-center justify-center gap-3 text-center min-h-[140px] animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <div className="space-y-1">
                <p className="text-[11.5px] font-bold text-brand-700">⚡ 正在执行高级图像反推...</p>
                <p className="text-[9.5px] text-slate-400 font-medium">正在分析风格、主体与画面细节 (推理中)</p>
              </div>
            </div>
          )
        }

        if (serverError || promptReverseError) {
          const err = serverError ? { message: serverError } : promptReverseError
          return (
            <div className="rounded-2xl p-4 bg-rose-50 border border-rose-100 flex flex-col gap-2 font-sans select-none">
              <p className="text-[11.5px] font-extrabold text-rose-700">❌ 反推失败</p>
              <p className="text-[10px] text-rose-500 leading-relaxed font-semibold">
                {err.code === 'GPU_MEMORY_INSUFFICIENT' || err.code === 'CUDA_OUT_OF_MEMORY'
                  ? '显存不足！请关闭其他占用显卡的程序，或改用 Qwen3-VL-4B/2B 系列模型。'
                  : err.message || '推理运行出错，请确认依赖包与模型文件完整。'}
              </p>
              {err.stderr && (
                <details className="mt-1 group cursor-pointer">
                  <summary className="text-[9px] text-rose-600 font-bold hover:text-rose-800 transition-colors select-none outline-none flex items-center gap-1 cursor-pointer">
                    <span>📋 查看完整错误日志 (Terminal Console Log)</span>
                    <span className="text-[7px] inline-block transform group-open:rotate-90 transition-transform">▶</span>
                  </summary>
                  <pre className="mt-1.5 p-2 bg-slate-900 border border-slate-800 text-[8.5px] text-rose-400 font-mono rounded-lg max-h-[140px] overflow-auto select-text whitespace-pre-wrap leading-normal cursor-text">
                    {err.stderr}
                  </pre>
                </details>
              )}
              <button
                onClick={() => handleRun()}
                className="mt-1 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-sm"
              >
                重试反推
              </button>
            </div>
          )
        }

        if (selectedAsset.aiPrompt) {
          let promptData: any = {}
          try {
            promptData = JSON.parse(selectedAsset.aiPrompt)
          } catch (e) {
            promptData = { englishPrompt: selectedAsset.aiPrompt, chineseDescription: '原始非结构化反推结果。' }
          }

          return (
            <div className="space-y-3 font-sans animate-in fade-in duration-300 flex flex-col">
              {/* Switch Capsule Component */}
              <div className="flex justify-end mb-1">
                <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-full border border-slate-200/50 w-fit select-none">
                  <button
                    onClick={() => setShowEnglishPrompt(true)}
                    className={`px-3 py-1 text-[9px] font-extrabold rounded-full transition-all cursor-pointer ${
                      showEnglishPrompt 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    显示英文提示词
                  </button>
                  <button
                    onClick={() => setShowEnglishPrompt(false)}
                    className={`px-3 py-1 text-[9px] font-extrabold rounded-full transition-all cursor-pointer ${
                      !showEnglishPrompt 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    仅中文解析
                  </button>
                </div>
              </div>

              {/* English Prompt */}
              {showEnglishPrompt && (
                <div className="space-y-1 mb-2 animate-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">英文 Prompt (SD / Midjourney)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(promptData.englishPrompt || '')
                        setCopiedPromptField('prompt')
                        setTimeout(() => setCopiedPromptField(null), 2000)
                      }}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      {copiedPromptField === 'prompt' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedPromptField === 'prompt' ? '已复制' : '复制 Prompt'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-600 leading-relaxed font-sans select-text break-all max-h-36 overflow-y-auto scrollbar-thin shadow-sm">
                    {promptData.englishPrompt}
                  </div>
                </div>
              )}

              {/* Chinese Description */}
              {promptData.chineseDescription && (
                <div className="space-y-1">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">中文画面解析描述</span>
                  <div className="bg-slate-50/70 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-600 leading-relaxed font-sans select-text shadow-sm">
                    {promptData.chineseDescription}
                  </div>
                </div>
              )}

              {/* Negative Prompt */}
              {promptData.negativePromptSuggestion && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">负面词建议 (Negative Prompt)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(promptData.negativePromptSuggestion || '')
                        setCopiedPromptField('negative')
                        setTimeout(() => setCopiedPromptField(null), 2000)
                      }}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded text-[9.5px] font-bold transition-all cursor-pointer"
                    >
                      {copiedPromptField === 'negative' ? '已复制' : '复制'}
                    </button>
                  </div>
                  <div className="bg-slate-50/70 border border-slate-100 p-2.5 rounded-xl text-[10.5px] text-slate-500 leading-relaxed font-mono select-text shadow-sm">
                    {promptData.negativePromptSuggestion}
                  </div>
                </div>
              )}

              {/* Categorized tags Display */}
              <div className="space-y-2 border-t border-slate-100/50 pt-2 text-[10.5px] leading-relaxed">
                {/* Styles */}
                {Array.isArray(promptData.styleTags) && promptData.styleTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-slate-400 font-bold mr-1">风格词:</span>
                    {promptData.styleTags.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-[9px]">{t}</span>
                    ))}
                  </div>
                )}
                {/* Colors */}
                {Array.isArray(promptData.colorTags) && promptData.colorTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-slate-400 font-bold mr-1">色彩词:</span>
                    {promptData.colorTags.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-[9px]">{t}</span>
                    ))}
                  </div>
                )}
                {/* Subjects */}
                {Array.isArray(promptData.subjectTags) && promptData.subjectTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-slate-400 font-bold mr-1">主体词:</span>
                    {promptData.subjectTags.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 font-bold text-[9px]">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Source model & memory release details */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-slate-50 select-none">
                <span>模型: <span className="text-brand-500 font-bold">{selectedOption?.model?.name || selectedOption?.model?.displayName || '未知'}</span></span>
                <button
                  onClick={() => handleRun()}
                  className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg font-bold transition-all cursor-pointer shadow-sm"
                >
                  重新反推
                </button>
              </div>
            </div>
          )
        }

        // Default: not_started
        if (selectedOption?.isDownloaded) {
          return (
            <div className="bg-slate-50/50 border border-dashed border-slate-200 p-4 text-center rounded-2xl space-y-2.5 font-sans select-none">
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                已就绪！当前高级反推激活模型为 {selectedOption.model.name || selectedOption.model.displayName}。
              </p>
              <button
                onClick={() => handleRun()}
                className="w-full py-2 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white rounded-xl shadow-sm hover:shadow text-[11.5px] font-bold transition-premium flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>🚀 开始图片反推</span>
              </button>
            </div>
          )
        }

        return (
          <div className="bg-slate-50/50 border border-dashed border-slate-200 p-4 text-center rounded-2xl space-y-2.5 font-sans select-none">
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              请先前往 AI 控制台配置或下载高级反推模型 {selectedOption?.model?.name || selectedOption?.model?.displayName || ''}。
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAsset(null)
                window.location.hash = '#/ai-console'
              }}
              className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[11px] font-bold transition-premium flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>前往 AI 控制台配置</span>
            </button>
          </div>
        )
      })()}
    </div>
  )
}
