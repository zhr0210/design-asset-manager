import crypto from 'crypto'
import type { DoctorCheckContext, DoctorCheckResult, DoctorReport } from '../../shared/types/doctor.types'
import { detectPlatform } from '../platform/platform-detector'
import { resolveManagedPaths } from '../platform/path-resolver'
import type { RegisteredDoctorCheck, RunDoctorOptions } from './doctor.types'
import { aiWorkerCheck } from './checks/ai-worker.check'
import { nativeDepsCheck } from './checks/native-deps.check'
import { nodeCheck } from './checks/node.check'
import { pathCheck } from './checks/path.check'
import { permissionCheck } from './checks/permission.check'
import { portCheck } from './checks/port.check'
import { pythonCheck } from './checks/python.check'
import { systemCheck } from './checks/system.check'

const DEFAULT_TIMEOUT_MS = 5000

export const DEFAULT_DOCTOR_CHECKS: RegisteredDoctorCheck[] = [
  systemCheck,
  pathCheck,
  nodeCheck,
  pythonCheck,
  portCheck,
  nativeDepsCheck,
  aiWorkerCheck,
  permissionCheck
]

export function aggregateDoctorStatus(checks: DoctorCheckResult[]): DoctorReport['overallStatus'] {
  if (checks.some((check) => check.status === 'error')) return 'error'
  if (checks.some((check) => check.status === 'warning')) return 'warning'
  return 'ok'
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export class EnvironmentDoctor {
  private checks: Map<string, RegisteredDoctorCheck>

  public constructor(checks: RegisteredDoctorCheck[] = DEFAULT_DOCTOR_CHECKS) {
    this.checks = new Map(checks.map((check) => [check.id, check]))
  }

  public listChecks(): RegisteredDoctorCheck[] {
    return [...this.checks.values()]
  }

  public async runAllChecks(options: RunDoctorOptions = {}): Promise<DoctorReport> {
    return this.runChecks([...this.checks.keys()], options)
  }

  public async runCheckById(id: string, options: RunDoctorOptions = {}): Promise<DoctorCheckResult> {
    const context = this.createContext(options)
    return this.runOne(id, context)
  }

  public async runChecks(checkIds: string[], options: RunDoctorOptions = {}): Promise<DoctorReport> {
    const context = this.createContext(options)
    const checks = await Promise.all(checkIds.map((id) => this.runOne(id, context)))
    return {
      id: `doctor-${crypto.randomUUID()}`,
      generatedAt: new Date().toISOString(),
      platform: context.platformInfo.platform,
      arch: context.platformInfo.arch,
      profile: context.platformInfo.profile,
      overallStatus: aggregateDoctorStatus(checks),
      checks
    }
  }

  private createContext(options: RunDoctorOptions): DoctorCheckContext {
    const platformInfo = options.context?.platformInfo ?? detectPlatform()
    const managedPaths = options.context?.managedPaths ?? resolveManagedPaths()
    return {
      platformInfo,
      managedPaths,
      settingsSnapshot: options.context?.settingsSnapshot,
      aiWorkerConfig: options.context?.aiWorkerConfig ?? {
        baseUrl: 'http://127.0.0.1:8000',
        healthPath: '/health',
        timeoutMs: Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 2000)
      },
      timeoutMs: options.timeoutMs ?? options.context?.timeoutMs ?? DEFAULT_TIMEOUT_MS
    }
  }

  private async runOne(id: string, context: DoctorCheckContext): Promise<DoctorCheckResult> {
    const check = this.checks.get(id)
    const startedAt = Date.now()
    if (!check) {
      return {
        id,
        label: id,
        status: 'skipped',
        message: `Doctor check '${id}' is not registered.`,
        durationMs: Date.now() - startedAt
      }
    }

    try {
      return await withTimeout(check.run(context), context.timeoutMs, check.id)
    } catch (err) {
      return {
        id: check.id,
        label: check.label,
        status: 'error',
        message: `Doctor check failed: ${err instanceof Error ? err.message : String(err)}`,
        details: { error: err instanceof Error ? err.stack ?? err.message : String(err) },
        durationMs: Date.now() - startedAt
      }
    }
  }
}
