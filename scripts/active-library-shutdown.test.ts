import assert from 'node:assert/strict'
import { ShutdownCoordinator, type ShutdownEvent } from '../src/main/app-shutdown/shutdown-coordinator'

function event(counter: { prevented: number }): ShutdownEvent {
  return { preventDefault: () => { counter.prevented += 1 } }
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve))
}

let resolveDrain: (() => void) | undefined
let drainCalls = 0
let quitCalls = 0
const waiting = new ShutdownCoordinator({
  drain: () => { drainCalls += 1; return new Promise<void>((resolve) => { resolveDrain = resolve }) },
  requestQuit: () => { quitCalls += 1 }
})
const waitingEvents = { prevented: 0 }
waiting.handleBeforeQuit(event(waitingEvents))
waiting.handleBeforeQuit(event(waitingEvents))
assert.equal(waiting.state, 'draining')
assert.equal(drainCalls, 1)
assert.equal(waitingEvents.prevented, 2)
assert.equal(quitCalls, 0)
resolveDrain!()
await flush()
assert.equal(waiting.state, 'completed')
assert.equal(quitCalls, 1)
const completedEvents = { prevented: 0 }
waiting.handleBeforeQuit(event(completedEvents))
assert.equal(completedEvents.prevented, 0)

let shouldFail = true
let retryCalls = 0
const retryable = new ShutdownCoordinator({
  drain: async () => { retryCalls += 1; if (shouldFail) throw new Error('synthetic close failure') },
  requestQuit: () => { quitCalls += 1 }
})
const failedEvents = { prevented: 0 }
retryable.handleBeforeQuit(event(failedEvents))
await flush()
assert.equal(retryable.state, 'failed')
assert.equal(retryCalls, 1)
assert.equal(quitCalls, 1)
shouldFail = false
retryable.handleBeforeQuit(event(failedEvents))
await flush()
assert.equal(retryable.state, 'completed')
assert.equal(retryCalls, 2)
assert.equal(quitCalls, 2)
assert.equal(failedEvents.prevented, 2)

console.log('Active Library shutdown coordinator passed')
