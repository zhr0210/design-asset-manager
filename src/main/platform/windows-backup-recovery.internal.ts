import {createHash} from 'node:crypto'
import type {WindowsBackupConnectionSnapshot, WindowsBackupSourceEvidence} from './windows-backup-source.internal'
import {validateWindowsBackupSource} from './windows-backup-source.internal'

export interface WindowsBackupBinding {
  format: 1; operation: string; library: string; lineage: string; controlStore: string; generation: string
  source: WindowsBackupSourceEvidence; connection: WindowsBackupConnectionSnapshot; imageSha256: string
}
export interface WindowsBackupRecoveryBundle {
  binding: string; backing: string; verified: string; finished: string | null; imageSha256: string
}
export const backupBindingSha256 = (binding: string) => createHash('sha256').update(binding, 'utf8').digest('hex')
export function serializeWindowsBackupBinding(binding: WindowsBackupBinding): string {
  if (!binding || !binding.source || !binding.connection ||
    Object.keys(binding).sort().join('|') !== ['format','operation','library','lineage','controlStore','generation','source','connection','imageSha256'].sort().join('|') ||
    Object.keys(binding.source).sort().join('|') !== ['volume','file','size','created','written','links','sha256','available','filesystem'].sort().join('|') ||
    Object.keys(binding.connection).sort().join('|') !== ['pages','pageSize','dataVersion','schemaVersion'].sort().join('|') ||
    !Object.values(binding.connection).every(value => Number.isSafeInteger(value) && value > 0)) throw Error('BACKUP_BINDING_REFUSED')
  validateWindowsBackupSource(binding.source, binding.connection)
  if (binding.format !== 1 || ![binding.operation,binding.library,binding.lineage,binding.controlStore,binding.generation].every(value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u.test(value)) ||
    typeof binding.imageSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(binding.imageSha256) || binding.source.sha256 !== binding.imageSha256) throw Error('BACKUP_BINDING_REFUSED')
  const text = JSON.stringify(binding)
  if (Buffer.byteLength(text) > 4096) throw Error('BACKUP_BINDING_REFUSED')
  return text
}
function status(text: string, phase: string, bindingSha256: string, imageSha256: string) {
  if (Buffer.byteLength(text) > 4096) throw Error('BACKUP_RECOVERY_STATUS_REFUSED')
  const value = JSON.parse(text)
  const keys = phase === 'tracer-finished' ? ['phase','productionQualified','bindingSha256','imageSha256','mainDeclaredCommitted'] : ['phase','productionQualified','bindingSha256','imageSha256']
  if (!value || text !== JSON.stringify(value) || Object.keys(value).sort().join('|') !== keys.sort().join('|') || value.phase !== phase || value.productionQualified !== false ||
    value.bindingSha256 !== bindingSha256 || value.imageSha256 !== imageSha256 || phase === 'tracer-finished' && typeof value.mainDeclaredCommitted !== 'boolean') throw Error('BACKUP_RECOVERY_STATUS_REFUSED')
  return value
}
/** Expected binding must come from the captured operation, never from these untrusted files.
 * Content evidence grants no restore/write authority and does not prove source transaction commit. */
export function inspectWindowsBackupRecovery(bundle: WindowsBackupRecoveryBundle, expected: WindowsBackupBinding) {
  const canonical = serializeWindowsBackupBinding(expected), digest = backupBindingSha256(canonical)
  if (bundle.binding !== canonical || bundle.imageSha256 !== expected.imageSha256) throw Error('BACKUP_RECOVERY_BINDING_REFUSED')
  status(bundle.backing, 'tracer-backing-up', digest, expected.imageSha256)
  status(bundle.verified, 'tracer-target-verified', digest, expected.imageSha256)
  const finish = bundle.finished === null ? undefined : status(bundle.finished, 'tracer-finished', digest, expected.imageSha256)
  return {kind: finish ? finish.mainDeclaredCommitted ? 'commit-claimed' : 'cancelled' : 'interrupted',
    snapshot: 'content-and-binding-verified', sourceCommit: 'unproven', productionQualified: false, restoreAllowed: false} as const
}
