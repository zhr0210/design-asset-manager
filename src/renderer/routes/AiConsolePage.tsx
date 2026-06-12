import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Boxes,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  Download,
  FolderOpen,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  PanelRight,
  Play,
  Plus,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  TerminalSquare,
  Trash2,
  Wand2,
  X
} from 'lucide-react'
import { useSettingsStore } from '../stores/settings.store'
import AiRuntimePanel from '../components/settings/AiRuntimePanel'
import { PlatformAiCapabilityMatrix } from '../components/settings/PlatformAiCapabilityMatrix'
import type {
  AiBackendConfig,
  AiBackendType,
  AiPromptReverseSettings,
  PromptReverseBackendMode
} from '../../shared/types/ai-backend.types'
import type { AiMemoryPolicy, AiPromptTemplate } from '../../shared/types/settings.types'
import type { AiRuntimeClipSiglipOnnxStatusResponse, AiRuntimePythonMpsStatusResponse } from '../../shared/contracts/ai-runtime.contract'
import type {
  LlamaHardwareProfile,
  LlamaInstallPlan,
  LlamaInstallProgressEvent,
  LlamaInstallStatus,
  LlamaServerTestResult
} from '../../shared/types/llama-runtime.types'
import type { PlatformAiWorkerProbeWithRuntimeVersions } from '../../shared/types/platform-ai-runtime.types'
import type { PlatformAiBranchStatusResponse } from '../../shared/types/platform-ai-branch-status.types'
import type { PlatformAiActionPlan } from '../../shared/types/platform-ai-action-plan.types'
import type {
  CooperativeWorkerModelStatus,
  WorkerModelStatusSnapshot
} from '../../shared/types/model-artifact-readiness.types'
import type { PromptVlmModel } from '../../shared/types/ai-model.types'
import {
  projectPlatformAiBranchStatusDisplay,
  projectPlatformAiRouteOverviewDisplay,
  selectPlatformAiBranchStatus
} from '../../shared/workflows/platform-ai-branch-status.workflow'
import { resolvePlatformAiActionCommand } from '../../shared/workflows/platform-ai-action-plan.workflow'
import {
  projectGgufArtifactTileDisplay,
  projectCooperativeModelRowDisplay,
  projectModelArtifactRowDisplay,
  resolveActivePromptModelArtifactReady
} from '../../shared/workflows/model-artifact-readiness.workflow'
import { type AiQueueStatsLike, projectAiQueueStatusDisplay } from '../../shared/workflows/ai-queue-status.workflow'
import {
  projectClipSiglipOnnxCompatibilityDisplay,
  projectLlamaRuntimeDisplay,
  projectPlatformAiWorkerProbeDiagnosticsSelection,
  type PlatformAiWorkerProbeDiagnosticsDisplay,
  projectPythonMpsCompatibilityDisplay
} from '../../shared/workflows/ai-runtime-status.workflow'
import {
  type AiConsoleGpuDisplay,
  type AiConsoleModelReadinessDisplayInput,
  projectAiConsoleGpuDisplay,
  projectAiConsoleModelReadinessDisplay
} from '../../shared/workflows/ai-console-overview.workflow'
import type { ClearGpuMemoryResult, GpuStatus } from '../../shared/types/ai-worker.types'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS, DEFAULT_PROMPT_TEMPLATE_ID, DEFAULT_QWEN3VL_DESIGN_PROMPT, OPENAI_COMPATIBLE_REVERSE_PROMPT } from '../../shared/constants/prompt-templates.constants'

type ConsoleTab = 'overview' | 'models' | 'services' | 'runtime' | 'prompts' | 'logs'
type TextBoxProvider = 'none' | 'easyocr' | 'rapidocr' | 'paddleocr' | 'mock'

type ModelRow = {
  id: string
  name: string
  role: string
  capability: string
  source: string
  accent: string
}

type LocalGgufModel = {
  id: string
  name: string
  filename: string
  modelPath: string
  isDownloaded?: boolean
  isDownloading?: boolean
  quantization?: string
  parameterSize?: string
  recommendedMinVramGB?: number
  runtime?: string
  stability?: string
  officialReleaseDate?: string
  mmprojFilename?: string
}

type GpuSample = {
  time: number
  usagePercent: number
  freeMb: number
}

type FallbackSummary = {
  value: string
  caption: string
}

type CooperativeModelDownloadState = Record<string, {
  isDownloaded: boolean
  isDownloading: boolean
  progress: number
  message: string
  localPath?: string
}>

type CooperativeRuntimeStatus = NonNullable<WorkerModelStatusSnapshot['cooperative_models']>

const COOPERATIVE_MODEL_ID_BY_ROW_ID: Record<string, string> = {
  ram: 'ram-plus',
  florence2: 'florence-2-large',
  clip: 'clip-vit-b-32',
  wd_tagger: 'wd-vit-tagger-v3'
}

const MODEL_ROWS: ModelRow[] = [
  {
    id: 'ram',
    name: 'RAM++',
    role: '通用语义标签',
    capability: '主体、场景、构图和语义标签识别',
    source: 'Python AI Worker',
    accent: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/60'
  },
  {
    id: 'florence2',
    name: 'Florence-2',
    role: '图文描述与 OCR',
    capability: '详细描述、OCR 提取和版面文字分析',
    source: 'Python AI Worker',
    accent: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/60'
  },
  {
    id: 'clip',
    name: 'OpenCLIP',
    role: '设计语义分类',
    capability: '风格、排版、视觉构图和相似性分类',
    source: 'Python AI Worker',
    accent: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/60'
  },
  {
    id: 'wd_tagger',
    name: 'WD Tagger v3',
    role: '插画与动漫标签',
    capability: '插画、角色、姿态和图像标签预测',
    source: 'Python AI Worker',
    accent: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900/60'
  },
  {
    id: 'qwen_vl',
    name: 'Qwen3-VL',
    role: '多模态视觉理解',
    capability: '视觉推理、提示词反推和结构化理解',
    source: '本地原生推理 / OpenAI-compatible',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60'
  }
]

const DEFAULT_LLAMA_BACKEND: AiBackendConfig = {
  id: 'llama-local-openai',
  name: 'Llama 本地量化模型服务',
  type: 'llama-openai',
  enabled: false,
  baseUrl: 'http://127.0.0.1:8080/v1',
  apiKey: 'local',
  defaultModel: '',
  timeoutMs: 120000,
  capabilities: {
    chat: true,
    vision: false,
    embeddings: false,
    jsonOutput: true,
    modelList: true,
    modelManagement: false
  },
  priority: 50,
  notes: '适用于 llama.cpp / llama-server 暴露的 OpenAI-compatible API。'
}

const DEFAULT_PROMPT_SETTINGS: AiPromptReverseSettings = {
  backendMode: 'llama-openai',
  selectedNativeModelId: 'qwen3-vl-4b-instruct',
  selectedExternalBackendId: 'llama-local-openai',
  selectedExternalModel: '',
  maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
  maxImageSize: 1024,
  temperature: 0.6,
  topP: 0.9
}

const DEFAULT_MEMORY_POLICY: AiMemoryPolicy = {
  clearGpuBeforePromptReverse: 'auto',
  forceClearWhenInsufficient: true,
  minFreeVramGBBeforeQwen8B: 10,
  maxGpuMemoryUsagePercent: 92,
  enableGpuMemoryGuard: true,
  enableGpuMemoryPollingDuringInference: true,
  gpuMemoryPollIntervalMs: 1000
}

const PROMPT_TEMPLATE_LIBRARY = [
  {
    id: DEFAULT_PROMPT_TEMPLATE_ID,
    label: '统一默认反推提示词',
    language: '中文',
    runtime: 'Qwen3-VL GGUF / Llama / OpenAI-compatible',
    text: DEFAULT_QWEN3VL_DESIGN_PROMPT
  },
  {
    id: 'openai-compatible.vision_prompt.v1',
    label: 'OpenAI-compatible 兼容展示',
    language: '中文',
    runtime: 'Llama / OpenAI-compatible Vision API',
    text: OPENAI_COMPATIBLE_REVERSE_PROMPT
  }
]

const createExternalBackend = (index: number): AiBackendConfig => ({
  ...DEFAULT_LLAMA_BACKEND,
  id: `external-openai-${Date.now()}`,
  name: `OpenAI-compatible 服务 ${index + 1}`,
  type: 'openai-compatible',
  enabled: false,
  apiKey: '',
  priority: 100 + index,
  notes: '自定义 OpenAI-compatible API 推理服务。'
})

function isDeveloperMockEnabled() {
  try {
    return new URLSearchParams(window.location.search).get('devMock') === '1' || localStorage.getItem('dam.devMockTelemetry') === '1'
  } catch {
    return false
  }
}

function normalizeWorkerGpuStatus(raw: any) {
  if (!raw) {
    return {
      available: false,
      isMock: false,
      deviceName: 'Unknown GPU',
      totalMb: 0,
      usedMb: 0,
      freeMb: 0,
      usagePercent: 0,
      error: null as string | null
    }
  }

  if ('cudaAvailable' in raw || 'totalVramGB' in raw) {
    return {
      available: Boolean(raw.success && raw.cudaAvailable),
      isMock: false,
      deviceName: raw.gpuName || 'Unknown GPU',
      totalMb: Math.round(Number(raw.totalVramGB || 0) * 1024),
      usedMb: Math.round(Number(raw.usedVramGB || 0) * 1024),
      freeMb: Math.round(Number(raw.freeVramGB || 0) * 1024),
      usagePercent: Number(raw.usagePercent || 0),
      error: raw.error ?? null
    }
  }

  return {
    available: Boolean(raw.available),
    isMock: Boolean(raw.is_mock),
    deviceName: raw.device_name || 'Unknown GPU',
    totalMb: Number(raw.total_vram_mb || 0),
    usedMb: Number(raw.used_vram_mb || 0),
    freeMb: Number(raw.free_vram_mb || 0),
    usagePercent: Number(raw.utilization_percent || 0),
    error: raw.error ?? null
  }
}

function formatGb(mb: number) {
  if (!mb || mb <= 0) return '未知'
  return `${(mb / 1024).toFixed(1)} GB`
}

function formatReleaseDate(value?: string) {
  if (!value) return '未知'
  return value
}

function normalizeStability(value?: string) {
  return {
    stable: '稳定',
    'gpu-sensitive': '显存敏感',
    experimental: '实验'
  }[value ?? ''] ?? (value || '未知')
}

function currentReverseModelCode(promptSettings: AiPromptReverseSettings, selectedPromptModelId: string, selectedBackend?: AiBackendConfig) {
  if (promptSettings.backendMode === 'native-qwen3vl') return selectedPromptModelId || promptSettings.selectedNativeModelId || '未选择'
  return promptSettings.selectedExternalModel || selectedBackend?.defaultModel || selectedBackend?.name || '未选择'
}

function currentReversePromptPreview(promptSettings: AiPromptReverseSettings) {
  if (promptSettings.backendMode === 'native-qwen3vl') {
    return {
      title: DEFAULT_PROMPT_TEMPLATE_ID,
      text: DEFAULT_QWEN3VL_DESIGN_PROMPT
    }
  }

  return {
    title: DEFAULT_PROMPT_TEMPLATE_ID,
    text: DEFAULT_QWEN3VL_DESIGN_PROMPT
  }
}

function backendHealthText(backend: AiBackendConfig, backendResults: Record<string, string>) {
  return backendResults[`health:${backend.id}`] || backendResults[`models:${backend.id}`] || null
}

function summarizeFallbackBackends(
  backends: AiBackendConfig[],
  backendResults: Record<string, string>,
  matcher: (backend: AiBackendConfig) => boolean,
  emptyCaption: string
): FallbackSummary {
  const matches = backends.filter(matcher)
  const enabled = matches.filter((backend) => backend.enabled)
  const latestHealth = matches.map((backend) => backendHealthText(backend, backendResults)).find(Boolean)
  const primary = enabled[0] ?? matches[0] ?? null

  if (!primary) {
    return { value: '未配置', caption: emptyCaption }
  }

  return {
    value: enabled.length > 0 ? '已启用' : '已配置',
    caption: latestHealth || primary.defaultModel || primary.name
  }
}

function summarizeOllamaFallback(backends: AiBackendConfig[], backendResults: Record<string, string>): FallbackSummary {
  return summarizeFallbackBackends(
    backends,
    backendResults,
    (backend) => backend.type === 'ollama' || /ollama/i.test(backend.name) || /:11434\b/.test(backend.baseUrl),
    'Qwen2.5-VL Ollama fallback'
  )
}

function summarizeExternalHttpFallback(backends: AiBackendConfig[], backendResults: Record<string, string>): FallbackSummary {
  return summarizeFallbackBackends(
    backends,
    backendResults,
    (backend) => backend.type === 'openai-compatible' || backend.type === 'custom' || backend.type === 'lm-studio',
    'OpenAI-compatible / LM Studio / custom HTTP'
  )
}

