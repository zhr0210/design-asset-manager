import assert from 'node:assert/strict'
import { checkAssetAuthorityBaseline, readAssetAuthoritySources, type AssetAuthoritySources } from './asset-authority-baseline'

const sources = await readAssetAuthoritySources()
const main = 'src/main/index.ts'

function replace(file: string, before: string, after: string): AssetAuthoritySources {
  const text = sources.get(file)
  assert.ok(text !== undefined && text.includes(before), `Fixture anchor is missing: ${file}`)
  return new Map(sources).set(file, text.replace(before, after))
}

function append(file: string, text: string): AssetAuthoritySources {
  assert.ok(sources.has(file), `Fixture source is missing: ${file}`)
  return new Map(sources).set(file, `${sources.get(file)}\n${text}`)
}

assert.deepEqual(checkAssetAuthorityBaseline(sources), [], 'The active authority baseline must pass.')

for (const fixture of [
  append(main, "import './capture-intake/sqlite-capture-persistence.adapter'"),
  append(main, "import './library-lifecycle/active-library-session'"),
  replace(main, 'registerMainIpcComposition({', 'registerAssetIpc()\n  registerMainIpcComposition({')
]) {
  assert.ok(checkAssetAuthorityBaseline(fixture).some((violation) =>
    violation.code.startsWith('active-authority-') || violation.code === 'premature-library-composition'),
    'Unexpected composition must fail the active authority guard.')
}

assert.ok(checkAssetAuthorityBaseline(
  replace('src/main/local-host/active-library-commands.ts', 'LEGACY_DELETE_DISABLED', 'LEGACY_DELETE_ENABLED')
).some((violation) => violation.code === 'active-authority-ipc-changed'), 'IPC authority changes require review.')

assert.ok(checkAssetAuthorityBaseline(
  replace('src/main/ipc/active-library.ipc.ts', 'dependencies.isTrustedSender?.(event)', 'dependencies.bypassTrustedSender?.(event)')
).some((violation) => violation.code === 'active-authority-ipc-changed'), 'The desktop facade must keep its trusted sender gate.')

for (const file of ['src/main/ai-acceptance/acceptance-service.ts', 'src/main/retrieval-workspace/query-file-grants.ts']) {
  assert.ok(checkAssetAuthorityBaseline(
    append(file, "import { createActiveLibrarySession } from '../library-lifecycle/active-library-session'")
  ).some((violation) => violation.code === 'active-authority-composition-changed' && violation.file === file),
  'Reviewed consumers must not acquire additional Library authority.')
}

assert.ok(checkAssetAuthorityBaseline(
  append('src/main/library-lifecycle/active-library-host.ts', "import { getDatabase } from '../db'")
).some((violation) => violation.code === 'active-authority-host-changed'), 'Host global DB fallback must fail.')

assert.ok(checkAssetAuthorityBaseline(
  append('src/main/index.ts', 'initDatabase()')
).some((violation) => violation.code === 'active-authority-composition-changed'), 'Legacy database startup must fail.')

const legacyReadonlyWorkspace = 'src/main/legacy-readonly-workspace/legacy-readonly-workspace.ts'
for (const forbiddenImport of [
  "import '../library-lifecycle/active-library-session'",
  "import '../library-lifecycle/exclusive-library-lock.tracer'",
  "import '../capture-intake/sqlite-capture-persistence.adapter'",
  "import '../db'"
]) {
  assert.ok(checkAssetAuthorityBaseline(
    append(legacyReadonlyWorkspace, forbiddenImport)
  ).some((violation) => violation.file === legacyReadonlyWorkspace &&
    violation.code.startsWith('active-authority-')), `Legacy read-only workspace must reject ${forbiddenImport}.`)
}

assert.ok(checkAssetAuthorityBaseline(
  replace(
    legacyReadonlyWorkspace,
    'import { openReadonlyLibraryDatabase, sqliteRecoverySidecarsAbsent } from',
    'import { openReadonlyLibraryDatabase, sqliteRecoverySidecarsAbsent, createActiveLibrarySession } from'
  )
).some((violation) => violation.code === 'active-authority-composition-changed' &&
  violation.file === legacyReadonlyWorkspace), 'The read-only helper exception must allow only its two exact bindings.')

assert.ok(checkAssetAuthorityBaseline(
  replace('src/shared/client/workspace-client.ts', 'deleteAsset: (_id: string) => Promise.resolve', "deleteAsset: (id: string) => transport.invoke('assets:delete', id)")
).some((violation) => violation.code === 'active-authority-bridge-changed'), 'Legacy delete bridge must remain disabled.')

assert.deepEqual(checkAssetAuthorityBaseline(sources), [], 'Fixture mutations must not modify the live snapshot.')
console.log('asset-authority-baseline passed')
