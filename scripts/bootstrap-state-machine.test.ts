import assert from 'node:assert/strict'
import fs from 'node:fs'
import type { DoctorReport } from '../src/shared/types/doctor.types'
import {
  canTransition,
  createInitialBootstrapState,
  getNextAllowedEvents,
  transitionBootstrapState
} from '../src/main/bootstrap/bootstrap-state-machine'

const report: DoctorReport = {
  id: 'doctor-report-test',
  generatedAt: '2026-06-01T00:00:00.000Z',
  platform: 'win32',
  arch: 'x64',
  profile: 'windows-x64',
  overallStatus: 'ok',
  checks: []
}

let state = createInitialBootstrapState('manual', '2026-06-01T00:00:00.000Z')
assert.equal(state.status, 'not_initialized')
assert.equal(state.currentStep, null)
assert.deepEqual(getNextAllowedEvents(state), ['START_CHECK', 'SKIP', 'RESET'])

let result = transitionBootstrapState(state, { type: 'START_CHECK', at: '2026-06-01T00:00:01.000Z' })
assert.equal(result.ok, true)
state = result.state
assert.equal(state.status, 'checking')
assert.equal(state.currentStep, 'run_doctor')

result = transitionBootstrapState(state, { type: 'DOCTOR_COMPLETED', doctorReport: report, at: '2026-06-01T00:00:02.000Z' })
assert.equal(result.ok, true)
state = result.state
assert.equal(state.status, 'recommendation_ready')
assert.equal(state.currentStep, 'resolve_profile')

result = transitionBootstrapState(state, { type: 'PROFILE_RESOLVED', recommendedProfileId: 'windows-cpu', at: '2026-06-01T00:00:03.000Z' })
assert.equal(result.ok, true)
state = result.state
assert.equal(state.status, 'recommendation_ready')
assert.equal(state.currentStep, 'wait_user_confirm')

result = transitionBootstrapState(state, { type: 'USER_CONFIRMED', at: '2026-06-01T00:00:04.000Z' })
assert.equal(result.ok, true)
state = result.state
assert.equal(state.status, 'installing')
assert.equal(state.currentStep, 'install_runtime')

result = transitionBootstrapState(state, { type: 'INSTALL_COMPLETED', at: '2026-06-01T00:00:05.000Z' })
assert.equal(result.ok, true)
state = result.state
assert.equal(state.status, 'verifying')
assert.equal(state.currentStep, 'verify_runtime')

result = transitionBootstrapState(state, { type: 'VERIFY_COMPLETED', at: '2026-06-01T00:00:06.000Z' })
assert.equal(result.ok, true)
state = result.state
assert.equal(state.status, 'completed')
assert.equal(state.currentStep, 'completed')
assert.equal(canTransition(state, { type: 'INSTALL_STARTED' }), false)
assert.equal(transitionBootstrapState(state, { type: 'INSTALL_STARTED' }).ok, false)

const skipped = transitionBootstrapState(createInitialBootstrapState(), { type: 'SKIP' })
assert.equal(skipped.ok, true)
assert.equal(skipped.state.status, 'skipped')

const failed = transitionBootstrapState(createInitialBootstrapState(), {
  type: 'FAIL',
  error: {
    code: 'TEST_FAILURE',
    message: 'test failure',
    recoverable: true
  }
})
assert.equal(failed.ok, false)

const checking = transitionBootstrapState(createInitialBootstrapState(), { type: 'START_CHECK' }).state
const failedDuringCheck = transitionBootstrapState(checking, {
  type: 'FAIL',
  error: {
    code: 'TEST_FAILURE',
    message: 'test failure',
    recoverable: true
  }
})
assert.equal(failedDuringCheck.ok, true)
assert.equal(failedDuringCheck.state.status, 'failed')

const retry = transitionBootstrapState(failedDuringCheck.state, { type: 'RETRY' })
assert.equal(retry.ok, true)
assert.equal(retry.state.status, 'checking')

const illegal = transitionBootstrapState(createInitialBootstrapState(), { type: 'INSTALL_COMPLETED' })
assert.equal(illegal.ok, false)
assert.equal(illegal.error?.code, 'BOOTSTRAP_INVALID_TRANSITION')

const machineSource = fs.readFileSync('src/main/bootstrap/bootstrap-state-machine.ts', 'utf8')
assert.doesNotMatch(machineSource, /download\w*\s*\(/i)
assert.doesNotMatch(machineSource, /install\w*\s*\(/i)
assert.doesNotMatch(machineSource, /aiWorker|AI Worker/)
