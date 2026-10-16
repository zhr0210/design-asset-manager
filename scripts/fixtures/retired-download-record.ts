import Database from 'better-sqlite3'
export function seedRetiredDownloadRecord(file: string, scope: { libraryIdentity: string; generation: string }, id: string) {
  const db = new Database(file)
  try {
    const now = new Date().toISOString()
    db.prepare("INSERT INTO managed_download_intents(task_id,library_identity,creation_generation,request_url,file_name,phase,revision,transfer_epoch,identity_encoding,committed_bytes,created_at,updated_at) VALUES(?,?,?,?,?,'pending',0,0,1,0,?,?)").run(id,scope.libraryIdentity,scope.generation,'https://fixture.invalid/not-requested.png','generated.png',now,now)
  } finally { db.close() }
}
export function retiredDownloadCount(file: string): number {
  const db = new Database(file, { readonly: true })
  try { return db.prepare('SELECT count(*) FROM managed_download_intents').pluck().get() as number }
  finally { db.close() }
}
