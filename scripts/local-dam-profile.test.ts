import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createSyntheticSettingsService } from '../src/main/local-host/synthetic-profile'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-profile-test-'))
try {
  const profileDirectory = path.join(root, 'profile')
  await fs.mkdir(profileDirectory)
  const configuration = { rootDirectory: root, profileDirectory, libraryDirectory: path.join(root, 'library') }
  const service = createSyntheticSettingsService(configuration)
  service.saveSettings({ concurrency: 3 })
  assert.equal(createSyntheticSettingsService(configuration).getSettings().concurrency, 3, 'settings survive Host restart in the same controlled profile')
  assert.throws(() => service.saveSettings({ libraryPath: os.homedir() }), /SYNTHETIC_SCOPE_DENIED/)
  assert.throws(() => service.saveSettings({ managedPaths: { modelRoot: os.homedir() } } as any), /SYNTHETIC_SCOPE_DENIED/)
  assert.throws(() => service.saveSettings({ autoInstallAllowed: true }), /SYNTHETIC_EXECUTION_DENIED/)
  assert.throws(() => service.saveSettings({ aiBackends: [{ baseUrl: 'https://example.org', enabled: true } as any] }), /SYNTHETIC_ENDPOINT_DENIED/)
  assert.throws(() => service.saveSettings({ aiBackends: [{ baseUrl: 'http://127.0.0.1:1', enabled: true } as any] }), /SYNTHETIC_ENDPOINT_DENIED/, 'loopback alone does not authorize a service')
  assert.equal(service.getSettings().concurrency, 3, 'rejected patch cannot change persisted settings')
  console.log('PASS controlled profile persists settings and rejects adjacent data and unregistered services')
} finally { await fs.rm(root, { recursive: true, force: true }) }
