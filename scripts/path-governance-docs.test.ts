import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const inventoryDocPath = 'docs/platform/PATH_FIELD_INVENTORY.md'
const riskDocPath = 'docs/platform/PATH_GOVERNANCE_RISK_REGISTER.md'
const designDocPath = 'docs/platform/PATH_MIGRATION_DESIGN.md'
const machineInventoryPath = '.codeindex/path-field-inventory.json'

const inventoryDoc = await fs.readFile(inventoryDocPath, 'utf8')
const riskDoc = await fs.readFile(riskDocPath, 'utf8')
const designDoc = await fs.readFile(designDocPath, 'utf8')
const machineInventoryRaw = await fs.readFile(machineInventoryPath, 'utf8')
const machineInventory = JSON.parse(machineInventoryRaw) as {
  rules?: Record<string, unknown>
  privacy?: Record<string, unknown>
  fields?: Array<{ field?: string; forbidAutomaticMigration?: boolean }>
}

assert.ok(inventoryDoc.length > 0)
assert.ok(riskDoc.length > 0)
assert.ok(designDoc.length > 0)
assert.ok(machineInventoryRaw.length > 0)

const fieldNames = (machineInventory.fields ?? []).map((field) => field.field)
assert.ok(fieldNames.includes('assets.file_path'))
assert.ok(fieldNames.includes('download task save_path'))
assert.ok(fieldNames.includes('thumbnail_path'))
assert.ok(fieldNames.includes('modelRootDir'))
assert.ok((machineInventory.fields ?? []).some((field) => field.forbidAutomaticMigration === true))

assert.equal(machineInventory.privacy?.containsRealUserPaths, false)
assert.equal(machineInventory.privacy?.containsRealAssetPaths, false)
assert.equal(machineInventory.privacy?.containsRuntimeDatabaseContents, false)
assert.equal(machineInventory.privacy?.scannedUserAssetLibrary, false)
assert.equal(machineInventory.rules?.noAutoMigration, true)
assert.equal(machineInventory.rules?.requiresBackup, true)
assert.equal(machineInventory.rules?.requiresRollback, true)

const allDocs = [inventoryDoc, riskDoc, designDoc, machineInventoryRaw].join('\n')
assert.doesNotMatch(allDocs, /C:\\Users\\[A-Za-z0-9_.-]+/i)
assert.doesNotMatch(allDocs, /\/Users\/[A-Za-z0-9_.-]+/)
assert.doesNotMatch(allDocs, /Design Asset Manager[\\/](?:library|assets|models)/i)
assert.match(allDocs, /no-auto-migration/i)
assert.match(allDocs, /backup/i)
assert.match(allDocs, /rollback/i)

const changedFiles = await readGitChangedFiles()
assert.ok(!changedFiles.includes('src/main/db/schema.ts'))
assert.ok(!changedFiles.includes('src/main/services/asset.service.ts'))
assert.ok(!changedFiles.some((file) => /src\/main\/services\/download/.test(file)))

async function readGitChangedFiles(): Promise<string[]> {
  const { execFile } = await import('node:child_process')
  return new Promise((resolve, reject) => {
    execFile('git', ['diff', '--name-only'], { encoding: 'utf8' }, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout.split(/\r?\n/).filter(Boolean))
    })
  })
}
