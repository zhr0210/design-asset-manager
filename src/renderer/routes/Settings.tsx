import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FolderOpen,
  HardDrive,
  Loader2,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2
} from 'lucide-react'
import { useSettingsStore } from '../stores/settings.store'
import DoctorPanel from '../components/settings/DoctorPanel'
import SettingsMigrationPanel from '../components/settings/SettingsMigrationPanel'

export default function Settings() {
  const { settings, updateSettings, clearCache, loadSettings } = useSettingsStore()
  const [libraryPath, setLibraryPath] = useState(settings.libraryPath)
  const [modelRootDir, setModelRootDir] = useState(settings.modelRootDir || '~/DesignAssetManager/AIModels')
  const [concurrency, setConcurrency] = useState(settings.concurrency)
  const [delayInterval, setDelayInterval] = useState(settings.delayInterval)
  const [saveOriginalUrl, setSaveOriginalUrl] = useState(settings.saveOriginalUrl)
  const [autoThumbnail, setAutoThumbnail] = useState(settings.autoThumbnail)
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    setLibraryPath(settings.libraryPath)
    setModelRootDir(settings.modelRootDir || '~/DesignAssetManager/AIModels')
    setConcurrency(settings.concurrency)
    setDelayInterval(settings.delayInterval)
    setSaveOriginalUrl(settings.saveOriginalUrl)
    setAutoThumbnail(settings.autoThumbnail)
  }, [settings])

  const handleSelectFolder = async (currentPath: string, setter: (path: string) => void) => {
    const api = (window as any).electronAPI
    if (!api?.settingsSelectFolder) return
    const result = await api.settingsSelectFolder({ defaultPath: currentPath })
    if (typeof result === 'string' && result) setter(result)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateSettings({
        libraryPath,
        modelRootDir,
        concurrency,
        delayInterval,
        saveOriginalUrl,
        autoThumbnail
      })
      setToast('系统偏好已保存')
      window.setTimeout(() => setToast(null), 2200)
    } finally {
      setSaving(false)
    }
  }

  const handleClearCache = async () => {
    setClearing(true)
    try {
      await clearCache()
      setToast('临时视觉缓存已清理')
      window.setTimeout(() => setToast(null), 2200)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 pb-10">
      {toast && (
        <div className="fixed right-8 top-20 z-50 inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 text-[12px] font-extrabold text-emerald-700 shadow-card-hover">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      )}

      <div className="w-full space-y-6 px-1">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
              <SettingsIcon className="h-3.5 w-3.5 text-brand-500" />
              Preferences
            </div>
            <h2 className="mt-3 text-[24px] font-black tracking-tight text-slate-950">系统偏好设置</h2>
            <p className="mt-1 text-[12.5px] font-semibold text-slate-500">
              管理素材存储、下载节流和本地运行目录。AI 模型、反推、后端与显存防护已集中到 AI 控制台。
            </p>
          </div>

          <Link
            to="/ai-console"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-[12px] font-black text-white shadow-card-hover transition-all hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            前往 AI 控制台
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-6">
            <section className="rounded-[24px] border border-white bg-white p-6 shadow-premium">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-900">下载与本地素材库偏好</h3>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-slate-400">这些设置影响素材入库、下载速度和本地缓存位置。</p>
                </div>
              </div>

              <div className="space-y-7">
                <Field label="本地素材库物理路径">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <FolderOpen className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input value={libraryPath} onChange={(event) => setLibraryPath(event.target.value)} className="control pl-10" required />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectFolder(libraryPath, setLibraryPath)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      浏览文件夹
                    </button>
                  </div>
                  <p className="mt-2 text-[10.5px] font-semibold text-slate-400">抓取的原图与缩略图默认存放在这里，支持多盘迁移。</p>
                </Field>

                <Field label="AI 模型与运行时存储目录">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <HardDrive className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input value={modelRootDir} onChange={(event) => setModelRootDir(event.target.value)} className="control pl-10" required />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectFolder(modelRootDir, setModelRootDir)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      选择目录
                    </button>
                  </div>
                  <p className="mt-2 text-[10.5px] font-semibold text-slate-400">
                    Qwen3-VL、GGUF、mmproj、llama.cpp 运行时与安装缓存会存放在这里。具体模型、后端和反推策略请在 AI 控制台配置。
                  </p>
                </Field>

                <SliderField
                  label="并发下载任务上限"
                  value={concurrency}
                  suffix="个并发"
                  min={1}
                  max={8}
                  step={1}
                  onChange={setConcurrency}
                  marks={['1 单图模式', '3 默认并发', '8 高速模式']}
                />

                <SliderField
                  label="请求延迟间隔"
                  value={delayInterval}
                  suffix="秒延迟"
                  min={0}
                  max={5}
                  step={0.5}
                  onChange={setDelayInterval}
                  marks={['0 秒', '1.5 秒推荐', '5 秒深度节流']}
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ToggleCard
                    title="保存原始来源 URL"
                    caption="保留素材来源页面，方便后续回溯。"
                    checked={saveOriginalUrl}
                    onChange={setSaveOriginalUrl}
                  />
                  <ToggleCard
                    title="自动生成缩略图"
                    caption="入库后自动生成本地预览图。"
                    checked={autoThumbnail}
                    onChange={setAutoThumbnail}
                  />
                </div>
              </div>
            </section>

            <DoctorPanel />
          </div>

          <section className="space-y-5">
            <div className="rounded-[24px] border border-white bg-white p-6 shadow-premium">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-slate-900">本地优先与数据隔离</h4>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
                    反推、OCR、色彩提取和模型下载均遵循本地优先原则。不要在日志或报告中暴露素材路径、私有数据或密钥。
                  </p>
                </div>
              </div>
            </div>

            <SettingsMigrationPanel />

            <div className="rounded-[24px] border border-white bg-white p-6 shadow-premium">
              <h4 className="flex items-center gap-2 text-[14px] font-black text-slate-900">
                <Trash2 className="h-4.5 w-4.5 text-rose-500" />
                临时视觉缓存清理
              </h4>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-400">
                清理运行中产生的预览和页面渲染缓存，不会删除素材库中已入库的文件。
              </p>
              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearing}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-black text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              >
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                立即清理缓存数据
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-brand-500 px-4 py-3.5 text-[13px] font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
              保存配置并应用偏好
            </button>
          </section>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-black text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function SliderField({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
  marks
}: {
  label: string
  value: number
  suffix: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  marks: string[]
}) {
  return (
    <div className="border-t border-slate-100 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-black text-slate-600">{label}</span>
        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-600">{value} {suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-500"
      />
      <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400">
        {marks.map((mark) => <span key={mark}>{mark}</span>)}
      </div>
    </div>
  )
}

function ToggleCard({
  title,
  caption,
  checked,
  onChange
}: {
  title: string
  caption: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:bg-white">
      <span>
        <span className="block text-[12.5px] font-black text-slate-800">{title}</span>
        <span className="mt-1 block text-[10.5px] font-semibold leading-5 text-slate-400">{caption}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-brand-500" />
    </label>
  )
}
