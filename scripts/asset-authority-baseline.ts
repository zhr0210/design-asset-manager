import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

export type AssetAuthoritySources = ReadonlyMap<string, string>
export type AssetAuthorityViolation = Readonly<{ code: string; file: string }>

const ISOLATED_CAPABILITIES = new Set([
  'initializeCaptureIntakeSchema', 'createActiveLibrarySession', 'createActiveLibraryCaptureWorkflow'
])

const LEGACY_READONLY_WORKSPACE = 'src/main/legacy-readonly-workspace/legacy-readonly-workspace.ts'
const READONLY_LIBRARY_DATABASE_HELPER = 'src/main/library-lifecycle/readonly-library-database.internal.ts'
const READONLY_LIBRARY_DATABASE_BINDINGS = [
  'openReadonlyLibraryDatabase',
  'sqliteRecoverySidecarsAbsent'
].sort().join(',')

// Reviewed consumers of the existing authority, not new global DB owners.
const LIBRARY_CONSUMER_IMPORTS: Record<string, Record<string, string>> = {
  'src/main/ai-acceptance/acceptance-service.ts': {
    'src/main/library-lifecycle/index.ts': 'createActiveLibraryHost',
    'src/main/library-lifecycle/production-active-library-dependencies.ts': 'createProductionActiveLibraryHostDependencies'
  },
  'src/main/retrieval-workspace/query-file-grants.ts': {
    'src/main/library-lifecycle/bounded-preview-reader.ts': 'readBoundedPreviewBytes'
  }
}

/** Development-only adapter. Read source text, never import application modules. */
export async function readAssetAuthoritySources(): Promise<AssetAuthoritySources> {
  const sources = new Map<string, string>()
  async function visit(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.posix.join(directory, entry.name)
      if (entry.isDirectory() && !['tests', '__tests__', 'extensions'].includes(entry.name)) {
        await visit(file)
      } else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(file) && !/\.(?:d|test|spec)\.[cm]?[jt]sx?$/.test(file)) {
        sources.set(file, await fs.readFile(file, 'utf8'))
      }
    }
  }
  for (const directory of ['src/main', 'src/preload', 'src/renderer', 'src/shared']) {
    await visit(directory)
  }
  return sources
}

/** Source-policy evidence only; this cannot grant Library write authority. */
export function checkAssetAuthorityBaseline(
  sources: AssetAuthoritySources
): readonly AssetAuthorityViolation[] {
  const violations: AssetAuthorityViolation[] = []
  const visited = new Set<string>()
  const parsed = new Map<string, ts.SourceFile>()
  function visit(file: string): void {
    if (visited.has(file)) return
    visited.add(file)
    const text = sources.get(file)
    if (text === undefined) {
      violations.push({ code: 'missing-composition-source', file })
      return
    }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    parsed.set(file, source)
    if (hasNode(source, (node) =>
      (ts.isCallExpression(node) && ISOLATED_CAPABILITIES.has(memberName(node.expression))) ||
      ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
        ISOLATED_CAPABILITIES.has(memberName(node))) ||
      (ts.isBindingElement(node) && ISOLATED_CAPABILITIES.has((node.propertyName ?? node.name).getText())))) {
      violations.push({ code: 'premature-library-composition', file })
    }
    for (const dependency of runtimeImports(source)) {
      if (dependency.bindings.some((name) => ISOLATED_CAPABILITIES.has(name))) {
        violations.push({ code: 'premature-library-composition', file })
      }
      const target = localTarget(file, dependency.specifier)
      if (!target) continue
      if (/(?:^|\/)(?:capture-intake|library-lifecycle|library-start)(?:[/.]|$)/.test(target)) {
        violations.push({ code: 'premature-library-composition', file })
        continue
      }
      const resolved = resolveSource(target, sources)
      if (resolved) visit(resolved)
      else if (!/\.(?:json|css|scss|svg|png|jpe?g|webp|ico)$/.test(target)) {
        violations.push({ code: 'missing-composition-source', file })
      }
    }
  }
  if (isActiveCutoverComposition(sources)) return checkActiveAuthorityGraph(sources)
  for (const entry of [
    'src/main/index.ts', 'src/preload/index.ts', 'src/preload/browser.ts', 'src/renderer/main.tsx'
  ]) visit(entry)
  checkLegacyChain(parsed, violations)
  checkRendererBoundary(parsed, violations)
  checkAssetChannels(parsed, violations)
  checkWriterInventory(parsed, sources, violations)
  return violations
}

