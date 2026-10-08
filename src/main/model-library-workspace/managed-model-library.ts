import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { ManagedModelLibrarySummary, ManagedVisionModelId, ModelAcquisitionReview,
  ModelAcquisitionTask, ModelOwnership, HuggingFaceDiscoveryEntry } from '../../shared/contracts/managed-model-library.contract'
import { inspectVisionModel, VISION_MODEL_PROFILES, type VisionModelArtifact } from '../model-library/vision-model-artifact'
import { bindVisionEnvironment, nativeVisionFingerprint, type ManagedVisionConfiguration } from '../model-library/vision-model-binding'
import { inspectGgufModel, bindGgufArtifact } from '../model-library/gguf-model-artifact'
import { modelSourceBinding, validateUpstreamReleasePolicy, UPSTREAM_MODEL_RELEASES, verifyUpstreamRelease,
  type PublicModelFetch, type UpstreamModelRelease } from './huggingface-model-source'
import { discoverHuggingFaceModels, HF_MODEL_SCOPE } from './huggingface-model-discovery'
import { assembleGgufBundles } from './huggingface-gguf-bundles'
import { assertChinaModelUrl } from './china-model-mirror'
import { transferModelFile } from './model-file-transfer'
import { recommendGgufBundles } from '../local-ai-resources/gguf-load-plan'
import type { VisualAdmission } from '../visual-ai/visual-admission'
import type { ModelRecommendationPreference } from '../../shared/contracts/local-ai-resources.contract'

interface ModelRecord {
  id: string; configuration: ManagedVisionConfiguration; artifact: VisionModelArtifact; ownership: ModelOwnership;
  release: UpstreamModelRelease | null; sourceCheckedAt: number | null; sourceBinding: string | null;
  trusted: boolean; retired: boolean; qualifiedAt: string | null
  sourceRefreshError?: string | null
  sourceBlock?: string | null
  validatedPlans?: Array<{ configuration: ManagedVisionConfiguration; qualifiedAt: string }>
}
interface Review {
  expires: number; ownership: ModelOwnership; artifact?: VisionModelArtifact; python?: string;
  release?: UpstreamModelRelease; configuration?: Omit<ManagedVisionConfiguration, 'enabled'>;
  sourceCheckedAt?: number; sourceBinding?: string
}
interface TransferRecord {
  id: string; review: Review; modelEntryId: string; state: ModelAcquisitionTask['state']; completedBytes: number;
  error: string | null; artifact?: VisionModelArtifact
}
const STORE_MARKER = '.dam-model-store'
const TRUST_WINDOW = 24 * 60 * 60 * 1000
const HEADROOM = 256 * 1024 ** 2

