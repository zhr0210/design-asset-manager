import { ipcMain } from 'electron'
import {
  CHANNEL_DOCTOR_CLEAR_LAST_REPORT,
  CHANNEL_DOCTOR_GET_LAST_REPORT,
  CHANNEL_DOCTOR_LIST_CHECKS,
  CHANNEL_DOCTOR_RUN_ALL,
  CHANNEL_DOCTOR_RUN_CHECK,
  CHANNEL_DOCTOR_RUN_CHECKS
} from '../../shared/contracts/doctor.contract'
import type { DoctorRunCheckRequest, DoctorRunRequest } from '../../shared/contracts/doctor.contract'
import { DoctorService } from '../services/doctor'

function errorResponse(error: unknown) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  }
}

export function registerDoctorIpc() {
  const service = DoctorService.getInstance()

  ipcMain.handle(CHANNEL_DOCTOR_RUN_ALL, async (_, request?: DoctorRunRequest) => {
    try {
      const report = await service.runAll({ timeoutMs: request?.timeoutMs })
      return { success: true, report }
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_RUN_ALL} error:`, err)
      return errorResponse(err)
    }
  })

  ipcMain.handle(CHANNEL_DOCTOR_RUN_CHECKS, async (_, request: DoctorRunRequest) => {
    try {
      const report = await service.runChecks(request?.checkIds ?? [], { timeoutMs: request?.timeoutMs })
      return { success: true, report }
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_RUN_CHECKS} error:`, err)
      return errorResponse(err)
    }
  })

  ipcMain.handle(CHANNEL_DOCTOR_RUN_CHECK, async (_, request: DoctorRunCheckRequest) => {
    try {
      const check = await service.runCheck(request.checkId, { timeoutMs: request.timeoutMs })
      return { success: true, check }
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_RUN_CHECK} error:`, err)
      return errorResponse(err)
    }
  })

  ipcMain.handle(CHANNEL_DOCTOR_GET_LAST_REPORT, async () => {
    try {
      return { success: true, report: service.getLastReport() }
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_GET_LAST_REPORT} error:`, err)
      return errorResponse(err)
    }
  })

  ipcMain.handle(CHANNEL_DOCTOR_CLEAR_LAST_REPORT, async () => {
    try {
      service.clearLastReport()
      return { success: true }
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_CLEAR_LAST_REPORT} error:`, err)
      return errorResponse(err)
    }
  })

  ipcMain.handle(CHANNEL_DOCTOR_LIST_CHECKS, async () => {
    try {
      return {
        success: true,
        checks: service.listChecks().map((check) => ({ id: check.id, label: check.label }))
      }
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_LIST_CHECKS} error:`, err)
      return errorResponse(err)
    }
  })
}