function isActiveCutoverComposition(sources: AssetAuthoritySources): boolean {
  const main = sources.get('src/main/index.ts') ?? ''
  return main.includes('createProductionActiveLibraryHost') &&
    (main.includes('registerActiveLibraryIpc') || main.includes('registerMainIpcComposition'))
}

function checkActiveAuthorityGraph(sources: AssetAuthoritySources): readonly AssetAuthorityViolation[] {
  const violations: AssetAuthorityViolation[] = []
  const main = sources.get('src/main/index.ts') ?? ''
  const activeIpc = sources.get('src/main/ipc/active-library.ipc.ts') ?? ''
  const commandFile = 'src/main/local-host/active-library-commands.ts'
  const commands = sources.get(commandFile) ?? ''
  const preload = sources.get('src/preload/index.ts') ?? ''
  const workspaceClient = sources.get('src/shared/client/workspace-client.ts') ?? ''
  const host = sources.get('src/main/library-lifecycle/active-library-host.ts') ?? ''
  if (/initDatabase|ColorPaletteService|startQueueSync|resolvePythonExecutable/u.test(main) ||
    /registerAssetIpc|registerTagIpc|registerAssetTagIpc|registerAiWorkerIpc|registerPathGovernanceIpc/u.test(main)) {
    violations.push({ code: 'active-authority-composition-changed', file: 'src/main/index.ts' })
  }
  if (!commands.includes("'assets:delete'") || !commands.includes('LEGACY_DELETE_DISABLED') ||
    !/dependencies\.isTrustedSender\?\.\(event\)\s*!==\s*true/u.test(activeIpc) || !commands.includes('CHANNEL_LIBRARY_TRASH_PREPARE') ||
    !activeIpc.includes('createActiveLibraryCommands') || !activeIpc.includes('commands.invoke(channel, ...args)')) {
    violations.push({ code: 'active-authority-ipc-changed', file: 'src/main/ipc/active-library.ipc.ts' })
  }
  if (preload.includes("ipcRenderer.invoke('assets:delete'") ||
    !/deleteAsset:\s*\(_id:\s*string\)\s*=>\s*Promise\.resolve\(\{\s*success:\s*false,/u.test(workspaceClient)) {
    violations.push({ code: 'active-authority-bridge-changed', file: 'src/preload/index.ts' })
  }
  if (host.includes('getDatabase') || /withDatabase|setDatabase\(/u.test(host)) {
    violations.push({ code: 'active-authority-host-changed', file: 'src/main/library-lifecycle/active-library-host.ts' })
  }
  for (const file of ['src/main/active-library-runtime.ts', 'src/main/app-storage/app-storage.ts', 'src/main/ipc/active-library.ipc.ts']) {
    if (!sources.has(file)) violations.push({ code: 'active-authority-source-missing', file })
  }
  const visited = new Set<string>()
  const visit = (file: string, libraryAllowed: boolean): void => {
    if (visited.has(file)) return
    visited.add(file)
    const sourceText = sources.get(file)
    if (sourceText === undefined) { violations.push({ code: 'active-authority-source-missing', file }); return }
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true)
    for (const dependency of runtimeImports(source)) {
      const target = localTarget(file, dependency.specifier)
      if (!target) continue
      const resolved = resolveSource(target, sources)
      if (!resolved) {
        if (!/\.(?:json|css|scss|svg|png|jpe?g|webp|ico)$/u.test(target)) {
          violations.push({ code: 'active-authority-source-missing', file })
        }
        continue
      }
      if (resolved === 'src/main/db/index.ts' || (resolved.startsWith('src/main/') && /ai-(?:client|worker)|color-palette|path-governance|path-migration/u.test(resolved))) {
        violations.push({ code: 'active-authority-legacy-dependency', file })
      }
      const exactReadonlyHelper = file === LEGACY_READONLY_WORKSPACE &&
        resolved === READONLY_LIBRARY_DATABASE_HELPER &&
        [...dependency.bindings].sort().join(',') === READONLY_LIBRARY_DATABASE_BINDINGS
      const reviewedBinding = LIBRARY_CONSUMER_IMPORTS[file]?.[resolved]
      const exactConsumer = reviewedBinding !== undefined &&
        [...dependency.bindings].sort().join(',') === reviewedBinding
      const isLibrary = /(?:^|\/)(?:capture-intake|library-lifecycle)(?:[/.]|$)/u.test(resolved)
      const currentAllowsLibrary = libraryAllowed || file === 'src/main/active-library-runtime.ts' || file === 'src/main/ipc/active-library.ipc.ts'
      if (isLibrary && !currentAllowsLibrary && !exactReadonlyHelper && !exactConsumer) {
        violations.push({ code: 'active-authority-composition-changed', file })
      }
      visit(resolved, libraryAllowed || (isLibrary && !exactReadonlyHelper) ||
        file === 'src/main/active-library-runtime.ts' || file === 'src/main/ipc/active-library.ipc.ts')
    }
  }
  visit('src/main/index.ts', false)
  visit('src/preload/index.ts', false)
  for (const [file, source] of sources) {
    if (['src/renderer/stores/asset.store.ts', 'src/renderer/components/asset/AssetDeleteButton.tsx', 'src/renderer/routes/Library.tsx'].includes(file)) {
      if (/api\.(?:saveAsset|deleteAsset)\s*\(/u.test(source) || /(?:promoteCandidate|promotion)/iu.test(source)) violations.push({ code: 'active-authority-renderer-boundary', file })
    }
  }
  const trashRegistrations = (commands.match(/handle\(CHANNEL_LIBRARY_TRASH_(?:PREPARE|DISPATCH|INSPECT|LIST),/gu) ?? []).length
  if (trashRegistrations < 4) violations.push({ code: 'active-authority-ipc-changed', file: 'src/main/ipc/active-library.ipc.ts' })
  return violations
}

// This is the reviewed pre-cutover inventory, NOT permission to add new writers.
type DatabaseInventoryEntry = readonly [globalImports: string, assetWrites: string, responsibility: string]
const LEGACY_DATABASE_INVENTORY: Record<string, DatabaseInventoryEntry> = {
  'src/main/index.ts': ['initDatabase', '', 'composition'],
  'src/main/db/index.ts': ['', 'asset_tags,assets,tags', 'connection owner / startup migrations'],
  'src/main/ipc/asset.ipc.ts': ['getDatabase', 'assets', 'asset captions / delegated save and delete'],
  'src/main/ipc/ai-worker.ipc.ts': ['getDatabase', 'assets', 'asset AI status'],
  'src/main/ipc/path-governance.ipc.ts': ['getDatabase', '', 'asset reads / delegates path writes'],
  'src/main/path-migration/path-migration-executor.ts': ['setDatabase', 'assets', 'injected asset writer / legacy rollback rebind'],
  'src/main/services/asset.service.ts': ['getDatabase', 'asset_tags,assets,tags', 'asset save / legacy hard delete'],
  'src/main/services/asset-tag.service.ts': ['getDatabase', 'asset_tags,assets', 'asset relationships'],
  'src/main/services/tag.service.ts': ['getDatabase', 'asset_tags,tags', 'tag dictionary / asset relationships'],
  'src/main/services/ai-client.service.ts': ['getDatabase', 'assets', 'Electron AI result sync'],
  'src/main/services/ai-client/ai-task-lifecycle-sync.sink.ts': ['', 'assets', 'injected asset status writer'],
  'src/main/services/color-palette.service.ts': ['getDatabase', 'assets', 'derived asset evidence'],
  'src/main/services/tag-search.service.ts': ['getDatabase', '', 'asset read only'],
  'src/main/services/text-detection/qwen-vl-text-box-provider.ts': ['getDatabase', '', 'asset read only'],
  'src/main/services/download.service.ts': ['getDatabase', '', 'application-scoped download tasks, not Promotion'],
  'src/main/services/site.service.ts': ['getDatabase', '', 'application-scoped site configuration']
}

function checkWriterInventory(
  parsed: ReadonlyMap<string, ts.SourceFile>,
  sources: AssetAuthoritySources,
  violations: AssetAuthorityViolation[]
): void {
  for (const [file, source] of parsed) {
    const access: string[] = []
    const writes = new Set<string>()
    for (const dependency of runtimeImports(source)) {
      const target = localTarget(file, dependency.specifier)
      if (target && resolveSource(target, sources) === 'src/main/db/index.ts') access.push(...dependency.bindings)
    }
    walk(source, (node) => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        for (const match of node.text.matchAll(/\b(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM)\s+(?:(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|\w+)\s*\.\s*)?["`\[]?(assets|asset_tags|tags|capture_requests|asset_candidates|promotion_links|asset_lifecycle|asset_trash_plans)\b/gi)) {
          writes.add(match[1].toLowerCase())
        }
      }
    })
    const [globalImports = '', assetWrites = ''] = LEGACY_DATABASE_INVENTORY[file] ?? []
    if (access.sort().join(',') !== globalImports) {
      violations.push({ code: 'global-database-consumers-changed', file })
    }
    if ([...writes].sort().join(',') !== assetWrites) {
      violations.push({ code: 'asset-writer-inventory-changed', file })
    }
  }
  for (const file of Object.keys(LEGACY_DATABASE_INVENTORY)) {
    if (!parsed.has(file)) violations.push({ code: 'asset-writer-inventory-changed', file })
  }
}

function checkRendererBoundary(
  sources: ReadonlyMap<string, ts.SourceFile>,
  violations: AssetAuthorityViolation[]
): void {
  const expect = policyRequirement(violations, 'renderer-asset-authority-changed')
  const preload = sources.get('src/preload/index.ts')
  const exposure = calls(preload, 'contextBridge.exposeInMainWorld')
    .filter((call) => literal(call.arguments[0]) === 'damClient')
  const api = exposure.length === 1 ? exposure[0].arguments[1] : undefined
  expect('src/preload/index.ts',
    sameCode(namedBody(api, 'saveAsset'), "ipcRenderer.invoke('assets:save', { asset, tags })") &&
    sameCode(namedBody(api, 'deleteAsset'), "ipcRenderer.invoke('assets:delete', id)"))

  const store = sources.get('src/renderer/stores/asset.store.ts')
  const addAsset = namedBody(store, 'addAsset')
  let payload: ts.Expression | undefined
  let payloadReferences = 0
  if (addAsset) walk(addAsset, (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'newDbAsset') payload = node.initializer
    if (ts.isIdentifier(node) && node.text === 'newDbAsset') payloadReferences++
  })
  const payloadFields = [
    'id', 'title', 'file_name', 'file_path', 'thumbnail_path', 'source_site_id', 'source_site_name',
    'source_page_url', 'original_url', 'width', 'height', 'file_size', 'file_type', 'dominant_color',
    'browser_page_title', 'capture_method'
  ].sort().join(',')
  expect('src/renderer/stores/asset.store.ts',
    !!payload && ts.isObjectLiteralExpression(payload) && payloadReferences === 2 &&
    payload.properties.map((property) => ts.isPropertyAssignment(property) ? property.name.getText() : '')
      .sort().join(',') === payloadFields &&
    hasCall(addAsset, 'api.saveAsset(newDbAsset, assetData.tags)') &&
    hasCall(namedBody(store, 'deleteAsset'), 'api.deleteAsset(id)'))

  const allowedCalls: Record<string, string> = {
    'src/renderer/stores/asset.store.ts': 'deleteAsset,saveAsset',
    'src/renderer/components/asset/AssetDeleteButton.tsx': 'deleteAsset'
  }
  for (const [file, source] of sources) {
    if (!file.startsWith('src/renderer/')) continue
    const authorityCalls: string[] = []
    walk(source, (node) => {
      if (!ts.isCallExpression(node)) return
      const name = memberName(node.expression)
      if (/^(?:saveAsset|deleteAsset|addAsset)$|promot/i.test(name)) authorityCalls.push(name)
    })
    expect(file, authorityCalls.sort().join(',') === (allowedCalls[file] ?? ''))
  }
  for (const file of Object.keys(allowedCalls)) expect(file, sources.has(file))
}

function literal(node: ts.Node | undefined): string | undefined {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined
}

function memberName(node: ts.Expression): string {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  return ts.isElementAccessExpression(node) ? literal(node.argumentExpression) ?? '' : ''
}

function checkLegacyChain(
  sources: ReadonlyMap<string, ts.SourceFile>,
  violations: AssetAuthorityViolation[]
): void {
  const expect = policyRequirement(violations, 'legacy-asset-chain-changed')
  const main = sources.get('src/main/index.ts')
  const readyCall = calls(main, 'app.whenReady().then')[0]
  const ready = readyCall?.arguments[0]
  const setup = namedBody(main, 'setupIpcHandlers')
  let registrationReferences = 0
  if (main) walk(main, (node) => {
    if (ts.isIdentifier(node) && node.text === 'registerAssetIpc') registrationReferences++
  })
  expect('src/main/index.ts',
    importsName(main, './db', 'initDatabase') &&
    importsName(main, './ipc/asset.ipc', 'registerAssetIpc') &&
    hasCall(ready, 'initDatabase()') && hasCall(ready, 'setupIpcHandlers()') &&
    hasCall(setup, 'registerAssetIpc()') && calls(main, 'registerAssetIpc').length === 1 &&
    calls(main, 'initDatabase').length === 1 && calls(main, 'setupIpcHandlers').length === 1 &&
    registrationReferences === 2)

  const ipc = sources.get('src/main/ipc/asset.ipc.ts')
  const register = namedBody(ipc, 'registerAssetIpc')
  expect('src/main/ipc/asset.ipc.ts',
    importsName(ipc, '../services/asset.service', 'AssetService') &&
    hasNode(register, (node) => ts.isVariableDeclaration(node) && sameCode(node, 'service = new AssetService()')) &&
    hasCall(handlerBody(register, 'assets:list'), 'service.listAssets(filters)') &&
    hasCall(handlerBody(register, 'assets:save'), 'service.saveAsset(data.asset, data.tags || [])') &&
    sameCode(handlerBody(register, 'assets:delete'), `{
      try {
        service.deleteAsset(id)
        return { success: true, id }
      } catch (err) {
        console.error('[IPC] assets:delete error:', err)
        return { success: false, error: String(err) }
      }
    }`))

  const service = sources.get('src/main/services/asset.service.ts')
  expect('src/main/services/asset.service.ts',
    importsName(service, '../db', 'getDatabase') &&
    sameCode(namedBody(service, 'getDb'), '{ return getDatabase() }') &&
    hasNode(namedBody(service, 'saveAsset'), (node) =>
      ts.isVariableDeclaration(node) && sameCode(node, 'db = this.getDb()')) &&
    sameCode(namedBody(service, 'deleteAsset'), `{
      const db = this.getDb()
      db.transaction(() => {
        db.prepare('DELETE FROM asset_tags WHERE asset_id = ?').run(id)
        db.prepare('DELETE FROM assets WHERE id = ?').run(id)
      })()
    }`))

  const database = sources.get('src/main/db/index.ts')
  expect('src/main/db/index.ts',
    hasNode(namedBody(database, 'initDatabase'), (node) =>
      ts.isBinaryExpression(node) && sameCode(node, 'db = new Database(dbPath)')) &&
    sameCode(namedBody(database, 'setDatabase'), '{ db = newDb }') &&
    sameCode(namedBody(database, 'getDatabase'), `{
      if (!db) {
        throw new Error('Database not initialized. Please call initDatabase() first.')
      }
      return db
    }`))

}

function policyRequirement(violations: AssetAuthorityViolation[], code: string): (file: string, valid: boolean) => void {
  return (file, valid) => { if (!valid) violations.push({ code, file }) }
}

function checkAssetChannels(
  sources: ReadonlyMap<string, ts.SourceFile>,
  violations: AssetAuthorityViolation[]
): void {
  const owners: Record<string, string[]> = {
    'src/main/ipc/asset.ipc.ts': ['list', 'save', 'delete', 'save-custom-category', 'get-custom-category', 'update-caption', 'reset-caption-edited'],
    'src/main/ipc/color-palette.ipc.ts': ['extract-palette', 'trigger-extract-save'],
    'src/main/ipc/path-governance.ipc.ts': ['path-migration-report', 'apply-path-migration', 'path-governance-report']
  }
  owners['src/preload/index.ts'] = Object.values(owners).flat()
  // Preserve the existing non-Asset descriptor/bridge dispatches, not a file-wide
  // escape hatch. Each exact call shape is allowed once; additions require review.
  const legacyOpaqueCalls: Record<string, string[]> = {
    'src/main/ipc/ai-runtime.ipc.ts': [
      'ipcMain.handle(descriptor.channel, createPlatformAiCapabilitiesIpcHandler(descriptor))',
      'ipcMain.handle(descriptor.channel, createPlatformAiBranchStatusIpcHandler(descriptor))',
      'ipcMain.handle(descriptor.channel, createPythonCompatibilityStatusIpcHandler(descriptor))',
      'ipcMain.handle(descriptor.channel, createPythonExecutionProbeIpcHandler(descriptor))'
    ],
    'src/preload/index.ts': ['ipcRenderer.invoke(channel, request)']
  }
  const readString = staticStringReader(sources)
  for (const [file, source] of sources) {
    const channels: string[] = []
    const opaque = [...legacyOpaqueCalls[file] ?? []]
    let invalid = false
    const expectedCallee = file.startsWith('src/main/') ? 'ipcMain.handle' : 'ipcRenderer.invoke'
    walk(source, (node) => {
      if (!ts.isCallExpression(node)) return
      const channel = readString(node.arguments[0])
      if (channel === undefined) {
        // Unknown direct registrations/invocations could reuse an Asset channel.
        // Require review instead of growing this into a JS constant evaluator.
        if (sameCode(node.expression, expectedCallee)) {
          const known = opaque.findIndex((code) => sameCode(node, code))
          if (known < 0) invalid = true
          else opaque.splice(known, 1)
        }
        return
      }
      if (!/^(?:assets|capture|candidates?|promotion|asset-trash|trash|library(?:-start)?):/.test(channel)) return
      channels.push(channel)
      if (!sameCode(node.expression, expectedCallee)) invalid = true
    })
    const expected = (owners[file] ?? []).map((name) => `assets:${name}`).sort().join(',')
    if (invalid || opaque.length > 0 || channels.sort().join(',') !== expected) {
      violations.push({ code: file.startsWith('src/main/')
        ? 'legacy-asset-chain-changed' : 'renderer-asset-authority-changed', file })
    }
  }
}

// Bounded literal/const/import resolution for public channel names, not JS execution.
// Ambiguous bindings, cycles and computed calls produce no inferred string value.
function staticStringReader(sources: ReadonlyMap<string, ts.SourceFile>): (node: ts.Node | undefined) => string | undefined {
  const bindings = new Map<string, ts.Expression[]>()
  const cache = new Map<string, string | undefined>()
  for (const [file, source] of sources) walk(source, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const key = `${file}:${node.name.text}`
      bindings.set(key, [...bindings.get(key) ?? [], node.initializer])
    }
  })
  function lookup(file: string, name: string): string | undefined {
    const key = `${file}:${name}`
    if (cache.has(key)) return cache.get(key)
    cache.set(key, undefined)
    const values = bindings.get(key)
    if (values) {
      const result = values.length === 1 ? read(values[0]) : undefined
      cache.set(key, result)
      return result
    }
    const source = sources.get(file)
    if (!source) return undefined
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.importClause?.isTypeOnly) continue
      const names = statement.importClause?.namedBindings
      const binding = names && ts.isNamedImports(names) ? names.elements.find((item) => !item.isTypeOnly && item.name.text === name) : undefined
      const target = localTarget(file, statement.moduleSpecifier.text)
      const resolved = target && resolveSource(target, sources)
      if (binding && resolved) {
        const result = lookup(resolved, binding.propertyName?.text ?? binding.name.text)
        cache.set(key, result)
        return result
      }
    }
    return undefined
  }
  function read(node: ts.Node | undefined): string | undefined {
    if (!node) return undefined
    if (ts.isIdentifier(node)) return lookup(node.getSourceFile().fileName, node.text)
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return read(node.expression)
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = read(node.left), right = read(node.right)
      return left !== undefined && right !== undefined ? left + right : undefined
    }
    return literal(node)
  }
  return read
}

