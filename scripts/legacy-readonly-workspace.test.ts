import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import Database from 'better-sqlite3'
import { createLegacyReadOnlyWorkspace } from '../src/main/legacy-readonly-workspace'
import { CREATE_ASSETS_TABLE, CREATE_ASSET_TAGS_TABLE, CREATE_TAGS_TABLE } from '../src/main/db/schema'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-legacy-readonly-')))
const databasePath=path.join(root,'legacy.sqlite')
const previewPath=path.join(root,'preview.png')
const previewBytes=Buffer.from([137,80,78,71,13,10,26,10,0])
await fs.writeFile(previewPath,previewBytes)
const fixture=new Database(databasePath)
fixture.pragma('foreign_keys=ON')
fixture.exec([CREATE_ASSETS_TABLE,CREATE_TAGS_TABLE,CREATE_ASSET_TAGS_TABLE].join('\n'))
const now='2026-09-10T00:00:00.000Z'
fixture.prepare(`INSERT INTO assets(id,title,file_name,file_path,thumbnail_path,source_site_id,source_site_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).run('legacy-asset','Legacy Poster','legacy.png',previewPath,previewPath,'legacy','Legacy',now,now)
fixture.prepare(`INSERT INTO tags(id,name,normalized_name,type,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run('legacy-tag','archive','archive','custom',now,now)
fixture.prepare(`INSERT INTO asset_tags(id,asset_id,tag_id,source,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`).run('legacy-rel','legacy-asset','legacy-tag','manual','confirmed',now,now)
fixture.close()
const before=await evidence(databasePath)
let sequence=0
const workspace=createLegacyReadOnlyWorkspace({selection:{selectLegacyDatabase:async()=>({kind:'selected',databasePath,assetRootDirectory:root,tildeRootDirectory:root})},evidenceLevel:'synthetic-read-only',createIdentity:(kind)=>`${kind}:${++sequence}`})
const planned=await workspace.prepare();assert.equal(planned.kind,'planned');if(planned.kind!=='planned')throw new Error()
assert.deepEqual(planned.review.counts,{assets:1,tags:1,relations:1})
assert.equal(planned.review.mutationPolicy,'no-migration-no-copy-no-write')
const ready=await workspace.confirm(planned.review.receipt)
assert.equal(ready.state,'ready')
assert.equal(ready.evidenceLevel,'synthetic-read-only')
const listed=await workspace.list();assert.equal(listed.length,1);assert.deepEqual(listed[0].tags,['archive']);assert.equal(listed[0].referencedFileAvailable,true)
assert.equal((await workspace.search('poster')).length,1)
assert.equal((await workspace.search('archive')).length,1)
assert.deepEqual(Buffer.from(await workspace.readPreview('legacy-asset')),previewBytes)
await assert.rejects(workspace.readPreview('../private'),/LEGACY_READONLY_REQUEST_INVALID/)
await workspace.close()
const after=await evidence(databasePath)
assert.deepEqual(after,before,'Read-only workspace must not change legacy database bytes or stat.')
for(const suffix of['-wal','-shm','-journal'])await assert.rejects(fs.access(`${databasePath}${suffix}`))

const unsafeDatabasePath=path.join(root,'unsafe.sqlite')
await fs.copyFile(databasePath,unsafeDatabasePath)
const tildePreview=path.join(root,'tilde.png')
await fs.writeFile(tildePreview,previewBytes)
const nonImage=path.join(root,'not-image.png')
await fs.writeFile(nonImage,Buffer.from('not an image'))
const largeImage=path.join(root,'large.png')
await fs.writeFile(largeImage,previewBytes)
await fs.truncate(largeImage,32*1024*1024+1)
const outsideRoot=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-legacy-outside-')))
const outsidePreview=path.join(outsideRoot,'outside.png')
await fs.writeFile(outsidePreview,previewBytes)
const symlinkPreview=path.join(root,'symlink.png')
await fs.symlink(outsidePreview,symlinkPreview)
const unsafeFixture=new Database(unsafeDatabasePath)
for(const [id,thumbnail] of [
  ['tilde-asset','~/tilde.png'],
  ['outside-asset',outsidePreview],
  ['symlink-asset',symlinkPreview],
  ['nonimage-asset',nonImage],
  ['large-asset',largeImage]
] as const){
  unsafeFixture.prepare(`INSERT INTO assets(id,title,file_name,file_path,thumbnail_path,source_site_id,source_site_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).run(id,id,`${id}.png`,thumbnail,thumbnail,'legacy','Legacy',now,now)
}
unsafeFixture.close()
const unsafeWorkspace=createLegacyReadOnlyWorkspace({selection:{selectLegacyDatabase:async()=>({kind:'selected',databasePath:unsafeDatabasePath,assetRootDirectory:root,tildeRootDirectory:root})},evidenceLevel:'synthetic-read-only'})
const unsafeReview=await unsafeWorkspace.prepare();if(unsafeReview.kind!=='planned')throw new Error()
await unsafeWorkspace.confirm(unsafeReview.review.receipt)
assert.deepEqual(Buffer.from(await unsafeWorkspace.readPreview('tilde-asset')),previewBytes,'Historical ~/ references must resolve only through the selected tilde root.')
for(const id of['outside-asset','symlink-asset','nonimage-asset','large-asset']){
  await assert.rejects(unsafeWorkspace.readPreview(id),/LEGACY_READONLY_PREVIEW_UNAVAILABLE/)
}
await unsafeWorkspace.close()

for(const suffix of['-wal','-journal']){
  const guardedPath=path.join(root,`guarded-${suffix.slice(1)}.sqlite`)
  await fs.copyFile(databasePath,guardedPath)
  const sidecar=`${guardedPath}${suffix}`
  await fs.writeFile(sidecar,Buffer.from('synthetic recovery sidecar'))
  const guardedBefore=await Promise.all([evidence(guardedPath),evidence(sidecar)])
  const guarded=createLegacyReadOnlyWorkspace({selection:{selectLegacyDatabase:async()=>({kind:'selected',databasePath:guardedPath,assetRootDirectory:root})}})
  await assert.rejects(guarded.prepare(),/LEGACY_READONLY_DATABASE_UNAVAILABLE/)
  assert.deepEqual(await Promise.all([evidence(guardedPath),evidence(sidecar)]),guardedBefore,`${suffix} rejection must not mutate either file.`)
  await guarded.close()
}

const replacedPath=path.join(root,'replaced.sqlite')
await fs.copyFile(databasePath,replacedPath)
const replacedWorkspace=createLegacyReadOnlyWorkspace({selection:{selectLegacyDatabase:async()=>({kind:'selected',databasePath:replacedPath,assetRootDirectory:root})}})
const replacedReview=await replacedWorkspace.prepare();if(replacedReview.kind!=='planned')throw new Error()
const replacement=path.join(root,'replacement.sqlite')
await fs.copyFile(databasePath,replacement)
await fs.rename(replacement,replacedPath)
await assert.rejects(replacedWorkspace.confirm(replacedReview.review.receipt),/LEGACY_READONLY_REVIEW_STALE/)
for(const suffix of['-wal','-shm','-journal'])await assert.rejects(fs.access(`${replacedPath}${suffix}`))
await replacedWorkspace.close()

const activeSwapPath=path.join(root,'active-swap.sqlite')
await fs.copyFile(databasePath,activeSwapPath)
const activeSwapWorkspace=createLegacyReadOnlyWorkspace({selection:{selectLegacyDatabase:async()=>({kind:'selected',databasePath:activeSwapPath,assetRootDirectory:root})}})
const activeSwapReview=await activeSwapWorkspace.prepare();if(activeSwapReview.kind!=='planned')throw new Error()
await activeSwapWorkspace.confirm(activeSwapReview.review.receipt)
const heldOriginal=path.join(root,'active-swap-original.sqlite')
await fs.rename(activeSwapPath,heldOriginal)
await fs.copyFile(databasePath,activeSwapPath)
const heldBefore=await evidence(heldOriginal)
await assert.rejects(activeSwapWorkspace.list(),/LEGACY_READONLY_REVIEW_STALE/)
assert.deepEqual(await evidence(heldOriginal),heldBefore,'Replacing the selected path must not mutate the originally opened node.')
for(const candidate of[activeSwapPath,heldOriginal])for(const suffix of['-wal','-shm','-journal'])await assert.rejects(fs.access(`${candidate}${suffix}`))
await assert.rejects(activeSwapWorkspace.close(),/LEGACY_READONLY_REVIEW_STALE/)

const cancelled=createLegacyReadOnlyWorkspace({selection:{selectLegacyDatabase:async()=>({kind:'cancelled'})}})
assert.deepEqual(await cancelled.prepare(),{kind:'cancelled'})
await cancelled.close()
console.log('Legacy Read-Only Workspace passed')

async function evidence(filePath:string){const stat=await fs.stat(filePath,{bigint:true});const bytes=await fs.readFile(filePath);return{sha:createHash('sha256').update(bytes).digest('hex'),size:stat.size,mtimeNs:stat.mtimeNs,ino:stat.ino,dev:stat.dev}}
