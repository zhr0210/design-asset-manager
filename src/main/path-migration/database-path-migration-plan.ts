import type { DatabasePathRemapDryRunReport } from './database-path-design'

export interface DatabasePathMigrationGate {
  backupRequired: true
  dryRunRequired: true
  sampleDatabaseTestRequired: true
  rollbackRequired: true
  userConfirmationRequired: true
  noAutoMigration: true
  oldPathFallback: true
}

export interface DatabasePathMigrationPlan {
  phase: '13B'
  planId: string
  sourceDryRun: DatabasePathRemapDryRunReport
  gates: DatabasePathMigrationGate
  applyEnabled: false
  rollbackEnabled: false
  schemaChangeIncluded: false
  dataWriteIncluded: false
  backupPlan: {
    kind: 'sqlite-file-copy'
    destination: '<managed-backup-dir>'
    beforeApplyOnly: true
  }
  rollbackPlan: {
    kind: 'restore-backup-copy'
    requiresUserConfirmation: true
  }
  sampleDatabaseTestPlan: {
    usesRuntimeDatabase: false
    fixtureKind: 'in-memory-sample-rows'
    assertions: string[]
  }
  warnings: string[]
}

export function createDatabasePathMigrationPlan(sourceDryRun: DatabasePathRemapDryRunReport): DatabasePathMigrationPlan {
  const hasLegacyFallback = sourceDryRun.summary.legacyFallback > 0
  return {
    phase: '13B',
    planId: `database-path-migration-${sourceDryRun.phase}`,
    sourceDryRun,
    gates: {
      backupRequired: true,
      dryRunRequired: true,
      sampleDatabaseTestRequired: true,
      rollbackRequired: true,
      userConfirmationRequired: true,
      noAutoMigration: true,
      oldPathFallback: true
    },
    applyEnabled: false,
    rollbackEnabled: false,
    schemaChangeIncluded: false,
    dataWriteIncluded: false,
    backupPlan: {
      kind: 'sqlite-file-copy',
      destination: '<managed-backup-dir>',
      beforeApplyOnly: true
    },
    rollbackPlan: {
      kind: 'restore-backup-copy',
      requiresUserConfirmation: true
    },
    sampleDatabaseTestPlan: {
      usesRuntimeDatabase: false,
      fixtureKind: 'in-memory-sample-rows',
      assertions: [
        'dry-run maps only paths inside the proposed library root',
        'legacy absolute values remain available as fallback',
        'empty values are skipped',
        'apply remains disabled in this phase'
      ]
    },
    warnings: hasLegacyFallback
      ? ['One or more sample paths require old path fallback before any migration can be considered.']
      : []
  }
}
