import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { isTrustedLibrarySender } from '../src/main/trusted-sender'
import { qualifyMacLocalVolume } from '../src/main/library-lifecycle/mac-volume-qualification'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-active-volume-')))
const evidence = await qualifyMacLocalVolume(root, 'scope:synthetic')
if (process.platform === 'darwin') {
  assert.equal(evidence.kind, 'qualified')
  assert.equal(evidence.scopeIdentity, 'scope:synthetic')
  assert.equal(evidence.atomicReplace, 'qualified')
  assert.equal(evidence.durableCommit, 'qualified')
  assert.equal(evidence.mountBoundary, 'qualified')
  assert.ok((evidence.availableBytes ?? 0) > 0)
} else {
  assert.equal(evidence.kind, 'unsupported')
}
const trustedWindow = { isDestroyed: () => false, webContents: { id: 7, getURL: () => 'file:///renderer/index.html' } } as any
const mainFrame = { parent: null, url: 'file:///renderer/index.html#/library' }
assert.equal(isTrustedLibrarySender({ sender: { id: 7 }, senderFrame: mainFrame }, { ...trustedWindow, webContents: { ...trustedWindow.webContents, getURL: () => 'file:///renderer/index.html#/library' } }, 'file:///renderer/index.html', mainFrame), true)
assert.equal(isTrustedLibrarySender({ sender: { id: 7 }, senderFrame: { parent: {} , url: 'file:///renderer/index.html' } }, trustedWindow, 'file:///renderer/index.html'), false)
assert.equal(isTrustedLibrarySender({ sender: { id: 7 }, senderFrame: { parent: null, url: 'https://untrusted.invalid' } }, trustedWindow, 'file:///renderer/index.html'), false)
assert.equal(isTrustedLibrarySender({ sender: { id: 7 }, senderFrame: { parent: null, url: 'https://untrusted.invalid' } }, { ...trustedWindow, webContents: { ...trustedWindow.webContents, getURL: () => 'https://untrusted.invalid' } }, 'file:///renderer/index.html'), false)
assert.equal(isTrustedLibrarySender({ sender: { id: 8 }, senderFrame: { parent: null, url: 'file:///renderer/index.html' } }, trustedWindow, 'file:///renderer/index.html'), false)
console.log('Active Library runtime qualification passed')
