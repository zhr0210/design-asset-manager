import assert from 'node:assert/strict'
import type { DoctorCheckContext, DoctorCheckResult, DoctorReport } from '../src/shared/types/doctor.types'
import { EnvironmentDoctor } from '../src/main/doctor/environment-doctor'
import type { RegisteredDoctorCheck } from '../src/main/doctor/doctor.types'
import { DoctorCacheService } from '../src/main/services/doctor/doctor-cache.service'
import { DoctorLogService } from '../src/main/services/doctor/doctor-log.service'
import { DoctorService } from '../src/main/services/doctor/doctor.service'

class SilentDoctorLogService extends DoctorLogService {
  public logReportSummary(): void {}
  public logCheckFailure(): void {}
  public logDoctorError(): void {}
}

const baseContext: Partial<DoctorCheckContext> = {
  platformInfo: {
    platform: 'win32',
    arch: 'x64',
    profile: 'windows-x64',
    isWindows: true,
    isMacOS: false,
    isAppleSilicon: false
  },
  managedPaths: {
    userDataDir: 'C:/managed/user-data',
    configDir: 'C:/managed/user-data/config',
    databaseDir: 'C:/managed/user-data/database',
    logsDir: 'C:/managed/user-data/logs',
    cacheDir: 'C:/managed/user-data/cache',
    runtimeDir: 'C:/managed/user-data/runtime',
    modelsDir: 'C:/managed/user-data/models',
    tempDir: 'C:/managed/temp',
    downloadsDir: 'C:/managed/downloads'
  },
  timeoutMs: 1000
}

function result(id: string, status: DoctorCheckResult['status'] = 'ok'): DoctorCheckResult {
  return {
    id,
    label: id,
    status,
    message: status,
    durationMs: 0
  }
}

const checks: RegisteredDoctorCheck[] = [
  {
    id: 'safe-check',
    label: 'Safe check',
    async run() {
      return result('safe-check')
    }
  },
  {
    id: 'second-check',
    label: 'Second check',
    async run() {
      return result('second-check')
    }
  },
  {
    id: 'failing-check',
    label: 'Failing check',
    async run() {
      throw new Error('intentional failure')
    }
  }
]

const service = new DoctorService({
  doctor: new EnvironmentDoctor(checks),
  logger: new SilentDoctorLogService()
})

const report = await service.runAll({ context: baseContext })
assert.equal(report.checks.length, 3)
assert.equal(report.overallStatus, 'error')
assert.equal(service.getLastReport()?.id, report.id)
assert.equal(service.getLastRunAt(), report.generatedAt)

service.clearLastReport()
assert.equal(service.getLastReport(), null)
assert.equal(service.getLastRunAt(), null)

const partialReport = await service.runChecks(['safe-check'], { context: baseContext })
assert.deepEqual(partialReport.checks.map((check) => check.id), ['safe-check'])

const oneCheck = await service.runCheck('failing-check', { context: baseContext })
assert.equal(oneCheck.status, 'error')

const cache = new DoctorCacheService()
assert.equal(cache.isStale(1000), true)
const nowReport: DoctorReport = { ...partialReport, generatedAt: new Date().toISOString() }
cache.setLastReport(nowReport)
assert.equal(cache.isStale(60_000), false)
cache.setLastReport({ ...partialReport, generatedAt: new Date(Date.now() - 120_000).toISOString() })
assert.equal(cache.isStale(1000), true)

assert.equal(service.listChecks().some((check) => check.id.includes('bootstrap')), false)
assert.equal(service.listChecks().some((check) => check.id.includes('ai-worker-start')), false)
