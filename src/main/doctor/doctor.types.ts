import type { DoctorCheckContext, DoctorCheckResult } from '../../shared/types/doctor.types'

export type DoctorCheck = (context: DoctorCheckContext) => Promise<DoctorCheckResult>

export interface RegisteredDoctorCheck {
  id: string
  label: string
  run: DoctorCheck
}

export interface RunDoctorOptions {
  checkIds?: string[]
  timeoutMs?: number
  context?: Partial<DoctorCheckContext>
}

export { DoctorCheckContext, DoctorCheckResult }
