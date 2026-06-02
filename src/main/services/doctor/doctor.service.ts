import type { DoctorCheckResult, DoctorReport } from '../../../shared/types/doctor.types'
import { EnvironmentDoctor } from '../../doctor/environment-doctor'
import type { RegisteredDoctorCheck, RunDoctorOptions } from '../../doctor/doctor.types'
import { ensureDirectory } from '../../platform/filesystem-guard'
import { resolveManagedPaths } from '../../platform/path-resolver'
import { DoctorCacheService } from './doctor-cache.service'
import { DoctorLogService } from './doctor-log.service'

export interface DoctorServiceOptions {
  doctor?: EnvironmentDoctor
  cache?: DoctorCacheService
  logger?: DoctorLogService
}

export class DoctorService {
  private static instance: DoctorService
  private readonly doctor: EnvironmentDoctor
  private readonly cache: DoctorCacheService
  private readonly logger: DoctorLogService

  public constructor(options: DoctorServiceOptions = {}) {
    this.doctor = options.doctor ?? new EnvironmentDoctor()
    this.cache = options.cache ?? new DoctorCacheService()
    this.logger = options.logger ?? new DoctorLogService()
  }

  public static getInstance(): DoctorService {
    if (!DoctorService.instance) {
      DoctorService.instance = new DoctorService()
    }
    return DoctorService.instance
  }

  public async runAll(options?: RunDoctorOptions): Promise<DoctorReport> {
    return this.captureReport(() => this.doctor.runAllChecks(options))
  }

  public async runChecks(checkIds: string[], options?: RunDoctorOptions): Promise<DoctorReport> {
    return this.captureReport(() => this.doctor.runChecks(checkIds, options))
  }

  public async runCheck(checkId: string, options?: RunDoctorOptions): Promise<DoctorCheckResult> {
    const check = await this.doctor.runCheckById(checkId, options)
    if (check.status === 'error') {
      this.logger.logCheckFailure(check)
    }
    return check
  }

  public async repairCheck(checkId: string, options?: RunDoctorOptions): Promise<{
    check: DoctorCheckResult
    repair: { checkId: string; action: string; changed: boolean; message: string }
  }> {
    const repair = await this.applyRepair(checkId)
    const check = await this.runCheck(checkId, options)
    return { check, repair }
  }

  public getLastReport(): DoctorReport | null {
    return this.cache.getLastReport()
  }

  public clearLastReport(): void {
    this.cache.clear()
  }

  public getLastRunAt(): string | null {
    return this.cache.getLastRunAt()
  }

  public listChecks(): RegisteredDoctorCheck[] {
    return this.doctor.listChecks()
  }

  private async applyRepair(checkId: string): Promise<{ checkId: string; action: string; changed: boolean; message: string }> {
    if (checkId === 'path' || checkId === 'permission') {
      const managedPaths = resolveManagedPaths()
      await Promise.all(Object.values(managedPaths).map((dir) => ensureDirectory(dir)))
      return {
        checkId,
        action: 'ensure-managed-directories',
        changed: true,
        message: '已创建或确认应用托管目录，随后自动重检该项目。'
      }
    }

    if (checkId === 'node') {
      return {
        checkId,
        action: 'use-bundled-electron-node',
        changed: false,
        message: '已使用软件内置 Electron Node 运行时重新检测；打包版无需用户安装 npm。'
      }
    }

    if (checkId === 'native-deps') {
      return {
        checkId,
        action: 'verify-packaged-native-dependencies',
        changed: false,
        message: '已重新验证打包内原生依赖；如仍失败，请重新安装最新软件包。'
      }
    }

    if (checkId === 'ai-worker' || checkId === 'port') {
      return {
        checkId,
        action: 'refresh-local-service-state',
        changed: false,
        message: '已刷新本地服务状态；如 AI Worker 未启动，请在 AI 控制台启动或配置对应服务。'
      }
    }

    return {
      checkId,
      action: 'rerun-check',
      changed: false,
      message: '该检测项无需写入修复，已自动重检。'
    }
  }

  private async captureReport(run: () => Promise<DoctorReport>): Promise<DoctorReport> {
    try {
      const report = await run()
      this.cache.setLastReport(report)
      this.logger.logReportSummary(report)
      for (const check of report.checks) {
        if (check.status === 'error') {
          this.logger.logCheckFailure(check)
        }
      }
      return report
    } catch (error) {
      this.logger.logDoctorError(error)
      throw error
    }
  }
}
