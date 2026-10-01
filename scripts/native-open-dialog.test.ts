import assert from 'node:assert/strict'
import { createNativeOpenDialog } from '../src/main/platform/native-open-dialog'

const calls: string[] = []
let destroyed = false
let ownerAvailable = true
const owner = {
  isDestroyed: () => destroyed,
  isMinimized: () => true,
  restore: () => { calls.push('restore') },
  show: () => { calls.push('show') },
  focus: () => { calls.push('focus') }
}
let release: () => void = () => undefined
const wait = new Promise<void>((resolve) => { release = resolve })
let presented = 0
const open = createNativeOpenDialog({
  getOwner: () => ownerAvailable ? owner : null,
  present: async (actualOwner, options) => {
    assert.equal(actualOwner, owner)
    assert.deepEqual(options.properties, ['openFile'])
    assert.deepEqual(options.filters, [{ name: 'Database', extensions: ['db'] }])
    presented += 1
    calls.push('present')
    if (presented === 1) await wait
    return { canceled: true, filePaths: [] }
  }
})
const options = { properties: ['openFile' as const], filters: [{ name: 'Database', extensions: ['db'] }] }
const first = open(options)
const second = open(options)
await Promise.resolve()
assert.equal(presented, 1, 'A second dialog must not steal focus while the first is open.')
assert.deepEqual(calls, ['restore', 'show', 'focus', 'present'])
release()
assert.deepEqual(await first, { canceled: true, filePaths: [] })
await second
assert.equal(presented, 2, 'Cancellation must release the next dialog.')
destroyed = true
await assert.rejects(open(options), /NATIVE_DIALOG_WINDOW_UNAVAILABLE/)
assert.equal(presented, 2, 'A destroyed window must never fall back to a detached dialog.')
destroyed = false
ownerAvailable = false
await assert.rejects(open(options), /NATIVE_DIALOG_WINDOW_UNAVAILABLE/)
ownerAvailable = true
await open(options)
assert.equal(presented, 3, 'A later valid window must recover after a failed request.')
console.log('Native dialog ownership and cancellation checks passed')
