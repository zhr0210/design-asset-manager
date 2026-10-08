import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {SettingsService} from '../src/main/services/settings.service'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'dam-settings-profile-'))
const a=SettingsService.openProfile(path.join(root,'a'))
const b=SettingsService.openProfile(path.join(root,'b'))
a.saveSettings({concurrency:7,aiBackends:[]})
b.saveSettings({concurrency:2})
assert.equal(SettingsService.openProfile(path.join(root,'a')).getSettings().concurrency,7)
assert.equal(SettingsService.openProfile(path.join(root,'b')).getSettings().concurrency,2)
const legacy=path.join(root,'legacy.json')
const original=JSON.stringify({concurrency:5,aiBackends:[{id:'retained-reference',credentialRef:'retained-reference',credentialRevision:4}]})
fs.writeFileSync(legacy,original)
const migrated=SettingsService.openProfile(path.join(root,'migrated'),[legacy])
assert.equal(migrated.getSettings().aiBackends?.[0].credentialRevision,4)
assert.equal(fs.readFileSync(legacy,'utf8'),original)
fs.writeFileSync(legacy,'invalid')
assert.equal(SettingsService.openProfile(path.join(root,'migrated'),[legacy]).getSettings().concurrency,5)
assert.throws(()=>SettingsService.openProfile('relative'))
assert.throws(()=>SettingsService.openProfile(path.join(root,'refused'),[legacy]))
assert.equal(fs.existsSync(path.join(root,'refused','settings.json')),false)
console.log('Profile isolation, cold reopen and preserving legacy migration passed')
