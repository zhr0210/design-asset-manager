import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

import { CREATE_DOWNLOAD_TASKS_TABLE } from '../db/schema'

export interface AppStorage {
  readonly database: Database.Database
  close(): void
}

/** App-scoped store; it never contains or opens Library Asset tables. */
export function createAppStorage(appStateDirectory: string): AppStorage {
  if (!path.isAbsolute(appStateDirectory)) throw new Error('APP_STORAGE_DIRECTORY_INVALID')
  fs.mkdirSync(appStateDirectory, { recursive: true })
  const database = new Database(path.join(appStateDirectory, 'app-state.sqlite'))
  try {
    database.pragma('foreign_keys = ON')
    database.exec(CREATE_DOWNLOAD_TASKS_TABLE)
    return Object.freeze({ database, close: () => { if (database.open) database.close() } })
  } catch (error) {
    database.close()
    throw error
  }
}
