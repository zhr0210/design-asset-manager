import type { DoctorCheckResult, DoctorReport } from '../../../shared/types/doctor.types'

export class DoctorLogService {
  public logReportSummary(report: DoctorReport): void {
    console.log(
      `[DoctorService] Report ${report.id} completed with ${report.overallStatus}. ` +
        `Checks: ${report.checks.length}.`
    )
  }

  public logCheckFailure(check: DoctorCheckResult): void {
    console.warn(`[DoctorService] Check ${check.id} reported ${check.status}: ${check.message}`)
  }

  public logDoctorError(error: unknown): void {
    console.error('[DoctorService] Unexpected Doctor service error:', error)
  }
}
