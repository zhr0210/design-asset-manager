import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'

const source = await fs.readFile('src/main/index.ts', 'utf8')
const start = source.indexOf("  registerWorkspaceCommand('app:prepare-browser-entry'")
const end = source.indexOf("  registerWorkspaceCommand('app:open-browser'", start)
assert.ok(start > 0 && end > start)
assert.match(source, /browserDeniedChannels = new Set\(\['app:prepare-browser-entry'/)
let handler!: (event: { browser?: boolean; trusted?: boolean }) => Promise<{entry:string;expiresAt:string}>
let launches = 0
const context = vm.createContext({
  registerWorkspaceCommand: (_: string, fn: typeof handler) => { handler = fn },
  isBrowserContext: (e: { browser?: boolean }) => !!e.browser,
  isTrustedWorkspace: (e: { trusted?: boolean }) => !!e.trusted,
  localServer: { authorizeLaunch: () => { launches++; return 'http://127.0.0.1:12345/launch' } },
  shutdownCoordinator: { state: 'idle' }, approvedExit: false,
  workspaceTransitions: { applying: () => false }
})
vm.runInContext(source.slice(start, end), context)
for (const event of [{browser:true,trusted:true}, {trusted:false}]) await assert.rejects(handler(event), /UNTRUSTED_SENDER/)
assert.equal(launches, 0)
context.shutdownCoordinator = {state:'draining'}
await assert.rejects(handler({trusted:true}), /LOCAL_HOST_UNAVAILABLE/)
context.shutdownCoordinator = {state:'idle'}
const result = await handler({trusted:true})
assert.equal(result.entry, 'http://127.0.0.1:12345/launch')
assert.ok(Date.parse(result.expiresAt) > Date.now() + 59_000)
assert.equal(launches, 1)
console.log('Actual Main entry handler: trusted native only, shutdown guard, ordinary non-secret one-use address. HTTP grant/Origin/CSRF protections tested separately.')
