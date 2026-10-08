import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import type { AssetSearchRequest, AssetSearchPage, AssetSearchIndexStatus,AssetColorFilter,AssetColorCoverage } from '../../shared/contracts/asset-search.contract'
import type {AssetDiscoveryEvidence} from '../../shared/workflows/asset-discovery.workflow'
import type { ActiveLibraryAssetProjection } from '../../shared/contracts/active-library.contract'
import { assetDiscoveryRank, assetDiscoverySearchText, projectAssetDiscovery,refreshAssetDiscoveryMatch } from '../../shared/workflows/asset-discovery.workflow'
import { readAssets } from '../library-lifecycle/active-library-asset-queries'
import type { VisualAdmission } from '../visual-ai/visual-admission'
import {searchFolderMembers} from './folder-scope'
import {measurePreviewHistogram,PREVIEW_HISTOGRAM_RECIPE,type PreviewColorHistogram} from '../library-lifecycle/measure-preview-colors'
import {matchPreviewColor} from './color-match'

const APP_ID = 0x44414d53, BATCH = 100
const normalize = (v: string) => v.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex')
function searchProjection(a: ActiveLibraryAssetProjection) {
  return { id: a.id, revision: a.revision, title: a.title, fileName: a.fileName, thumbnailRef: a.thumbnailRef,
    sourceSiteId: a.sourceSiteId, createdAt: a.createdAt, tags: a.tags, tagAliases: a.tagAliases,
    aiCaption: a.aiCaption,aiCaptionIsUserEdited:a.aiCaptionIsUserEdited,aiCaptionSource:a.aiCaptionSource, aiOcrText: a.aiOcrText, tagAnalysis: a.tagAnalysis, visualAi: a.visualAi }
}
const fingerprint = (a: ActiveLibraryAssetProjection) => digest(searchProjection(a))
const viewKey=(a:ActiveLibraryAssetProjection)=>JSON.stringify([a.revision,a.thumbnailRef])
function grams(text: string) {
  const chars = Array.from(text), result = new Set<string>()
  for (let i = 0; i < chars.length; i++) for (let size = 1; size <= 3 && i + size <= chars.length; size++) {
    const value = chars.slice(i, i + size).join('')
    if (!/\s/u.test(value)) result.add(value)
  }
  return result
}

/** Host-only derived index. Main business tables remain the authority. TEMP
 * triggers write an independent durable dirty stream before the source commit;
 * rollback creates harmless extra work, never an unrecorded committed update.
 * Notification outbox delivery is not consumed by this independent reader. */
