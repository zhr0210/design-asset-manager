import { getWorkspaceClient } from '../workspace-client'
import {appPath} from '../../shared/workflows/app-navigation.workflow'
import React, { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderOpen, HardDrive, Moon, Sun, Save, Sparkles, ShieldCheck, Compass, Keyboard } from 'lucide-react'
import { useSettingsStore } from '../stores/settings.store'
import { useUIStore } from '../stores/ui.store'
import { Button, Notice, PageHeader } from '../components/ui/WorkspacePrimitives'
import { useTransientWorkspaceEdit } from '../workspace-edit-guards'
import type { AppSettings } from '../../shared/types/settings.types'
import type { SettingsExpected } from '../../shared/contracts/settings.contract'
import { workspaceMutationErrorMessage } from '../../shared/client/workspace-connection-error'

const sections = [
  { id: 'appearance', label: '外观与操作', Icon: Sun },
  { id: 'library', label: '资料库', Icon: HardDrive },
  { id: 'ai', label: 'AI 与模型', Icon: Sparkles },
  { id: 'capture', label: '采集与下载', Icon: Compass },
  { id: 'shortcuts', label: '快捷键', Icon: Keyboard },
  { id: 'advanced', label: '高级维护', Icon: ShieldCheck }
] as const

export default function Settings() {
  const { settings, updateSettings, loadSettings } = useSettingsStore()
  const { theme, toggleTheme } = useUIStore()
  const [params, setParams] = useSearchParams()
  const section = sections.some(item => item.id === params.get('section')) ? params.get('section')! : 'appearance'
  const [query, setQuery] = useState('')
  const [libraryPath, setLibraryPath] = useState(settings.libraryPath)
  const [modelRootDir, setModelRootDir] = useState(settings.modelRootDir || '~/DesignAssetManager/AIModels')
  const [concurrency, setConcurrency] = useState(settings.concurrency)
  const [delayInterval, setDelayInterval] = useState(settings.delayInterval)
  const [saveOriginalUrl, setSaveOriginalUrl] = useState(settings.saveOriginalUrl)
  const [autoThumbnail, setAutoThumbnail] = useState(settings.autoThumbnail)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)
  const baseline = useRef(settings)
  useEffect(() => { void loadSettings() }, [])
  useEffect(() => {
    const old = baseline.current
    const rebase = <K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings[K] => {
      if (value !== old[key]) return value
      baseline.current = { ...baseline.current, [key]: settings[key] }
      return settings[key]
    }
    setLibraryPath(value => rebase('libraryPath', value))
    setModelRootDir(value => rebase('modelRootDir', value) || '~/DesignAssetManager/AIModels')
    setConcurrency(value => rebase('concurrency', value))
    setDelayInterval(value => rebase('delayInterval', value))
    setSaveOriginalUrl(value => rebase('saveOriginalUrl', value))
    setAutoThumbnail(value => rebase('autoThumbnail', value))
  }, [settings])
  const dirty = libraryPath !== settings.libraryPath || modelRootDir !== (settings.modelRootDir || '~/DesignAssetManager/AIModels') || concurrency !== settings.concurrency || delayInterval !== settings.delayInterval || saveOriginalUrl !== settings.saveOriginalUrl || autoThumbnail !== settings.autoThumbnail
  const editedValues = { libraryPath, modelRootDir, concurrency, delayInterval, saveOriginalUrl, autoThumbnail }
  const conflicting = (Object.keys(editedValues) as Array<keyof typeof editedValues>).filter(key => editedValues[key] !== baseline.current[key] && settings[key] !== baseline.current[key])
  useTransientWorkspaceEdit(dirty)
  const selectFolder = async (value: string, setValue: (value: string) => void) => {
    try {
      const api = getWorkspaceClient()
      if (!api?.settingsSelectFolder) { setFeedback({ error: true, text: '当前环境无法打开文件夹选择器。' }); return }
      const result = await api.settingsSelectFolder({ defaultPath: value })
      const selectedPath = typeof result === 'string' ? result : result?.canceled === false && typeof result.path === 'string' ? result.path : ''
      if (selectedPath) setValue(selectedPath)
    } catch { setFeedback({ error: true, text: '未能选择文件夹，请重试。' }) }
  }
  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return
    if (conflicting.length > 0) { setFeedback({ error: true, text: '偏好已在另一界面变化，输入仍保留。请核对当前已保存偏好，再明确采用新基准。' }); return }
    setSaving(true); setFeedback(null)
    const values = { libraryPath, modelRootDir, concurrency, delayInterval, saveOriginalUrl, autoThumbnail }
    const patch: Partial<AppSettings> = {}, expected: SettingsExpected = {}
    for (const key of Object.keys(values) as Array<keyof typeof values>) {
      if (values[key] !== baseline.current[key]) {
        Object.assign(patch, { [key]: values[key] }); Object.assign(expected, { [key]: baseline.current[key] ?? null })
      }
    }
    try { await updateSettings(patch, expected); baseline.current = useSettingsStore.getState().settings; setFeedback({ error: false, text: '偏好已保存。' }) }
    catch (error) { setFeedback({ error: true, text: workspaceMutationErrorMessage(error, '偏好未保存，输入仍保留。设置可能已在另一界面变化，请重新核对后保存。') }); await loadSettings() }
    finally { setSaving(false) }
  }
  return <div className="ui-page ui-tool-page preferences-page structured-preferences">
    <PageHeader eyebrow="PREFERENCES" title="设置" description="按工作方式组织偏好，清楚知道每一项影响哪里。" actions={<Link className="ui-button ui-button-secondary" to="/library">返回素材工作区</Link>} />
    {feedback && <Notice tone={feedback.error ? 'danger' : 'positive'}>{feedback.text}</Notice>}
    {conflicting.length > 0 && <Notice><p>另一界面已保存新的偏好，当前输入仍保留。</p><details><summary>核对当前已保存偏好</summary>{conflicting.map(key => <p key={key}>{({ libraryPath: '素材存储路径偏好', modelRootDir: '模型根目录偏好', concurrency: '并发任务上限', delayInterval: '请求间隔', saveOriginalUrl: '保留原始来源 URL', autoThumbnail: '自动生成缩略图' })[key]}：{String(settings[key] ?? '未设置')}</p>)}</details><Button disabled={saving} onClick={() => { baseline.current = settings; setFeedback({ error: false, text: '已采用当前偏好为保存基准。页面输入仍待保存。' }) }}>核对后采用当前偏好为基准</Button></Notice>}
    <div className="preferences-layout"><nav aria-label="设置分类" onKeyDown={event => {
      if ((event.target as HTMLElement).tagName === 'INPUT' || !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const visible = sections.filter(item => item.label.includes(query))
      if (!visible.length) return
      const current = visible.findIndex(item => item.id === section)
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + visible.length) % visible.length
      setParams({ section: visible[index].id }, { replace: true })
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[index]?.focus()
    }}><input className="ui-input" aria-label="搜索设置分类" placeholder="搜索设置" value={query} onChange={event => setQuery(event.target.value)} />
      {sections.filter(item => item.label.includes(query)).map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setParams({ section: id }, { replace: true })}><Icon size={17} />{label}</button>)}
      {query && !sections.some(item => item.label.includes(query)) && <p className="ui-meta">没有匹配的分类</p>}
    </nav><main className="preferences-content">
      <section hidden={section !== 'appearance'} className="ui-card"><h2>外观与操作</h2><p className="ui-meta">应用外观即时生效，查看模式从素材工作区底部切换。</p><div className="appearance-options">{(['light', 'dark'] as const).map(value => <button type="button" key={value} className="appearance-choice" aria-label={value === 'light' ? '浅色外观' : '深色外观'} aria-pressed={theme === value} onClick={() => { if (theme !== value) toggleTheme() }}><span className={`appearance-miniature ${value}`}><span /><span><i /><i /><i /></span></span><span className="appearance-choice-label">{value === 'light' ? <Sun size={16} /> : <Moon size={16} />}{value === 'light' ? '浅色' : '深色'}</span></button>)}</div><p className="ui-meta">模式切换采用玻璃过渡。开启系统“减少动态效果”后改用短淡入淡出；减少透明度或增强对比度时使用更实的背景。</p></section>
      <form id="workspace-preferences" onSubmit={handleSave}>
        <section hidden={section !== 'library'} className="ui-card"><h2>资料库</h2><Notice>这里保存默认路径偏好，不切换当前资料库或迁移文件。</Notice><div className="ui-actions"><Link className="ui-button ui-button-secondary" to="/library">打开与管理资料库</Link><Link className="ui-button ui-button-secondary" to="/connected-libraries">Eagle 连接库</Link><Link className="ui-button ui-button-secondary" to="/legacy-library">找回旧素材</Link></div><label className="ui-field"><span>素材存储路径偏好</span><span className="ui-actions"><input className="ui-input flex-1 min-w-0" aria-label="素材存储路径偏好" value={libraryPath} onChange={event => setLibraryPath(event.target.value)} required /><Button onClick={() => selectFolder(libraryPath, setLibraryPath)}><FolderOpen />浏览文件夹</Button></span></label></section>

        <section hidden={section !== 'capture'} className="ui-card"><h2>采集与下载</h2><p className="ui-meta">下载任务由任务中心管理。以下是保留的旧采集偏好，不控制当前受管下载或素材复制流程。</p><label className="ui-field"><span className="preference-row"><span>并发任务上限</span><output>{concurrency} 个</output></span><input disabled aria-label="并发任务上限" type="range" min="1" max="8" step="1" value={concurrency} onChange={event => setConcurrency(Number(event.target.value))} /></label><label className="ui-field"><span className="preference-row"><span>请求间隔</span><output>{delayInterval} 秒</output></span><input disabled aria-label="请求间隔" type="range" min="0" max="5" step="0.5" value={delayInterval} onChange={event => setDelayInterval(Number(event.target.value))} /></label><label className="preference-row">保留原始来源 URL<input className="ui-switch" type="checkbox" disabled role="switch" checked={saveOriginalUrl} onChange={event => setSaveOriginalUrl(event.target.checked)} /></label><label className="preference-row">自动生成缩略图<input className="ui-switch" type="checkbox" disabled role="switch" checked={autoThumbnail} onChange={event => setAutoThumbnail(event.target.checked)} /></label></section>
      </form>
      <section hidden={section!=='ai'} className="ui-card"><h2>AI 与模型</h2><p>连接与账号在统一页面管理，配置不会发送素材。</p><Link className="ui-button ui-button-secondary" to={appPath('ai-console')}>管理 AI 连接与账号</Link></section>
      <section hidden={section !== 'shortcuts'} className="ui-card"><h2>快捷键</h2>{[['搜索素材', '⌘ F / Ctrl F'], ['快速查看', '空格'], ['关闭当前浮层', 'Esc'], ['切换查看模式', '在底部模式条使用左右方向键']].map(([label, shortcut]) => <div className="preference-row" key={label}><span>{label}</span><kbd>{shortcut}</kbd></div>)}</section>
      {section === 'advanced' && <section><Notice>维护操作会先检查目标与范围。配置外部模型服务不会授权上传素材。</Notice><Link className="ui-button ui-button-secondary" to="/about">帮助与当前构建</Link><Link className="ui-button ui-button-secondary" to={appPath('ai-diagnostics')}>查看现行诊断</Link></section>}
    </main></div>
    <footer className="preferences-savebar"><span role="status">{saving ? '正在保存…' : dirty ? '有尚未保存的偏好更改' : '路径偏好已同步'}</span><Button type="submit" form="workspace-preferences" variant="primary" disabled={!dirty || saving || conflicting.length > 0}><Save />{saving ? '保存中…' : '保存偏好'}</Button></footer>
  </div>
}
