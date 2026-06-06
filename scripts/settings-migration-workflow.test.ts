import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import type { CompatibilityReport, SettingsMigrationPlan } from '../src/shared/types/settings-migration.types'
import {
  projectSettingsMigrationStatus,
  resolvePlanPanelStatus,
  resolveReportPanelStatus,
  projectSettingsMigrationSummary,
  projectSettingsMigrationBackups,
  formatBackupSize,
  SETTINGS_MIGRATION_EMPTY_LABELS
} from '../src/shared/workflows/settings-migration.workflow'

const baseReport: CompatibilityReport = {
  originalVersion: 1,
  targetVersion: 2,
  changes: [],
  warnings: [],
  blockingIssues: [],
  wouldChange: false,
  safeToApplyLater: true
}

const basePlan: SettingsMigrationPlan = {
  id: 'plan-123',
  generatedAt: '2026-06-05',
  sourceVersion: 1,
  targetVersion: 2,
  status: 'safe_to_apply',
  changes: [],
  warnings: [],
  blockingIssues: [],
  backupRequired: true,
  canApply: true,
  canRollback: false,
  dryRunResult: {
    settings: {},
    report: baseReport
  }
}

// Test resolvePlanPanelStatus
assert.equal(resolvePlanPanelStatus(null), 'not_analyzed')
assert.equal(resolvePlanPanelStatus({ ...basePlan, blockingIssues: ['some issue'] }), 'blocked')
assert.equal(resolvePlanPanelStatus({ ...basePlan, canApply: false }), 'blocked')
assert.equal(resolvePlanPanelStatus({ ...basePlan, changes: [], warnings: [] }), 'no_changes')
assert.equal(resolvePlanPanelStatus({
  ...basePlan,
  changes: [{ field: 'test', type: 'add', message: 'add it' }],
  warnings: []
}), 'safe_to_apply')

// Test resolveReportPanelStatus
assert.equal(resolveReportPanelStatus(null), 'not_analyzed')
assert.equal(resolveReportPanelStatus({ ...baseReport, blockingIssues: ['some issue'] }), 'blocked')
assert.equal(resolveReportPanelStatus({ ...baseReport, safeToApplyLater: false }), 'blocked')
assert.equal(resolveReportPanelStatus({ ...baseReport, wouldChange: false, warnings: [] }), 'no_changes')
assert.equal(resolveReportPanelStatus({ ...baseReport, wouldChange: true, warnings: [] }), 'safe_to_apply')

// Test projectSettingsMigrationStatus
const statusNotAnalyzed = projectSettingsMigrationStatus('not_analyzed')
assert.equal(statusNotAnalyzed.status, 'not_analyzed')
assert.equal(statusNotAnalyzed.label, '尚未分析')
assert.equal(statusNotAnalyzed.className, 'border-slate-200 bg-slate-50 text-slate-600')
assert.equal(statusNotAnalyzed.iconName, 'check-circle')

const statusLoading = projectSettingsMigrationStatus('loading')
assert.equal(statusLoading.label, '检查中')

// Test projectSettingsMigrationSummary
const summary = projectSettingsMigrationSummary(basePlan, null)

assert.deepEqual(summary, [
  { key: 'id', label: '方案 ID', value: 'plan-123' },
  { key: 'generatedAt', label: '生成时间', value: '2026-06-05' },
  { key: 'sourceVersion', label: '源版本', value: '1' },
  { key: 'targetVersion', label: '目标版本', value: '2' },
  { key: 'status', label: '状态', value: '可安全应用' },
  { key: 'canApply', label: '可应用', value: '是' },
  { key: 'canRollback', label: '可回滚', value: '否' },
  { key: 'backupRequired', label: '需要备份', value: '是' }
])

// Test formatBackupSize
assert.equal(formatBackupSize(0), '0 B')
assert.equal(formatBackupSize(500), '500 B')
assert.equal(formatBackupSize(1024), '1.0 KB')
assert.equal(formatBackupSize(1024 * 1024 * 1.5), '1.5 MB')

// Test projectSettingsMigrationBackups
const backups = projectSettingsMigrationBackups([
  { name: 'backup1.json', createdAt: '2026-06-05', sizeBytes: 1536 }
])
assert.deepEqual(backups, [
  { name: 'backup1.json', createdAtLabel: '2026-06-05', sizeLabel: '1.5 KB' }
])

// Test empty labels
assert.equal(SETTINGS_MIGRATION_EMPTY_LABELS.changes, '未加载任何变更。')

const panelSource = await fs.readFile('src/renderer/components/settings/SettingsMigrationPanel.tsx', 'utf8')
assert.match(panelSource, /projectSettingsMigrationStatus/)
assert.doesNotMatch(panelSource, /const statusStyles/)
assert.doesNotMatch(panelSource, /const statusLabels/)
assert.doesNotMatch(panelSource, /as any/)

console.log('settings-migration-workflow passed')