/** One Host-owned inventory for runtime selection and UI. Installation never activates a model. */
export function createManagedModelLibrary(d: {
  database: Database.Database; root: string; runner: string; fetch: PublicModelFetch;
  selectModel(): Promise<string | null>; selectPython(): Promise<string | null>;
  reserve(id: string, signal: AbortSignal): { release(): void }; changed(): void;
  admission?: VisualAdmission;
}) {
  d.database.exec(`
    CREATE TABLE IF NOT EXISTS managed_model_store(singleton INTEGER PRIMARY KEY CHECK(singleton=1),identity TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS managed_model_entries(id TEXT PRIMARY KEY,record TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS managed_model_transfers(id TEXT PRIMARY KEY,record TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS managed_model_catalog(id TEXT PRIMARY KEY,record TEXT NOT NULL,release TEXT);
  `)
  const reviews = new Map<string, Review>()
  const running = new Map<string, { abort: AbortController; done: Promise<void> }>()
  let preparing = false, preparationAbort: AbortController | undefined, draining = false
  let preparationDone: Promise<unknown> | undefined, catalogDone: Promise<void> | undefined, catalogAbort: AbortController | undefined
  let catalogError: string | null = null
  const catalogRows = () => d.database.prepare('SELECT id,record,release FROM managed_model_catalog').all() as
    Array<{ id: string; record: string; release: string | null }>
  const discoveries = () => catalogRows().map(row => {
    const entry = JSON.parse(row.record) as HuggingFaceDiscoveryEntry
    entry.files=entry.files.map(file=>{
      let url:string|null=null
      if(file.downloadUrl)try{assertChinaModelUrl(file.downloadUrl);url=file.downloadUrl}catch{}
      return {...file,downloadUrl:url}
    })
    if (!entry.repository.endsWith('-GGUF') || entry.state !== 'available') return entry
    const bundles = assembleGgufBundles(entry), supported = bundles.some(bundle=>bundle.support==='managed-gguf')
    return { ...entry,bundles,...(supported ? { support: 'managed-vision' as const,
      supportNotice: 'Windows x64 受管 GGUF 运行路径已接通；CPU、GPU、混合方式与每个具体组合仍需真实图像验证。' } : {}) }
  })
  const releases = () => UPSTREAM_MODEL_RELEASES.map(seed => {
    const row = catalogRows().find(row => row.id === seed.id)
    if (!row) return seed
    if (!row.release) return null
    const release = JSON.parse(row.release) as UpstreamModelRelease
    validateUpstreamReleasePolicy(release); return release
  }).filter((value): value is UpstreamModelRelease => value !== null)
  const entryPattern = /^model-entry:[a-f0-9-]{36}$/
  const transferPattern = /^model-transfer:[a-f0-9-]{36}$/
  const validateRecord = (record: ModelRecord) => {
    if (!entryPattern.test(record.id) || record.configuration.entryId !== record.id ||
      !path.isAbsolute(record.configuration.root) || (!record.artifact.gguf &&
        (!record.configuration.python || !path.isAbsolute(record.configuration.python))) ||
      !/^[a-f0-9]{64}$/.test(record.configuration.fingerprint) || !Object.hasOwn(VISION_MODEL_PROFILES, record.artifact.modelId))
      throw Error('MODEL_STORAGE_RECORD_INVALID')
    if (record.release) validateUpstreamReleasePolicy(record.release)
    return record
  }
  const validateTask = (record: TransferRecord) => {
    const files = record.review?.artifact?.files ?? record.review?.release?.files
    if (!transferPattern.test(record.id) || !entryPattern.test(record.modelEntryId) || !files || files.length > 257 || !files.length ||
      files.some(file => file.name.length > 240 || file.name.split('/').some(part => !/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..') ||
        !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || !/^[a-f0-9]{64}$/.test(file.sha256)))
      throw Error('MODEL_STORAGE_RECORD_INVALID')
    if (record.review.release) validateUpstreamReleasePolicy(record.review.release)
    return record
  }
  const read = (id: string): ModelRecord => {
    const row = d.database.prepare('SELECT record FROM managed_model_entries WHERE id=?').get(id) as { record: string } | undefined
    if (!row) throw Error('MODEL_ENTRY_NOT_FOUND')
    return validateRecord(JSON.parse(row.record))
  }
  const save = (record: ModelRecord) => d.database.prepare('INSERT INTO managed_model_entries VALUES(?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record')
    .run(record.id, JSON.stringify(record))
  const models = () => (d.database.prepare('SELECT record FROM managed_model_entries').all() as Array<{ record: string }>).map(row => validateRecord(JSON.parse(row.record)))
  const transfers = () => (d.database.prepare('SELECT record FROM managed_model_transfers').all() as Array<{ record: string }>).map(row => validateTask(JSON.parse(row.record)))
  const saveTask = (record: TransferRecord) => d.database.prepare('INSERT INTO managed_model_transfers VALUES(?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record')
    .run(record.id, JSON.stringify(record))
  const task = (id: string) => {
    const record = transfers().find(value => value.id === id)
    if (!record) throw Error('MODEL_TASK_NOT_FOUND')
    return record
  }
  for (const record of transfers()) if (record.state === 'running') { record.state = 'interrupted'; saveTask(record) }
  const root = path.resolve(d.root)
  const contained = (file: string) => {
    const relative = path.relative(root, path.resolve(file))
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('MODEL_STAGING_UNSAFE')
    return path.resolve(file)
  }
  async function ensureStore() {
    const stored = d.database.prepare('SELECT identity FROM managed_model_store WHERE singleton=1').get() as { identity: string } | undefined
    if (!stored) {
      const identity = `dam-model-store:${randomUUID()}`
      // An existing unregistered directory cannot be adopted, overwritten, or cleaned.
      await fs.mkdir(root, { mode: 0o700 })
      await fs.writeFile(path.join(root, STORE_MARKER), identity, { flag: 'wx', mode: 0o600 })
      d.database.prepare('INSERT INTO managed_model_store VALUES(1,?)').run(identity)
    }
    const identity = (d.database.prepare('SELECT identity FROM managed_model_store WHERE singleton=1').get() as { identity: string }).identity
    const stat = await fs.lstat(root), marker = await fs.lstat(path.join(root, STORE_MARKER))
    if (!stat.isDirectory() || stat.isSymbolicLink() || !marker.isFile() || marker.isSymbolicLink() || marker.size > 256 ||
      await fs.readFile(path.join(root, STORE_MARKER), 'utf8') !== identity) throw Error('MODEL_STORAGE_IDENTITY_LOST')
    for (const name of ['staging', 'artifacts']) {
      const directory = contained(path.join(root, name))
      await fs.mkdir(directory, { recursive: true, mode: 0o700 })
      const entry = await fs.lstat(directory)
      if (!entry.isDirectory() || entry.isSymbolicLink()) throw Error('MODEL_STAGING_UNSAFE')
    }
    return identity
  }
  async function diskBudget(additionalBytes: number) {
    const stat = await fs.statfs(path.dirname(root)), freeDiskBytes = stat.bavail * stat.bsize
    if (!Number.isSafeInteger(freeDiskBytes) || freeDiskBytes < additionalBytes + HEADROOM) throw Error('MODEL_DISK_SPACE_INSUFFICIENT')
    return freeDiskBytes
  }
  async function withPreparation<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (draining || preparing) throw Error('MODEL_LIBRARY_BUSY')
    preparing = true; preparationAbort = new AbortController()
    const signal = preparationAbort.signal
    const done = (async () => {
      let permit: { release(): void } | undefined
      try { permit = d.reserve(`model-review:${randomUUID()}`, signal); return await operation(signal) }
      finally { preparing = false; preparationAbort = undefined; permit?.release(); d.changed() }
    })()
    preparationDone = done
    try { return await done } finally { if (preparationDone === done) preparationDone = undefined }
  }
  async function createReview(operation: (signal: AbortSignal) => Promise<Review>) {
    for (const [id, review] of reviews) if (review.expires < Date.now()) reviews.delete(id)
    if (reviews.size >= 4) throw Error('MODEL_REVIEW_LIMIT')
    return withPreparation(async signal => {
      const value = await operation(signal)
      signal.throwIfAborted()
      const files = value.artifact?.files ?? value.release!.files
      const bytes = files.reduce((sum, file) => sum + file.bytes, 0), additionalBytes = value.ownership === 'reference' ? 0 : bytes
      const freeDiskBytes = await diskBudget(additionalBytes)
      const id = `model-import-review:${randomUUID()}`
      reviews.set(id, value)
      const profile = VISION_MODEL_PROFILES[value.artifact?.modelId ?? value.release!.id]
      return { review: id, model: value.artifact?.model ?? value.release!.name, ownership: value.ownership,
        source: value.release ? 'huggingface-upstream' : 'user-import', revision: value.release?.revision ?? null,
        repository: value.release?.repository ?? null,
        license: value.release?.license ?? value.artifact!.license, bytes, additionalBytes, freeDiskBytes,
        loadRamBytes: value.release?.gguf || value.artifact?.gguf ? bytes + 1536 * 1024 ** 2 : profile.loadRamBytes,
        notice: value.ownership === 'reference' ? '只读引用所选数据制品；DAM 不修改或删除源文件。导入后仍需真实验证才能启用。' :
          '数据制品存入当前 profile 的 DAM 受管模型目录，保留原版本。安装完成后仍需真实验证才能启用。',
      } satisfies ModelAcquisitionReview
    })
  }
  const inspectArtifact = (directory: string, review: Review, signal: AbortSignal) => {
    const bundle = review.artifact?.gguf ?? review.release?.gguf
    return bundle ? inspectGgufModel(directory, bundle, signal) : inspectVisionModel(directory, signal)
  }
  const bindArtifact = (artifact: VisionModelArtifact, python: string | undefined, signal: AbortSignal) => {
    if (artifact.gguf) return Promise.resolve(bindGgufArtifact(artifact))
    if (!python) throw Error('LOCAL_RUNTIME_UNAVAILABLE')
    return bindVisionEnvironment(artifact, python, d.runner, signal)
  }
  function selectedGgufRelease(bundleId: string): UpstreamModelRelease {
    const bundle = catalogRows().flatMap(row => (JSON.parse(row.record) as HuggingFaceDiscoveryEntry).bundles ?? [])
      .find(bundle => bundle.id === bundleId)
    if (!bundle) throw Error('MODEL_SOURCE_UNAVAILABLE')
    const release: UpstreamModelRelease = { id: `qwen3-vl-${bundle.size.toLowerCase()}-instruct` as ManagedVisionModelId,
      name: `Qwen3-VL-${bundle.size}-${bundle.variant} · ${bundle.languageQuantization} / ${bundle.projectorQuantization}`,
      repository: bundle.repository, revision: bundle.revision, catalogProvider: bundle.catalogProvider, license: 'apache-2.0', gguf: bundle,
      loadRamBytes: bundle.bytes + 1536 * 1024 ** 2,
      files: bundle.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })) }
    validateUpstreamReleasePolicy(release)
    return release
  }
  function register(artifact: VisionModelArtifact, configuration: Omit<ManagedVisionConfiguration, 'enabled'>,
    review: Review, id = `model-entry:${randomUUID()}`) {
    const existing = review.ownership === 'reference' && models().find(record => record.configuration.fingerprint === configuration.fingerprint && record.ownership === review.ownership &&
      (record.release?.revision ?? null) === (review.release?.revision ?? null))
    if (existing) {
      if (!existing.trusted || existing.retired) throw Error('MODEL_TRUST_REVIEW_REQUIRED')
      return existing.id
    }
    if (models().length >= 64) throw Error('MODEL_INVENTORY_LIMIT')
    save({ id, artifact, configuration: { ...configuration, entryId: id, enabled: false,
      source: review.release ? 'huggingface-upstream' : 'user-import', ownership: review.ownership },
      ownership: review.ownership, release: review.release ?? null, sourceCheckedAt: review.sourceCheckedAt ?? null,
      sourceBinding: review.sourceBinding ?? null, trusted: true, retired: false, qualifiedAt: null })
    d.changed(); return id
  }
  async function checkedStage(record: TransferRecord, create: boolean, published = false) {
    validateTask(record)
    const identity = await ensureStore(), stage = contained(path.join(root, published ? 'artifacts' : 'staging',
      published ? record.modelEntryId.replace('model-entry:', '') : record.id.replace('model-transfer:', '')))
    if (create) {
      await fs.mkdir(stage, { mode: 0o700 })
      await fs.writeFile(path.join(stage, STORE_MARKER), JSON.stringify({ identity, taskId: record.id }), { flag: 'wx', mode: 0o600 })
    }
    const stat = await fs.lstat(stage), marker = await fs.lstat(path.join(stage, STORE_MARKER))
    if (!stat.isDirectory() || stat.isSymbolicLink() || !marker.isFile() || marker.isSymbolicLink() || marker.size > 512 ||
      await fs.readFile(path.join(stage, STORE_MARKER), 'utf8') !== JSON.stringify({ identity, taskId: record.id })) throw Error('MODEL_STAGING_UNSAFE')
    const files = record.review.artifact?.files ?? record.review.release!.files
    const allowed = new Set([STORE_MARKER, ...files.flatMap(file => [file.name, file.name + '.part'])])
    const directories = new Set(files.flatMap(file => {
      const parts = file.name.split('/'); return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'))
    }))
    async function check(directory: string, prefix = '') {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const name = prefix + entry.name
        if (entry.isSymbolicLink()) throw Error('MODEL_STAGING_UNSAFE')
        if (entry.isDirectory() && directories.has(name)) await check(path.join(directory, entry.name), name + '/')
        else if (!entry.isFile() || !allowed.has(name)) throw Error('MODEL_STAGING_UNSAFE')
      }
    }
    await check(stage)
    return stage
  }
  async function runTransfer(record: TransferRecord, signal: AbortSignal) {
    const permit = d.reserve(record.id, signal)
    try {
      const stage = await checkedStage(record, false), review = record.review
      if (review.release) {
        const trusted = await verifyUpstreamRelease(review.release, d.fetch, signal)
        review.sourceBinding = trusted.binding; review.sourceCheckedAt = trusted.verifiedAt
      }
      const files = review.artifact?.files ?? review.release!.files
      await diskBudget(Math.max(0, files.reduce((sum, file) => sum + file.bytes, 0) - record.completedBytes))
      let prior = 0, lastPersisted = 0
      for (const file of files) {
        signal.throwIfAborted()
        await transferModelFile({ file, stage, signal, fetch: d.fetch, release: review.release,
          sourceRoot: review.artifact?.root, progress: completed => {
            record.completedBytes = prior + completed
            if (Date.now() - lastPersisted > 500) { lastPersisted = Date.now(); saveTask(record); d.changed() }
          } })
        prior += file.bytes; record.completedBytes = prior; saveTask(record)
      }
      const artifact = await inspectArtifact(stage, review, signal)
      if (review.artifact && artifact.artifactFingerprint !== review.artifact.artifactFingerprint) throw Error('LOCAL_MODEL_CHANGED')
      const configuration = await bindArtifact(artifact, review.python, signal)
      signal.throwIfAborted()
      // Journal the publish intent before rename. Startup never guesses that a directory is installed.
      record.artifact = artifact; saveTask(record)
      const finalRoot = contained(path.join(root, 'artifacts', record.modelEntryId.replace('model-entry:', '')))
      try { await fs.lstat(finalRoot); throw Error('MODEL_STAGING_UNSAFE') }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      await fs.rename(stage, finalRoot)
      const finalArtifact = { ...artifact, root: finalRoot }
      d.database.transaction(() => {
        register(finalArtifact, { ...configuration, root: finalRoot }, review, record.modelEntryId)
        record.state = 'complete'; record.error = null; saveTask(record)
      })()
    } finally { permit.release() }
  }
  function start(record: TransferRecord) {
    if (draining || running.size || record.state === 'complete' || record.state === 'abandoned') throw Error('MODEL_LIBRARY_BUSY')
    const abort = new AbortController()
    record.state = 'running'; record.error = null; saveTask(record)
    const done = runTransfer(record, abort.signal).catch(error => {
      record.state = abort.signal.aborted ? 'paused' : 'failed'
      record.error = abort.signal.aborted ? null : publicError(error)
      saveTask(record)
    }).finally(() => { running.delete(record.id); d.changed() })
    running.set(record.id, { abort, done }); d.changed()
  }
  function assertTrusted(configuration: ManagedVisionConfiguration) {
    if (!configuration.entryId) return // Legacy user import is re-inspected before its first migration.
    const record = read(configuration.entryId)
    const nativeCandidate = configuration.gguf && configuration.native && record.artifact.gguf?.id === configuration.gguf.id &&
      record.artifact.artifactFingerprint === configuration.artifactFingerprint && nativeVisionFingerprint(configuration) === configuration.fingerprint
    if (!record.trusted || record.retired || (!nativeCandidate && record.configuration.fingerprint !== configuration.fingerprint)) throw Error('MODEL_TRUST_REVOKED')
    if (record.sourceBlock) throw Error(record.sourceBlock)
    if (record.release) {
      validateUpstreamReleasePolicy(record.release)
      if (modelSourceBinding(record.release) !== record.sourceBinding) throw Error('MODEL_SOURCE_REVOKED')
      // Installed immutable bytes retain their accepted execution trust offline.
      // Metadata age is shown separately; missing evidence and known revocation
      // still refuse, and the runtime rechecks local bytes/environment on load.
      if (record.sourceCheckedAt === null || !Number.isSafeInteger(record.sourceCheckedAt) || record.sourceCheckedAt < 0)
        throw Error('MODEL_SOURCE_EVIDENCE_MISSING')
    }
  }
  return {
    recommendGguf(preference: ModelRecommendationPreference) {
      if (!d.admission) throw Error('AI_RESOURCE_UNAVAILABLE')
      if (!['balanced', 'efficient', 'quality'].includes(preference)) throw Error('MODEL_ACTION_INVALID')
      const bundles = discoveries().flatMap(entry=>entry.bundles ?? [])
      return recommendGgufBundles(bundles, d.admission, preference)
    },
    summary(activeEntryId?: string): ManagedModelLibrarySummary & { preparing: boolean } {
      return { preparing, catalogRefreshing: !!catalogDone, catalogError,
        catalogCheckedAt: catalogRows().map(row => (JSON.parse(row.record) as HuggingFaceDiscoveryEntry).checkedAt).sort().at(-1) ?? null,
        discovery: discoveries(),
        models: models().map(record => ({ id: record.id, model: record.artifact.model, modelId: record.artifact.modelId,
        format: record.artifact.gguf ? 'gguf' : 'transformers',
        bytes: record.artifact.bytes, fingerprint: record.configuration.fingerprint, ownership: record.ownership,
        source: record.release ? 'huggingface-upstream' : 'user-import', revision: record.release?.revision ?? null,
        license: record.release?.license ?? record.artifact.license, trust: record.trusted ? 'accepted' : 'revoked',
        sourceBlock: record.sourceBlock ?? null,
        qualifiedAt: record.qualifiedAt, active: record.id === activeEntryId, retired: record.retired,
        sourceFreshness: {
          kind: !record.release ? 'not-applicable' : record.sourceCheckedAt === null ||
            !Number.isSafeInteger(record.sourceCheckedAt) || record.sourceCheckedAt < 0 || record.sourceCheckedAt > Date.now()
            ? 'unknown' : Date.now() - record.sourceCheckedAt > TRUST_WINDOW ? 'stale' : 'fresh',
          checkedAt: record.sourceCheckedAt,
          error: record.sourceRefreshError ?? null,
        } })),
        tasks: transfers().map(record => ({ id: record.id, model: record.review.artifact?.model ?? record.review.release!.name,
          kind: record.review.ownership === 'managed-copy' ? 'copy' : 'download', state: record.state, completedBytes: record.completedBytes,
          totalBytes: (record.review.artifact?.files ?? record.review.release!.files).reduce((sum, file) => sum + file.bytes, 0),
          error: record.error, modelEntryId: record.state === 'complete' ? record.modelEntryId : null })),
        catalog: releases().map(release => ({ id: release.id, model: release.name, repository: release.repository,
          revision: release.revision, license: release.license, loadRamBytes: release.loadRamBytes,
          bytes: release.files.reduce((sum, file) => sum + file.bytes, 0),
          installed: models().some(record => record.release?.repository === release.repository && record.release.revision === release.revision && record.trusted && !record.retired) })),
        sourceNotice: '目录与模型下载使用 ModelScope 境内来源，固定镜像提交、长度和完整哈希；不直接访问 Hugging Face，也不跟随回到其存储的重定向。镜像缺失单独提示。已安装且验证有效的模型可离线使用，检查时间过期不单独撤销资格；本地变化和已知撤信任仍拒绝。来源核验不冒充 DAM 发布者签名。',
      }
    },
    reviewImport(ownership: 'reference' | 'managed-copy') {
      return createReview(async signal => {
        const selected = await d.selectModel(); if (!selected) throw Error('MODEL_SELECTION_CANCELLED')
        const python = await d.selectPython(); if (!python) throw Error('MODEL_SELECTION_CANCELLED')
        const artifact = await inspectVisionModel(selected, signal), configuration = await bindVisionEnvironment(artifact, python, d.runner, signal)
        return { expires: Date.now() + 30 * 60_000, ownership, artifact, python: configuration.python, configuration }
      })
    },
    reviewInstall(modelId: ManagedVisionModelId) {
      return createReview(async signal => {
        const release = releases().find(release => release.id === modelId)
        if (!release) throw Error('MODEL_SOURCE_UNAVAILABLE')
        const trusted = await verifyUpstreamRelease(release, d.fetch, AbortSignal.any([signal, AbortSignal.timeout(30_000)]))
        const python = await d.selectPython(); if (!python) throw Error('MODEL_SELECTION_CANCELLED')
        return { expires: Date.now() + 30 * 60_000, ownership: 'managed-download', release, python,
          sourceBinding: trusted.binding, sourceCheckedAt: trusted.verifiedAt }
      })
    },
    reviewGgufInstall(bundleId: string) {
      return createReview(async signal => {
        const release = selectedGgufRelease(bundleId)
        const trusted = await verifyUpstreamRelease(release, d.fetch, AbortSignal.any([signal, AbortSignal.timeout(30_000)]))
        return { expires: Date.now() + 30 * 60_000, ownership: 'managed-download', release,
          sourceBinding: trusted.binding, sourceCheckedAt: trusted.verifiedAt }
      })
    },
    reviewGgufImport(bundleId: string, ownership: 'reference' | 'managed-copy') {
      return createReview(async signal => {
        const release = selectedGgufRelease(bundleId)
        const trusted = await verifyUpstreamRelease(release, d.fetch, AbortSignal.any([signal, AbortSignal.timeout(30_000)]))
        const selected = await d.selectModel(); if (!selected) throw Error('MODEL_SELECTION_CANCELLED')
        const artifact = await inspectGgufModel(selected, release.gguf!, signal), configuration = bindGgufArtifact(artifact)
        return { expires: Date.now() + 30 * 60_000, ownership, artifact, configuration, release,
          sourceBinding: trusted.binding, sourceCheckedAt: trusted.verifiedAt }
      })
    },
    confirm(reviewId: string) { return withPreparation(async signal => {
      const review = reviews.get(reviewId)
      if (!review || review.expires < Date.now()) throw Error('MODEL_REVIEW_EXPIRED')
      if (running.size) throw Error('MODEL_LIBRARY_BUSY')
      reviews.delete(reviewId)
      if (review.ownership === 'reference') {
          const artifact = await inspectArtifact(review.artifact!.root, review, signal)
          const configuration = await bindArtifact(artifact, review.python, signal)
          if (configuration.fingerprint !== review.configuration!.fingerprint) throw Error('LOCAL_MODEL_CHANGED')
          signal.throwIfAborted()
          return { modelEntryId: register(artifact, configuration, review) }
      }
      if (transfers().length >= 32) throw Error('MODEL_TASK_LIMIT')
      const record: TransferRecord = { id: `model-transfer:${randomUUID()}`, modelEntryId: `model-entry:${randomUUID()}`, review,
        state: 'paused', completedBytes: 0, error: null }
      await diskBudget((review.artifact?.files ?? review.release!.files).reduce((sum, file) => sum + file.bytes, 0))
      saveTask(record)
      try { await checkedStage(record, true); signal.throwIfAborted() }
      catch (error) { record.state = 'failed'; record.error = publicError(error); saveTask(record); throw error }
      start(record); return { taskId: record.id }
    }) },
    discardReview(id: string) { reviews.delete(id) },
    cancelPreparation() { preparationAbort?.abort() },
    async pause(id: string) { const runningTask = running.get(id); runningTask?.abort.abort(); await runningTask?.done },
    resume(id: string) { return withPreparation(async signal => {
      const record = task(id)
      if (!['paused', 'interrupted', 'failed'].includes(record.state)) throw Error('MODEL_TASK_STATE_CHANGED')
      if (running.size) throw Error('MODEL_LIBRARY_BUSY')
      // Recover a rename whose DB commit did not complete, with full byte/environment checks.
      if (record.artifact) {
        const finalRoot = contained(path.join(root, 'artifacts', record.modelEntryId.replace('model-entry:', '')))
        try {
          await checkedStage(record, false, true)
          const artifact = await inspectArtifact(finalRoot, record.review, signal)
          if (artifact.artifactFingerprint !== record.artifact.artifactFingerprint) throw Error('MODEL_FILE_INTEGRITY_FAILED')
          const configuration = await bindArtifact(artifact, record.review.python, signal)
          if (record.review.release) {
            const trusted = await verifyUpstreamRelease(record.review.release, d.fetch, AbortSignal.any([signal, AbortSignal.timeout(30_000)]))
            record.review.sourceBinding = trusted.binding; record.review.sourceCheckedAt = trusted.verifiedAt
          }
          d.database.transaction(() => { register(artifact, configuration, record.review, record.modelEntryId); record.state = 'complete'; record.error = null; saveTask(record) })()
          d.changed(); return
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      }
      start(record)
    }) },
    abandon(id: string) { return withPreparation(async signal => {
      await this.pause(id)
      const record = task(id)
      if (record.state === 'complete') throw Error('MODEL_TASK_STATE_CHANGED')
      const stage = await checkedStage(record, false)
      signal.throwIfAborted()
      // Delete only enumerated regular task files after checking root/task identity. Originals and installed models never enter here.
      async function clean(directory: string) {
        for (const file of await fs.readdir(directory)) { const target = contained(path.join(directory, file)); const stat = await fs.lstat(target)
          if (stat.isSymbolicLink()) throw Error('MODEL_STAGING_UNSAFE')
          if (stat.isDirectory()) { await clean(target); await fs.rmdir(target) }
          else if (stat.isFile()) await fs.unlink(target)
          else throw Error('MODEL_STAGING_UNSAFE')
        }
      }
      await clean(stage)
      await fs.rmdir(stage); record.state = 'abandoned'; record.error = null; saveTask(record); d.changed()
    }) },
    async configuration(id: string, signal = AbortSignal.timeout(30_000)) {
      let record = read(id)
      if (!record.trusted || record.retired) throw Error('MODEL_TRUST_REVOKED')
      assertTrusted(record.configuration)
      // A user-requested verification may follow an application/runtime update.
      // Keep the accepted artifact identity; activation still hashes all model
      // bytes before loading. Rebinding never restores revoked trust or grants
      // capability qualification without the real probe.
      const before = record.configuration.fingerprint
      const artifact = record.artifact.gguf ? await inspectGgufModel(record.artifact.root, record.artifact.gguf, signal) : record.artifact
      if (artifact.artifactFingerprint !== record.artifact.artifactFingerprint) throw Error('LOCAL_MODEL_CHANGED')
      if (artifact.gguf) return { ...record.configuration }
      const bound = await bindArtifact(artifact, record.configuration.python, signal)
      signal.throwIfAborted()
      record = read(id)
      assertTrusted(record.configuration)
      if (record.configuration.fingerprint !== before) throw Error('MODEL_LIBRARY_BUSY')
      if (bound.fingerprint !== before) {
        record.configuration = { ...record.configuration, ...bound, enabled: false }
        record.qualifiedAt = null
        save(record); d.changed()
      }
      return { ...record.configuration }
    },
    refreshSource(id: string) {
      return withPreparation(async signal => {
        const before = read(id)
        if (!before.trusted || before.retired) throw Error('MODEL_TRUST_REVOKED')
        if (!before.release) throw Error('MODEL_SOURCE_NOT_APPLICABLE')
        validateUpstreamReleasePolicy(before.release)
        try {
          const trusted = await verifyUpstreamRelease(before.release, d.fetch,
            AbortSignal.any([signal, AbortSignal.timeout(30_000)]))
          signal.throwIfAborted()
          const current = read(id)
          if (!current.trusted || current.retired) throw Error('MODEL_TRUST_REVOKED')
          if (current.sourceBinding !== before.sourceBinding ||
              current.configuration.fingerprint !== before.configuration.fingerprint)
            throw Error('MODEL_LIBRARY_BUSY')
          current.sourceCheckedAt = trusted.verifiedAt
          current.sourceBinding = trusted.binding
          current.sourceBlock = null
          current.sourceRefreshError = null
          save(current)
          d.changed()
        } catch (error) {
          const code = error instanceof Error && /^MODEL_[A-Z_]+$/.test(error.message)
            ? error.message : 'MODEL_SOURCE_UNAVAILABLE'
          const current = read(id)
          if (current.sourceBinding === before.sourceBinding &&
              current.configuration.fingerprint === before.configuration.fingerprint) {
            current.sourceRefreshError = code
            if (['MODEL_SOURCE_REVOKED', 'MODEL_SOURCE_METADATA_CHANGED', 'MODEL_SOURCE_METADATA_INVALID', 'MODEL_SOURCE_LICENSE_CHANGED'].includes(code)) {
              current.sourceBlock = code
              current.qualifiedAt = null
            }
            save(current)
            d.changed()
          }
          throw Error(code)
        }
      })
    },
    assertTrusted,
    verifiedConfigurations(id: string): ManagedVisionConfiguration[] {
      const record = read(id)
      if (!record.trusted || record.retired || record.sourceBlock || !record.qualifiedAt) return []
      return (record.validatedPlans ?? []).filter(value => {
        const c = value.configuration
        return c.entryId === id && c.gguf?.id === record.artifact.gguf?.id && c.native &&
          c.artifactFingerprint === record.artifact.artifactFingerprint && nativeVisionFingerprint(c) === c.fingerprint
      }).map(value => structuredClone(value.configuration))
    },
    qualified(configuration: ManagedVisionConfiguration) {
      if (configuration.entryId) { const record = read(configuration.entryId); assertTrusted(configuration);
        const qualifiedAt = new Date().toISOString()
        if (configuration.gguf) {
          record.configuration = { ...configuration, enabled: false }
          record.validatedPlans = [...(record.validatedPlans ?? []).filter(value =>
            value.configuration.fingerprint !== configuration.fingerprint),
            { configuration: structuredClone(record.configuration), qualifiedAt }].slice(-16)
        }
        record.qualifiedAt = qualifiedAt; save(record); d.changed() }
    },
    setTrust(id: string, trusted: boolean) {
      const record = read(id); record.trusted = trusted; record.qualifiedAt = null; record.validatedPlans = []; if (trusted) record.retired = false; save(record); d.changed()
    },
    retire(id: string) { const record = read(id); record.retired = true; save(record); d.changed() },
    migrateLegacy(configuration: ManagedVisionConfiguration) { return withPreparation(async signal => {
      if (configuration.entryId) return configuration
      const artifact = await inspectVisionModel(configuration.root, signal)
      const bound = await bindArtifact(artifact, configuration.python, signal)
      signal.throwIfAborted()
      const id = register(artifact, bound, { expires: 0, ownership: 'reference', python: 'python' in bound ? bound.python : undefined, artifact })
      return { ...read(id).configuration, enabled: configuration.enabled }
    }) },
    refreshCatalog() {
      if (draining) throw Error('MODEL_LIBRARY_BUSY')
      if (catalogDone) return catalogDone
      catalogAbort = new AbortController()
      catalogError = null
      const catalogSignal = catalogAbort.signal
      const done = (async () => {
        let permit: { release(): void } | undefined
        try { permit = d.reserve(`model-catalog:${randomUUID()}`, catalogSignal)
          await discoverHuggingFaceModels(d.fetch, catalogSignal, (entry, release) => {
        if (!HF_MODEL_SCOPE.some(scope => scope.id === entry.id && scope.repository === entry.repository)) throw Error('MODEL_SOURCE_METADATA_INVALID')
        d.database.prepare('INSERT INTO managed_model_catalog VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record,release=excluded.release')
          .run(entry.id, JSON.stringify(entry), release ? JSON.stringify(release) : null)
        d.changed()
          })
        } finally { permit?.release() }
      })().catch(error => { catalogError = publicError(error); throw error })
        .finally(() => { catalogDone = undefined; catalogAbort = undefined; d.changed() })
      catalogDone = done; d.changed(); return done
    },
    async drain() {
      draining = true; preparationAbort?.abort(); catalogAbort?.abort(); reviews.clear()
      for (const execution of running.values()) execution.abort.abort()
      await Promise.allSettled([preparationDone, catalogDone, ...[...running.values()].map(value => value.done)])
    },
  }
}

function publicError(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  return /^(MODEL|LOCAL|AI)_[A-Z_]+$/.test(code) ? code : 'MODEL_TRANSFER_FAILED'
}
export type ManagedModelLibrary = ReturnType<typeof createManagedModelLibrary>