function GpuMemoryChart({
  samples,
  totalMb,
  telemetryTrusted
}: {
  samples: GpuSample[]
  totalMb: number
  telemetryTrusted: boolean
}) {
  const points = samples.length ? samples : [{ time: Date.now(), usagePercent: 0, freeMb: 0 }]
  const width = 320
  const height = 76
  const maxIndex = Math.max(1, points.length - 1)
  const line = points
    .map((sample, index) => {
      const x = (index / maxIndex) * width
      const y = height - (Math.min(100, Math.max(0, sample.usagePercent)) / 100) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const area = `${line} L ${width} ${height} L 0 ${height} Z`

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-2 text-[10px] font-bold text-slate-600 shadow-inner dark:border-brand-900/50 dark:bg-brand-950/20 dark:text-slate-300">
      <div className="mb-1 flex items-center justify-between">
        <span>专用 GPU 内存</span>
        <span>{telemetryTrusted ? formatGb(totalMb) : 'Unknown'}</span>
      </div>
      <div className="relative h-[72px] overflow-hidden rounded-lg border border-brand-100 bg-white/80 dark:border-brand-900/50 dark:bg-slate-950/60">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.10) 1px, transparent 1px)',
            backgroundSize: '16px 8px'
          }}
        />
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d={area} fill={telemetryTrusted ? 'rgba(99, 102, 241, 0.18)' : 'rgba(100, 116, 139, 0.12)'} />
          <path d={line} fill="none" stroke={telemetryTrusted ? '#6366f1' : '#64748b'} strokeWidth="2" />
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-brand-100 bg-white/90 px-2 py-0.5 text-[11px] text-brand-600 shadow-sm dark:border-brand-900/70 dark:bg-slate-900/90 dark:text-brand-300">
          专用 GPU 内存
        </div>
      </div>
    </div>
  )
}

function PromptPreview({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="truncate text-[10px] font-black uppercase tracking-wide text-brand-500 dark:text-brand-300">{title}</div>
        <div className="shrink-0 text-[9px] font-black text-slate-400 dark:text-slate-500">滚动查看完整提示词</div>
      </div>
      <div className="max-h-[104px] overflow-y-auto rounded-lg bg-white px-2 py-1.5 text-[10.5px] font-bold leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400 whitespace-pre-wrap">{text}</div>
    </div>
  )
}

