import React, { useCallback, useEffect, useRef, useState } from 'react'
import { requireWorkspaceClient } from '../../workspace-client'
import type { ManagedModelAction, ManagedModelLibrarySummary, ModelAcquisitionReview } from '../../../shared/contracts/managed-model-library.contract'
import type { GgufModelRecommendation, ModelRecommendationPreference } from '../../../shared/contracts/local-ai-resources.contract'

const states: Record<string, string> = {
  unconfigured: '尚未选择模型', inactive: '模型已卸载', checking: '正在核对制品与环境', loading: '正在加载模型',
  verifying: '正在进行真实图像验证', ready: '本次验证通过，可以分析', stopping: '正在退出，仍计入占用',
  unknown: '尚未确认退出，资源仍保留', failed: '验证未完成',
}
const errors: Record<string, string> = {
  AI_MEMORY_WAIT: '内存不足，请释放其他应用内存或调整 DAM 预留后重试。OCR 与云连接仍可独立使用。',
  LOCAL_MODEL_CHANGED: '制品或运行环境已变化，请重新导入并验证。已有版本和分析保留。',
  LOCAL_CAPABILITY_FAILED: '真实图像验证未通过，新版本没有启用。可重新加载原版本。',
  LOCAL_RUNTIME_START_FAILED: '运行未成功，请检查所选 Python 的 Torch、Transformers、Pillow 和 psutil。',
  LOCAL_MODEL_UNSUPPORTED: '当前支持 Qwen3-VL 2B/4B Instruct、CPU float32；不支持自定义仓库代码或量化配置。',
  LOCAL_MODEL_COMPANION_MISSING: '缺少权重分片、tokenizer、图像配置或聊天模板，请选择完整的制品目录。',
  LOCAL_MODEL_BYTES_REJECTED: '模型文件的结构或完整性核验未通过，没有建立可用配置。',
  MODEL_FILE_INTEGRITY_FAILED: '文件与已核对的哈希不一致。没有启用；请放弃本次临时文件后重新安装。',
  MODEL_DISK_SPACE_INSUFFICIENT: '磁盘空间不足。原版本保留，请释放空间后重试。',
  MODEL_TRUST_REVOKED: '模型信任已撤销，新的执行已停止。已有分析结果保留。',
  MODEL_SOURCE_REVOKED: '所选版本的上游来源不再允许访问，新的执行已停止。文件与已有结果保留。',
  MODEL_SOURCE_EVIDENCE_MISSING: '此版本缺少完整来源核对记录，请重新核对。已接受版本不会仅因检查时间过期而停用。',
  MODEL_SOURCE_UNAVAILABLE: '无法连接境内模型来源。文件和当前可用版本保留，请稍后重试。',
  MODEL_MIRROR_UNAVAILABLE: 'ModelScope 境内镜像暂不可用或未收录此仓库。已安装模型与文件保留，不转向 Hugging Face。',
  MODEL_MIRROR_FILE_UNAVAILABLE: '境内镜像缺少与所选版本完全同哈希的配套文件。保留旧模型和已下载字节，不下载其他版本替代。',
  MODEL_TRANSFER_FAILED: '传输未完成。临时文件已保留，可明确恢复；完整校验通过后才会入库。',
  MODEL_LIBRARY_BUSY: '已有模型操作正在进行，请等待或暂停当前操作。',
  VISUAL_ADMISSION_SUSPENDED: '应用正在切库、退出或核对工作，请完成后重新操作。',
  LOCAL_RUNTIME_BUSY: '模型正在执行或切换，请等待当前工作单元完成。',
  MODEL_REVIEW_EXPIRED: '本次确认已过期，请重新核对。',
  MODEL_TRUST_REVIEW_REQUIRED: '该版本曾撤销信任或归档，请从保留版本中明确重新信任后再验证。',
  MODEL_STAGING_UNSAFE: '本次临时文件的归属或结构不匹配，已停止并保留文件，请核对存储。',
  MODEL_NO_QUALIFIED_COMBINATION: '请先真实验证至少一个模型版本，再使用按预算自动选择。',
  MODEL_SOURCE_LICENSE_CHANGED: '上游许可发生变化，本次安装已停止；请核对新的许可。已有版本保留。',
  MODEL_SOURCE_METADATA_CHANGED: '上游文件信息与固定版本不一致，本次安装已停止。',
  MODEL_SOURCE_REDIRECT_REJECTED: '下载转向了未批准的来源，传输已停止。',
  MODEL_STORAGE_IDENTITY_LOST: '受管存储标记不匹配，已保留文件并停止操作。',
  AI_DEVICE_UNKNOWN: '显存余量、驱动或设备支持尚未确认。请重新采样，或明确选择 CPU 慢速方案。',
  AI_RESOURCE_ESTIMATE_EXCEEDED: '实际占用超出本次加载预算，已停止并保留模型文件及旧配置。请核对资源或选择其他加载方式。',
  LOCAL_RUNTIME_LOAD_TIMEOUT: '运行器未在时限内完成加载与本机连接核对，未授予资格。已安装文件保留，请核对诊断后重试。',
  LOCAL_OOM: '本地运行器报告内存或显存不足。当前执行未完成，请核对资源与已验证加载方案。',
  NATIVE_RUNTIME_PREPARATION_FAILED: '固定原生运行包尚未准备完成，模型文件保留。请核对网络与空间后重试。',
}
const taskStates: Record<string, string> = { running: '传输中', paused: '已暂停', interrupted: '应用中断，等待明确恢复',
  failed: '未完成', complete: '已核验入库，尚未自动启用', abandoned: '已放弃并清理本次临时文件' }
