import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  CHANNEL_DOCTOR_CLEAR_LAST_REPORT,
  CHANNEL_DOCTOR_GET_LAST_REPORT,
  CHANNEL_DOCTOR_LIST_CHECKS,
  CHANNEL_DOCTOR_REPAIR_CHECK,
  CHANNEL_DOCTOR_RUN_ALL,
  CHANNEL_DOCTOR_RUN_CHECK,
  CHANNEL_DOCTOR_RUN_CHECKS
} from '../src/shared/contracts/doctor.contract'
import type { DoctorRunRequest } from '../src/shared/contracts/doctor.contract'

assert.equal(CHANNEL_DOCTOR_RUN_ALL, 'doctor:runAll')
assert.equal(CHANNEL_DOCTOR_RUN_CHECKS, 'doctor:runChecks')
assert.equal(CHANNEL_DOCTOR_RUN_CHECK, 'doctor:runCheck')
assert.equal(CHANNEL_DOCTOR_REPAIR_CHECK, 'doctor:repairCheck')
assert.equal(CHANNEL_DOCTOR_GET_LAST_REPORT, 'doctor:getLastReport')
assert.equal(CHANNEL_DOCTOR_CLEAR_LAST_REPORT, 'doctor:clearLastReport')
assert.equal(CHANNEL_DOCTOR_LIST_CHECKS, 'doctor:listChecks')

const request: DoctorRunRequest = { checkIds: ['system', 'path'], timeoutMs: 1000 }
assert.deepEqual(request.checkIds, ['system', 'path'])

const preloadSource = fs.readFileSync('src/preload/index.ts', 'utf8')
assert.match(preloadSource, /doctor:\s*\{/)
assert.match(preloadSource, /runAll:/)
assert.match(preloadSource, /runChecks:/)
assert.match(preloadSource, /runCheck:/)
assert.match(preloadSource, /repairCheck:/)
assert.match(preloadSource, /getLastReport:/)
assert.match(preloadSource, /clearLastReport:/)
assert.match(preloadSource, /listChecks:/)
assert.doesNotMatch(preloadSource, /invoke:\s*\(/)
assert.doesNotMatch(preloadSource, /ipcRenderer\.invoke\(channel/)

const contractSource = fs.readFileSync('src/shared/contracts/doctor.contract.ts', 'utf8')
assert.match(contractSource, /import type \{ DoctorCheckResult, DoctorReport \}/)
assert.doesNotMatch(contractSource, /interface\s+DoctorReport/)
