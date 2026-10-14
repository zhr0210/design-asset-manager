import type Database from 'better-sqlite3'
import {applyWorkMediaSchema} from '../work-mode/work-media.schema'

/** Only called in the Host's backed-up maintenance transaction. Legacy schemas
 * stay readable until an explicit write authorizes retirement. */
export function applyWorkSetRetirementSchema(db:Database.Database) {
  const version=Number(db.pragma('user_version',{simple:true}))
  if(version===16)return
  if(!Number.isInteger(version)||version<1||version>15)throw Error('WORK_SET_SCHEMA_UNSUPPORTED')
  applyWorkMediaSchema(db)
  db.exec('ALTER TABLE work_sets DROP COLUMN note; ALTER TABLE work_sets DROP COLUMN colors_json;')
  if((db.pragma('foreign_key_check') as unknown[]).length)throw Error('WORK_SET_RETIREMENT_FOREIGN_KEY_FAILED')
  db.pragma('user_version=16')
}
