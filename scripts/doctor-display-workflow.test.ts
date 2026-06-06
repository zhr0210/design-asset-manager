import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import type { DoctorCheckResult, DoctorReport } from '../src/shared/types/doctor.types'
import {
  maskDoctorPath,
  projectDoctorCheckLabel,
  projectDoctorCheckList,
  projectDoctorDateLabel,
  projectDoctorDetailsLabel,
  projectDoctorInfoLabel,
  projectDoctorPathSummaryDisplay,
  projectDoctorReportSummaryDisplay,
  projectDoctorStatusDisplay
} from '../src/shared/workflows/doctor-display.workflow'

assert.deepEqual(projectDoctorStatusDisplay('loading'), {
  status: 'loading',
  label: '检测中',
  badgeClass: 'border-brand-100 bg-brand-50 text-brand-600',
  icon: 'loading'
})
assert.equal(projectDoctorStatusDisplay('ok').label, '正常')
assert.equal(projectDoctorStatusDisplay('warning').icon, 'warning')
assert.equal(projectDoctorStatusDisplay('error').badgeClass, 'border-rose-100 bg-rose-50 text-rose-700')
assert.equal(projectDoctorStatusDisplay(null).label, '未检测')
assert.equal(projectDoctorInfoLabel('platform'), '系统')
assert.equal(projectDoctorInfoLabel('custom'), 'custom')
assert.equal(projectDoctorCheckLabel('ai-worker'), 'AI Worker 服务')
assert.equal(projectDoctorCheckLabel('custom-check', 'Custom Check'), 'Custom Check')
assert.equal(projectDoctorDateLabel(null), '无')
assert.equal(projectDoctorDateLabel('not-a-date'), 'not-a-date')
assert.equal(projectDoctorDetailsLabel(undefined), '无')
assert.match(projectDoctorDetailsLabel({ nested: { ok: true } }), /"ok": true/)
assert.equal(maskDoctorPath('/Users/example/Library/Application Support/DesignAssetManager'), '.../Application Support/DesignAssetManager')

const pathCheck = check('path', 'Path', 'warning', 'path warning', {
  paths: {
    userDataDir: { path: '/Users/example/Library/Application Support/DesignAssetManager', exists: true, isDirectory: true }
  },
  audit: {
    checkedPaths: [
      {
        key: 'userDataDir',
        path: '/Users/example/Library/Application Support/DesignAssetManager',
        status: 'warning',
        warnings: ['unsafe /Users/example/Library/Application Support/DesignAssetManager']
      },
      {
        key: 'logsDir',
        path: '/Users/example/Library/Logs/DesignAssetManager',
        status: 'ok'
      }
    ],
    warnings: ['path warning /Users/example/Library/Logs/DesignAssetManager'],
    blockingIssues: []
  }
})
const permissionCheck = check('permission', 'Permission', 'warning', 'permission warning', {
  paths: [{ label: 'userDataDir', writable: true }],
  logPaths: [{ label: 'logsDir', writable: false, error: 'denied /Users/example/Library/Logs/DesignAssetManager' }],
  cacheTempPaths: []
})
const report: DoctorReport = {
  id: 'doctor-test',
  generatedAt: '2026-06-05T00:00:00.000Z',
  platform: 'darwin',
  arch: 'arm64',
  profile: 'macos-apple-silicon',
  overallStatus: 'warning',
  checks: [pathCheck, permissionCheck, check('python', 'Python Original', 'ok', 'python ok')]
}

const reportSummary = projectDoctorReportSummaryDisplay(report)
assert.equal(reportSummary.platformLabel, 'macOS')
assert.equal(reportSummary.archLabel, 'arm64')
assert.equal(reportSummary.profileLabel, 'macos-apple-silicon')
assert.equal(reportSummary.overallLabel, '提醒')
assert.notEqual(reportSummary.generatedAtLabel, '无')

const checks = projectDoctorCheckList(report, [{ id: 'custom', label: 'Custom Known' }])
assert.deepEqual(checks.slice(0, 4).map((item) => item.id), ['system', 'path', 'node', 'python'])
assert.equal(checks.find((item) => item.id === 'path')?.label, '路径治理')
assert.equal(checks.find((item) => item.id === 'custom')?.label, 'Custom Known')

const emptyPathSummary = projectDoctorPathSummaryDisplay(null)
assert.equal(emptyPathSummary.empty, true)
assert.equal(emptyPathSummary.emptyTitle, '路径治理')
assert.equal(emptyPathSummary.emptyMessage, '尚未加载 Doctor 体检报告。')

const pathSummary = projectDoctorPathSummaryDisplay(report)
assert.equal(pathSummary.empty, false)
assert.equal(pathSummary.title, '路径治理')
assert.equal(pathSummary.statusLabel, '提醒')
assert.equal(pathSummary.warningTitle, '路径提醒')
assert.equal(pathSummary.permissionTitle, '权限探测')
assert.equal(pathSummary.paths.length, 9)
assert.equal(pathSummary.paths.find((item) => item.key === 'userDataDir')?.statusLabel, '提醒')
assert.equal(pathSummary.paths.find((item) => item.key === 'logsDir')?.statusLabel, '提醒')
assert.ok(pathSummary.warnings.every((item) => !item.includes('/Users/example')))
assert.ok(pathSummary.permissions.every((item) => !item.includes('/Users/example')))
assert.deepEqual(pathSummary.details, [
  '已汇总 9 个托管路径条目。',
  '报告中包含 1 条路径提醒或阻塞项。',
  '报告中包含 1 条权限探测提醒。'
])

const doctorPanelSource = await fs.readFile('src/renderer/components/settings/DoctorPanel.tsx', 'utf8')
const pathSummarySource = await fs.readFile('src/renderer/components/settings/PathGovernanceSummary.tsx', 'utf8')
const sharedIndexSource = await fs.readFile('src/shared/index.ts', 'utf8')

assert.match(doctorPanelSource, /projectDoctorStatusDisplay/)
assert.match(doctorPanelSource, /projectDoctorCheckList/)
assert.match(doctorPanelSource, /projectDoctorReportSummaryDisplay/)
assert.match(pathSummarySource, /projectDoctorPathSummaryDisplay/)
assert.match(sharedIndexSource, /doctor-display\.workflow/)
assert.doesNotMatch(doctorPanelSource, /const\s+INFO_LABELS/)
assert.doesNotMatch(doctorPanelSource, /const\s+CHECK_LABELS/)
assert.doesNotMatch(doctorPanelSource, /const\s+STATUS_LABELS/)
assert.doesNotMatch(doctorPanelSource, /const\s+STATUS_STYLES/)
assert.doesNotMatch(doctorPanelSource, /function formatDate/)
assert.doesNotMatch(doctorPanelSource, /function stringifyDetails/)
assert.doesNotMatch(pathSummarySource, /const\s+STATUS_STYLE/)
assert.doesNotMatch(pathSummarySource, /MANAGED_PATH_KEYS/)
assert.doesNotMatch(pathSummarySource, /function buildSummary/)
assert.doesNotMatch(pathSummarySource, /function collectPaths/)
assert.doesNotMatch(pathSummarySource, /function maskPath/)
assert.doesNotMatch(pathSummarySource, /Path governance/)
assert.doesNotMatch(pathSummarySource, /No Doctor report has been loaded yet/)

console.log('doctor-display-workflow passed')

function check(
  id: string,
  label: string,
  status: DoctorCheckResult['status'],
  message: string,
  details?: Record<string, unknown>
): DoctorCheckResult {
  return {
    id,
    label,
    status,
    message,
    details,
    durationMs: 10
  }
}
