import type { DoctorCheckResult, DoctorReport } from '../../../shared/types/doctor.types'
import { EnvironmentDoctor } from '../../doctor/environment-doctor'
import type { RegisteredDoctorCheck, RunDoctorOptions } from '../../doctor/doctor.types'
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
