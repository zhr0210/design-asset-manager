import os from 'node:os'
import type { VisualAdmission } from '../visual-ai/visual-admission'
import { WINDOWS_BACKUP_PROFILE } from './windows-backup-profile.internal'

type MaintenanceHold = ReturnType<VisualAdmission['hold']>

/** OS memory evidence plus the existing shared ledger; no model or business grant. */
export function reserveWindowsBackupMemory(input: {
  hold: MaintenanceHold
  imageBytes: number
  signal: AbortSignal
  readMemory?: () => { free: number; total: number }
}) {
  const p = WINDOWS_BACKUP_PROFILE
  if (!Number.isSafeInteger(input.imageBytes) || input.imageBytes < 100 || input.imageBytes > p.maxImageBytes) throw Error('BACKUP_MEMORY_IMAGE_LIMIT')
  const bytes = p.imageCopies * input.imageBytes + p.helperReserveBytes + p.mainReserveBytes
  let memory: { free: number; total: number }
  try { memory = input.readMemory ? input.readMemory() : { free: os.freemem(), total: os.totalmem() } }
  catch { throw Error('BACKUP_MEMORY_UNKNOWN') }
  if (!Number.isSafeInteger(memory.free) || !Number.isSafeInteger(memory.total) || memory.total < 1 ||
    memory.free < 0 || memory.free > memory.total) throw Error('BACKUP_MEMORY_UNKNOWN')
  const reserve = Math.max(p.freeReserveBytes, Math.ceil(memory.total * p.freeReserveFraction))
  if (memory.free < bytes + input.hold.inspect().materialBytes + reserve) throw Error('BACKUP_MEMORY_INSUFFICIENT')
  const permit = input.hold.reserveBackup(bytes, input.signal)
  return { bytes, release: permit.release }
}
