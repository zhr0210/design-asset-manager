import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import type Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../../src/main/library-lifecycle/production-active-library-dependencies'
import { openReadonlyLibraryDatabase, sqliteRecoverySidecarsAbsent } from '../../src/main/library-lifecycle/readonly-library-database.internal'
import { readLibraryManifestDeclaration } from '../../src/main/library-lifecycle/library-manifest.tracer'
import { inspectLibraryControlStore } from '../../src/main/library-lifecycle/library-open-control-store.internal'
import { assertLibraryDataSchema } from '../../src/main/library-lifecycle/library-materialization.internal'
import { createVisualAdmission, VISUAL_ADMISSION_PROFILE } from '../../src/main/visual-ai/visual-admission'

// Explicitly local, public-fixture acceptance harness. It requires the separately
// prepared, hash-bound public sample manifest; never discovers a user's library.
const repository = process.cwd()
const parent = path.resolve('.scratch/wc01-diverse-image-library-20261005')
const selected = (await fs.readFile(path.join(parent, 'selected-run.txt'), 'utf8')).trim()
const root = path.resolve(selected)
assert.equal(path.dirname(root), parent)
assert.match(path.basename(root), /^run-[A-Za-z0-9_-]+$/)
const manifest = JSON.parse(await fs.readFile(path.join(root, 'fixtures-public.json'), 'utf8'))
assert.equal(manifest.privateDataRead, false)
assert.equal(manifest.modelsDownloaded, false)
const execution = process.env.DAM_WC01_IMAGE_EXECUTION ?? 'exec-01'
assert.match(execution, /^exec-[0-9]+$/)
const evidence = path.join(root, execution)
await fs.mkdir(evidence)
assert.equal(process.platform, 'win32')
assert.equal(process.arch, 'x64')
assert.notEqual(process.env.SQLITE_USE_URI, '1')
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const save = (name: string, value: unknown) => fs.writeFile(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
const log = (value: unknown) => console.log(JSON.stringify(value))
interface Fixture {
  id: string; name: string; feature: string; relativePath: string; bytes: number; sha256: string;
  codecExpected: 'pass' | 'reject'; captureExpected: 'import' | 'exclude' | 'preview-failure'; sourceKind: string;
}
const fixtures: Fixture[] = manifest.fixtures
const fixturePath = (f: Fixture) => {
  const result = path.resolve(root, f.relativePath)
  assert.ok(result.startsWith(path.join(root, 'fixtures') + path.sep))
  return result
}
const admissions: ReturnType<typeof createVisualAdmission>[] = []
const hosts: ReturnType<typeof createActiveLibraryHost>[] = []
const steps: { id: string; status: string; detail?: unknown }[] = []
async function step<T>(id: string, action: () => Promise<T>): Promise<T> {
  log({ step: id, status: 'RUNNING' })
  try {
    const result = await action()
    steps.push({ id, status: 'PASS' })
    log({ step: id, status: 'PASS' })
    return result
  } catch (error) {
    const detail = error instanceof Error ? { name: error.name, message: error.message } : { name: 'unknown' }
    steps.push({ id, status: 'FAIL', detail })
    log({ step: id, status: 'FAIL', detail })
    throw error
  }
}
function createHost(library: string, selection: Fixture[] = []) {
  assert.ok(library.startsWith(evidence + path.sep))
  const admission = createVisualAdmission()
  const files = { value: selection }
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }),
    selectLocalFiles: async () => ({ kind: 'selected', files: files.value.map(f => ({ filePath: fixturePath(f) })) })
  }, { admission }))
  admissions.push(admission); hosts.push(host)
  return { host, admission, files, library, file: path.join(library, '.dam/library.sqlite') }
}
const emptyLedger = { materialBytes: 0, frozenBytes: 0, preparing: 0, requests: 0, tags: 0, receipts: 0, waiting: 0, accepting: true }
async function resourceOnlyProbe(admission: ReturnType<typeof createVisualAdmission>) {
  assert.deepEqual(admission.inspect(), emptyLedger)
  const ocr = await admission.reserveOcr(4096, new AbortController().signal)
  ocr.release()
  const pi = await admission.reservePiProbe(new AbortController().signal)
  pi.release()
  assert.deepEqual(admission.inspect(), emptyLedger)
}
async function treeFiles(directory: string): Promise<Record<string, { bytes: number; sha256: string }>> {
  const result: Record<string, { bytes: number; sha256: string }> = {}
  async function visit(current: string) {
    for (const name of (await fs.readdir(current)).sort()) {
      const absolute = path.join(current, name), stat = await fs.lstat(absolute)
      assert.equal(stat.isSymbolicLink(), false)
      if (stat.isDirectory()) await visit(absolute)
      else {
        assert.ok(stat.isFile()); assert.equal(stat.nlink, 1)
        result[path.relative(directory, absolute).split(path.sep).join('/')] = { bytes: stat.size, sha256: sha(await fs.readFile(absolute)) }
      }
    }
  }
  await visit(directory)
  return result
}
function rows(database: Database.Database, table: string, columns: string[]) {
  const quote = (value: string) => '"' + value.replaceAll('"', '""') + '"'
  const data = database.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(table)}`).all()
  const encoded = data.map(row => JSON.stringify(row)).sort()
  return { count: encoded.length, sha256: sha(JSON.stringify(encoded)) }
}
type TableProof = Record<string, { columns: string[]; count: number; sha256: string }>
async function databaseProof(file: string, previous?: TableProof) {
  assert.ok(sqliteRecoverySidecarsAbsent(file))
  const database = openReadonlyLibraryDatabase(file)
  try {
    assert.equal(database.pragma('quick_check(1)', { simple: true }), 'ok')
    assert.deepEqual(database.pragma('foreign_key_check'), [])
    assertLibraryDataSchema(database)
    const tables = (database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[]).map(row => row.name)
    const proof: TableProof = {}
    for (const table of previous ? Object.keys(previous) : tables.filter(name=>name!=='library_operation_journal')) {
      assert.ok(tables.includes(table), `Existing table preserved: ${table}`)
      const columns = previous?.[table].columns ?? (database.pragma(`table_info('${table.replaceAll("'", "''")}')`) as { name: string }[]).map(row => row.name)
      proof[table] = { columns, ...rows(database, table, columns) }
    }
    const pages = Number(database.pragma('page_count', { simple: true })), pageSize = Number(database.pragma('page_size', { simple: true }))
    const bytes = (await fs.stat(file)).size
    const declarationRoot = file.slice(0,file.indexOf(path.sep+'.dam'+path.sep))
    assert.ok(declarationRoot.startsWith(evidence+path.sep))
    const manifestRead=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(declarationRoot,'.dam/library.manifest.json'))))
    assert.equal(manifestRead.kind,'compatible');if(manifestRead.kind!=='compatible')throw Error('MANIFEST_NOT_COMPATIBLE')
    const store=inspectLibraryControlStore(database,manifestRead.declaration)
    assert.equal(store.kind,'compatible')
    const journalRows=database.prepare('SELECT operation_identity,state FROM library_operation_journal ORDER BY operation_identity').all() as {operation_identity:string;state:string}[]
    assert.ok(journalRows.every(row=>row.state==='settled'))
    const journal={count:journalRows.length,sha256:sha(JSON.stringify(journalRows)),
      commits:journalRows.filter(row=>row.operation_identity.startsWith('backup-proof:v1:')).map(row=>({
        markerSha256:sha(row.operation_identity),targetSchema:Number(row.operation_identity.split(':').at(-1)),state:row.state}))}
    return { schemaVersion: Number(database.pragma('user_version', { simple: true })), pages, pageSize,
      fileBytes: bytes, pageBytes: pages * pageSize, sha256: sha(await fs.readFile(file)), tables: proof,journal }
  } finally { database.close() }
}
async function copyLibrary(source: string, name: string) {
  assert.ok(sqliteRecoverySidecarsAbsent(path.join(source, '.dam/library.sqlite')))
  assert.ok(sqliteRecoverySidecarsAbsent(path.join(source, '.dam/exclusive-library-lock.sqlite')))
  const before = await treeFiles(source), destination = path.join(evidence, name)
  await fs.cp(source, destination, { recursive: true, force: false, errorOnExist: true })
  assert.deepEqual(await treeFiles(destination), before)
  assert.deepEqual(await treeFiles(source), before)
  return { directory: destination, files: before }
}
async function backups(library: string) {
  const dir = path.join(library, '.dam/schema-backups')
  try { return (await fs.readdir(dir)).sort().map(name => path.join(dir, name, 'library.sqlite')) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error }
}
async function verifyAssetBytes(context: ReturnType<typeof createHost>, expectedCount: number) {
  const assets = await context.host.listAssets()
  assert.equal(assets.length, expectedCount)
  const session = await context.host.readVisualSession({ libraryIdentity: context.host.inspect().identity!, generation: context.host.inspect().generation! })
  const imageProofs = []
  for (const asset of assets) {
    const fixture = fixtures.find(item => path.basename(fixturePath(item)) === asset.fileName)
    assert.ok(fixture, 'Each promoted asset belongs to the explicit public/derived fixture manifest')
    const original = await context.host.readManagedOriginal(asset.id, asset.revision, asset.thumbnailRef)
    assert.equal(sha(original.bytes), fixture.sha256)
    const sourceMetadata=await sharp(original.bytes).metadata()
    const orientedWidth=[5,6,7,8].includes(sourceMetadata.orientation??1)?sourceMetadata.height!:sourceMetadata.width!
    const orientedHeight=[5,6,7,8].includes(sourceMetadata.orientation??1)?sourceMetadata.width!:sourceMetadata.height!
    const preview = await context.host.readPreview(asset.id), metadata = await sharp(preview).metadata()
    assert.equal(metadata.format,sourceMetadata.format,'Preview follows detected content format, including misleading file extensions')
    assert.ok(metadata.width! <= 1600 && metadata.height! <= 1600)
    assert.ok(Math.abs(metadata.width!*orientedHeight-metadata.height!*orientedWidth)<=Math.max(orientedWidth,orientedHeight),'Preview uses EXIF orientation and preserves aspect within one pixel')
    assert.equal(metadata.pages ?? 1, 1)
    assert.equal(metadata.depth,'uchar','Preview safely normalizes supported higher bit-depth originals')
    let sourceHasTransparency=false
    if(sourceMetadata.hasAlpha) {
      const alpha=await sharp(original.bytes).ensureAlpha().extractChannel('alpha').raw({depth:'uchar'}).toBuffer()
      sourceHasTransparency=alpha.some(value=>value<255)
      if(sourceHasTransparency) {
        assert.equal(metadata.hasAlpha,true,'Required preview preserves actual nonopaque source pixels')
        const previewAlpha=await sharp(preview).ensureAlpha().extractChannel('alpha').raw({depth:'uchar'}).toBuffer()
        assert.ok(previewAlpha.some(value=>value<255),'Preview must retain actual transparency, not merely an alpha channel')
      }
    }
    const lease = context.admission.open('wc01-owned-preview', session)
    try {
      await lease.prepare(asset.id, () => context.host.readVisualPreview({ libraryIdentity: context.host.inspect().identity!,
        generation: context.host.inspect().generation!, sessionToken:session.sessionToken, assetId: asset.id, assetRevision: asset.revision, previewGeneration: asset.thumbnailRef }))
      lease.consume()
      const jpeg = await lease.withRequest(asset.id, 'combined', new AbortController().signal, async bytes => {
        const m = await sharp(bytes).metadata()
        assert.equal(m.format, 'jpeg'); assert.ok(m.width! <= 1024 && m.height! <= 1024)
        assert.ok(Math.abs(m.width!*orientedHeight-m.height!*orientedWidth)<=Math.max(orientedWidth,orientedHeight),'AI preparation preserves oriented aspect within one pixel')
        return { bytes: bytes.length, sha256: sha(bytes), width: m.width, height: m.height }
      })
      imageProofs.push({ fixture: fixture.id, originalUnchanged: true, preview: { bytes: preview.length, sha256: sha(preview),
        format: metadata.format, width: metadata.width, height: metadata.height, depth: metadata.depth, alpha: metadata.hasAlpha },
        source:{format:sourceMetadata.format,width:sourceMetadata.width,height:sourceMetadata.height,depth:sourceMetadata.depth,orientation:sourceMetadata.orientation??1,pages:sourceMetadata.pages??1,firstFrameHasTransparency:sourceHasTransparency},jpeg })
    } finally { lease.dispose() }
    await resourceOnlyProbe(context.admission)
  }
  return imageProofs
}
let failure: unknown
const runtime = { platform: process.platform, arch: process.arch, versions: process.versions, sqliteUriOverride: process.env.SQLITE_USE_URI ?? null,
  chain: 'Repository Electron Node runner -> production ActiveLibraryHost / Windows Adapter / default VisualAdmission',
  dependencyOverrides: 'dialog selection only', storageOverride: false, realPrivateLibraryAccess: false,
  modelInference: 'NOT_RUN', computerUse: 'NOT_RUN / third product retest remains excluded' }