function TaskListPreview({ queueStats }: { queueStats: AiQueueStatsLike }) {
  const display = projectAiQueueStatusDisplay(queueStats)

  return (
    <div className="grid grid-cols-2 gap-2">
      {display.rows.map((row) => (
        <div key={row.code} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${row.toneClass}`} />
            <span className="truncate">{row.label}</span>
          </span>
          <span className="font-mono text-slate-950 dark:text-slate-50">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

function PromptSystemPanel({
  activePromptTitle,
  promptSettings,
  customTemplates,
  updateSettings
}: {
  activePromptTitle: string
  promptSettings: AiPromptReverseSettings
  customTemplates: AiPromptTemplate[]
  updateSettings: (settings: Partial<{ promptReverseTemplates: AiPromptTemplate[] }>) => Promise<void>
}) {
  const [templateName, setTemplateName] = useState('')
  const [templateContent, setTemplateContent] = useState('')
  const templates = [
    ...PROMPT_TEMPLATE_LIBRARY,
    ...customTemplates.map((template) => ({
      id: template.id,
      label: template.name,
      language: template.language,
      runtime: '用户自定义模板',
      text: template.content
    }))
  ]

  const saveTemplate = async () => {
    const name = templateName.trim()
    const content = templateContent.trim()
    if (!name || !content) return
    const now = new Date().toISOString()
    const next: AiPromptTemplate = {
      id: `custom.prompt.${Date.now()}`,
      name,
      content,
      language: 'zh-CN',
      createdAt: now,
      updatedAt: now
    }
    await updateSettings({ promptReverseTemplates: [...customTemplates, next] })
    setTemplateName('')
    setTemplateContent('')
  }

  const removeTemplate = async (id: string) => {
    await updateSettings({ promptReverseTemplates: customTemplates.filter((template) => template.id !== id) })
  }

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">反推提示词系统</h3>
          <p className="mt-1 max-w-3xl text-[11.5px] font-semibold leading-5 text-slate-400 dark:text-slate-500">
            将原本隐藏在推理脚本里的提示词模板前端化展示。这里展示文本指令系统；图片输入仍由运行时安全传入，不在控制台展示 base64 或文件内容。
          </p>
        </div>
        <StatusPill tone="muted">
          {promptSettings.backendMode === 'native-qwen3vl' ? '当前：统一默认模板' : '当前：统一默认模板'}
        </StatusPill>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {templates.map((template) => {
          const active = activePromptTitle === template.id
          return (
            <div key={template.id} className={`rounded-2xl border p-4 ${active ? 'border-brand-200 bg-brand-50/60 dark:border-brand-900/70 dark:bg-brand-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50'}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-[13px] font-black text-slate-900 dark:text-slate-100">{template.label}</h4>
                    {active && <StatusPill tone="good">当前使用</StatusPill>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500">
                    <span>{template.id}</span>
                    <span>/</span>
                    <span>{template.language}</span>
                    <span>/</span>
                    <span>{template.runtime}</span>
                  </div>
                </div>
                {template.id.startsWith('custom.prompt.') && (
                  <button
                    type="button"
                    onClick={() => removeTemplate(template.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    删除
                  </button>
                )}
              </div>
              <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white bg-white p-4 text-[11px] font-semibold leading-6 text-slate-600 shadow-inner dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {template.text}
              </pre>
            </div>
          )
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100">添加自定义提示词模板</h4>
        <div className="mt-3 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_auto]">
          <Field label="模板名称">
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className="control" placeholder="例如：商品海报深度反推" />
          </Field>
          <Field label="完整提示词">
            <textarea
              value={templateContent}
              onChange={(event) => setTemplateContent(event.target.value)}
              className="control min-h-[120px] resize-y"
              placeholder="输入完整反推提示词。建议继续要求返回 englishPrompt、chineseDescription、shortCaption 以及中文 tags。"
            />
          </Field>
          <div className="flex items-end">
            <MiniButton tone="primary" onClick={saveTemplate} disabled={!templateName.trim() || !templateContent.trim()}>
              <Plus className="h-4 w-4" />
              添加模板
            </MiniButton>
          </div>
        </div>
      </div>
    </section>
  )
}

function statusTone(tone: 'good' | 'warn' | 'bad' | 'muted') {
  return {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300',
    warn: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
    bad: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300',
    muted: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
  }[tone]
}

function StatusPill({ tone, children }: { tone: 'good' | 'warn' | 'bad' | 'muted'; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold ${statusTone(tone)}`}>{children}</span>
}

function MiniButton({
  children,
  onClick,
  disabled,
  tone = 'default'
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: 'default' | 'primary' | 'danger'
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white'
      : tone === 'danger'
        ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[11.5px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  )
}

export default function AiConsolePage() {
  const { settings, updateSettings, loadSettings } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<ConsoleTab>('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [expandedModelFamilies, setExpandedModelFamilies] = useState<Record<string, boolean>>({ qwen_vl: true })
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [gpuStatus, setGpuStatus] = useState<GpuStatus | null>(null)
  const [modelsList, setModelsList] = useState<PromptVlmModel[]>([])
  const [localGgufModels, setLocalGgufModels] = useState<LocalGgufModel[]>([])
  const [gpuSamples, setGpuSamples] = useState<GpuSample[]>([])
  const [platformWorkerProbe, setPlatformWorkerProbe] = useState<PlatformAiWorkerProbeWithRuntimeVersions | null>(null)
  const [platformProbeDisplay, setPlatformProbeDisplay] = useState<PlatformAiWorkerProbeDiagnosticsDisplay>(
    () => projectPlatformAiWorkerProbeDiagnosticsSelection({}).display
  )
  const [platformBranchStatus, setPlatformBranchStatus] = useState<PlatformAiBranchStatusResponse | null>(null)
  const [pythonMpsStatus, setPythonMpsStatus] = useState<AiRuntimePythonMpsStatusResponse | null>(null)
  const [clipSiglipOnnxStatus, setClipSiglipOnnxStatus] = useState<AiRuntimeClipSiglipOnnxStatusResponse | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [clearResult, setClearResult] = useState<ClearGpuMemoryResult | null>(null)
  const [backendResults, setBackendResults] = useState<Record<string, string>>({})
  const [backendModelLists, setBackendModelLists] = useState<Record<string, string[]>>({})
  const [llamaHardware, setLlamaHardware] = useState<LlamaHardwareProfile | null>(null)
  const [llamaPlan, setLlamaPlan] = useState<LlamaInstallPlan | null>(null)
  const [llamaStatus, setLlamaStatus] = useState<LlamaInstallStatus | null>(null)
  const [llamaTest, setLlamaTest] = useState<LlamaServerTestResult | null>(null)
  const [llamaRunning, setLlamaRunning] = useState(false)
  const [selectedLlamaModelId, setSelectedLlamaModelId] = useState<string>('')
  const [llamaInstallLogs, setLlamaInstallLogs] = useState<string[]>([])
  const [downloadSource, setDownloadSource] = useState<'huggingface' | 'hf-mirror' | 'production-cdn'>('hf-mirror')
  const [logs, setLogs] = useState<string[]>([])
  const [cooperativeModels, setCooperativeModels] = useState<CooperativeModelDownloadState>({})
  const [cooperativeCleanups, setCooperativeCleanups] = useState<(() => void)[]>([])

  const [textBoxProvider, setTextBoxProvider] = useState<TextBoxProvider>(settings.textBoxProvider ?? 'easyocr')
  const [enableTextColorAnalysis, setEnableTextColorAnalysis] = useState(settings.enableTextColorAnalysis ?? true)
  const [ocrTimeoutMs, setOcrTimeoutMs] = useState(settings.ocrTimeoutMs ?? 15000)
  const [maxTextBoxesPerImage, setMaxTextBoxesPerImage] = useState(settings.maxTextBoxesPerImage ?? 30)
  const [selectedPromptModelId, setSelectedPromptModelId] = useState(settings.selectedPromptModelId ?? 'qwen3-vl-4b-instruct')
  const [promptSettings, setPromptSettings] = useState<AiPromptReverseSettings>(settings.promptReverseSettings ?? DEFAULT_PROMPT_SETTINGS)
  const [memoryPolicy, setMemoryPolicy] = useState<AiMemoryPolicy>({ ...DEFAULT_MEMORY_POLICY, ...(settings.memoryPolicy ?? {}) })
  const [aiBackends, setAiBackends] = useState<AiBackendConfig[]>(settings.aiBackends?.length ? settings.aiBackends : [DEFAULT_LLAMA_BACKEND])

  const devMockEnabled = isDeveloperMockEnabled()
  const workerGpu = normalizeWorkerGpuStatus(aiStatus?.gpu_status)
  const directGpu = normalizeWorkerGpuStatus(gpuStatus)
  const effectiveGpu = workerGpu.available || workerGpu.isMock ? workerGpu : directGpu
  const isWorkerOffline = aiStatus?.offline ?? true
  const isMockTelemetry = effectiveGpu.isMock
  const telemetryTrusted = effectiveGpu.available && (!effectiveGpu.isMock || devMockEnabled)
  const loadedModels = aiStatus?.loaded_models ?? {}
  const cooperativeRuntimeModels: CooperativeRuntimeStatus = (
    aiStatus as WorkerModelStatusSnapshot | null
  )?.cooperative_models ?? {}
  const queueStats: AiQueueStatsLike = aiStatus?.queue_stats ?? { queued: 0, running: 0, completed: 0, failed: 0 }
  const queueStatusDisplay = projectAiQueueStatusDisplay(queueStats)
  const selectedBackend = aiBackends.find((backend) => backend.id === promptSettings.selectedExternalBackendId)
  const ollamaFallback = useMemo(() => summarizeOllamaFallback(aiBackends, backendResults), [aiBackends, backendResults])
  const externalHttpFallback = useMemo(() => summarizeExternalHttpFallback(aiBackends, backendResults), [aiBackends, backendResults])
  const activeBackendLabel =
    promptSettings.backendMode === 'native-qwen3vl'
      ? 'Python Transformers 实验路线'
      : selectedBackend?.name || (promptSettings.backendMode === 'llama-openai' ? 'Llama 本地服务' : 'OpenAI-compatible')
  const activeReverseModel = currentReverseModelCode(promptSettings, selectedPromptModelId, selectedBackend)
  const activePromptPreview = currentReversePromptPreview(promptSettings)

  const selectedModel = selectedModelId ? MODEL_ROWS.find((model) => model.id === selectedModelId) : null
  const selectedExternalModels = promptSettings.selectedExternalBackendId ? backendModelLists[promptSettings.selectedExternalBackendId] ?? [] : []
  const installedNativeModels = modelsList.filter((model) => model.isDownloaded)
  const installedGgufModels = localGgufModels.filter((model) => model.isDownloaded)
  const installedModelCount = installedNativeModels.length + installedGgufModels.length
  const currentNativeModel = modelsList.find((model) => model.id === selectedPromptModelId)
  const currentGgufModel = localGgufModels.find((model) => model.filename === promptSettings.selectedExternalModel || model.id === promptSettings.selectedExternalModel)
  const currentModelReady = resolveActivePromptModelArtifactReady({
    backendMode: promptSettings.backendMode,
    nativeModelDownloaded: currentNativeModel?.isDownloaded,
    ggufModelDownloaded: currentGgufModel?.isDownloaded,
    llamaServerRunning: Boolean(llamaStatus?.serverPid),
    externalBackendEnabled: selectedBackend?.enabled
  })
  const modelReadinessInput: AiConsoleModelReadinessDisplayInput = {
    installedModelCount,
    currentModelReady,
    workerOffline: isWorkerOffline
  }
  const gpuDisplay = projectAiConsoleGpuDisplay({
    telemetryTrusted,
    deviceName: effectiveGpu.deviceName,
    totalMb: effectiveGpu.totalMb,
    freeMb: effectiveGpu.freeMb,
    usagePercent: effectiveGpu.usagePercent,
    maxGpuMemoryUsagePercent: memoryPolicy.maxGpuMemoryUsagePercent,
    minFreeVramGBBeforeQwen8B: memoryPolicy.minFreeVramGBBeforeQwen8B
  })
  const modelReadinessDisplay = projectAiConsoleModelReadinessDisplay(modelReadinessInput)
  const latestLogLine = logs[0] ?? '暂无本地操作日志'

  const pushLog = (message: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} ${message}`, ...prev].slice(0, 80))
  }

  const pushLlamaInstallLog = (message: string) => {
    setLlamaInstallLogs((prev) => [`${new Date().toLocaleTimeString()} ${message}`, ...prev].slice(0, 160))
  }


  // Listen for macOS AI dependency install log events (real-time pip output)
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onOcrInstallLog) return
    const handler = (_event: any, message: string) => {
      const trimmed = message.trim()
      if (!trimmed) return
      // Try to parse JSON lines from the new streaming installer
      for (const line of trimmed.split(/\r?\n/)) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line.trim())
          if (parsed.type === 'pip-log') {
            pushLog(`[pip] ${parsed.message}`)
          } else if (parsed.type === 'progress') {
            pushLog(`[pip ${parsed.progress}%] ${parsed.message}`)
          } else if (parsed.type === 'error') {
            pushLog(`[pip ERR] ${parsed.package ?? ''}: ${parsed.message}`)
          } else if (parsed.type === 'complete') {
            pushLog(`[pip] ${parsed.success ? '✓' : '✗'} ${parsed.message}`)
          } else {
            pushLog(`[pip] ${line.trim().slice(0, 200)}`)
          }
        } catch {
          // Raw pip output
          pushLog(`[pip] ${line.trim().slice(0, 200)}`)
        }
      }
    }
    api.onOcrInstallLog(handler)
    // Note: preload does not expose removeListener for this channel;
    // this effect intentionally persists for the component lifetime.
  }, [])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  const setBusy = (key: string, value: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: value }))
  }

  const fetchConsoleStatus = async (source: 'auto' | 'manual' = 'auto') => {
    const api = (window as any).electronAPI
    setBusy('refresh', true)
    try {
      if (!api) {
        setAiStatus({ offline: true, error: 'Electron bridge is unavailable in browser preview.' })
        setGpuStatus(null)
        setModelsList([])
        if (source === 'manual') {
          showToast('浏览器预览无法连接桌面端 AI 服务')
          pushLog('Preview mode: Electron bridge unavailable')
        }
        return
      }

      const [status, gpu, models, llama, ggufModels, macOSProbe, windowsProbe, macOSBranchStatus, windowsBranchStatus, clipSiglipStatus] = await Promise.all([
        api.aiModelStatus?.().catch((err: any) => ({ offline: true, error: String(err) })),
        api.aiWorkerGetGpuStatus?.().catch(() => null),
        api.aiModelList?.().catch(() => []),
        api.llamaRuntimeGetStatus?.().catch(() => null),
        api.llamaRuntimeListLocalModels?.().catch(() => []),
        api.aiRuntime?.getMacOSCapabilities ? api.aiRuntime.getMacOSCapabilities().catch(() => null) : Promise.resolve(null),
        api.aiRuntime?.getWindowsCapabilities ? api.aiRuntime.getWindowsCapabilities().catch(() => null) : Promise.resolve(null),
        api.aiRuntime?.getMacOSAiBranchStatus ? api.aiRuntime.getMacOSAiBranchStatus().catch(() => null) : Promise.resolve(null),
        api.aiRuntime?.getWindowsAiBranchStatus ? api.aiRuntime.getWindowsAiBranchStatus().catch(() => null) : Promise.resolve(null),
        api.aiRuntime?.getClipSiglipOnnxStatus ? api.aiRuntime.getClipSiglipOnnxStatus().catch(() => null) : Promise.resolve(null)
      ])

      setAiStatus(status)
      setGpuStatus(gpu)
      setModelsList(Array.isArray(models) ? models : [])
      setLocalGgufModels(Array.isArray(ggufModels) ? ggufModels : [])
      if (llama) {
        setLlamaStatus(llama)
        if (typeof llama.serverRunning === 'boolean') {
          setLlamaRunning(llama.serverRunning)
        }
      }
      const projectedBranchStatus = selectPlatformAiBranchStatus(
        [macOSBranchStatus, windowsBranchStatus]
          .map((response: any) => response?.success && response.data ? response.data as PlatformAiBranchStatusResponse : null)
      )
      setPlatformBranchStatus(projectedBranchStatus)
      const probeSelection = projectPlatformAiWorkerProbeDiagnosticsSelection({
        platformBranch: projectedBranchStatus?.platformBranch,
        macOSProbe: macOSProbe?.success ? macOSProbe.data?.capabilities : null,
        windowsProbe: windowsProbe?.success ? windowsProbe.data?.capabilities : null
      })
      setPlatformWorkerProbe(probeSelection.probe)
      setPlatformProbeDisplay(probeSelection.display)
      if (status?.offline === false && api.aiRuntime?.getPythonMpsStatus) {
        const pythonMps = await api.aiRuntime.getPythonMpsStatus().catch(() => null)
        if (pythonMps?.success && pythonMps.data) {
          setPythonMpsStatus(pythonMps.data)
        } else {
          setPythonMpsStatus(null)
        }
      } else {
        setPythonMpsStatus(null)
      }
      if (clipSiglipStatus?.success && clipSiglipStatus.data) {
        setClipSiglipOnnxStatus(clipSiglipStatus.data)
      } else {
        setClipSiglipOnnxStatus(null)
      }

      // Detect running llama-server via IPC health check (main process, no CORS)
      if (promptSettings?.backendMode === 'llama-openai' && typeof llama?.serverRunning !== 'boolean' && !(llama?.serverPid)) {
        try {
          const baseUrl = aiBackends.find((b) => b.id === promptSettings.selectedExternalBackendId)?.baseUrl
          const result = await api.llamaHealthCheck?.(baseUrl).catch(() => ({ running: false }))
          if (result?.running) {
            setLlamaRunning(true)
            if (llama) {
              setLlamaStatus({ ...llama, serverPid: 1, phase: 'running' })
            }
          } else {
            setLlamaRunning(false)
          }
        } catch {
          setLlamaRunning(false)
        }
      } else {
        setLlamaRunning(Boolean(llama?.serverRunning || llama?.serverPid))
      }

      const sample = normalizeWorkerGpuStatus(status?.gpu_status).available
        ? normalizeWorkerGpuStatus(status?.gpu_status)
        : normalizeWorkerGpuStatus(gpu)
      setGpuSamples((prev) => {
        const next = [...prev, { time: Date.now(), usagePercent: sample.usagePercent, freeMb: sample.freeMb }]
        return next.slice(-24)
      })
      if (source === 'manual') {
        showToast(status?.offline ? 'AI Worker 未连接，状态已刷新' : 'AI 状态已刷新')
        pushLog(status?.offline ? 'Manual refresh: worker offline' : 'Manual refresh completed')
      }
    } catch (err) {
      if (source === 'manual') {
        showToast('刷新失败，详情已写入日志')
        pushLog(`Manual refresh failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    } finally {
      setBusy('refresh', false)
    }
  }

  useEffect(() => {
    loadSettings()
    fetchConsoleStatus()
    fetchCooperativeModels()
    const timer = window.setInterval(fetchConsoleStatus, 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setTextBoxProvider(settings.textBoxProvider ?? 'easyocr')
    setEnableTextColorAnalysis(settings.enableTextColorAnalysis ?? true)
    setOcrTimeoutMs(settings.ocrTimeoutMs ?? 15000)
    setMaxTextBoxesPerImage(settings.maxTextBoxesPerImage ?? 30)
    setSelectedPromptModelId(settings.selectedPromptModelId ?? 'qwen3-vl-4b-instruct')
    setPromptSettings(settings.promptReverseSettings ?? DEFAULT_PROMPT_SETTINGS)
    setMemoryPolicy({ ...DEFAULT_MEMORY_POLICY, ...(settings.memoryPolicy ?? {}) })
    setAiBackends(settings.aiBackends?.length ? settings.aiBackends : [DEFAULT_LLAMA_BACKEND])
  }, [settings])

  const handleSaveAiSettings = async () => {
    setBusy('save', true)
    try {
      await updateSettings({
        enableTextColorAnalysis,
        textBoxProvider,
        ocrTimeoutMs,
        maxTextBoxesPerImage,
        selectedPromptModelId,
        selectedPromptModelPath: modelsList.find((model) => model.id === selectedPromptModelId)?.localPath ?? settings.selectedPromptModelPath,
        promptReverseSettings: {
          ...promptSettings,
          selectedNativeModelId: selectedPromptModelId
        },
        memoryPolicy,
        aiBackends
      })
      showToast('AI 设置已保存')
      pushLog('AI settings saved')
    } finally {
      setBusy('save', false)
    }
  }

  // The shared action is platform-neutral; the current executable installer is macOS-backed.
  const [installingAiRuntimeDeps, setInstallingAiRuntimeDeps] = useState(false)

  const handleInstallAiRuntimeDeps = async () => {
    const api = (window as any).electronAPI
    if (!api?.macosAiInstallDeps) {
      showToast('安装接口不可用')
      return
    }
    setInstallingAiRuntimeDeps(true)
    showToast('正在安装 macOS AI 依赖 (torch, transformers, onnxruntime)...')
    pushLog('macOS AI deps installation started')
    try {
      const result = await api.macosAiInstallDeps()
      if (result?.success) {
        showToast('macOS AI 依赖安装完成')
        const installedCount = Array.isArray(result.installedPackages) ? result.installedPackages.length : 0
        const runtimeLabel = result.runtime?.created ? 'managed runtime created' : 'managed runtime reused'
        pushLog(`macOS AI deps installation completed (${installedCount} package checks, ${runtimeLabel}, ${Math.round((result.durationMs ?? 0) / 1000)}s)`)
      } else {
        const failedPackages = Array.isArray(result?.failedPackages)
          ? result.failedPackages.map((item: any) => item?.package).filter(Boolean)
          : []
        const packageMessage = failedPackages.length ? failedPackages.join(', ') : 'unknown package'
        const message = result?.error || `exit=${result?.exitCode ?? 'unknown'} failed=${packageMessage}`
        showToast('安装失败：' + String(message).slice(0, 120))
        pushLog(`macOS AI deps install failed (${Math.round((result?.durationMs ?? 0) / 1000)}s): ${packageMessage}`)
      }
      await fetchConsoleStatus('manual')
    } catch (err: any) {
      showToast('安装失败: ' + String(err))
      pushLog('macOS AI deps install failed: ' + String(err))
    } finally {
      setInstallingAiRuntimeDeps(false)
    }
  }

  const [installingOcr, setInstallingOcr] = useState(false)

  const handleInstallEasyOcr = async () => {
    const api = (window as any).electronAPI
    if (!api?.ocrInstallEasyOcr) {
      showToast('OCR 安装接口不可用')
      return
    }
    setInstallingOcr(true)
    showToast('正在安装 EasyOCR 及其依赖...')
    pushLog('OCR EasyOCR installation started')
    try {
      await api.ocrInstallEasyOcr()
      showToast('EasyOCR 安装完成')
      pushLog('OCR EasyOCR installation completed')
      await fetchConsoleStatus('manual')
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err)
      showToast('EasyOCR 安装失败: ' + message)
      pushLog(`OCR EasyOCR installation failed: ${message}`)
    } finally {
      setInstallingOcr(false)
    }
  }

  const handleClearGpuMemory = async () => {
    const api = (window as any).electronAPI
    if (!api?.aiWorkerClearGpuMemory) {
      setClearResult({ success: false, before: null, after: null, error: '当前环境无法访问桌面端显存清理接口。' })
      showToast('显存清理接口不可用')
      pushLog('VRAM clear unavailable')
      return
    }

    setBusy('clear', true)
    try {
      const result = await api.aiWorkerClearGpuMemory()
      setClearResult(result)
      showToast(result?.success ? '显存清理已完成' : '显存清理失败')
      pushLog(result?.success ? 'VRAM clear completed' : `VRAM clear failed: ${result?.error || 'unknown error'}`)
      await fetchConsoleStatus()
    } finally {
      setBusy('clear', false)
    }
  }

  const handleForceUnload = async () => {
    const api = (window as any).electronAPI
    if (!api?.aiModelUnload) {
      showToast('模型卸载接口不可用')
      pushLog('Model unload unavailable')
      return
    }

    setBusy('unload', true)
    try {
      const result = await api.aiModelUnload()
      showToast(result?.success ? '已卸载 Worker 中的模型' : '模型卸载失败')
      pushLog(result?.success ? 'Python worker models unloaded' : `Model unload failed: ${result?.error || 'unknown error'}`)
      await fetchConsoleStatus()
    } finally {
      setBusy('unload', false)
    }
  }

  // -- Cooperative model download / cancel / delete --
  const fetchCooperativeModels = async () => {
    const api = (window as any).electronAPI
    if (!api?.cooperativeModelList) return
    try {
      const result = await api.cooperativeModelList()
      if (result?.success && Array.isArray(result.models)) {
        const state: CooperativeModelDownloadState = {}
        for (const m of result.models) {
          state[m.id] = {
            isDownloaded: Boolean(m.isDownloaded),
            isDownloading: false,
            progress: m.isDownloaded ? 100 : 0,
            message: m.isDownloaded ? '已下载' : '未下载',
            localPath: m.localPath
          }
        }
        setCooperativeModels(state)
      }
    } catch (err: any) {
      pushLog('Cooperative model list failed: ' + String(err))
    }
  }

  const handleDownloadCooperativeModel = async (modelId: string) => {
    const api = (window as any).electronAPI
    if (!api?.cooperativeModelDownload) {
      showToast('模型下载接口不可用')
      return
    }
    const registryModelId = COOPERATIVE_MODEL_ID_BY_ROW_ID[modelId] ?? modelId

    setCooperativeModels((prev) => ({
      ...prev,
      [registryModelId]: { ...(prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: '' }), isDownloading: true, progress: 0, message: '准备下载...' }
    }))

    try {
      const result = await api.cooperativeModelDownload(registryModelId)
      if (!result?.success) {
        setCooperativeModels((prev) => ({
          ...prev,
          [registryModelId]: { ...(prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: '' }), isDownloading: false, message: result?.error || '下载启动失败' }
        }))
        showToast('下载启动失败：' + (result?.error || '未知错误'))
        pushLog('Cooperative model download failed: ' + (result?.error || 'unknown'))
      }
    } catch (err: any) {
      setCooperativeModels((prev) => ({
        ...prev,
        [registryModelId]: { ...(prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: '' }), isDownloading: false, message: String(err) }
      }))
      pushLog('Cooperative model download error: ' + String(err))
    }
  }

  const handleCancelCooperativeDownload = async (modelId: string) => {
    const api = (window as any).electronAPI
    if (!api?.cooperativeModelCancelDownload) return
    const registryModelId = COOPERATIVE_MODEL_ID_BY_ROW_ID[modelId] ?? modelId
    try {
      await api.cooperativeModelCancelDownload(registryModelId)
      setCooperativeModels((prev) => ({
        ...prev,
        [registryModelId]: { ...(prev[registryModelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: '' }), isDownloading: false, message: '已取消' }
      }))
      showToast('已取消下载')
    } catch (err: any) {
      pushLog('Cooperative model cancel failed: ' + String(err))
    }
  }

  const handleDeleteCooperativeModel = async (modelId: string) => {
    const api = (window as any).electronAPI
    if (!api?.cooperativeModelDelete) return
    const registryModelId = COOPERATIVE_MODEL_ID_BY_ROW_ID[modelId] ?? modelId
    try {
      const result = await api.cooperativeModelDelete(registryModelId)
      if (result?.success) {
        setCooperativeModels((prev) => ({
          ...prev,
          [registryModelId]: { isDownloaded: false, isDownloading: false, progress: 0, message: '已删除' }
        }))
        showToast('模型已删除')
        pushLog('Cooperative model deleted: ' + registryModelId)
      } else {
        showToast('删除失败：' + (result?.error || '未知错误'))
      }
    } catch (err: any) {
      pushLog('Cooperative model delete failed: ' + String(err))
    }
  }

  // Setup cooperative model download progress listeners
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onCooperativeModelDownloadProgress) return

    // Clean up existing listeners
    for (const cleanup of cooperativeCleanups) {
      try { cleanup() } catch { /* ignore */ }
    }

    const cleanups: (() => void)[] = []
    const modelIds = Object.values(COOPERATIVE_MODEL_ID_BY_ROW_ID)

    for (const modelId of modelIds) {
      const cleanup = api.onCooperativeModelDownloadProgress(modelId, (_event: any, data: any) => {
        if (!data || !data.type) return
        setCooperativeModels((prev) => {
          const existing = prev[modelId] || { isDownloaded: false, isDownloading: false, progress: 0, message: '' }
          if (data.type === 'progress') {
            return { ...prev, [modelId]: { ...existing, isDownloading: true, progress: data.progress ?? existing.progress, message: data.message || existing.message } }
          }
          if (data.type === 'complete' || (data.type === 'exit' && data.success)) {
            return { ...prev, [modelId]: { ...existing, isDownloaded: true, isDownloading: false, progress: 100, message: '下载完成' } }
          }
          if (data.type === 'error' || (data.type === 'exit' && !data.success)) {
            return { ...prev, [modelId]: { ...existing, isDownloading: false, isDownloaded: false, message: data.error?.message || data.message || '下载失败' } }
          }
          return prev
        })
      })
      cleanups.push(cleanup)
    }

    setCooperativeCleanups(cleanups)
    return () => {
      for (const cleanup of cleanups) {
        try { cleanup() } catch { /* ignore */ }
      }
    }
  }, [])

  const updateBackend = (id: string, patch: Partial<AiBackendConfig>) => {
    setAiBackends((prev) => prev.map((backend) => (backend.id === id ? { ...backend, ...patch } : backend)))
  }

  const addBackend = () => {
    setAiBackends((prev) => [...prev, createExternalBackend(prev.length)])
    setActiveTab('services')
    showToast('已添加推理服务草稿')
    pushLog('External backend draft added')
  }

  const testBackend = async (backend: AiBackendConfig) => {
    const api = (window as any).electronAPI
    if (!api?.aiBackendHealthCheck) {
      setBackendResults((prev) => ({ ...prev, [`health:${backend.id}`]: '当前环境无法访问桌面端推理服务健康检查接口。' }))
      showToast('推理服务健康检查接口不可用')
      pushLog(`${backend.name} health check unavailable`)
      return
    }

    setBusy(`health:${backend.id}`, true)
    try {
      const result = await api.aiBackendHealthCheck({ backendId: backend.id, config: backend })
      setBackendResults((prev) => ({
        ...prev,
        [`health:${backend.id}`]: result.success
          ? `连接成功${result.latencyMs ? ` / ${result.latencyMs}ms` : ''}`
          : `${result.error?.code ?? 'BACKEND_CONNECTION_FAILED'}: ${result.error?.message ?? '连接失败'}`
      }))
      showToast(result.success ? '推理服务连接成功' : '推理服务连接失败')
      pushLog(`${backend.name} health check ${result.success ? 'passed' : 'failed'}`)
    } finally {
      setBusy(`health:${backend.id}`, false)
    }
  }

  const fetchBackendModels = async (backend: AiBackendConfig) => {
    const api = (window as any).electronAPI
    if (!api?.aiBackendListModels) {
      setBackendResults((prev) => ({ ...prev, [`models:${backend.id}`]: '当前环境无法访问桌面端模型列表接口。' }))
      showToast('模型列表接口不可用')
      pushLog(`${backend.name} model list unavailable`)
      return
    }

    setBusy(`models:${backend.id}`, true)
    try {
      const result = await api.aiBackendListModels({ backendId: backend.id, config: backend })
      if (result.success) {
        const models = result.models.map((model: any) => model.id)
        setBackendModelLists((prev) => ({ ...prev, [backend.id]: models }))
        setBackendResults((prev) => ({ ...prev, [`models:${backend.id}`]: `已读取 ${models.length} 个模型` }))
        showToast(`已读取 ${models.length} 个模型`)
      } else {
        setBackendResults((prev) => ({
          ...prev,
          [`models:${backend.id}`]: `${result.error?.code ?? 'BACKEND_MODEL_LIST_FAILED'}: ${result.error?.message ?? '拉取失败'}`
        }))
        showToast('模型列表拉取失败')
      }
    } finally {
      setBusy(`models:${backend.id}`, false)
    }
  }

  const detectLlamaHardware = async () => {
    const api = (window as any).electronAPI
    if (!api?.llamaRuntimeDetectHardware) {
      showToast('硬件分析接口不可用')
      pushLog('Llama hardware detection unavailable')
      return
    }

    setBusy('llama-detect', true)
    try {
      const hardware = await api.llamaRuntimeDetectHardware()
      setLlamaHardware(hardware)
      showToast('硬件分析完成')
      pushLog(`Llama hardware detected: ${hardware.gpuName || 'no NVIDIA GPU'}`)
    } finally {
      setBusy('llama-detect', false)
    }
  }

  const createLlamaPlan = async () => {
    const api = (window as any).electronAPI
    if (!api?.llamaRuntimeCreateInstallPlan) {
      showToast('安装方案接口不可用')
      pushLog('Llama install plan unavailable')
      return
    }

    setBusy('llama-plan', true)
    try {
      const plan = await api.llamaRuntimeCreateInstallPlan({
        modelRootDir: settings.modelRootDir,
        downloadSource
      })
      setLlamaPlan(plan)
      setSelectedLlamaModelId(plan.recommendedModel.id)
      setLlamaInstallLogs([
        `${new Date().toLocaleTimeString()} 安装方案已生成：${plan.accelerator} / ${plan.recommendedModel.name}`,
        ...plan.warnings.map((warning: string) => `${new Date().toLocaleTimeString()} 提示：${warning}`)
      ].slice(0, 160))
      showToast('安装方案已生成')
      pushLog(`Llama install plan created: ${plan.accelerator} / ${plan.recommendedModel.name}`)
    } finally {
      setBusy('llama-plan', false)
    }
  }

  const createSelectedLlamaPlan = () => {
    if (!llamaPlan) return null
    const selectedModel = llamaPlan.modelCandidates.find((model) => model.id === selectedLlamaModelId) ?? llamaPlan.recommendedModel
    const separator = llamaPlan.installRoot.includes('\\') ? '\\' : '/'
    return {
      ...llamaPlan,
      recommendedModel: selectedModel,
      modelDir: `${llamaPlan.installRoot.replace(/[\\/]+$/, '')}${separator}models${separator}gguf${separator}${selectedModel.id}`
    }
  }

  const startLlamaInstall = async () => {
    const api = (window as any).electronAPI
    const plan = createSelectedLlamaPlan()
    if (!api?.llamaRuntimeStartInstall || !plan) {
      showToast(plan ? '安装接口不可用' : '请先生成安装方案')
      pushLog(plan ? 'Llama install API unavailable' : 'Llama install blocked: no plan')
      return
    }

    setBusy('llama-install', true)
    pushLlamaInstallLog(`开始安装：${plan.accelerator} / ${plan.recommendedModel.name}`)
    let unsubscribe: (() => void) | undefined
    if (api.onLlamaRuntimeInstallProgress) {
      unsubscribe = api.onLlamaRuntimeInstallProgress(plan.installId, (_event: any, data: LlamaInstallProgressEvent) => {
        setLlamaStatus((prev) => ({
          ...(prev ?? { baseUrl: plan.baseUrl }),
          installId: data.installId,
          phase: data.phase,
          progress: data.progress,
          message: data.message,
          installRoot: plan.installRoot,
          runtimeDir: plan.runtimeDir,
          baseUrl: plan.baseUrl,
          error: data.error
        }))
        pushLlamaInstallLog(`${data.phase} ${data.progress}% - ${data.message}${data.detail ? ` ${data.detail}` : ''}`)
      })
    }

    try {
      const status = await api.llamaRuntimeStartInstall({ plan })
      setLlamaStatus(status)
      showToast(status.phase === 'complete' ? 'Llama 安装完成' : status.message || 'Llama 安装状态已更新')
      pushLog(status.phase === 'complete' ? 'Llama install completed' : `Llama install: ${status.message}`)
      await fetchConsoleStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      showToast('Llama 安装失败')
      pushLlamaInstallLog(`安装失败：${message}`)
      pushLog(`Llama install failed: ${message}`)
    } finally {
      unsubscribe?.()
      setBusy('llama-install', false)
    }
  }

  const cancelLlamaInstall = async () => {
    const api = (window as any).electronAPI
    if (!api?.llamaRuntimeCancelInstall) {
      showToast('取消安装接口不可用')
      pushLog('Llama install cancel unavailable')
      return
    }

    setBusy('llama-cancel-install', true)
    try {
      const status = await api.llamaRuntimeCancelInstall()
      setLlamaStatus(status)
      showToast('已请求取消 Llama 安装')
      pushLlamaInstallLog('已请求取消安装')
      pushLog('Llama install cancel requested')
    } finally {
      setBusy('llama-cancel-install', false)
    }
  }

  const startLlamaServer = async () => {
    const api = (window as any).electronAPI
    if (!api?.llamaRuntimeStartServer) {
      showToast('启动推理接口不可用')
      pushLog('Llama server start unavailable')
      return
    }

    setBusy('llama-start', true)
    try {
      const status = await api.llamaRuntimeStartServer(llamaPlan ? { plan: llamaPlan } : undefined)
      setLlamaStatus(status)
      showToast(status.phase === 'complete' ? 'Llama 服务已启动' : status.message || 'Llama 服务状态已更新')
      pushLog(status.phase === 'complete' ? 'Llama server started' : `Llama server: ${status.message}`)
    } finally {
      setBusy('llama-start', false)
    }
  }

  const stopLlamaServer = async () => {
    const api = (window as any).electronAPI
    if (!api?.llamaRuntimeStopServer) {
      showToast('停止推理服务接口不可用')
      pushLog('Llama server stop unavailable')
      return
    }

    setBusy('llama-stop', true)
    try {
      const status = await api.llamaRuntimeStopServer()
      setLlamaStatus(status)
      showToast('Llama 推理服务已停止')
      pushLog('Llama server stopped')
      await fetchConsoleStatus()
    } finally {
      setBusy('llama-stop', false)
    }
  }

  const testLlamaServer = async () => {
    const api = (window as any).electronAPI
    if (!api?.llamaRuntimeTestServer) {
      setLlamaTest({
        success: false,
        baseUrl: 'http://127.0.0.1:8080/v1',
        models: [],
        chatOk: false,
        visionOk: false,
        visionInput: 'generated_fixture',
        checkedAt: new Date().toISOString(),
        error: { code: 'BRIDGE_UNAVAILABLE', message: '当前环境无法访问桌面端 Llama 连接测试接口。' }
      })
      showToast('Llama 连接测试接口不可用')
      pushLog('Llama server test unavailable')
      return
    }

    setBusy('llama-test', true)
    try {
      const result = await api.llamaRuntimeTestServer({ baseUrl: 'http://127.0.0.1:8080/v1' })
      setLlamaTest(result)
      showToast(result.success ? 'Llama 文本与视觉推理验证成功' : 'Llama 推理验证失败')
      pushLog(result.success ? `Llama multimodal test passed: ${result.modelId || 'local model'}` : `Llama server test failed: ${result.error?.message || 'unknown error'}`)
      await fetchConsoleStatus()
    } finally {
      setBusy('llama-test', false)
    }
  }

  const openModelDetail = (model: ModelRow) => {
    setSelectedModelId(model.id)
    setActiveTab('models')
    if (model.id === 'qwen_vl') {
      setExpandedModelFamilies((prev) => ({ ...prev, qwen_vl: !prev.qwen_vl }))
    }
    showToast(`已打开 ${model.name} 详情`)
    pushLog(`Model detail opened: ${model.name}`)
  }

  return (
    <div className="h-full overflow-y-auto text-slate-900 dark:text-slate-100">
      {toast && (
        <div className="fixed right-8 top-20 z-50 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-[12px] font-extrabold text-emerald-700 shadow-card-hover dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {toast}
        </div>
      )}

      <div className="flex min-h-full flex-col gap-5">
        <main className="min-w-0 flex-1 space-y-5">
          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  核心管理模块
                </div>
                <h2 className="mt-3 text-[26px] font-black tracking-tight text-slate-950 dark:text-slate-50">AI 运行控制台</h2>
                <p className="mt-1 max-w-3xl text-[13px] font-semibold leading-6 text-slate-500 dark:text-slate-400">
                  集中管理本地模型、视觉提示词反推、自动化打标流程、推理服务与显存安全策略。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MiniButton tone="primary" onClick={() => setSettingsOpen(true)}>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center">
                    <ImageIcon className="h-4 w-4" />
                    <Settings className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-slate-950 dark:bg-slate-50" />
                  </span>
                  AI 设置
                </MiniButton>
                <MiniButton onClick={() => fetchConsoleStatus('manual')} disabled={loading.refresh}>
                  <RefreshCw className={`h-4 w-4 ${loading.refresh ? 'animate-spin' : ''}`} />
                  刷新状态
                </MiniButton>
                <MiniButton tone="danger" onClick={handleClearGpuMemory} disabled={loading.clear}>
                  {loading.clear ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  安全释放显存
                </MiniButton>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              icon={<Gauge className="h-4 w-4" />}
              title="GPU 与显存"
              value={gpuDisplay.valueLabel}
              caption={gpuDisplay.captionLabel}
              tone={gpuDisplay.riskTone}
              action="查看日志"
              onAction={() => {
                setActiveTab('logs')
                pushLog('GPU telemetry diagnostic opened')
              }}
            >
              <GpuMemoryChart samples={gpuSamples} totalMb={effectiveGpu.totalMb} telemetryTrusted={telemetryTrusted} />
            </StatusCard>
            <StatusCard
              icon={<Brain className="h-4 w-4" />}
              title="当前反推模型"
              value={activeReverseModel}
              caption={promptSettings.backendMode === 'native-qwen3vl' ? 'Python Transformers 实验路线' : activeBackendLabel}
              tone={modelReadinessDisplay.tone}
              action="查看模型"
              onAction={() => setActiveTab('models')}
            >
              <PromptPreview title={activePromptPreview.title} text={activePromptPreview.text} />
            </StatusCard>
            <StatusCard
              icon={<ListChecks className="h-4 w-4" />}
              title="任务列表"
              value={queueStatusDisplay.valueLabel}
              caption={queueStatusDisplay.captionLabel}
              tone={queueStatusDisplay.statusTone}
              action="查看运行日志"
              onAction={() => setActiveTab('logs')}
            >
              <TaskListPreview queueStats={queueStats} />
            </StatusCard>
            <StatusCard
              icon={<Boxes className="h-4 w-4" />}
              title="模型就绪"
              value={modelReadinessDisplay.valueLabel}
              caption={modelReadinessDisplay.captionLabel}
              tone={modelReadinessDisplay.tone}
              action="管理模型"
              onAction={() => setActiveTab('models')}
            />
          </section>

          <section className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
            {([
              ['overview', '总览', Activity],
              ['models', '模型', Boxes],
              ['services', '推理服务', Server],
              ['runtime', 'AI 运行时管理', ShieldCheck],
              ['prompts', '反推提示词', Wand2],
              ['logs', '日志', TerminalSquare]
            ] as Array<[ConsoleTab, string, React.ComponentType<{ className?: string }>]>).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-black transition-all ${
                  activeTab === id
                    ? 'bg-slate-950 text-white shadow-premium dark:bg-slate-100 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </section>

          {activeTab === 'overview' && (
            <OverviewWorkspace
              promptMode={promptSettings.backendMode}
              activeReverseModel={activeReverseModel}
              activeBackendLabel={activeBackendLabel}
              modelReadinessInput={modelReadinessInput}
              installedNativeModels={installedNativeModels}
              installedGgufModels={installedGgufModels}
              queueStats={queueStats}
              llamaStatus={llamaStatus}
              llamaRunning={llamaRunning}
              platformWorkerProbe={platformWorkerProbe}
              platformProbeDisplay={platformProbeDisplay}
              platformBranchStatus={platformBranchStatus}
              onInstallAiRuntimeDeps={handleInstallAiRuntimeDeps}
              installingAiRuntimeDeps={installingAiRuntimeDeps}
              onStartLlamaInstall={startLlamaInstall}
              onInstallEasyOcr={handleInstallEasyOcr}
              pythonMpsStatus={pythonMpsStatus}
              clipSiglipOnnxStatus={clipSiglipOnnxStatus}
              ollamaFallback={ollamaFallback}
              externalHttpFallback={externalHttpFallback}
              selectedBackend={selectedBackend}
              latestLogLine={latestLogLine}
              gpuDisplay={gpuDisplay}
              setActiveTab={setActiveTab}
              onRefreshEvidence={() => fetchConsoleStatus('manual')}
            />
          )}

          {activeTab === 'models' && (
            <ModelsWorkspace
              modelsList={modelsList}
              localGgufModels={localGgufModels}
              loadedModels={loadedModels}
              cooperativeRuntimeModels={cooperativeRuntimeModels}
              selectedModel={selectedModel}
              selectedModelId={selectedModelId}
              expandedModelFamilies={expandedModelFamilies}
              selectedPromptModelId={selectedPromptModelId}
              promptSettings={promptSettings}
              memoryPolicy={memoryPolicy}
              setMemoryPolicy={setMemoryPolicy}
              telemetryTrusted={telemetryTrusted}
              isMockTelemetry={isMockTelemetry}
              devMockEnabled={devMockEnabled}
              effectiveGpu={effectiveGpu}
              gpuDisplay={gpuDisplay}
              riskTone={gpuDisplay.riskTone}
              clearResult={clearResult}
              loading={loading}
              openModelDetail={openModelDetail}
              fetchConsoleStatus={fetchConsoleStatus}
              handleForceUnload={handleForceUnload}
              handleClearGpuMemory={handleClearGpuMemory}
              cooperativeModels={cooperativeModels}
              onDownloadCooperativeModel={handleDownloadCooperativeModel}
              onCancelCooperativeDownload={handleCancelCooperativeDownload}
              onDeleteCooperativeModel={handleDeleteCooperativeModel}
            />
          )}

          {activeTab === 'services' && (
            <BackendsWorkspace
              aiBackends={aiBackends}
              promptSettings={promptSettings}
              setPromptSettings={setPromptSettings}
              updateBackend={updateBackend}
              addBackend={addBackend}
              testBackend={testBackend}
              fetchBackendModels={fetchBackendModels}
              backendResults={backendResults}
              backendModelLists={backendModelLists}
              selectedExternalModels={selectedExternalModels}
              loading={loading}
              llamaHardware={llamaHardware}
              llamaPlan={llamaPlan}
              llamaStatus={llamaStatus}
              llamaTest={llamaTest}
              selectedLlamaModelId={selectedLlamaModelId}
              setSelectedLlamaModelId={setSelectedLlamaModelId}
              llamaInstallLogs={llamaInstallLogs}
              localGgufModels={localGgufModels}
              detectLlamaHardware={detectLlamaHardware}
              createLlamaPlan={createLlamaPlan}
              startLlamaInstall={startLlamaInstall}
              cancelLlamaInstall={cancelLlamaInstall}
              startLlamaServer={startLlamaServer}
              stopLlamaServer={stopLlamaServer}
              testLlamaServer={testLlamaServer}
              downloadSource={downloadSource}
              setDownloadSource={setDownloadSource}
            />
          )}

          {activeTab === 'runtime' && <AiRuntimePanel />}

          {activeTab === 'prompts' && (
            <PromptSystemPanel
              activePromptTitle={activePromptPreview.title}
              promptSettings={promptSettings}
              customTemplates={settings.promptReverseTemplates ?? []}
              updateSettings={updateSettings}
            />
          )}

          {activeTab === 'logs' && (
            <section className="rounded-[22px] border border-slate-800 bg-slate-950 p-5 text-slate-200 shadow-premium">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-black">运行日志</h3>
                <MiniButton onClick={() => setLogs([])}>清空可见日志</MiniButton>
              </div>
              <div className="max-h-[520px] space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-[11px] leading-6 text-slate-300">
                {logs.length ? logs.map((line, index) => <div key={`${line}-${index}`}>{line}</div>) : <div className="text-slate-500">暂无本地操作日志。</div>}
              </div>
            </section>
          )}
        </main>

        <aside
          className={`fixed bottom-8 right-8 top-24 z-40 w-[420px] max-w-[calc(100vw-4rem)] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/35 ${
            settingsOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-[16px] font-black text-slate-950 dark:text-slate-50">AI 设置</h3>
                <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">提取、反推、推理服务和安全策略</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <SettingsBlock icon={<Wand2 className="h-4 w-4" />} title="文字与色彩提取" caption="自动检测画面文字和色彩前景">
                <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] font-extrabold text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                  启用文字色彩分析
                  <input type="checkbox" checked={enableTextColorAnalysis} onChange={(event) => setEnableTextColorAnalysis(event.target.checked)} className="h-4 w-4 accent-brand-500" />
                </label>
                <Field label="文字定位引擎">
                  <select value={textBoxProvider} onChange={(event) => setTextBoxProvider(event.target.value as TextBoxProvider)} className="control">
                    <option value="none">暂不启用</option>
                    <option value="easyocr">EasyOCR（推荐）</option>
                    <option value="rapidocr">RapidOCR</option>
                    <option value="paddleocr">PaddleOCR ONNX</option>
                    <option value="mock">开发者虚拟检测框</option>
                  </select>
                </Field>
                <Field label="最大定位框数量">
                  <input type="number" min={5} max={100} value={maxTextBoxesPerImage} onChange={(event) => setMaxTextBoxesPerImage(Number(event.target.value))} className="control" />
                </Field>
                <Field label="单图提取超时（毫秒）">
                  <input type="number" min={1000} max={60000} step={1000} value={ocrTimeoutMs} onChange={(event) => setOcrTimeoutMs(Number(event.target.value))} className="control" />
                </Field>
              </SettingsBlock>

              <SettingsBlock icon={<Brain className="h-4 w-4" />} title="AI 高级反推" caption="配置多模态提示词反推引擎">
                <Field label="反推核心引擎">
                  <select
                    value={promptSettings.backendMode}
                    onChange={(event) => {
                      const mode = event.target.value as PromptReverseBackendMode
                      const firstBackend = aiBackends.find((backend) => backend.type === mode)
                      setPromptSettings((prev) => ({
                        ...prev,
                        backendMode: mode,
                        selectedExternalBackendId: mode === 'native-qwen3vl' ? prev.selectedExternalBackendId : firstBackend?.id ?? prev.selectedExternalBackendId
                      }))
                    }}
                    className="control"
                  >
                    <option value="llama-openai">Qwen3-VL GGUF / Llama 本地接口</option>
                    <option value="native-qwen3vl">Python Transformers 实验路线</option>
                    <option value="openai-compatible">自定义 OpenAI-compatible</option>
                  </select>
                </Field>
                <Field label="原生反推模型">
                  <select value={selectedPromptModelId} onChange={(event) => setSelectedPromptModelId(event.target.value)} className="control">
                    <option value="qwen3-vl-4b-instruct">qwen3-vl-4b-instruct</option>
                    <option value="qwen3-vl-8b-instruct">qwen3-vl-8b-instruct</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="输出长度">
                    <input type="number" min={64} max={4096} value={promptSettings.maxNewTokens} onChange={(event) => setPromptSettings((prev) => ({ ...prev, maxNewTokens: Number(event.target.value) }))} className="control" />
                  </Field>
                  <Field label="温度">
                    <input type="number" min={0} max={2} step={0.1} value={promptSettings.temperature} onChange={(event) => setPromptSettings((prev) => ({ ...prev, temperature: Number(event.target.value) }))} className="control" />
                  </Field>
                </div>
                <MiniButton onClick={() => setActiveTab('services')}>
                  <PanelRight className="h-4 w-4" />
                  管理推理服务
                </MiniButton>
              </SettingsBlock>
            </div>

            <div className="border-t border-slate-100 p-5 dark:border-slate-800">
              <button
                type="button"
                onClick={handleSaveAiSettings}
                disabled={loading.save}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-[13px] font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50"
              >
                {loading.save ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存 AI 设置
              </button>
            </div>
          </div>
        </aside>

        {false && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="fixed right-5 top-24 z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-600 shadow-card-hover transition-transform hover:scale-105 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-400"
            title="打开 AI 设置"
          >
            <PanelRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

function OverviewWorkspace(props: {
  promptMode: PromptReverseBackendMode
  activeReverseModel: string
  activeBackendLabel: string
  modelReadinessInput: AiConsoleModelReadinessDisplayInput
  installedNativeModels: PromptVlmModel[]
  installedGgufModels: LocalGgufModel[]
  queueStats: AiQueueStatsLike
  llamaStatus: LlamaInstallStatus | null
  llamaRunning?: boolean
  platformWorkerProbe: PlatformAiWorkerProbeWithRuntimeVersions | null
  platformProbeDisplay: PlatformAiWorkerProbeDiagnosticsDisplay
  platformBranchStatus: PlatformAiBranchStatusResponse | null
  onInstallAiRuntimeDeps?: () => Promise<void>
  installingAiRuntimeDeps?: boolean
  onStartLlamaInstall?: () => Promise<void>
  onInstallEasyOcr?: () => Promise<void>
  pythonMpsStatus: AiRuntimePythonMpsStatusResponse | null
  clipSiglipOnnxStatus: AiRuntimeClipSiglipOnnxStatusResponse | null
  ollamaFallback: FallbackSummary
  externalHttpFallback: FallbackSummary
  selectedBackend?: AiBackendConfig
  latestLogLine: string
  gpuDisplay: AiConsoleGpuDisplay
  setActiveTab: React.Dispatch<React.SetStateAction<ConsoleTab>>
  onRefreshEvidence: () => void
}) {
  const smokeGguf = props.installedGgufModels.find((model) => model.id === 'qwen3-vl-2b-instruct-q4-k-m') ?? props.installedGgufModels[0] ?? null
  const llamaDisplay = projectLlamaRuntimeDisplay(props.llamaStatus, props.llamaRunning)
  const pythonMpsDisplay = projectPythonMpsCompatibilityDisplay(props.pythonMpsStatus)
  const clipSiglipOnnxDisplay = projectClipSiglipOnnxCompatibilityDisplay(props.clipSiglipOnnxStatus)
  const routeOverviewDisplay = projectPlatformAiRouteOverviewDisplay(props.platformBranchStatus)
  const ggufArtifactDisplay = projectGgufArtifactTileDisplay(smokeGguf)
  const modelReadinessDisplay = projectAiConsoleModelReadinessDisplay(props.modelReadinessInput)
  const serviceState = props.promptMode === 'llama-openai'
    ? `Llama 服务${llamaDisplay.serviceValue}`
    : props.promptMode === 'openai-compatible'
      ? props.selectedBackend?.enabled ? '外部服务已启用' : '外部服务未启用'
      : modelReadinessDisplay.workerStatusLabel
  const queueStatusDisplay = projectAiQueueStatusDisplay(props.queueStats)

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">运行驾驶舱</h3>
              <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">聚合当前反推链路、服务健康、任务队列与模型就绪状态。</p>
            </div>
            <StatusPill tone={modelReadinessDisplay.tone}>{modelReadinessDisplay.executableLabel}</StatusPill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <RuntimeTile label="当前反推链路" value={props.activeReverseModel} caption={props.activeBackendLabel} />
            <RuntimeTile label="服务状态" value={serviceState} caption={props.promptMode === 'native-qwen3vl' ? 'Python Worker' : 'OpenAI-compatible API'} />
            <RuntimeTile label="任务队列" value={queueStatusDisplay.valueLabel} caption={queueStatusDisplay.captionLabel} />
            <RuntimeTile label="显存水位" value={props.gpuDisplay.usageLabel} caption={props.gpuDisplay.freeLabel === '未知' ? '未知状态按风险处理' : `${props.gpuDisplay.freeLabel} 可用`} />
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">模型摘要</h3>
              <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">只统计本机已安装且可选择的模型版本。</p>
            </div>
            <MiniButton onClick={() => props.setActiveTab('models')}>
              <Boxes className="h-4 w-4" />
              查看模型
            </MiniButton>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <RuntimeTile label="Python Transformers 模型" value={`${props.installedNativeModels.length} 个`} caption={props.installedNativeModels.map((m) => m.id).join(' / ') || '暂无已安装版本'} />
            <RuntimeTile label="GGUF 量化模型" value={`${props.installedGgufModels.length} 个`} caption={props.installedGgufModels.map((m) => m.filename).slice(0, 2).join(' / ') || '暂无已安装版本'} />
          </div>
        </div>

        <PlatformAiBranchStatusPanel
          status={props.platformBranchStatus}
          onAction={(actionPlan) => {
            const command = resolvePlatformAiActionCommand(actionPlan, props.platformBranchStatus?.platformBranch)
            if (command.kind === 'refresh_evidence') {
              props.onRefreshEvidence()
              return
            }
            if (command.kind === 'start_llama_install') {
              if (props.onStartLlamaInstall) {
                props.onStartLlamaInstall()
                return
              }
            }
            if (command.kind === 'install_ocr_runtime') {
              if (props.onInstallEasyOcr) {
                props.onInstallEasyOcr()
                return
              }
            }
            if (command.kind === 'install_ai_runtime_dependencies') {
              if (props.onInstallAiRuntimeDeps) {
                props.onInstallAiRuntimeDeps()
                return
              }
            }
            if (command.kind === 'open_tab' && command.targetTab) {
              props.setActiveTab(command.targetTab)
            }
          }}
        />

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">{routeOverviewDisplay.title}</h3>
              <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">{routeOverviewDisplay.description}</p>
            </div>
            {routeOverviewDisplay.showWorkerProbeDiagnostics && (
              <div className="flex items-center gap-2">
                <StatusPill tone={props.platformProbeDisplay.connectionTone}>{props.platformProbeDisplay.connectionLabel}</StatusPill>
                <MiniButton tone="primary" onClick={props.onInstallAiRuntimeDeps} disabled={props.installingAiRuntimeDeps}>
                  {props.installingAiRuntimeDeps ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  {props.installingAiRuntimeDeps ? routeOverviewDisplay.installingDependenciesLabel : routeOverviewDisplay.installDependenciesLabel}
                </MiniButton>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {routeOverviewDisplay.showWorkerProbeDiagnostics ? (
              <>
                <RuntimeTile label={routeOverviewDisplay.diagnosticTiles.mpsLabel} value={props.platformProbeDisplay.accelerator.valueLabel} caption={props.platformProbeDisplay.accelerator.captionLabel} />
                <RuntimeTile label={routeOverviewDisplay.diagnosticTiles.pythonCompatibilityLabel} value={pythonMpsDisplay.label} caption={pythonMpsDisplay.runtimeLabel} />
                <RuntimeTile label={routeOverviewDisplay.diagnosticTiles.onnxRuntimeLabel} value={props.platformProbeDisplay.onnxRuntime.valueLabel} caption={props.platformProbeDisplay.onnxRuntime.captionLabel} />
                <RuntimeTile label={routeOverviewDisplay.diagnosticTiles.clipSiglipOnnxLabel} value={props.platformProbeDisplay.clipSiglipOnnx.valueLabel} caption={props.platformProbeDisplay.clipSiglipOnnx.captionLabel} />
                <RuntimeTile label={routeOverviewDisplay.diagnosticTiles.clipSiglipCompatibilityLabel} value={clipSiglipOnnxDisplay.label} caption={clipSiglipOnnxDisplay.runtimeLabel} />
              </>
            ) : routeOverviewDisplay.runtimeLanes.map((lane) => (
              <RuntimeTile
                key={lane.lane}
                label={lane.label}
                value={lane.statusLabel}
                caption={lane.isPrimary ? routeOverviewDisplay.primaryRuntimeLaneCaption : routeOverviewDisplay.candidateRuntimeLaneCaption}
              />
            ))}
            <RuntimeTile label="Llama 路线" value={llamaDisplay.routeValue} caption={llamaDisplay.routeCaption} />
            <RuntimeTile label="Qwen2.5-VL Ollama fallback" value={props.ollamaFallback.value} caption={props.ollamaFallback.caption} />
            <RuntimeTile label="external HTTP fallback" value={props.externalHttpFallback.value} caption={props.externalHttpFallback.caption} />
            <RuntimeTile label="Smoke GGUF" value={ggufArtifactDisplay.smokeValueLabel} caption={ggufArtifactDisplay.smokeCaptionLabel} />
            <RuntimeTile label="Vision mmproj" value={ggufArtifactDisplay.mmprojValueLabel} caption={ggufArtifactDisplay.mmprojCaptionLabel} />
          </div>

          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] font-bold leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            {routeOverviewDisplay.priorityLabel}
          </div>

          {routeOverviewDisplay.showWorkerProbeDiagnostics && (
            <PlatformAiCapabilityMatrix probe={props.platformWorkerProbe} />
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">服务健康</h3>
            <StatusPill tone={props.gpuDisplay.riskTone}>{props.gpuDisplay.riskTone === 'good' ? '正常' : props.gpuDisplay.riskTone === 'bad' ? '关注' : '未知'}</StatusPill>
          </div>
          <div className="space-y-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">Python Worker：{modelReadinessDisplay.workerStatusLabel.replace('Worker ', '')}</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">Llama 服务：{llamaDisplay.serviceValue}</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">外部服务：{props.selectedBackend?.name || '未选择'}</div>
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">最近事件</h3>
            <MiniButton onClick={() => props.setActiveTab('logs')}>
              <TerminalSquare className="h-4 w-4" />
              日志
            </MiniButton>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">{props.latestLogLine}</div>
        </div>
      </div>
    </section>
  )
}

function PlatformAiBranchStatusPanel({
  status,
  onAction
}: {
  status: PlatformAiBranchStatusResponse | null
  onAction: (actionPlan: PlatformAiActionPlan) => void
}) {
  const display = projectPlatformAiBranchStatusDisplay(status)

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">{display.panelTitle}</h3>
          <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">
            {display.panelDescription}
          </p>
        </div>
        <StatusPill tone={display.headerStatusTone}>{display.headerStatusLabel}</StatusPill>
      </div>

      {!status && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[12px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          {display.emptyLabel}
        </div>
      )}

      {status && (
        <div className="grid gap-3 md:grid-cols-2">
          {display.workflows.map((workflow) => {
            return (
              <div key={workflow.workflow} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-black text-slate-400 dark:text-slate-500">{workflow.workflowLabel}</div>
                    <div className="mt-2 truncate text-[15px] font-black text-slate-950 dark:text-slate-50">{workflow.title}</div>
                  </div>
                  <StatusPill tone={workflow.statusTone}>{workflow.statusLabel}</StatusPill>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{workflow.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {workflow.runtimeLanes.map((lane) => (
                    <span
                      key={lane.lane}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${lane.isPrimary ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}
                    >
                      {lane.label}: {lane.statusLabel}
                    </span>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <div>{display.evidencePrefix}：{workflow.evidenceLabel}</div>
                  <div className="mt-1">{display.missingPrefix}：{workflow.missingLabel}</div>
                  {workflow.nextActionLabel && <div className="mt-1">{display.nextActionPrefix}：{workflow.nextActionLabel}</div>}
                  {(workflow.actionPlan.kind !== 'none' || workflow.status === 'planned_capability') && (
                    <button
                      type="button"
                      disabled={!workflow.actionPlan.enabled}
                      onClick={() => {
                        onAction(workflow.actionPlan)
                      }}
                      className="mt-3 inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {workflow.actionPlan.kind === 'refresh_evidence'
                        ? <RefreshCw className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                      {workflow.actionPlan.label}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RuntimeTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="text-[10.5px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
      <div className="mt-2 truncate text-[18px] font-black text-slate-950 dark:text-slate-50">{value}</div>
      <div className="mt-1 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{caption}</div>
    </div>
  )
}

function ModelsWorkspace(props: {
  modelsList: PromptVlmModel[]
  localGgufModels: LocalGgufModel[]
  loadedModels: Record<string, unknown>
  cooperativeRuntimeModels: CooperativeRuntimeStatus
  selectedModel?: ModelRow | null
  selectedModelId: string | null
  expandedModelFamilies: Record<string, boolean>
  selectedPromptModelId: string
  promptSettings: AiPromptReverseSettings
  memoryPolicy: AiMemoryPolicy
  setMemoryPolicy: React.Dispatch<React.SetStateAction<AiMemoryPolicy>>
  telemetryTrusted: boolean
  isMockTelemetry: boolean
  devMockEnabled: boolean
  effectiveGpu: ReturnType<typeof normalizeWorkerGpuStatus>
  gpuDisplay: AiConsoleGpuDisplay
  riskTone: 'good' | 'warn' | 'bad'
  clearResult: ClearGpuMemoryResult | null
  loading: Record<string, boolean>
  openModelDetail: (model: ModelRow) => void
  fetchConsoleStatus: (source?: 'auto' | 'manual') => Promise<void>
  handleForceUnload: () => Promise<void>
  handleClearGpuMemory: () => Promise<void>
  // Cooperative model download
  cooperativeModels: CooperativeModelDownloadState
  onDownloadCooperativeModel: (modelId: string) => Promise<void>
  onCancelCooperativeDownload: (modelId: string) => Promise<void>
  onDeleteCooperativeModel: (modelId: string) => Promise<void>
}) {
  const installedNative = props.modelsList.filter((model) => model.isDownloaded)
  const installedGguf = props.localGgufModels.filter((model) => model.isDownloaded)
  const qwenExpanded = Boolean(props.expandedModelFamilies.qwen_vl)

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">模型与任务矩阵</h3>
            <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">能力模块保持混合展示，Qwen3-VL 展开为本机已安装版本集合。</p>
          </div>
          <div className="flex gap-2">
            <MiniButton onClick={() => props.fetchConsoleStatus('manual')}>
              <RefreshCw className="h-4 w-4" />
              更新列表
            </MiniButton>
            <MiniButton tone="danger" onClick={props.handleForceUnload} disabled={props.loading.unload}>
              {props.loading.unload ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              卸载全部模型
            </MiniButton>
          </div>
        </div>

        <div className="space-y-2">
          {MODEL_ROWS.map((model) => {
            const loaded = Boolean(props.loadedModels[model.id])
            const isSelected = props.selectedModelId === model.id
            const installedCount = model.id === 'qwen_vl' ? installedNative.length + installedGguf.length : 0
            const isCooperative = model.id === 'ram' || model.id === 'florence2' || model.id === 'clip' || model.id === 'wd_tagger'
            const cooperativeRegistryId = COOPERATIVE_MODEL_ID_BY_ROW_ID[model.id] ?? model.id
            const coopState = isCooperative ? props.cooperativeModels[cooperativeRegistryId] : undefined
            const runtimeCoopState: CooperativeWorkerModelStatus | undefined = isCooperative
              ? props.cooperativeRuntimeModels[model.id]
              : undefined
            const cooperativeDisplay = isCooperative
              ? projectCooperativeModelRowDisplay({
                  runtimeStatus: runtimeCoopState,
                  downloadState: coopState,
                  sourceLabel: model.source,
                  installedVersionCount: installedCount
                })
              : null
            const readinessDisplay = cooperativeDisplay?.readiness
            const downloadProgressDisplay = cooperativeDisplay?.downloadProgress
            const artifactDisplay = cooperativeDisplay?.artifact ?? projectModelArtifactRowDisplay({
              isCooperative: false,
              isLoaded: loaded,
              sourceLabel: model.source,
              installedVersionCount: installedCount
            })

            return (
              <div key={model.id} className="space-y-2">
                <div
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-slate-950 shadow-premium ring-1 ring-brand-200 dark:border-brand-400 dark:bg-brand-950/45 dark:text-slate-50 dark:ring-brand-700/50'
                      : 'border-slate-200/70 bg-white hover:border-brand-100 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-brand-900 dark:hover:bg-slate-900'
                  }`}
                  onClick={() => props.openModelDetail(model)}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${model.accent}`}>
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[13px] font-black ${isSelected ? 'text-slate-950 dark:text-slate-50' : 'text-slate-800 dark:text-slate-200'}`}>{model.name}</span>
                      <span className={`text-[10px] font-extrabold ${isSelected ? 'text-brand-700 dark:text-brand-200' : 'text-slate-400 dark:text-slate-500'}`}>{model.role}</span>
                      {model.id === 'qwen_vl' && <StatusPill tone={installedCount ? 'good' : 'muted'}>{artifactDisplay.installedVersionsLabel}</StatusPill>}
                    </div>
                    <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10.5px] font-bold ${isSelected ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span>{model.capability}</span>
                      <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                      <span>{artifactDisplay.sourceLabel}</span>
                      {isCooperative && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                          <span>{readinessDisplay?.detail}</span>
                        </>
                      )}
                    </div>
                    {/* Cooperative model download progress bar */}
                    {isCooperative && downloadProgressDisplay?.shouldShow && (
                      <div className="mt-2 w-full">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all duration-300"
                            style={{ width: `${downloadProgressDisplay.progressPercent}%` }}
                          />
                        </div>
                        <div className="mt-0.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-500">{downloadProgressDisplay.messageLabel}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {isCooperative ? (
                      <>
                        <StatusPill tone={readinessDisplay?.tone ?? 'warn'}>{readinessDisplay?.label ?? '证据不足'}</StatusPill>
                        {artifactDisplay.action === 'delete' ? (
                          <MiniButton tone="danger" onClick={() => props.onDeleteCooperativeModel(model.id)}>
                            <Trash2 className="h-3 w-3" />
                            {artifactDisplay.actionLabel}
                          </MiniButton>
                        ) : artifactDisplay.action === 'cancel' ? (
                          <MiniButton tone="default" onClick={() => props.onCancelCooperativeDownload(model.id)}>
                            <Square className="h-3 w-3" />
                            {artifactDisplay.actionLabel}
                          </MiniButton>
                        ) : (
                          <MiniButton tone="primary" onClick={() => props.onDownloadCooperativeModel(model.id)}>
                            <Download className="h-3 w-3" />
                            {artifactDisplay.actionLabel}
                          </MiniButton>
                        )}
                      </>
                    ) : (
                      <>
                        <StatusPill tone={artifactDisplay.runtimeStatusTone}>{artifactDisplay.runtimeStatusLabel}</StatusPill>
                        {model.id === 'qwen_vl' ? <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${qwenExpanded ? 'rotate-180' : ''}`} /> : <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />}
                      </>
                    )}
                  </div>
                </div>
                {model.id === 'qwen_vl' && qwenExpanded && (
                  <QwenVersionCollection
                    nativeModels={installedNative}
                    ggufModels={installedGguf}
                    selectedPromptModelId={props.selectedPromptModelId}
                    promptSettings={props.promptSettings}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-5">
        <MemoryGuardPanel
          telemetryTrusted={props.telemetryTrusted}
          isMockTelemetry={props.isMockTelemetry}
          devMockEnabled={props.devMockEnabled}
          effectiveGpu={props.effectiveGpu}
          memoryPolicy={props.memoryPolicy}
          setMemoryPolicy={props.setMemoryPolicy}
          gpuDisplay={props.gpuDisplay}
          riskTone={props.riskTone}
          clearResult={props.clearResult}
          onClear={props.handleClearGpuMemory}
          clearing={props.loading.clear}
        />
        {props.selectedModel && (
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">{props.selectedModel.name}</h3>
            <p className="mt-2 text-[12px] font-semibold leading-6 text-slate-500 dark:text-slate-400">{props.selectedModel.capability}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">来源：{props.selectedModel.source}</div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">状态：{props.loadedModels[props.selectedModel.id] ? '已加载' : '未加载'}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function QwenVersionCollection(props: {
  nativeModels: PromptVlmModel[]
  ggufModels: LocalGgufModel[]
  selectedPromptModelId: string
  promptSettings: AiPromptReverseSettings
}) {
  const versions = [
    ...props.nativeModels.map((model) => ({
      id: `native:${model.id}`,
      code: model.id,
      name: model.displayName ?? model.id,
      size: model.modelSize,
      quantization: model.quantization === 'none' ? 'Native' : model.quantization,
      runtime: model.runtime ?? 'transformers',
      stability: model.stability,
      releaseDate: model.officialReleaseDate,
      current: props.promptSettings.backendMode === 'native-qwen3vl' && props.selectedPromptModelId === model.id
    })),
    ...props.ggufModels.map((model) => ({
      id: `gguf:${model.id}`,
      code: model.filename,
      name: model.name,
      size: model.parameterSize,
      quantization: model.quantization,
      runtime: 'llama.cpp / GGUF',
      stability: model.stability ?? 'stable',
      releaseDate: model.officialReleaseDate,
      current: props.promptSettings.backendMode === 'llama-openai' && props.promptSettings.selectedExternalModel === model.filename
    }))
  ]

  if (!versions.length) {
    return (
      <div className="ml-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-[12px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        尚未检测到已安装的 Qwen3-VL Native 或 GGUF 版本。
      </div>
    )
  }

  return (
    <div className="ml-0 space-y-2 rounded-2xl border border-brand-100 bg-brand-50/35 p-3 dark:border-brand-900/60 dark:bg-brand-950/15 sm:ml-12">
      {versions.map((version) => (
        <div key={version.id} className="grid gap-3 rounded-xl border border-white bg-white p-3 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[12px] font-black text-slate-900 dark:text-slate-100">{version.name}</span>
              {version.current && <StatusPill tone="good">当前使用</StatusPill>}
            </div>
            <div className="mt-1 truncate font-mono text-[10.5px] text-slate-500 dark:text-slate-400">{version.code}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:min-w-[330px] md:grid-cols-4">
            <VersionMeta label="规模" value={version.size || '未知'} />
            <VersionMeta label="量化" value={version.quantization || '未知'} />
            <VersionMeta label="稳定性" value={normalizeStability(version.stability)} />
            <VersionMeta label="官方发布" value={formatReleaseDate(version.releaseDate)} />
          </div>
        </div>
      ))}
    </div>
  )
}

function VersionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500">{label}</div>
      <div className="truncate text-[10.5px] font-black text-slate-700 dark:text-slate-200">{value}</div>
    </div>
  )
}

function StatusCard({
  icon,
  title,
  value,
  caption,
  tone,
  action,
  onAction,
  children
}: {
  icon: React.ReactNode
  title: string
  value: string
  caption: string
  tone: 'good' | 'warn' | 'bad' | 'muted'
  action: string
  onAction: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-premium transition-all hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11.5px] font-black text-slate-500 dark:text-slate-400">
          <span className="text-brand-500">{icon}</span>
          <span className="truncate">{title}</span>
        </div>
        <StatusPill tone={tone}>{tone === 'good' ? '正常' : tone === 'bad' ? '关注' : tone === 'warn' ? '未知' : '参数'}</StatusPill>
      </div>
      <div className="mt-5 truncate text-[20px] font-black tracking-tight text-slate-950 dark:text-slate-50">{value}</div>
      <div className="mt-1 min-h-[18px] truncate text-[11px] font-bold text-slate-400 dark:text-slate-500">{caption}</div>
      {children && <div className="mt-3">{children}</div>}
      <button
        type="button"
        onClick={onAction}
        className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-[11px] font-black text-slate-500 transition-colors hover:bg-white hover:text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
      >
        {action}
      </button>
    </div>
  )
}

function MemoryGuardPanel({
  telemetryTrusted,
  isMockTelemetry,
  devMockEnabled,
  effectiveGpu,
  memoryPolicy,
  setMemoryPolicy,
  gpuDisplay,
  riskTone,
  clearResult,
  onClear,
  clearing,
  expanded
}: {
  telemetryTrusted: boolean
  isMockTelemetry: boolean
  devMockEnabled: boolean
  effectiveGpu: ReturnType<typeof normalizeWorkerGpuStatus>
  memoryPolicy: AiMemoryPolicy
  setMemoryPolicy: React.Dispatch<React.SetStateAction<AiMemoryPolicy>>
  gpuDisplay: AiConsoleGpuDisplay
  riskTone: 'good' | 'warn' | 'bad'
  clearResult: ClearGpuMemoryResult | null
  onClear: () => void
  clearing?: boolean
  expanded?: boolean
}) {
  return (
    <div className={`rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900 ${expanded ? '' : 'xl:sticky xl:top-0'}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-black text-slate-950 dark:text-slate-50">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            显存安全策略
          </h3>
          <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">跟随模型配置使用，不再作为独立模块。</p>
        </div>
        <StatusPill tone={riskTone}>{gpuDisplay.statusLabel}</StatusPill>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-center justify-between text-[12px] font-black text-slate-700 dark:text-slate-300">
          <span>{gpuDisplay.deviceLabel}</span>
          <span>{gpuDisplay.usageLabel}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${gpuDisplay.barToneClass}`}
            style={{ width: `${gpuDisplay.barWidthPercent}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
          <span>空闲：{gpuDisplay.freeLabel}</span>
          <span>总量：{gpuDisplay.totalLabel}</span>
        </div>
        {isMockTelemetry && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] font-extrabold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {devMockEnabled ? 'Dev mock only，不参与安全判断。' : 'Mock metrics disabled，不参与显存安全判断。'}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Field label="防护策略">
          <select value={memoryPolicy.clearGpuBeforePromptReverse} onChange={(event) => setMemoryPolicy((prev) => ({ ...prev, clearGpuBeforePromptReverse: event.target.value as AiMemoryPolicy['clearGpuBeforePromptReverse'] }))} className="control">
            <option value="always">保守：每次反推前清理</option>
            <option value="auto">平衡：紧张时自动清理</option>
            <option value="never">性能：仅明显不足时拦截</option>
          </select>
        </Field>
        <Field label="占用红线（%）">
          <input type="number" min={50} max={99} value={memoryPolicy.maxGpuMemoryUsagePercent} onChange={(event) => setMemoryPolicy((prev) => ({ ...prev, maxGpuMemoryUsagePercent: Number(event.target.value) }))} className="control" />
        </Field>
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-extrabold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          显存不足时自动清理
          <input type="checkbox" checked={memoryPolicy.forceClearWhenInsufficient} onChange={(event) => setMemoryPolicy((prev) => ({ ...prev, forceClearWhenInsufficient: event.target.checked }))} className="h-4 w-4 accent-brand-500" />
        </label>
      </div>

      <button type="button" onClick={onClear} disabled={clearing} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-[12px] font-black text-brand-600 transition-all hover:bg-brand-100 disabled:opacity-50 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-300 dark:hover:bg-brand-950/50">
        {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        安全释放显存
      </button>

      {clearResult && (
        <div className={`mt-3 rounded-2xl border p-3 text-[11px] font-bold leading-5 ${clearResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'}`}>
          {clearResult.success ? '清理完成' : `清理失败：${clearResult.error || '未知错误'}`}
          {clearResult.before && clearResult.after && (
            <div className="mt-1 text-[10px] opacity-80">
              清理前可用 {clearResult.before.freeGB.toFixed(1)} GB / 清理后可用 {clearResult.after.freeGB.toFixed(1)} GB
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BackendsWorkspace(props: {
  aiBackends: AiBackendConfig[]
  promptSettings: AiPromptReverseSettings
  setPromptSettings: React.Dispatch<React.SetStateAction<AiPromptReverseSettings>>
  updateBackend: (id: string, patch: Partial<AiBackendConfig>) => void
  addBackend: () => void
  testBackend: (backend: AiBackendConfig) => void
  fetchBackendModels: (backend: AiBackendConfig) => void
  backendResults: Record<string, string>
  backendModelLists: Record<string, string[]>
  selectedExternalModels: string[]
  loading: Record<string, boolean>
  llamaHardware: LlamaHardwareProfile | null
  llamaPlan: LlamaInstallPlan | null
  llamaStatus: LlamaInstallStatus | null
  llamaTest: LlamaServerTestResult | null
  selectedLlamaModelId: string
  setSelectedLlamaModelId: (id: string) => void
  llamaInstallLogs: string[]
  localGgufModels: LocalGgufModel[]
  detectLlamaHardware: () => void
  createLlamaPlan: () => void
  startLlamaInstall: () => void
  cancelLlamaInstall: () => void
  startLlamaServer: () => void
  stopLlamaServer: () => void
  testLlamaServer: () => void
  downloadSource: 'huggingface' | 'hf-mirror' | 'production-cdn'
  setDownloadSource: React.Dispatch<React.SetStateAction<'huggingface' | 'hf-mirror' | 'production-cdn'>>
}) {
  const installedGguf = props.localGgufModels.filter((model) => model.isDownloaded)
  const selectedPlanModel = props.llamaPlan?.modelCandidates.find((model) => model.id === props.selectedLlamaModelId) ?? props.llamaPlan?.recommendedModel ?? null
  const installInProgress = props.llamaStatus ? ['detecting', 'planning', 'downloading', 'extracting', 'installing'].includes(props.llamaStatus.phase) : false
  const llamaDisplay = projectLlamaRuntimeDisplay(props.llamaStatus)

  return (
    <section className="space-y-5">
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">外部服务连接</h3>
            <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">管理 OpenAI-compatible API 与可作为反推链路的本地服务。</p>
          </div>
          <MiniButton tone="primary" onClick={props.addBackend}>
            <Plus className="h-4 w-4" />
            添加服务
          </MiniButton>
        </div>

        <div className="space-y-3">
          {props.aiBackends.map((backend) => (
            <div key={backend.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                <Field label="服务名称">
                  <input value={backend.name} onChange={(event) => props.updateBackend(backend.id, { name: event.target.value })} className="control" />
                </Field>
                <Field label="接口类型">
                  <select value={backend.type} onChange={(event) => props.updateBackend(backend.id, { type: event.target.value as AiBackendType })} className="control">
                    <option value="llama-openai">Llama 本地接口</option>
                    <option value="openai-compatible">OpenAI-compatible</option>
                    <option value="ollama">Ollama fallback</option>
                    <option value="lm-studio">LM Studio</option>
                    <option value="custom">Custom HTTP</option>
                  </select>
                </Field>
                <Field label="Base URL">
                  <input value={backend.baseUrl} onChange={(event) => props.updateBackend(backend.id, { baseUrl: event.target.value })} className="control" />
                </Field>
                <Field label="默认模型">
                  <input value={backend.defaultModel ?? ''} onChange={(event) => props.updateBackend(backend.id, { defaultModel: event.target.value })} className="control" />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <input type="checkbox" checked={backend.enabled} onChange={(event) => props.updateBackend(backend.id, { enabled: event.target.checked })} className="h-4 w-4 accent-brand-500" />
                  启用
                </label>
                <MiniButton onClick={() => props.testBackend(backend)} disabled={props.loading[`health:${backend.id}`]}>
                  {props.loading[`health:${backend.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                  测试健康度
                </MiniButton>
                <MiniButton onClick={() => props.fetchBackendModels(backend)} disabled={props.loading[`models:${backend.id}`]}>
                  <Database className="h-4 w-4" />
                  获取模型列表
                </MiniButton>
                <button
                  type="button"
                  onClick={() => props.setPromptSettings((prev) => ({ ...prev, backendMode: backend.type === 'llama-openai' ? 'llama-openai' : 'openai-compatible', selectedExternalBackendId: backend.id }))}
                  className="rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-black text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-950/60"
                >
                  用作反推服务
                </button>
              </div>
              {(props.backendResults[`health:${backend.id}`] || props.backendResults[`models:${backend.id}`]) && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {props.backendResults[`health:${backend.id}`] || props.backendResults[`models:${backend.id}`]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">Llama 本地推理服务</h3>
            <p className="mt-1 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">管理 llama.cpp、GGUF 模型、视觉 mmproj 与本地 OpenAI 接口。</p>
          </div>
          <StatusPill tone={llamaDisplay.pillTone}>
            {llamaDisplay.pillLabel}
          </StatusPill>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="下载源选择 (Download Source)">
            <select
              value={props.downloadSource}
              onChange={(e) => props.setDownloadSource(e.target.value as any)}
              className="control"
            >
              <option value="hf-mirror">HF 国内镜像源 (默认 · hf-mirror.com)</option>
              <option value="huggingface">Hugging Face 官方源 (huggingface.co)</option>
              <option value="production-cdn">高精度大模型生产端 CDN 接入 (免真实下载测试)</option>
            </select>
          </Field>
          <Field label="下载策略说明 (Download Info)">
            <div className="h-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {props.downloadSource === 'production-cdn'
                ? '已开启生产端 CDN 接入测试。在此模式下，下载仅执行连接性校验并模拟秒级完成，不会占用实际网络带宽。'
                : '常规下载源，开始安装后将真实下载大模型资源 (约 2GB - 9GB)。'}
            </div>
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MiniButton onClick={props.detectLlamaHardware} disabled={props.loading['llama-detect']}>
            <Cpu className="h-4 w-4" />
            硬件分析
          </MiniButton>
          <MiniButton onClick={props.createLlamaPlan} disabled={props.loading['llama-plan']}>
            <HardDrive className="h-4 w-4" />
            安装方案
          </MiniButton>
          <MiniButton tone="primary" onClick={props.startLlamaInstall} disabled={!props.llamaPlan || props.loading['llama-install'] || installInProgress}>
            {props.loading['llama-install'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            开始安装
          </MiniButton>
          <MiniButton tone="danger" onClick={props.cancelLlamaInstall} disabled={!installInProgress || props.loading['llama-cancel-install']}>
            <X className="h-4 w-4" />
            取消安装
          </MiniButton>
          <MiniButton onClick={props.startLlamaServer} disabled={props.loading['llama-start']}>
            <Play className="h-4 w-4" />
            启动推理
          </MiniButton>
          <MiniButton onClick={props.stopLlamaServer} disabled={props.loading['llama-stop']}>
            <Square className="h-4 w-4" />
            停止服务
          </MiniButton>
          <MiniButton onClick={props.testLlamaServer} disabled={props.loading['llama-test']}>
            <Activity className="h-4 w-4" />
            连接测试
          </MiniButton>
          <MiniButton onClick={() => (window as any).electronAPI?.llamaRuntimeOpenInstallRoot?.()}>
            <FolderOpen className="h-4 w-4" />
            安装目录
          </MiniButton>
        </div>
        {props.llamaPlan && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-black text-slate-800 dark:text-slate-200">安装方案候选</div>
                <div className="mt-1 text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                  Runtime {props.llamaPlan.runtimeVersion} / {props.llamaPlan.accelerator} / {props.llamaPlan.downloadSource ?? 'huggingface'}
                </div>
              </div>
              <StatusPill tone="warn">推荐：{props.llamaPlan.recommendedModel.name}</StatusPill>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {props.llamaPlan.modelCandidates.map((model) => {
                const active = (selectedPlanModel?.id ?? props.llamaPlan?.recommendedModel.id) === model.id
                return (
                  <div
                    key={model.id}
                    onClick={() => props.setSelectedLlamaModelId(model.id)}
                    className={`rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'border-brand-500 bg-brand-50/50 text-brand-900 shadow-premium-sm dark:border-brand-800 dark:bg-brand-950/35 dark:text-brand-100'
                        : 'border-slate-200 bg-slate-50/30 text-slate-600 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-black tracking-tight">{model.name}</span>
                        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black ${
                          active
                            ? 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                            : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {model.quantization}
                        </span>
                      </div>
                      <div className="mt-1.5 truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">{model.filename}</div>
                      <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {model.parameterSize} / 约 {model.estimatedSizeGB} GB / 建议显存 {model.recommendedMinVramGB} GB / {model.supportsVision ? '含视觉 mmproj' : '文本模型'}
                      </div>
                    </div>

                    {(model.url || model.mmprojUrl) && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1 text-[10px] font-bold">
                        {model.url && (
                          <div className="truncate" onClick={(e) => e.stopPropagation()}>
                            <span className="text-slate-400 dark:text-slate-500">GGUF 链接: </span>
                            <a
                              href={model.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:underline font-mono text-[9.5px] font-medium"
                            >
                              {model.url}
                            </a>
                          </div>
                        )}
                        {model.mmprojUrl && (
                          <div className="truncate" onClick={(e) => e.stopPropagation()}>
                            <span className="text-slate-400 dark:text-slate-500">mmproj 链接: </span>
                            <a
                              href={model.mmprojUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 hover:underline font-mono text-[9.5px] font-medium"
                            >
                              {model.mmprojUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {props.llamaPlan.warnings.length > 0 && (
              <div className="mt-3 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10.5px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {props.llamaPlan.warnings.map((warning) => <div key={warning}>• {warning}</div>)}
              </div>
            )}
          </div>
        )}

        {(props.llamaStatus?.installId || props.llamaInstallLogs.length > 0) && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-slate-800 dark:text-slate-200">安装进度与终端输出</div>
              <div className="text-[10.5px] font-black text-slate-400 dark:text-slate-500">{props.llamaStatus?.phase ?? 'idle'} / {props.llamaStatus?.progress ?? 0}%</div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, props.llamaStatus?.progress ?? 0))}%` }} />
            </div>
            {props.llamaStatus?.message && <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">{props.llamaStatus.message}</div>}
            <div className="scrollbar-none mt-3 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-[10px] leading-5 text-slate-200 dark:border-slate-800">
              {props.llamaInstallLogs.length ? props.llamaInstallLogs.map((line, index) => <div key={`${line}-${index}`}>{line}</div>) : <div className="text-slate-500">暂无安装日志</div>}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] font-bold leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
          <div>当前显卡：{props.llamaHardware?.gpuName || '尚未检测'}</div>
          <div>物理显存：{props.llamaHardware?.totalVramGB ? `${props.llamaHardware.totalVramGB} GB` : '未知'}</div>
          <div>安装方案：{props.llamaPlan ? `${props.llamaPlan.accelerator} / ${props.llamaPlan.recommendedModel.name}` : '尚未生成'}</div>
          <div>服务状态：{llamaDisplay.serviceDetailValue}</div>
          <div>
            当前 GGUF：{props.llamaStatus?.modelPath
              ? props.llamaStatus.modelPath.split(/[\\/]/).pop()
              : props.llamaTest?.modelId ?? '未选择'}
          </div>
          <div>
            mmproj：{props.llamaStatus?.mmprojPath
              ? props.llamaStatus.mmprojPath.split(/[\\/]/).pop()
              : props.llamaTest?.visionOk
                ? '图像推理已验证'
                : '未加载'}
          </div>
          {props.llamaTest && (
            <div className={props.llamaTest.success ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>
              多模态验证：{props.llamaTest.success
                ? 'GGUF 文本与 mmproj 图像推理通过'
                : props.llamaTest.error?.message || '验证失败'}
            </div>
          )}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 text-[12px] font-black text-slate-800 dark:text-slate-200">已安装 GGUF 模型</div>
          <div className="space-y-2">
            {installedGguf.length ? installedGguf.map((model) => (
              <div key={model.id} className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <div className="truncate font-black text-slate-800 dark:text-slate-200">{model.name}</div>
                <div className="mt-1 truncate font-mono text-[10px]">{model.filename}</div>
              </div>
            )) : (
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">暂无已安装 GGUF 模型。</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function SettingsBlock({ icon, title, caption, children }: { icon: React.ReactNode; title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-premium dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">{icon}</div>
        <div className="min-w-0">
          <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{title}</div>
          <div className="truncate text-[10.5px] font-bold text-slate-400 dark:text-slate-500">{caption}</div>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10.5px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      {children}
    </label>
  )
}
