import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../../src/main/library-lifecycle/production-active-library-dependencies'
import { DAM_BUILD_IDENTITY } from '../../src/shared/build-identity.generated'

const base = path.resolve('.scratch/f-release-scale-20261008/migrations')
await fs.mkdir(base,{recursive:true})
const sha = (bytes:Uint8Array|string) => createHash('sha256').update(bytes).digest('hex')
const results:unknown[] = []
const sources = [
  ['v1-public',path.resolve('.scratch/c-search-20261007/library')],
  ['v13-public',path.resolve('.scratch/wc01-real-model-library-20261005/run-U4eFuo/work-local')],
  ['v14-public',path.resolve('.scratch/c-search-20261007/library')]
] as const
for (const [alias,source] of sources) {
  const root = await fs.mkdtemp(path.join(base,alias+'-'))
  await fs.cp(source,root,{recursive:true,force:false,errorOnExist:true,filter:file=>!/-wal$|-shm$/.test(file)})
  for(const name of await fs.readdir(path.join(source,'.dam'))) if(name.endsWith('.sqlite')) {
    const db = new Database(path.join(source,'.dam',name),{readonly:true,fileMustExist:true})
    try { await fs.unlink(path.join(root,'.dam',name)); await db.backup(path.join(root,'.dam',name)) } finally {db.close()}
  }
  const dbFile = path.join(root,'.dam/library.sqlite')
  if (alias === 'v1-public') {
    let actualBackup: string | undefined
    for (const entry of await fs.readdir(path.join(root,'.dam/schema-backups'),{withFileTypes:true})) if (entry.isDirectory()) {
      const file = path.join(root,'.dam/schema-backups',entry.name,'library.sqlite')
      const backup = new Database(file,{readonly:true,fileMustExist:true})
      try {
        if (backup.pragma('user_version',{simple:true}) === 1) {
          assert.equal(backup.pragma('integrity_check',{simple:true}),'ok')
          assert.ok(Number(backup.prepare('SELECT count(*) FROM assets').pluck().get()) > 0, 'v1 backup must contain actual public assets')
          actualBackup = file
          break
        }
      } finally { backup.close() }
    }
    assert.ok(actualBackup, 'Actual pre-upgrade public v1 backup required, no schema downgrading')
    await fs.copyFile(actualBackup,dbFile)
  }
  const before = new Database(dbFile,{readonly:true,fileMustExist:true})
  const schema = Number(before.pragma('user_version',{simple:true}))
  const tables = ['assets','asset_lifecycle','tags','asset_tags','library_folders','library_folder_assets','visual_ai_evidence',
    'independent_tag_requests','independent_tag_executions','independent_tag_evidence','asset_ocr_evidence','asset_ocr_state']
  const present = new Set((before.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as {name:string}[]).map(row=>row.name))
  const rows = Object.fromEntries(tables.filter(table=>present.has(table)).map(table=>[table,before.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]))
  before.close()
  const files:Record<string,string> = {}
  async function collect(directory:string,prefix:string) {
    for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
      assert.equal(entry.isSymbolicLink(),false)
      const relative=prefix+'/'+entry.name,file=path.join(directory,entry.name)
      if(entry.isDirectory())await collect(file,relative)
      else if(entry.isFile())files[relative]=sha(await fs.readFile(file))
    }
  }
  await collect(path.join(root,'Originals'),'Originals')
  await collect(path.join(root,'.dam/required-previews'),'.dam/required-previews')
  const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory:async()=>({kind:'selected',directory:root}),selectLocalFiles:async()=>({kind:'cancelled'})
  }))
  try {
    await host.open();assert.equal(host.inspect().state,'ready')
    const scope={libraryIdentity:host.inspect().identity!,generation:host.inspect().generation!}
    if(schema<14) {
      const session=await host.readVisualSession(scope)
      await host.enableBasicAnalysis({...scope,sessionToken:session.sessionToken,expectedSchemaVersion:schema,allowUpgrade:true})
    }
    const media=await host.workMediaStatus(scope)
    await host.enableWorkMedia({...scope,sessionToken:media.sessionToken,expectedSchemaVersion:media.schemaVersion,allowUpgrade:true})
    await host.close();await host.reopen()
    assert.equal(host.inspect().state,'ready')
    const current=new Database(dbFile,{readonly:true,fileMustExist:true})
    try {
      assert.equal(current.pragma('user_version',{simple:true}),15)
      assert.equal(current.pragma('integrity_check',{simple:true}),'ok')
      assert.deepEqual(current.pragma('foreign_key_check'),[])
      for(const [table,previous] of Object.entries(rows))assert.deepEqual(current.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),previous,table+' preserved through migration')
    } finally {current.close()}
    for(const [file,digest] of Object.entries(files))assert.equal(sha(await fs.readFile(path.join(root,file))),digest,file)
    await host.close()
    const backups = []
    for(const entry of await fs.readdir(path.join(root,'.dam/schema-backups'),{withFileTypes:true}))if(entry.isDirectory()) {
      const file=path.join(root,'.dam/schema-backups',entry.name,'library.sqlite')
      const backup=new Database(file,{readonly:true,fileMustExist:true})
      try {assert.equal(backup.pragma('integrity_check',{simple:true}),'ok');backups.push({file,version:backup.pragma('user_version',{simple:true}),sha256:sha(await fs.readFile(file))})}
      finally{backup.close()}
    }
    const recoverable=backups.find(backup=>backup.version===schema)
    assert.ok(recoverable,'real pre-upgrade backup must be readable')
    const recoveryRoot=await fs.mkdtemp(path.join(base,alias+'-restore-'))
    await fs.cp(root,recoveryRoot,{recursive:true,force:false,errorOnExist:true})
    await fs.copyFile(recoverable.file,path.join(recoveryRoot,'.dam/library.sqlite'))
    const recovered=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
      selectLibraryDirectory:async()=>({kind:'selected',directory:recoveryRoot}),selectLocalFiles:async()=>({kind:'cancelled'})
    }))
    try {await recovered.open();assert.equal(recovered.inspect().state,'ready');assert.equal((await recovered.listAssets()).length,(rows.assets as unknown[]).length)}
    finally{await recovered.close()}
    results.push({alias,sourceSchema:schema,targetSchema:15,assets:(rows.assets as unknown[]).length,filesPreserved:Object.keys(files).length,
      backups:backups.map(({file,...value})=>({...value,alias:path.basename(path.dirname(file))})),restoredSchema:schema,
      restoreKind:'engineering restore on separate recoverable copy; not UI restoration acceptance'})
    console.log(JSON.stringify(results.at(-1)))
  } finally {await host.close()}
}
await fs.writeFile('.scratch/f-release-scale-20261008/evidence/migration-result.json',JSON.stringify({build:DAM_BUILD_IDENTITY,results,mock:false,ui:false},null,2)+'\n')