function importsName(source: ts.Node | undefined, from: string, name: string): boolean {
  return hasNode(source, (node) => ts.isImportDeclaration(node) &&
    ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === from &&
    !node.importClause?.isTypeOnly && !!node.importClause?.namedBindings &&
    ts.isNamedImports(node.importClause.namedBindings) &&
    node.importClause.namedBindings.elements.some((item) => !item.isTypeOnly &&
      item.name.text === name && (item.propertyName?.text ?? name) === name))
}

function namedBody(root: ts.Node | undefined, name: string): ts.Node | undefined {
  const matches: ts.Node[] = []
  if (root) walk(root, (node) => {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      node.name?.getText() === name && node.body) matches.push(node.body)
    if (ts.isPropertyAssignment(node) && node.name.getText() === name &&
      ts.isArrowFunction(node.initializer)) matches.push(node.initializer.body)
  })
  return matches.length === 1 ? matches[0] : undefined
}

function calls(root: ts.Node | undefined, expression: string): ts.CallExpression[] {
  const result: ts.CallExpression[] = []
  if (root) walk(root, (node) => {
    if (ts.isCallExpression(node) && sameCode(node.expression, expression)) result.push(node)
  })
  return result
}

function hasCall(root: ts.Node | undefined, code: string): boolean {
  return hasNode(root, (node) => ts.isCallExpression(node) && sameCode(node, code))
}

