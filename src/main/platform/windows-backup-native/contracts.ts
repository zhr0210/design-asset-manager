import type Database from 'better-sqlite3'
import type { WindowsBackupSourceEvidence } from '../windows-backup-source.internal'

export interface WindowsBackupRuntimeIdentity {
  protocol: 1
  manifestSha256: string
  sourceDigest: string
  sqliteVersion: string
  sqliteSource: string
  sqliteNativeSha256: string
  artifacts: Readonly<Record<'supervisor' | 'launcher' | 'target' | 'source', string>>
  loadBoundary: 'trusted-application-bundle'
  rssHardLimited: false
}

export interface WindowsBackupSourceBinding {
  readonly before: WindowsBackupSourceEvidence
  recheck(): WindowsBackupSourceEvidence
  /** CREATE_NEW, retained-parent reservation; refuses every existing journal. */
  reserveJournal(): void
  /** First operation inside Main's authority transaction, before domain DDL. */
  handoffJournal(): void
  /** Exactly one close attempt; an unconfirmed close poisons this Runtime. */
  close(): void
}

export interface WindowsBackupTargetReceipt {
  Outcome: 'target-verified' | 'refused'
  Reason: string | null
  Hash: string | null
  Bytes: number
  HandlesReleased: boolean
  FlushOrder: string[]
  SourceBefore: WindowsBackupSourceEvidence | null
  SourceAfter: WindowsBackupSourceEvidence | null
}

export interface WindowsBackupNativeRuntime {
  readonly identity: WindowsBackupRuntimeIdentity
  /** Source extension executes only after the caller has acquired its permit. */
  bindSource(database: Database.Database, control: string): WindowsBackupSourceBinding
  runTarget(input: {
    control: string
    operation: string
    image: Buffer
    signal: AbortSignal
    onSource(evidence: WindowsBackupSourceEvidence): string
    whileHeld(sha256: string, recheckSource: () => Promise<WindowsBackupSourceEvidence>): Promise<number>
  }): Promise<WindowsBackupTargetReceipt>
  /** True only after kernel exit and every known native close succeeded. */
  inspectReleased(): boolean
}
