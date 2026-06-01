import type { DoctorReport } from '../../../shared/types/doctor.types'

export class DoctorCacheService {
  private lastReport: DoctorReport | null = null
  private lastRunAt: string | null = null

  public setLastReport(report: DoctorReport): void {
    this.lastReport = report
    this.lastRunAt = report.generatedAt
  }

  public getLastReport(): DoctorReport | null {
    return this.lastReport
  }

  public clear(): void {
    this.lastReport = null
    this.lastRunAt = null
  }

  public getLastRunAt(): string | null {
    return this.lastRunAt
  }

  public isStale(maxAgeMs: number): boolean {
    if (!this.lastRunAt) return true
    const timestamp = Date.parse(this.lastRunAt)
    if (!Number.isFinite(timestamp)) return true
    return Date.now() - timestamp > maxAgeMs
  }
}