export function createAssetSearchIndex(d: { database: Database.Database; control: string; identity: string;
  generation: string; assertAuthority(): void; admission?: VisualAdmission;readPreview?(asset:ActiveLibraryAssetProjection):Promise<Uint8Array> }) {
  const registry = path.join(d.control, '.dam-asset-search.json')
  let index: Database.Database, store: { version: number; identity: string; file: string; storeId: string }
  let error: string | null = null, trackerFailed = false, building = false, trackingSuspended = false
  const snapshots = new Map<string, { query: AssetSearchRequest; key: string; generation: string; total: number; expires: number }>()
  const cursors = new Map<string, { snapshot: string; offset: number; key: string; expires: number }>()
  const installed = new Set<string>()
  const readRegistry = () => {
    const stat = fs.lstatSync(registry)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw Error('ASSET_SEARCH_STORAGE_INVALID')
    const value = JSON.parse(fs.readFileSync(registry, 'utf8'))
    if (value.version !== 1 || value.identity !== d.identity || !/^[a-f0-9-]{36}$/.test(value.storeId) ||
      !/^asset-search-[a-f0-9-]{36}\.sqlite$/.test(value.file) || Object.keys(value).length !== 4) throw Error('ASSET_SEARCH_STORAGE_INVALID')
    return value as typeof store
  }
  const fresh = () => {
    const id = randomUUID(), record = { version: 1, identity: d.identity, file: `asset-search-${id}.sqlite`, storeId: id }
    const filename = path.resolve(d.control, record.file)
    if (path.dirname(filename) !== path.resolve(d.control)) throw Error('ASSET_SEARCH_STORAGE_INVALID')
    const fd = fs.openSync(filename, 'wx', 0o600); fs.closeSync(fd)
    const db = new Database(filename)
    try {
      db.pragma(`application_id = ${APP_ID}`); db.pragma('user_version = 1'); db.pragma('journal_mode = WAL')
      db.exec(`CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE dirty(id TEXT PRIMARY KEY,seq INTEGER NOT NULL);
        CREATE TABLE docs(gen TEXT NOT NULL,id TEXT NOT NULL,fingerprint TEXT NOT NULL,revision TEXT NOT NULL,
          created_at TEXT NOT NULL,site TEXT NOT NULL,projection TEXT NOT NULL,PRIMARY KEY(gen,id));
        CREATE INDEX docs_created ON docs(gen,created_at DESC,id);
        CREATE TABLE grams(gen TEXT NOT NULL,scope TEXT NOT NULL,gram TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(gen,scope,gram,id)) WITHOUT ROWID;
        CREATE INDEX grams_asset ON grams(gen,id);
      `)
      const add = db.prepare('INSERT INTO meta VALUES(?,?)'), gen = randomUUID()
      for (const [k,v] of Object.entries({ identity: d.identity, storeId: id, active: gen, building: '', seq: '0', watermark: '0',
        seed: '', seeded: '0', clean: '0' })) add.run(k,v)
      const temp = path.join(d.control, `.dam-search-registry-${randomUUID()}.tmp`)
      fs.writeFileSync(temp, JSON.stringify(record), { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, registry)
      store = record; return db
    } catch (failure) { db.close(); throw failure }
  }
  try {
    store = readRegistry()
    const filename = path.resolve(d.control, store.file), stat = fs.lstatSync(filename)
    if (path.dirname(filename) !== path.resolve(d.control) || !stat.isFile() || stat.isSymbolicLink()) throw Error('ASSET_SEARCH_STORAGE_INVALID')
    try {
      index = new Database(filename, { fileMustExist: true })
      if (index.pragma('application_id', { simple: true }) !== APP_ID || index.pragma('user_version', { simple: true }) !== 1 ||
        index.pragma('quick_check', { simple: true }) !== 'ok' ||
        (index.prepare("SELECT value FROM meta WHERE key='identity'").pluck().get()) !== d.identity ||
        (index.prepare("SELECT value FROM meta WHERE key='storeId'").pluck().get()) !== store.storeId) throw Error('ASSET_SEARCH_INDEX_CORRUPT')
    } catch (failure) {
      index!?.close(); index = fresh(); error = '派生索引不可用，已保留旧文件并准备新代次。'
    }
  } catch (failure) {
    if ((failure as NodeJS.ErrnoException).code !== 'ENOENT') throw failure
    index = fresh()
  }
  const meta = (k: string) => String(index.prepare('SELECT value FROM meta WHERE key=?').pluck().get(k))
  const set = (k: string,v: string) => index.prepare('INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,v)
  if(meta('field-policy')!=='sources-v2'){set('seed','');set('seeded','0');set('field-policy','sources-v2')}
  if (meta('clean') !== '1') { set('seed',''); set('seeded','0') }
  set('clean','0')
  index.exec('CREATE TABLE IF NOT EXISTS colors(id TEXT PRIMARY KEY,view TEXT NOT NULL,recipe TEXT NOT NULL,sample TEXT,error TEXT)')
  index.exec('CREATE TEMP TABLE snapshot_hits(snapshot TEXT NOT NULL,id TEXT NOT NULL,fingerprint TEXT NOT NULL,rank INTEGER NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(snapshot,id)); CREATE INDEX snapshot_order ON snapshot_hits(snapshot,rank DESC,created_at DESC,id)')
  const mark = (id: unknown) => {
    if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(id)) return
    try { index.transaction(() => { const seq = Number(meta('seq')) + 1; set('seq', String(seq));
      index.prepare('INSERT INTO dirty VALUES(?,?) ON CONFLICT(id) DO UPDATE SET seq=excluded.seq').run(id,seq) })() }
    catch { trackerFailed = true; error = 'ASSET_SEARCH_DIRTY_WRITE_FAILED' }
  }
  d.database.function('dam_search_dirty', id => { mark(id); return null })
  const columns: Record<string,string> = { assets: 'id', asset_lifecycle: 'design_asset_identity', promotion_links: 'design_asset_identity',
    asset_tags: 'asset_id', tag_suggestions: 'asset_id', visual_ai_evidence: 'asset_id', independent_tag_current: 'asset_id',
    independent_tag_evidence: 'asset_id', independent_tag_decisions: 'asset_id', asset_ocr_state: 'asset_id',
    asset_ocr_evidence: 'asset_id', basic_analysis_current: 'asset_id', basic_analysis_requests: 'asset_id' }
  const installTracking = () => {
    if (trackingSuspended) return
    const sourceSchema = String(d.database.pragma('user_version',{simple:true}))
    if (meta('source-schema') !== sourceSchema) { set('seed',''); set('seeded','0'); set('source-schema',sourceSchema) }
    const tables = new Set((d.database.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as { name: string }[]).map(r=>r.name))
    for (const name of [...Object.keys(columns), 'tags', 'asset_candidates']) {
      if (installed.has(name) || !tables.has(name)) continue
      for (const event of ['INSERT','UPDATE','DELETE']) {
        const sources = event === 'UPDATE' ? ['OLD','NEW'] : [event === 'DELETE' ? 'OLD' : 'NEW']
        const statements = sources.map(row => name === 'tags'
          ? `SELECT dam_search_dirty(asset_id) FROM main.asset_tags WHERE tag_id=${row}.id;`
          : name === 'asset_candidates' ? `SELECT dam_search_dirty(design_asset_identity) FROM main.promotion_links WHERE candidate_identity=${row}.candidate_identity;`
            : `SELECT dam_search_dirty(${row}.${columns[name]});`).join(' ')
        d.database.exec(`CREATE TEMP TRIGGER IF NOT EXISTS dam_search_${name}_${event} AFTER ${event} ON main.${name} BEGIN ${statements} END`)
      }
      installed.add(name)
    }
  }
  installTracking()
  const suspendTracking = () => {
    if (building) throw Error('ASSET_SEARCH_INDEX_BUSY')
    trackingSuspended = true
    try {
      // Maintenance may change schema and rows while tracking is detached.
      // Keep existing snapshots; seed the derived projection once afterwards.
      set('seed',''); set('seeded','0')
      for (const name of installed) for (const event of ['INSERT','UPDATE','DELETE']) d.database.exec(`DROP TRIGGER IF EXISTS temp.dam_search_${name}_${event}`)
      installed.clear()
    } catch (failure) { installed.clear(); trackingSuspended = false; trackerFailed = true; throw failure }
    return () => { trackingSuspended = false }
  }
  const generations = () => [meta('active'), meta('building')].filter(Boolean)
  function status(): AssetSearchIndexStatus {
    const gen = meta('active'), pending = Number(index.prepare('SELECT COUNT(*) FROM dirty').pluck().get())
    return { state: trackerFailed ? 'unavailable' : meta('seeded') !== '1' || pending ? error ? 'recovering' : 'building' : 'ready',
      indexGeneration: gen, indexed: Number(index.prepare('SELECT COUNT(*) FROM docs WHERE gen=?').pluck().get(gen)), pending,
      total: Number(d.database.prepare("SELECT COUNT(*) FROM asset_lifecycle WHERE lifecycle_state='active'").pluck().get()),
      watermark: Number(meta('watermark')), error }
  }
  async function sync(signal: AbortSignal) {
    if (building) throw Error('ASSET_SEARCH_INDEX_BUSY')
    building = true
    try {
      installTracking()
      if (trackerFailed) { set('seed',''); set('seeded','0'); trackerFailed = false }
      for (;;) {
        signal.throwIfAborted(); d.assertAuthority()
        const permit = await d.admission?.reserveLocalWork('index', 32 * 1024 ** 2, signal, 'background')
        try {
          if (meta('seeded') !== '1') {
            const ids = d.database.prepare('SELECT design_asset_identity AS id FROM asset_lifecycle WHERE design_asset_identity>? ORDER BY design_asset_identity LIMIT ?').all(meta('seed'),BATCH) as { id: string }[]
            index.transaction(() => { for (const row of ids) mark(row.id); if (ids.length) set('seed',ids.at(-1)!.id); if (ids.length < BATCH) set('seeded','1') })()
          }
          const rows = index.prepare('SELECT id,seq FROM dirty ORDER BY seq LIMIT ?').all(BATCH) as { id: string; seq: number }[]
          const assets = new Map(readAssets(d.database, rows.map(r=>r.id)).map(a=>[a.id,a]))
          index.transaction(() => {
            for (const row of rows) {
              const a = assets.get(row.id)
              for (const gen of generations()) {
                const hash = a ? fingerprint(a) : ''
                if (hash && index.prepare('SELECT fingerprint FROM docs WHERE gen=? AND id=?').pluck().get(gen,row.id) === hash) continue
                index.prepare('DELETE FROM docs WHERE gen=? AND id=?').run(gen,row.id)
                index.prepare('DELETE FROM grams WHERE gen=? AND id=?').run(gen,row.id)
                if (!a) continue
                index.prepare('INSERT INTO docs VALUES(?,?,?,?,?,?,?)').run(gen,a.id,hash,a.revision,a.createdAt,a.sourceSiteId,JSON.stringify(searchProjection(a)))
                const add = index.prepare('INSERT INTO grams VALUES(?,?,?,?)')
                for (const scope of ['confirmed-only','includes-pending'] as const) for (const gram of grams(assetDiscoverySearchText(a,scope))) add.run(gen,scope,gram,a.id)
              }
              index.prepare('DELETE FROM dirty WHERE id=? AND seq=?').run(row.id,row.seq)
              set('watermark', String(Math.max(Number(meta('watermark')), row.seq)))
            }
          })()
          if (meta('seeded') === '1' && !index.prepare('SELECT 1 FROM dirty LIMIT 1').get()) {
            if (meta('building')) { set('active', meta('building')); set('building','') }
            error = null; break
          }
        } finally { permit?.release() }
        await new Promise<void>(resolve=>setImmediate(resolve))
      }
    } finally { building = false }
  }
  function expire() {
    for (const [id,snapshot] of snapshots) if (snapshot.expires < Date.now()) { snapshots.delete(id); index.prepare('DELETE FROM snapshot_hits WHERE snapshot=?').run(id) }
    for (const [id,cursor] of cursors) if (cursor.expires < Date.now() || !snapshots.has(cursor.snapshot)) cursors.delete(id)
    const keep = [...new Set([...generations(), ...[...snapshots.values()].map(s=>s.generation)])]
    index.prepare(`DELETE FROM docs WHERE gen NOT IN (${keep.map(()=>'?').join(',')})`).run(...keep)
    index.prepare(`DELETE FROM grams WHERE gen NOT IN (${keep.map(()=>'?').join(',')})`).run(...keep)
  }
  function colorCoverage():AssetColorCoverage {
    const row=index.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN c.sample IS NOT NULL THEN 1 ELSE 0 END) AS measured,
      SUM(CASE WHEN c.error IS NOT NULL THEN 1 ELSE 0 END) AS unavailable
      FROM docs d LEFT JOIN colors c ON c.id=d.id AND c.recipe=?
        AND c.view=json_array(json_extract(d.projection,'$.revision'),json_extract(d.projection,'$.thumbnailRef'))
      WHERE d.gen=?`).get(PREVIEW_HISTOGRAM_RECIPE,meta('active')) as {total:number;measured:number|null;unavailable:number|null}
    return{total:status().total,measured:row.measured??0,unavailable:row.unavailable??0,recipe:PREVIEW_HISTOGRAM_RECIPE}
  }
  async function filterColors(ids:readonly string[],filter:AssetColorFilter|undefined,signal:AbortSignal,measure=true):Promise<Map<string,AssetDiscoveryEvidence|null>>{
    if(!filter)return new Map(ids.map(id=>[id,null]))
    const matches=new Map<string,AssetDiscoveryEvidence|null>()
    for(let start=0;start<ids.length;start+=BATCH)for(const asset of readAssets(d.database,ids.slice(start,start+BATCH))){
      signal.throwIfAborted();d.assertAuthority()
      const view=viewKey(asset)
      let cached=index.prepare('SELECT sample,error FROM colors WHERE id=? AND view=? AND recipe=?').get(asset.id,view,PREVIEW_HISTOGRAM_RECIPE) as {sample:string|null;error:string|null}|undefined
      if(!cached){
        if(!measure)continue
        if(!d.readPreview)throw Error('ASSET_SEARCH_COLOR_UNAVAILABLE')
        // Authority/admission/I/O refusals are transient failures, not a saved
        // colour measurement. Only decoding a successfully read preview can
        // establish an unavailable sample for this exact view and recipe.
        const bytes=await d.readPreview(asset)
        let sample:PreviewColorHistogram|undefined
        try{sample=await measurePreviewHistogram(bytes)}
        catch{signal.throwIfAborted();d.assertAuthority()}
        signal.throwIfAborted();d.assertAuthority()
        const current=readAssets(d.database,[asset.id])[0]
        if(!current||viewKey(current)!==view)continue
        cached={sample:sample?JSON.stringify(sample):null,error:sample?null:'ASSET_SEARCH_COLOR_UNAVAILABLE'}
        index.prepare('INSERT INTO colors VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET view=excluded.view,recipe=excluded.recipe,sample=excluded.sample,error=excluded.error').run(asset.id,view,PREVIEW_HISTOGRAM_RECIPE,cached.sample,cached.error)
      }
      if(cached.sample){const evidence=matchPreviewColor(JSON.parse(cached.sample) as PreviewColorHistogram,filter);if(evidence)matches.set(asset.id,evidence)}
    }
    return matches
  }
  return {
    installTracking, suspendTracking, status,filterColors,colorCoverage,sync,
    async search(input: AssetSearchRequest, cancellation?: AbortSignal): Promise<AssetSearchPage> {
      d.assertAuthority(); expire()
      const deadline = AbortSignal.timeout(60000)
      const key = digest({ ...input, cursor: undefined }), signal = cancellation ? AbortSignal.any([deadline,cancellation]) : deadline
      let snapshotId: string, offset = 0
      if (input.cursor) {
        const cursor = cursors.get(input.cursor)
        if (!cursor || cursor.key !== key || cursor.expires < Date.now()) throw Error('ASSET_SEARCH_CURSOR_EXPIRED')
        snapshotId = cursor.snapshot; offset = cursor.offset
      } else {
        if (!building) await sync(signal)
        if (snapshots.size >= 16) throw Error('ASSET_SEARCH_BUSY')
        snapshotId = randomUUID()
        const gen = meta('active'), terms = [...new Set(normalize(input.query).split(/[\s,，。！？!?；;：:、]+/u).filter(Boolean))]
        if (terms.length > 64) throw Error('ASSET_SEARCH_QUERY_TOO_COMPLEX')
        const pivots = [...new Set(terms.map(term => Array.from(term).slice(0,3).join('')))]
        const candidates = index.prepare(`SELECT d.* FROM docs d WHERE d.gen=? ${input.sourceSiteId ? 'AND d.site=?' : ''}
          ${pivots.length ? `AND d.id IN (SELECT id FROM grams WHERE gen=? AND scope=? AND gram IN (${pivots.map(()=>'?').join(',')}) GROUP BY id HAVING COUNT(DISTINCT gram)=?)` : ''} AND d.id>? ORDER BY d.id LIMIT ${BATCH}`)
        const args = [gen,...(input.sourceSiteId ? [input.sourceSiteId] : []),...(pivots.length ? [gen,input.tagScope,...pivots,pivots.length] : [])]
        let count = 0
        const permit = await d.admission?.reserveLocalWork('index',(input.color?64:32) * 1024 ** 2,signal,'foreground')
        try {
          const insert = index.prepare('INSERT INTO snapshot_hits VALUES(?,?,?,?,?)')
          let after = ''
          for (;;) {
          const rows = candidates.all(...args,after) as Array<{ id: string; fingerprint: string; projection: string; created_at: string }>
          if (!rows.length) break
          after = rows.at(-1)!.id
          const members=searchFolderMembers(d.database,input.folderId,rows.map(r=>r.id))
          const colors=await filterColors(rows.filter(r=>members.has(r.id)).map(r=>r.id),input.color,signal)
          index.transaction(()=>{
          for (const row of rows) {
            if(!members.has(row.id)||!colors.has(row.id))continue
            signal.throwIfAborted()
            const asset = JSON.parse(row.projection) as ActiveLibraryAssetProjection
            if (!projectAssetDiscovery({ assets:[asset], query: input.query, sourceSiteId: input.sourceSiteId, tagScope: input.tagScope, tagQueries: input.tagQueries,fields:input.fields }).matches.length) continue
            if (++count > 200000) throw Error('ASSET_SEARCH_RESULT_LIMIT')
            insert.run(snapshotId,row.id,viewKey(asset),assetDiscoveryRank(asset,input.query,input.tagScope,input.fields),row.created_at)
          }
          })()
          }
        } catch(failure){index.prepare('DELETE FROM snapshot_hits WHERE snapshot=?').run(snapshotId);throw failure} finally { permit?.release() }
        snapshots.set(snapshotId, { query: input, key, generation: gen, total: count, expires: Date.now()+300000 })
      }
      const snapshot = snapshots.get(snapshotId)
      if (!snapshot) throw Error('ASSET_SEARCH_CURSOR_EXPIRED')
      const matches: AssetSearchPage['matches'] = []
      let scanned = 0
      while (matches.length < input.limit && offset < snapshot.total && scanned < 500) {
        const rows = index.prepare('SELECT id,fingerprint FROM snapshot_hits WHERE snapshot=? ORDER BY rank DESC,created_at DESC,id LIMIT ? OFFSET ?').all(snapshotId,input.limit-matches.length,offset) as {id:string;fingerprint:string}[]
        const initial = new Map(readAssets(d.database,rows.map(r=>r.id)).map(a=>[a.id,a]))
        const permit=input.color?await d.admission?.reserveLocalWork('index',32*1024**2,signal,'foreground'):undefined
        let colors:Map<string,AssetDiscoveryEvidence|null>
        try{colors=await filterColors(rows.filter(row=>{const a=initial.get(row.id);return a&&viewKey(a)===row.fingerprint}).map(row=>row.id),input.color,signal,false)}finally{permit?.release()}
        signal.throwIfAborted();d.assertAuthority()
        const assets = new Map(readAssets(d.database,rows.map(r=>r.id)).map(a=>[a.id,a]))
        const members=searchFolderMembers(d.database,input.folderId,rows.map(r=>r.id))
        offset += rows.length; scanned += rows.length
        for (const row of rows) {
          const a = assets.get(row.id)
          // Lifecycle, edits, view revision and current AI decisions are checked
          // against authority immediately before returning any frozen hit.
          if (!a || !members.has(row.id) || viewKey(a) !== row.fingerprint||!colors.has(row.id)) continue
          const match = projectAssetDiscovery({ assets:[a],query:input.query,tagScope:input.tagScope,tagQueries:input.tagQueries,sourceSiteId:input.sourceSiteId,fields:input.fields }).matches[0]
          if (match) {const color=colors.get(row.id);matches.push({asset:a,explanation:color?{lane:'lexical',evidence:[color,...(match.explanation?.evidence??[])]}:match.explanation})}
        }
      }
      let nextCursor: string | null = null
      if (offset < snapshot.total) { nextCursor = randomUUID(); cursors.set(nextCursor,{ snapshot:snapshotId,offset,key,expires:snapshot.expires }) }
      // A fully returned first page exposes no cursor and has no future reader.
      // Repeated source notifications must not retain these completed snapshots.
      if(!nextCursor&&!input.cursor){snapshots.delete(snapshotId);index.prepare('DELETE FROM snapshot_hits WHERE snapshot=?').run(snapshotId)}
      // A page can span several awaits while skipping invalid frozen hits.
      // Revalidate the complete accumulated page after the final await.
      signal.throwIfAborted();d.assertAuthority()
      const latest=new Map(readAssets(d.database,matches.map(m=>m.asset.id)).map(a=>[a.id,a]))
      const members=searchFolderMembers(d.database,input.folderId,matches.map(m=>m.asset.id))
      const safe=matches.flatMap(match=>{const asset=latest.get(match.asset.id)
        if(!asset||!members.has(asset.id)||viewKey(asset)!==viewKey(match.asset))return[]
        const current=refreshAssetDiscoveryMatch(match,asset,input);return current?[current]:[]})
      return { matches:safe,total:snapshot.total,nextCursor,index:status(),...(input.color?{colors:colorCoverage()}:{}) }
    },
    async rebuild() {
      d.assertAuthority(); if (building) throw Error('ASSET_SEARCH_INDEX_BUSY')
      index.prepare('DELETE FROM colors WHERE error IS NOT NULL').run()
      set('building',randomUUID()); set('seed',''); set('seeded','0')
      await sync(AbortSignal.timeout(60000)); return status()
    },
    close() { snapshots.clear(); cursors.clear(); if (!trackerFailed && !building) set('clean','1'); index.close() },
  }
}
export type AssetSearchIndex = ReturnType<typeof createAssetSearchIndex>