await save('runtime.json', runtime)
try {
  await step('verify-public-fixture-identities-and-create-derived-edge-cases', async () => {
    for (const fixture of fixtures) assert.equal(sha(await fs.readFile(fixturePath(fixture))), fixture.sha256)
    const base = fixtures.find(item => item.name === 'coffee.png')!, cat = fixtures.find(item => item.name === 'chelsea.png')!, text = fixtures.find(item => item.name === 'text.png')!
    const add = async (id: string, name: string, feature: string, bytes: Buffer, codecExpected: Fixture['codecExpected'] = 'pass', captureExpected: Fixture['captureExpected'] = 'import') => {
      const relativePath = 'fixtures/' + execution + '/' + name, file = path.join(root, relativePath)
      await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes, { flag: 'wx' })
      fixtures.push({ id, name, feature, relativePath, bytes: bytes.length, sha256: sha(bytes), codecExpected, captureExpected, sourceKind: 'locally-derived-public-fixture' })
    }
    await add('derived-webp', 'derived-cat.webp', 'photographic-webp', await sharp(fixturePath(cat)).webp({ quality: 85 }).toBuffer())
    await add('derived-large', 'derived-4096x3072.jpg', 'large-12.6MP-photograph', await sharp(fixturePath(base)).resize(4096,3072,{fit:'fill'}).jpeg({quality:88}).toBuffer())
    await add('derived-wide', 'derived-6000x240.jpg', 'extreme-wide-aspect', await sharp(fixturePath(base)).resize(6000,240,{fit:'fill'}).jpeg({quality:88}).toBuffer())
    await add('derived-unicode', '中文 子目录/终稿（多样性测试）.jpg', 'unicode-path-and-extension-content-mismatch', await fs.readFile(fixturePath(text)))
    await add('derived-corrupt-png', 'derived-truncated.png', 'incomplete-png-data', (await fs.readFile(fixturePath(base))).subarray(0,24), 'reject', 'preview-failure')
    const landscape = fixtures.find(item => item.name === 'Landscape_6.jpg')!
    await add('derived-corrupt-jpeg', 'derived-truncated.jpg', 'incomplete-jpeg-data', (await fs.readFile(fixturePath(landscape))).subarray(0,24), 'reject', 'preview-failure')
    await save('fixtures-complete.json', { ...manifest, fixtures, totalFixtures: fixtures.length, qualificationUnchanged: true })
  })
  await step('raw-image-codec-matrix-and-shared-ocr-pi-resource-isolation', async () => {
    const admission = createVisualAdmission(); admissions.push(admission)
    const outcomes = []
    for (const fixture of fixtures) {
      const lease = admission.open('wc01-public-raw', { sessionToken: 'owned-codec-matrix', leaseIdentity: 'owned-codec-matrix' })
      let result: unknown, errorCode: string | undefined
      try {
        await lease.prepare(fixture.id, () => fs.readFile(fixturePath(fixture)))
        assert.equal(fixture.codecExpected, 'pass', `Unsafe/unsupported raw image must refuse: ${fixture.id}`)
        lease.consume()
        result = await lease.withRequest(fixture.id, 'combined', new AbortController().signal, async bytes => {
          const m = await sharp(bytes).metadata()
          assert.equal(m.format, 'jpeg'); assert.ok(m.width! <= 1024 && m.height! <= 1024)
          if (fixture.feature === 'fully-transparent') {
            const raw = await sharp(bytes).removeAlpha().raw().toBuffer()
            assert.ok(raw.every(value => value >= 254), 'Fully transparent source flattens to white')
          }
          return { bytes: bytes.length, sha256: sha(bytes), width: m.width, height: m.height }
        })
      } catch (error) {
        if (fixture.codecExpected !== 'reject') throw error
        assert.ok(error instanceof Error && error.message === 'VISUAL_CODEC_FAILED', 'Refusal remains local; never accept unqualified runtime or unsafe resource evidence')
        errorCode = error.message
      } finally { lease.dispose() }
      await resourceOnlyProbe(admission)
      outcomes.push({ fixture: fixture.id, feature: fixture.feature, expected: fixture.codecExpected,
        outcome: errorCode ? 'LOCAL_CODEC_REFUSAL' : 'PREPARED', result, errorCode, ledger: admission.inspect(), ocrAndPiResourcePermits: 'PASS_NO_MODEL_EXECUTION' })
      log({ rawFixture: fixture.id, feature: fixture.feature, outcome: errorCode ?? 'PREPARED' })
    }
    await save('raw-codec-matrix.json', outcomes)
  })
  const positive = fixtures.filter(fixture => fixture.captureExpected === 'import')
  const excluded = fixtures.filter(fixture => fixture.captureExpected === 'exclude')
  const originalLibrary = createHost(path.join(evidence, 'source-library-v1'), [...positive,...excluded])
  await step('production-create-copy-promotion-preview-and-user-state', async () => {
    const creation = await originalLibrary.host.prepareCreate()
    assert.equal(creation.kind, 'planned'); if (creation.kind !== 'planned') throw Error('CREATE_NOT_PLANNED')
    await originalLibrary.host.confirmCreate(creation.plan.receipt)
    const addition = await originalLibrary.host.prepareAddAssets()
    assert.equal(addition.kind, 'planned'); if (addition.kind !== 'planned') throw Error('COPY_NOT_PLANNED')
    assert.equal(addition.plan.summary.eligibleCount, positive.length)
    assert.equal(addition.plan.summary.excludedCount, excluded.length)
    assert.ok(addition.plan.items.filter(item=>item.eligibility.kind==='excluded').every(item=>item.eligibility.kind==='excluded' && item.eligibility.code==='unsupported-format'))
    const copied = await originalLibrary.host.dispatchAddAssets(addition.plan.receipt)
    assert.equal(copied.state, 'complete'); assert.equal(copied.items.length, positive.length)
    assert.ok(copied.items.every(item=>item.state==='promoted'))
    const assets = await originalLibrary.host.listAssets()
    const parentTag = await originalLibrary.host.createTag({name:'WC01 public fixture parent'})
    const childTag = await originalLibrary.host.createTag({name:'WC01 confirmed fixture tag'})
    await originalLibrary.host.setTagParent(childTag.id,parentTag.id)
    await originalLibrary.host.createTagAlias(childTag.id,'WC01 fixture alias')
    for (const asset of assets.slice(0,3)) {
      await originalLibrary.host.updateAssetCaption(asset.id,'用户编辑状态保持 / WC01 public fixture')
      await originalLibrary.host.addTagToAsset(asset.id,childTag.id)
    }
    const proofs = await verifyAssetBytes(originalLibrary,positive.length)
    await save('production-intake.json',{ selected:fixtures.length-3, imported:positive.length, unsupportedExcluded:excluded.length,
      plan: addition.plan.summary, states:copied.items.map(item=>item.state), imageProofs:proofs, rawAssetsOrPrivateMetadataDumped:false })
    await originalLibrary.host.close(); await originalLibrary.host.reopen()
    assert.equal((await originalLibrary.host.listAssets()).length,positive.length)
    for(const asset of await originalLibrary.host.listAssets()) {
      const fixture = positive.find(f=>path.basename(fixturePath(f))===asset.fileName)!
      assert.equal(sha((await originalLibrary.host.readManagedOriginal(asset.id,asset.revision,asset.thumbnailRef)).bytes),fixture.sha256)
      assert.ok((await originalLibrary.host.readPreview(asset.id)).length>0)
    }
    await originalLibrary.host.close()
  })
  await step('ordinary-independent-baseline-and-work-copies', async () => {
    const initial = await databaseProof(originalLibrary.file)
    assert.equal(initial.schemaVersion,1,'Current formal creation naturally produces v1; no source downgrade')
    assert.ok(initial.fileBytes<=1048576 && initial.pageBytes<=1048576)
    await copyLibrary(originalLibrary.library,'baseline-v1')
    await copyLibrary(originalLibrary.library,'work-analysis')
    await save('initial-library-qualification.json',{ schemaVersion:initial.schemaVersion,fileBytes:initial.fileBytes,pageBytes:initial.pageBytes,
      pages:initial.pages,pageSize:initial.pageSize,sha256:initial.sha256,userTableSummaries:initial.tables,
      naturalSchema:true,mode:'ordinary-independent-file-copy',privateOriginalLibraryUsed:false })
  })
  const baselineV1 = path.join(evidence,'baseline-v1'), workAnalysis = createHost(path.join(evidence,'work-analysis'))
  const baselineV1Hashes = await treeFiles(baselineV1), prior = await databaseProof(path.join(baselineV1,'.dam/library.sqlite'))
  await step('formal-windows-analysis-disabled-migration-v1-to-v12-and-backup', async () => {
    await workAnalysis.host.open()
    const projection = workAnalysis.host.inspect(), scope = {libraryIdentity:projection.identity!,generation:projection.generation!}
    const context = await workAnalysis.host.readBackgroundAnalysis(scope)
    assert.equal(context.schemaVersion,1)
    const policy = await workAnalysis.host.configureBackgroundAnalysis({...scope,sessionToken:context.sessionToken,
      expectedRevision:context.policy.revision,expectedSchemaVersion:1,allowUpgrade:true,enabled:false,
      capabilities:{tags:false,caption:false,ocr:false}})
    assert.equal(policy.schemaVersion,12); assert.equal(policy.policy.enabled,false)
    assert.deepEqual(policy.policy.capabilities,{tags:false,caption:false,ocr:false})
    await resourceOnlyProbe(workAnalysis.admission)
    await workAnalysis.host.close()
    const backupFiles = await backups(workAnalysis.library); assert.equal(backupFiles.length,1)
    const backup = await databaseProof(backupFiles[0],prior.tables)
    assert.equal(backup.schemaVersion,1); assert.deepEqual(backup.tables,prior.tables);assert.deepEqual(backup.journal,prior.journal)
    const current = await databaseProof(workAnalysis.file,prior.tables)
    assert.equal(current.schemaVersion,12); assert.deepEqual(current.tables,prior.tables)
    assert.equal(current.journal.count,prior.journal.count+1);assert.equal(current.journal.commits.length,prior.journal.commits.length+1)
    assert.ok(current.journal.commits.some(marker=>marker.targetSchema===12))
    await workAnalysis.host.reopen(); assert.equal((await workAnalysis.host.listAssets()).length,positive.length)
    assert.equal((await workAnalysis.host.readBackgroundAnalysis(scope)).policy.enabled,false)
    await workAnalysis.host.close()
    assert.deepEqual(await treeFiles(baselineV1),baselineV1Hashes)
    await save('migration-v1-v12.json',{ source:prior,backup,current,backupCount:1,baselineUnchanged:true,
      userTablesPreserved:true,policyDisabled:true,ledger:workAnalysis.admission.inspect(),reopen:'PASS',
      adapter:'production',qualificationOverrides:false,modelsRun:false })
  })
  await step('independent-v12-baseline-and-ocr-work-copy', async () => {
    await copyLibrary(workAnalysis.library,'baseline-v12')
    await copyLibrary(workAnalysis.library,'work-ocr')
  })
  const baselineV12 = path.join(evidence,'baseline-v12'), baselineV12Hashes = await treeFiles(baselineV12)
  const beforeOcr = await databaseProof(path.join(baselineV12,'.dam/library.sqlite')), workOcr = createHost(path.join(evidence,'work-ocr'))
  await step('formal-windows-ocr-disabled-migration-v12-to-v13-and-backup', async () => {
    assert.equal(beforeOcr.schemaVersion,12); assert.ok(beforeOcr.fileBytes<=1048576&&beforeOcr.pageBytes<=1048576)
    const previousBackups = await backups(workOcr.library)
    await workOcr.host.open()
    const projection = workOcr.host.inspect(), scope={libraryIdentity:projection.identity!,generation:projection.generation!}
    const context = await workOcr.host.readBackgroundOcr(scope)
    assert.equal(context.schemaVersion,12); assert.equal(context.authorized,false)
    const result = await workOcr.host.configureBackgroundOcr({...scope,sessionToken:context.sessionToken,
      expectedRevision:context.permissionRevision,expectedSchemaVersion:12,allowUpgrade:true,enabled:false,runtimeFingerprint:''})
    assert.equal(result.schemaVersion,13); assert.equal(result.authorized,false); assert.equal(result.runtimeFingerprint,'')
    await resourceOnlyProbe(workOcr.admission); await workOcr.host.close()
    const currentBackups = await backups(workOcr.library), added = currentBackups.filter(file=>!previousBackups.includes(file))
    assert.equal(added.length,1)
    const backup=await databaseProof(added[0],beforeOcr.tables),current=await databaseProof(workOcr.file,prior.tables)
    assert.equal(backup.schemaVersion,12);assert.deepEqual(backup.tables,beforeOcr.tables);assert.deepEqual(backup.journal,beforeOcr.journal)
    assert.equal(current.schemaVersion,13);assert.deepEqual(current.tables,prior.tables)
    assert.equal(current.journal.count,beforeOcr.journal.count+1);assert.equal(current.journal.commits.length,beforeOcr.journal.commits.length+1)
    for(const marker of beforeOcr.journal.commits)assert.ok(current.journal.commits.some(next=>next.markerSha256===marker.markerSha256))
    assert.ok(current.journal.commits.some(marker=>marker.targetSchema===13))
    await workOcr.host.reopen();assert.equal((await workOcr.host.listAssets()).length,positive.length)
    const reopened = await workOcr.host.readBackgroundOcr(scope);assert.equal(reopened.authorized,false);assert.equal(reopened.runtimeFingerprint,'')
    for(const asset of await workOcr.host.listAssets()) {
      const fixture=positive.find(f=>path.basename(fixturePath(f))===asset.fileName)!
      assert.equal(sha((await workOcr.host.readManagedOriginal(asset.id,asset.revision,asset.thumbnailRef)).bytes),fixture.sha256)
      assert.ok((await workOcr.host.readPreview(asset.id)).length>0)
    }
    await workOcr.host.close();assert.deepEqual(await treeFiles(baselineV12),baselineV12Hashes)
    await save('migration-v12-v13.json',{source:beforeOcr,backup,current,additionalBackupCount:1,baselineUnchanged:true,
      userTablesPreserved:true,ocrAuthorized:false,runtimeFingerprint:'',ledger:workOcr.admission.inspect(),reopen:'PASS',modelsRun:false})
  })
  await step('malformed-input-candidate-refusal-and-unrelated-valid-intake',async()=>{
    const results=[]
    for(const fixture of fixtures.filter(f=>f.captureExpected==='preview-failure')) {
      const context=createHost(path.join(evidence,'negative-'+fixture.id),[fixture])
      const creation=await context.host.prepareCreate();if(creation.kind!=='planned')throw Error('NEGATIVE_CREATE_NOT_PLANNED')
      await context.host.confirmCreate(creation.plan.receipt)
      const addition=await context.host.prepareAddAssets();if(addition.kind!=='planned')throw Error('NEGATIVE_COPY_NOT_PLANNED')
      assert.equal(addition.plan.summary.eligibleCount,1)
      let code=''
      await assert.rejects(context.host.dispatchAddAssets(addition.plan.receipt),error=>{
        if(error&&typeof error==='object'&&'code' in error)code=String(error.code)
        return code==='preview-generation-failed'
      })
      assert.equal((await context.host.listAssets()).length,0,'Failed preview never promotes an Asset')
      context.files.value=[positive[0]]
      const recovery=await context.host.prepareAddAssets();if(recovery.kind!=='planned')throw Error('RECOVERY_COPY_NOT_PLANNED')
      const copied=await context.host.dispatchAddAssets(recovery.plan.receipt)
      assert.equal(copied.state,'complete');assert.equal((await context.host.listAssets()).length,1)
      await resourceOnlyProbe(context.admission);await context.host.close()
      await context.host.reopen();assert.equal((await context.host.listAssets()).length,1);await context.host.close()
      results.push({fixture:fixture.id,refusal:code,failedAssetPromoted:false,validIntakeAfterFailure:'PASS',reopen:'PASS',ledger:context.admission.inspect()})
    }
    await save('malformed-candidate-matrix.json',results)
  })
  await step('all-inputs-source-libraries-and-baselines-preserved',async()=>{
    for(const fixture of fixtures)assert.equal(sha(await fs.readFile(fixturePath(fixture))),fixture.sha256)
    assert.deepEqual(await treeFiles(baselineV1),baselineV1Hashes)
    assert.deepEqual(await treeFiles(baselineV12),baselineV12Hashes)
    assert.deepEqual((await databaseProof(originalLibrary.file)).tables,prior.tables)
    for(const admission of admissions)assert.deepEqual(admission.inspect(),emptyLedger)
    await save('preservation.json',{publicFixtureBytesUnchanged:true,sourceLibraryTablesUnchanged:true,
      baselineV1Unchanged:true,baselineV12Unchanged:true,allLedgers:admissions.map(admission=>admission.inspect()),privateDataRead:false})
  })
} catch(error) {failure=error}
finally {
  for(const host of hosts)try {await host.close()}catch(error){failure??=error}
  await save('result.json',{recordedAt:new Date().toISOString(),status:failure?'FAIL':'PASS',steps,
    fixtures:fixtures.length,rawCodecPass:fixtures.filter(f=>f.codecExpected==='pass').length,rawCodecReject:fixtures.filter(f=>f.codecExpected==='reject').length,
    productionImport:fixtures.filter(f=>f.captureExpected==='import').length,unsupportedFormat:fixtures.filter(f=>f.captureExpected==='exclude').length,
    malformedCandidates:fixtures.filter(f=>f.captureExpected==='preview-failure').length,ledgers:admissions.map(admission=>admission.inspect()),
    privateExistingLibrary:'NOT_ACCESSED / NOT_VERIFIED',computerUse:'NOT_RUN / USER_EXCLUDED',realModel:'NOT_RUN',runtime,
    testLevel:'Current production backend with public real-image fixtures in newly created disposable DAM libraries; not existing private-library validation'})
}
if(failure)throw failure
log({status:'PASS',execution:path.relative(repository,evidence).split(path.sep).join('/'),fixtures:fixtures.length,
  imported:fixtures.filter(f=>f.captureExpected==='import').length,computerUse:'NOT_RUN',privateDataRead:false})