function hasNode(root: ts.Node | undefined, predicate: (node: ts.Node) => boolean): boolean {
  let found = false
  if (root) walk(root, (node) => { if (predicate(node)) found = true })
  return found
}

function handlerBody(root: ts.Node | undefined, channel: string): ts.Node | undefined {
  const matches = calls(root, 'ipcMain.handle').filter((call) =>
    call.arguments[0] && ts.isStringLiteralLike(call.arguments[0]) && call.arguments[0].text === channel)
  const callback = matches.length === 1 ? matches[0].arguments[1] : undefined
  return callback && ts.isArrowFunction(callback) ? callback.body : undefined
}

// Small authority seams are intentionally pinned, not whole files. Formatting,
// comments and quote style are ignored; the explicit cutover replaces this policy.
function sameCode(node: ts.Node | undefined, expected: string): boolean {
  function tokens(text: string): string {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text)
    const result: string[] = []
    for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
      if (kind === ts.SyntaxKind.SemicolonToken) continue
      result.push(kind === ts.SyntaxKind.StringLiteral ? JSON.stringify(scanner.getTokenValue()) : scanner.getTokenText())
    }
    return result.join('\u0000')
  }
  return !!node && tokens(node.getText()) === tokens(expected)
}

function runtimeImports(source: ts.SourceFile): Array<{ specifier: string; bindings: string[] }> {
  const imports: Array<{ specifier: string; bindings: string[] }> = []
  walk(source, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause
      const names = clause?.namedBindings
      if (clause?.isTypeOnly || (names && ts.isNamedImports(names) && !clause?.name &&
        names.elements.length > 0 && names.elements.every((name) => name.isTypeOnly))) return
      imports.push({ specifier: node.moduleSpecifier.text, bindings:
        names && ts.isNamedImports(names)
          ? names.elements.filter((name) => !name.isTypeOnly).map((name) => name.propertyName?.text ?? name.name.text)
          : ['*'] })
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.every((name) => name.isTypeOnly)) return
      imports.push({ specifier: node.moduleSpecifier.text, bindings:
        node.exportClause && ts.isNamedExports(node.exportClause)
          ? node.exportClause.elements.filter((name) => !name.isTypeOnly).map((name) => name.propertyName?.text ?? name.name.text)
          : ['*'] })
    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) && literal(node.moduleReference.expression)) {
      imports.push({ specifier: literal(node.moduleReference.expression)!, bindings: ['*'] })
    } else if (ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      imports.push({ specifier: node.arguments[0].text, bindings: ['*'] })
    }
  })
  return imports
}

function localTarget(file: string, specifier: string): string | undefined {
  if (specifier.startsWith('.')) return path.posix.join(path.posix.dirname(file), specifier)
  if (specifier.startsWith('@renderer/')) return specifier.replace('@renderer/', 'src/renderer/')
  return undefined
}

function resolveSource(target: string, sources: ReadonlyMap<string, unknown>): string | undefined {
  const stem = target.replace(/\.[cm]?[jt]sx?$/, '')
  return [target, ...['.ts', '.tsx', '.js', '.mjs', '.cjs', '/index.ts', '/index.tsx']
    .map((suffix) => `${stem}${suffix}`)].find((file) => sources.has(file))
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node)
  ts.forEachChild(node, (child) => { walk(child, visit) })
}
