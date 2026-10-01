import fs from 'node:fs'

import Database from 'better-sqlite3'

/** Main-internal read transaction. Never creates, repairs or returns write authority. */
export function openReadonlyLibraryDatabase(databaseFile: string): Database.Database {
  if (process.platform !== 'darwin' || !sqliteRecoverySidecarsAbsent(databaseFile)) {
    throw new Error('LIBRARY_READ_DATABASE_UNAVAILABLE')
  }
  const database = new Database(databaseFile, {
    readonly: true,
    fileMustExist: true,
    timeout: 0
  })
  try {
    // Connection-local read protection, before any pager read. On the proven
    // macOS POSIX host this refuses WAL before it can open WAL/SHM sidecars.
    // It neither changes journal mode nor acquires a writer transaction.
    database.pragma('locking_mode = EXCLUSIVE')
    database.pragma('query_only = ON')
    database.exec('BEGIN')
    return database
  } catch {
    database.close()
    throw new Error('LIBRARY_READ_DATABASE_UNAVAILABLE')
  }
}

export function sqliteRecoverySidecarsAbsent(databaseFile: string): boolean {
  for (const suffix of ['-journal', '-wal', '-shm']) {
    try {
      fs.lstatSync(`${databaseFile}${suffix}`)
      return false
    } catch (error) {
      if (!error || typeof error !== 'object' ||
        !('code' in error) || error.code !== 'ENOENT') return false
    }
  }
  return true
}