const ownership: Record<string, string> = { reference: '只读引用', 'managed-copy': 'DAM 受管副本', 'managed-download': 'DAM 受管下载' }
const gib = (bytes: number) => (bytes / 1024 ** 3).toFixed(2) + ' GiB'
const errorMessage = (value: unknown) => {
  const code = value instanceof Error ? value.message : String(value ?? '')
  return Object.entries(errors).find(([key]) => code.includes(key))?.[1] ?? '操作未完成，已有版本与结果保留。请核对状态后重试。'
}

export default function ManagedModelSettings() {
  const [status, setStatus] = useState<any>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [importMode, setImportMode] = useState<'reference' | 'managed-copy'>('reference')
  const [review, setReview] = useState<ModelAcquisitionReview | null>(null), [acknowledged, setAcknowledged] = useState(false)
  const [recommendations, setRecommendations] = useState<GgufModelRecommendation[]>([])
  const [preference, setPreference] = useState<ModelRecommendationPreference>('balanced')
  const initialCatalogRead = useRef(false), currentReview = useRef<string | null>(null)
  useEffect(() => { currentReview.current = review?.review ?? null }, [review])
  useEffect(() => () => { if (currentReview.current) void requireWorkspaceClient().managedModels.action({ kind: 'discard-review', review: currentReview.current }).catch(() => {}) }, [])
  const read = useCallback(async () => { setStatus(await requireWorkspaceClient().managedVision.status()) }, [])
  useEffect(() => {
    let live = true
    const refresh = () => void requireWorkspaceClient().managedVision.status().then(value => { if (live) setStatus(value) }).catch(() => {})
    refresh()
    const timer = setInterval(refresh, 2000), stop = requireWorkspaceClient().onSettingsChanged(refresh)
    return () => { live = false; clearInterval(timer); stop() }
  }, [])
  const library = status?.library as (ManagedModelLibrarySummary & { preparing: boolean }) | undefined
  useEffect(() => {
    if (!library || initialCatalogRead.current) return
    initialCatalogRead.current = true
    if (!library.catalogCheckedAt) void requireWorkspaceClient().managedModels.action({ kind: 'refresh-catalog' }).then(read).catch(() => {})
  }, [library, read])
  const act = async (action: ManagedModelAction) => {
    setBusy(true); setError('')
    try {
      const value = await requireWorkspaceClient().managedModels.action(action)
      if (action.kind === 'recommend-gguf') setRecommendations(value as GgufModelRecommendation[])
      if (['review-import', 'review-install', 'review-gguf-install', 'review-gguf-import'].includes(action.kind)) { setReview(value as ModelAcquisitionReview); setAcknowledged(false) }
      if (action.kind === 'confirm' || action.kind === 'discard-review') setReview(null)
      await read()
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('MODEL_SELECTION_CANCELLED'))) setError(errorMessage(error))
    } finally { setBusy(false) }
  }
  const stop = async () => {
    setError('')
    try { await requireWorkspaceClient().managedVision.deactivate(); await read() } catch (error) { setError(errorMessage(error)) }
  }
  const switching = busy || status?.switching || status?.computing || ['checking', 'loading', 'verifying', 'stopping', 'unknown'].includes(status?.state)
  const installed = library?.models.filter(model => !model.retired) ?? []
  const archived = library?.models.filter(model => model.retired) ?? []
  const transfers = library?.tasks.filter(task => !['complete', 'abandoned'].includes(task.state)) ?? []
  return <section className="ui-card" aria-label="本地视觉模型管理">
    <h2>本地视觉模型</h2>
    <p>从 ModelScope 境内来源安装支持组合，或导入已有完整制品。DAM 通过共享预算加载、复用与卸载；素材在本机推理。</p>
    <p role="status">{states[status?.state] ?? '正在读取状态'}{status?.configured ? ` · ${status.model}` : ''} · {status?.device ?? 'cpu'} / {status?.dtype ?? '尚未选择'}</p>
    {status?.nativePackage?.state === 'preparing' && <p role="status">正在准备固定 llama.cpp {status.nativePackage.release} 运行包 · {gib(status.nativePackage.completedBytes)} / {gib(status.nativePackage.totalBytes)}。不执行安装脚本。</p>}
    {status?.measurement && <p>进程测量：{status.measurementModel} · 工作集峰值 {gib(status.measurement.peakRamBytes)} · {status.measurement.threads} 个计算线程。{status.loadMs != null ? `加载 ${(status.loadMs / 1000).toFixed(1)} 秒。` : ''}{status.unloadMs != null ? `实际退出 ${(status.unloadMs / 1000).toFixed(1)} 秒。` : ''}</p>}
    <div className="ui-button-row">
      <button className="ui-button ui-button-secondary" disabled={!status?.configured || ['inactive', 'unconfigured'].includes(status?.state)} onClick={() => void stop()}>停用并释放</button>
      <button className="ui-button ui-button-secondary" onClick={() => void read().catch(error => setError(errorMessage(error)))}>重新读取模型状态</button>
    </div>
    {(error || status?.error) && <p role="alert">{error || errorMessage(status.error)}
      {typeof status?.error === 'string' && /^(LOCAL|MODEL|NATIVE|AI|VISUAL)_[A-Z_0-9]+$/.test(status.error) && <span> · 错误码 {status.error}</span>}
    </p>}
    <h3>境内模型镜像与支持组合</h3>
    <p>{library?.sourceNotice}</p>
    <div className="ui-button-row"><button className="ui-button ui-button-secondary" disabled={busy || library?.catalogRefreshing}
      onClick={() => void act({ kind: 'refresh-catalog' })}>{library?.catalogRefreshing ? '正在获取境内模型目录' : '刷新境内模型目录'}</button>
      {library?.catalogCheckedAt && <span>最近获取 {new Date(library.catalogCheckedAt).toLocaleString()}</span>}</div>
    {library?.catalogError && <p role="alert">{errorMessage(library.catalogError)}</p>}
    <section aria-label="按设备推荐量化模型">
      <h3>按设备余量选择量化模型</h3>
      <label>模型推荐偏好 <select aria-label="模型推荐偏好" value={preference} onChange={event => setPreference(event.target.value as ModelRecommendationPreference)}>
        <option value="balanced">平衡</option><option value="efficient">省资源</option><option value="quality">较高质量候选</option>
      </select></label>
      <button className="ui-button ui-button-secondary" disabled={busy || library?.catalogRefreshing}
        onClick={() => void act({ kind: 'recommend-gguf', preference })}>重新采样并推荐</button>
      <p>推荐计入完整权重、视觉投影、上下文与工作区、加载/传输及其他应用余量。预计适合与实际验证分开，执行前会重新核对；不会自动安装或更换量化精度。</p>
      {recommendations.slice(0, 8).map(model => <article className="ui-card" key={model.bundleId}>
        <strong>{model.model}{model.recommended ? ' · 当前推荐' : ''}</strong><p>{model.sourceKind === 'official' ? 'Qwen 官方' : 'Unsloth 社区'}</p>
        {model.plans.map(value => <p key={value.plan.identity}>{value.plan.mode === 'gpu' ? '完整 GPU' : value.plan.mode === 'hybrid' ? '混合加载' : 'CPU 慢速'}
          {value.plan.deviceIndex != null ? ` · GPU ${value.plan.deviceIndex}` : ''} · RAM 预计 {gib(value.plan.cost.ramBytes)}
          {Object.values(value.plan.cost.gpuBytes).length > 0 ? ` · 显存预计 ${gib(Object.values(value.plan.cost.gpuBytes)[0])}` : ''}。{value.reason}</p>)}
        <button className="ui-button ui-button-secondary" disabled={busy || !!review} onClick={() => void act({ kind: 'review-gguf-install', bundleId: model.bundleId })}>核对并安装推荐组合</button>
      </article>)}
    </section>
    <div className="ui-grid">
      {library?.catalog.map(model => <article key={model.id} className="ui-card" aria-label={model.model + ' 安装组合'}>
        <strong>{model.model}</strong>
        <p>{gib(model.bytes)} 磁盘 · 加载预算 {gib(model.loadRamBytes)} · {model.license}</p>
        <details><summary>来源与版本</summary><p>{model.repository} · 提交 {model.revision}</p><p>HTTPS 复核上游身份、逐文件长度与 SHA-256，支持断点传输；完整核验后才能入库。模型代码不会执行。</p></details>
        <button className="ui-button ui-button-secondary" disabled={busy || !!review || model.installed || transfers.some(task => task.state === 'running')}
          onClick={() => void act({ kind: 'review-install', modelId: model.id })}>{model.installed ? '此版本已安装' : '核对并安装 ' + model.model}</button>
      </article>)}
    </div>
    <details aria-label="全部相关境内模型"><summary>全部相关模型与下载文件 · {library?.discovery.length ?? 0} 个仓库</summary>
      <p>后端按 DAM 已登记的视觉、标签、描述、OCR 和图文向量模型范围查询上游；显示本次实际找到的文件。体积合计包含仓库不同格式与量化版本，并非一次安装大小。GGUF 权重需要匹配的视觉投影；Python/pickle 等仓库代码不会由 DAM 执行。RapidOCR 当前使用已安装运行包自带的模型，其生命周期在下方 OCR 管理。</p>
      {library?.discovery.map(model => <article key={model.id} className="ui-card" aria-label={model.model + ' 上游目录'}>
        <strong>{model.model} · {model.family}</strong><p>{model.sourceKind === 'community' ? '社区来源' : '发布方来源'} · {model.repository} · {model.license ?? '上游未提供可识别许可'} · {model.bytes == null ? '体积未取得' : gib(model.bytes) + '（全部文件合计）'}</p>
        <p>{model.supportNotice}</p>
        {!!model.bundles?.length && <details><summary>完整量化组合 · {model.bundles.length} 个选择</summary>
          <p>每个组合只包含一种语言量化的完整权重与同仓库视觉投影。容量为本组合下载量，目录完整不代表真实运行已验证。</p>
          {model.bundles.map(bundle => <section key={bundle.id} aria-label={`Qwen3-VL ${bundle.size} ${bundle.languageQuantization} 组合`}>
            <strong>{bundle.languageQuantization} · 视觉 {bundle.projectorQuantization}</strong>
            <p>{gib(bundle.bytes)} · {bundle.files.length} 个配套文件 · {bundle.support === 'managed-gguf' ? '支持安装，仍需实际验证' : '目录候选，运行路径尚未接通'}</p>
            <ul>{bundle.files.map(file => <li key={file.name}>{file.downloadUrl?<a href={file.downloadUrl} target="_blank" rel="noreferrer">{file.name}</a>:<span>{file.name} · 请刷新境内目录核对下载链接</span>} · {gib(file.bytes)}</li>)}</ul>
            {bundle.variant === 'Instruct' && ['2B', '4B', '8B'].includes(bundle.size) && <div className="ui-button-row">
              <button className="ui-button ui-button-secondary" disabled={busy || !!review || transfers.some(task => task.state === 'running')}
                onClick={() => void act({ kind: 'review-gguf-install', bundleId: bundle.id })}>核对并安装此组合</button>
              <button className="ui-button ui-button-ghost" disabled={busy || !!review}
                onClick={() => void act({ kind: 'review-gguf-import', bundleId: bundle.id, ownership: importMode })}>导入此组合的已有文件</button>
            </div>}
          </section>)}
        </details>}
        {model.state !== 'available' && <p role="status">{model.state === 'restricted' ? '此仓库需要上游访问授权；DAM 不获取账号秘密。' : '本次未能获取该仓库；可稍后刷新，其它模型仍可使用。'}</p>}
        {model.error && model.state === 'available' && <p role="alert">{errorMessage(model.error)}</p>}
        {model.files.length > 0 && <details><summary>固定提交 {model.revision} · {model.files.length} 个文件</summary>
          <ul>{model.files.map(file => <li key={file.name}>{file.downloadUrl?<a href={file.downloadUrl} target="_blank" rel="noreferrer">{file.name}</a>:<span>{file.name} · 境内镜像链接尚未核对</span>} · {gib(file.bytes)}{file.sha256 ? ` · SHA-256 ${file.sha256}` : ' · 完整摘要尚未取得'}</li>)}</ul>
        </details>}
      </article>)}
    </details>
    <details>
      <summary>导入已有模型（高级）</summary>
      <p>请选择完整的 Qwen3-VL 2B/4B Instruct 数据制品和已安装的可信 Python。GPU、其他精度与自定义模型代码尚不支持。</p>
      <label>模型所有权<select aria-label="导入模型所有权" value={importMode} onChange={event => setImportMode(event.target.value as typeof importMode)}>
        <option value="reference">只读引用，保留源目录权威</option><option value="managed-copy">复制导入，DAM 管理副本</option>
      </select></label>
      <button className="ui-button ui-button-secondary" disabled={busy || !!review} onClick={() => void act({ kind: 'review-import', ownership: importMode })}>导入已有本地模型</button>
    </details>
    {library?.preparing && <p role="status">正在核对模型与环境。<button className="ui-button ui-button-ghost" onClick={() => void requireWorkspaceClient().managedModels.action({ kind: 'cancel-preparation' })}>取消核对</button></p>}
    {review && <section aria-label="确认模型制品" className="ui-card">
      <h3>确认{review.ownership === 'managed-download' ? '安装' : '导入'} {review.model}</h3>
      <p>{ownership[review.ownership]} · {review.license} · {review.source === 'huggingface-upstream' ? `${review.repository?.startsWith('Qwen/') ? 'Qwen 官方' : '社区来源'} · ${review.repository} · ModelScope 境内下载，逐文件固定与完整哈希核验` : '用户选择的本地制品'}</p>
      <p>制品 {gib(review.bytes)} · 新增磁盘 {gib(review.additionalBytes)} · 当前可用 {gib(review.freeDiskBytes)}</p>
      <p>{review.notice}</p>
      <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />我已核对许可、来源和存储方式</label>
      <div className="ui-button-row"><button className="ui-button ui-button-primary" disabled={busy || !acknowledged}
        onClick={() => void act({ kind: 'confirm', review: review.review, decision: 'import-reviewed-model' })}>{review.ownership === 'managed-download' ? '确认安装' : '确认导入'}</button>
        <button className="ui-button ui-button-secondary" disabled={busy} onClick={() => void act({ kind: 'discard-review', review: review.review })}>取消</button></div>
    </section>}
    {transfers.length > 0 && <section aria-label="模型传输与恢复"><h3>模型传输</h3>{transfers.map(task => <article key={task.id} className="ui-card" aria-label={task.model + ' 传输'}>
      <strong>{task.model} · {taskStates[task.state]}</strong>
      <progress aria-label={task.model + ' 传输进度'} value={task.completedBytes} max={task.totalBytes} />
      <p>{gib(task.completedBytes)} / {gib(task.totalBytes)}。离开页面仍继续；暂停或重启保留已收到的字节。</p>
      {task.error && <p role="alert">{errorMessage(task.error)}</p>}
      <div className="ui-button-row">{task.state === 'running' ? <button className="ui-button ui-button-secondary" onClick={() => void act({ kind: 'pause', taskId: task.id })}>暂停传输</button> : <>
        <button className="ui-button ui-button-primary" disabled={busy} onClick={() => void act({ kind: 'resume', taskId: task.id })}>恢复传输并重新核验</button>
        <button className="ui-button ui-button-secondary" disabled={busy} onClick={() => void act({ kind: 'abandon', taskId: task.id })}>放弃本次临时文件</button></>}</div>
    </article>)}</section>}
    <section aria-label="已导入模型"><h3>已核验的模型版本</h3>
      <p>可手动选择版本，或按当前内存预算选择已真实验证的组合。优先复用已加载模型以减少切换；大型配置不保证每张素材都更准确。</p>
      <div className="ui-button-row"><button className="ui-button ui-button-secondary" disabled={switching} onClick={() => void act({ kind: 'auto-select', preference: 'efficient' })}>按当前预算自动选择 · 省资源</button>
        <button className="ui-button ui-button-secondary" disabled={switching} onClick={() => void act({ kind: 'auto-select', preference: 'quality' })}>按当前预算自动选择 · 优先较大配置</button></div>
      {!installed.length && <p>安装或导入后会出现在这里。每个版本在本次加载通过真实图像验证后才可用于分析。</p>}
      {installed.map(model => <article key={model.id} className="ui-card" aria-label={model.model + ' 已导入版本'}>
        <strong>{model.model}{model.active ? ' · 当前选择' : ''}</strong><p>制品格式 {model.format === 'gguf' ? 'GGUF' : 'Transformers'}</p>
        <p>{ownership[model.ownership]} · {gib(model.bytes)} · {model.trust === 'accepted' ? '来源已接受' : '信任已撤销'}</p>
        {model.sourceBlock && <p role="alert">此版本已停止新执行：{errorMessage(model.sourceBlock)} 请明确核对上游来源；成功复核不自动恢复模型资格。</p>}
        {model.source === 'huggingface-upstream' && <p>上游检查：{model.sourceFreshness?.checkedAt != null ? new Date(model.sourceFreshness.checkedAt).toLocaleString() : '时间未知'} · {model.sourceFreshness?.kind === 'fresh' ? '近期已核对' : model.sourceFreshness?.kind === 'stale' ? '检查信息已过期，本地资格保留' : '检查新鲜度未知'}。离线无法获知新的上游状态；加载仍核验文件与环境。</p>}
        {model.sourceFreshness?.error && <p role="status">最近上游核对未完成：{errorMessage(model.sourceFreshness.error)} 已接受的本地来源绑定保留。</p>}
        <p>{model.qualifiedAt ? `上次真实验证：${new Date(model.qualifiedAt).toLocaleString()}；重新加载仍会复核。` : '尚需真实验证，文件入库不会自动执行素材分析。'}</p>
        <details><summary>制品与运行绑定</summary><p>{model.revision ? '上游提交 ' + model.revision : '用户导入'} · 指纹 {model.fingerprint}</p><p>{model.license}</p></details>
        <div className="ui-button-row">{model.trust === 'accepted' ? <>
          {model.format === 'gguf' ? <>
            <button className="ui-button ui-button-primary" disabled={switching} onClick={() => void act({ kind: 'activate-gguf', modelEntryId: model.id, mode: 'gpu' })}>验证并使用 · 完整 GPU</button>
            <button className="ui-button ui-button-secondary" disabled={switching} onClick={() => void act({ kind: 'activate-gguf', modelEntryId: model.id, mode: 'hybrid' })}>验证并使用 · 混合慢速</button>
            <button className="ui-button ui-button-secondary" disabled={switching} onClick={() => void act({ kind: 'activate-gguf', modelEntryId: model.id, mode: 'cpu' })}>验证并使用 · CPU 慢速</button>
            <p>首次验证会准备固定受管运行包：CPU 约 19 MB；GPU/混合约 577 MB，含单独 NVIDIA CUDA 许可的 DLL。新方案完成真实图像验证后才启用。</p>
          </> : <button className="ui-button ui-button-primary" disabled={switching || model.active && status?.state === 'ready'} onClick={() => void act({ kind: 'activate', modelEntryId: model.id })}>验证并使用 {model.model}</button>}
          <button className="ui-button ui-button-secondary" disabled={busy} onClick={() => void act({ kind: 'revoke', modelEntryId: model.id })}>撤销此版本信任</button>
          {model.source === 'huggingface-upstream' && <button className="ui-button ui-button-secondary" disabled={busy || library?.preparing} onClick={() => void act({ kind: 'refresh-source', modelEntryId: model.id })}>核对上游来源</button>}
        </> : <button className="ui-button ui-button-secondary" disabled={busy} onClick={() => void act({ kind: 'restore', modelEntryId: model.id })}>重新信任此版本（仍需验证）</button>}
          <button className="ui-button ui-button-ghost" disabled={busy} onClick={() => void act({ kind: 'retire', modelEntryId: model.id })}>归档保留版本</button>
        </div>
      </article>)}
    </section>
    {archived.length > 0 && <details><summary>保留的归档版本 · {archived.length}</summary>{archived.map(model => <article key={model.id}>
      <p>{model.model} · {ownership[model.ownership]} · 文件保留；已有素材结果不受影响。</p>
      <button className="ui-button ui-button-secondary" disabled={busy} onClick={() => void act({ kind: 'restore', modelEntryId: model.id })}>恢复保留版本并重新信任</button>
    </article>)}</details>}
  </section>
}
