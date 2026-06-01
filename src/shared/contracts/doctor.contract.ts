import type { DoctorCheckResult, DoctorReport } from '../types/doctor.types'

export const CHANNEL_DOCTOR_RUN_ALL = 'doctor:runAll'
export const CHANNEL_DOCTOR_RUN_CHECKS = 'doctor:runChecks'
export const CHANNEL_DOCTOR_GET_LAST_REPORT = 'doctor:getLastReport'
export const CHANNEL_DOCTOR_CLEAR_LAST_REPORT = 'doctor:clearLastReport'

export const CHANNEL_DOCTOR_RUN = CHANNEL_DOCTOR_RUN_ALL
export const CHANNEL_DOCTOR_RUN_CHECK = 'doctor:runCheck'
export const CHANNEL_DOCTOR_LIST_CHECKS = 'doctor:listChecks'

export interface DoctorRunRequest {
  checkIds?: string[]
  timeoutMs?: number
}

export interface DoctorRunCheckRequest {
  checkId: string
  timeoutMs?: number
}

export interface DoctorRunResponse {
  success: boolean
  report?: DoctorReport
  error?: string
}

export interface DoctorRunCheckResponse {
  success: boolean
  check?: DoctorCheckResult
  error?: string
}

export interface DoctorGetLastReportResponse {
  success: boolean
  report?: DoctorReport | null
  error?: string
}

export interface DoctorClearLastReportResponse {
  success: boolean
  error?: string
}

export interface DoctorListChecksResponse {
  success: boolean
  checks?: Array<{ id: string; label: string }>
  error?: string
}
