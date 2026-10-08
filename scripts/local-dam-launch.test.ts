import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'
import { transform } from 'esbuild'
import { ShutdownCoordinator } from '../src/main/app-shutdown/shutdown-coordinator'
import { createWorkspaceLaunch } from '../src/main/local-host/workspace-launch'

type Entry = 'desktop' | 'browser'
const mainSource = await fs.readFile('src/main/index.ts', 'utf8')
const registrationStart = mainSource.indexOf("app.on('second-instance'")
const registrationEnd = mainSource.indexOf('\nconfigureNativeOpenDialog(', registrationStart)
assert.ok(registrationStart >= 0 && registrationEnd > registrationStart)
const registration = mainSource.slice(registrationStart, registrationEnd)

function mainSection(startMarker: string, endMarker: string): string {
  const start = mainSource.indexOf(startMarker)
  const end = mainSource.indexOf(endMarker, start)
  assert.ok(start >= 0 && end > start)
  return mainSource.slice(start, end)
}

const launchComposition = (await transform(mainSection('async function openBrowserWorkspace()', '\nconfigureNativeOpenDialog('), { loader: 'ts' })).code
const startupComposition = (await transform(
  mainSection('app.whenReady().then', '\n// Closing a view') + '\n' +
  mainSection('const libraryQuiescence = createLibraryQuiescence(', '\nfunction setupIpcHandlers()'),
  { loader: 'ts' }
)).code
const browserFailureMessage = '本机 DAM 仍在运行。请重新使用‘DAM 浏览器版’入口，或打开桌面版继续操作。'
const startupFailureMessage = '本机服务未能启动。DAM 将在清理本次启动资源后退出。请重新打开桌面版或浏览器版。'

function mainLaunchHarness(initial: Entry, openBrowser: () => Promise<void>, serverAvailable = true) {
  const events: string[] = [], notices: { title: string; message: string }[] = []
  let creations = 0, quitCalls = 0, secondInstance!: (_event: unknown, argv: string[]) => void
  const window = { isDestroyed: () => false, show: () => { events.push('show-desktop') }, focus: () => { events.push('focus-desktop') } }
  const context = vm.createContext({
    browserEntryRequested: initial === 'browser', syntheticE2e: undefined,
    createWorkspaceLaunch,
    localServer: serverAvailable ? { authorizeLaunch: () => 'http://127.0.0.1:12345/synthetic-launch' } : undefined,
    shutdownCoordinator: { state: 'idle' }, approvedExit: false, workspaceTransitions: { applying: () => false },
    mainWindow: null,
    createWindow: () => { creations++; events.push('create-desktop'); context.mainWindow = window },
    shell: { openExternal: async () => { events.push('open-browser'); await openBrowser() } },
    dialog: { showErrorBox: (title: string, message: string) => { notices.push({ title, message }) } },
    app: { on: (_name: string, callback: typeof secondInstance) => { secondInstance = callback }, quit: () => { quitCalls++ } }
  })
  vm.runInContext(launchComposition, context)
  const launch: ReturnType<typeof createWorkspaceLaunch> = vm.runInContext('workspaceLaunch', context)
  return { launch, context, events, notices, get creations() { return creations }, get quitCalls() { return quitCalls },
    repeat: (entry: Entry) => secondInstance({}, entry === 'browser' ? ['--dam-browser'] : []) }
}

async function mainStartup(failAt: 'storage' | 'server' | 'browser') {
  const effects: string[] = [], notices: { title: string; message: string }[] = [], logs: unknown[][] = [], quitApproved: boolean[] = []
  const handlers = new Map<string, (event?: { preventDefault(): void }, argv?: string[]) => void>()
  const failure = Error('DO_NOT_REPORT_SYNTHETIC_STARTUP_DETAIL')
  let readyCallback!: () => Promise<void>, browserAttempts = 0, desktopCreations = 0
  const window = { isDestroyed: () => false, show: () => { effects.push('show-desktop') }, focus: () => { effects.push('focus-desktop') } }
  const context = vm.createContext({
    ownsSingleHost: true, syntheticE2e: undefined, connectedSyntheticE2e: undefined,
    browserEntryRequested: failAt === 'browser', createWorkspaceLaunch,
    approvedExit: false, appStorage: undefined, activeLibraryHost: undefined, workspaceDrafts: undefined,
    workWindows: undefined, assetCard: undefined, connectedRuntime: undefined, localServer: undefined,
    requestedProfile: 'SYNTHETIC_PROFILE', SettingsService: { configureProfile: () => {} },
    aiDeviceSampler: undefined, visualAdmission: undefined, managedModels: undefined, retrievalModels: undefined,
    retrievalRuntime: undefined, queryFileGrants: undefined,
    createLocalAiDeviceSampler: () => ({ read: () => [], stop: async () => {} }),
    createVisualAdmission: () => ({}), powerMonitor: { getSystemIdleState: () => 'idle' },
    mainWindow: null, workspaceClients: new Map([['client:synthetic', { send: () => {} }]]),
    join: path.join, __dirname: 'SYNTHETIC_BUILD', randomUUID: () => 'synthetic-device',
    beforeWorkspaceWindowClose: () => {}, screen: { on: () => {} },
    app: {
      whenReady: () => ({ then: (callback: typeof readyCallback) => { readyCallback = callback } }),
      getPath: () => 'SYNTHETIC_PROFILE',
      getAppPath: () => 'SYNTHETIC_APP', isPackaged: false,
      on: (name: string, handler: (event?: { preventDefault(): void }, argv?: string[]) => void) => { handlers.set(name, handler) },
      quit: () => {
        effects.push('quit'); quitApproved.push(context.approvedExit)
        handlers.get('before-quit')?.({ preventDefault: () => { effects.push('prevent-quit') } })
      }
    },
    dialog: { showErrorBox: (title: string, message: string) => { effects.push('feedback'); notices.push({ title, message }) } },
    console: { error: (...messages: unknown[]) => { logs.push(messages) } },
    createAppStorage: () => {
      effects.push('create-storage')
      if (failAt === 'storage') throw failure
      return { database: { exec: () => {}, prepare: () => ({ run: () => {}, get: () => ({ identity: 'device:synthetic' }) }) },
        close: () => { effects.push('close-storage') } }
    },
    createProductionActiveLibraryHost: () => ({ inspect: () => ({ state: 'unconfigured' }) }),
    createWorkspaceDrafts: () => ({ flush: async () => { effects.push('flush-drafts') } }),
    createWorkWindowController: () => ({}), createAssetCardController: () => ({}),
    createConnectedLibraryRuntime: async () => ({ drain: async () => { effects.push('drain-connected') }, registerProtocols: () => { effects.push('register-connected-preview') } }),
    setupIpcHandlers: () => { effects.push('register-ipc') },
    createLocalDamServer: async () => {
      effects.push('create-server')
      if (failAt === 'server') throw failure
      return { authorizeLaunch: () => 'http://127.0.0.1:12345/synthetic-launch', close: async () => { effects.push('close-server') } }
    },
    electronMainHostContext: { platform: 'win32' },
    resolveElectronAppLifecyclePolicy: () => { effects.push('configure-workspace'); return {} },
    protocol: { handle: () => { effects.push('register-preview') } },
    workspaceTransitions: { applying: () => false, request: async () => { effects.push('review-exit') } },
    createWindow: () => { desktopCreations++; effects.push('create-desktop'); context.mainWindow = window },
    BrowserWindow: { getAllWindows: () => [] },
    shell: { openExternal: async () => { effects.push('open-browser'); if (++browserAttempts === 1) throw failure } },
    fileSelection: { cancelAll: () => { effects.push('cancel-files') } },
    createLibraryQuiescence: () => ({ drainForShutdown: async () => { effects.push('drain-library') } }),
    ShutdownCoordinator
  })
  vm.runInContext(launchComposition + '\n' + startupComposition, context)
  await readyCallback()
  await new Promise<void>(resolve => setImmediate(resolve))
  return { effects, notices, logs, quitApproved, handlers, state: vm.runInContext('shutdownCoordinator.state', context),
    get browserAttempts() { return browserAttempts }, get desktopCreations() { return desktopCreations } }
}

function harness(initial: Entry, allowed = () => true) {
  let ready = false, windowExists = false, creations = 0
  const events: Entry[] = []
  const showDesktop = () => { if (!windowExists) { windowExists = true; creations++ }; events.push('desktop') }
  const openBrowser = async () => { if (ready) events.push('browser') }
  const workspaceLaunch = createWorkspaceLaunch({ initial, canOpen: allowed, showDesktop, openBrowser })
  let secondInstance!: (_event: unknown, argv: string[]) => void
  vm.runInNewContext(registration, {
    app: { on: (_name: string, callback: typeof secondInstance) => { secondInstance = callback }, isReady: () => ready },
    mainWindow: null, createWindow: showDesktop, openBrowserWorkspace: openBrowser, workspaceLaunch
  })
  return {
    events, get creations() { return creations },
    repeat: (entry: Entry) => secondInstance({}, entry === 'browser' ? ['--dam-browser'] : []),
    ready: async () => {
      ready = true
      await workspaceLaunch.ready()
    }
  }
}

await test('Main retains a Browser launch received before a cold Desktop Host is ready', async () => {
  const host = harness('desktop')
  host.repeat('browser')
  assert.deepEqual(host.events, [])
  await host.ready()
  assert.deepEqual(host.events, ['desktop', 'browser'])
  assert.equal(host.creations, 1)
})

await test('a cold Browser Host retains an early Desktop launch and coalesces pending duplicates', async () => {
  const host = harness('browser')
  host.repeat('desktop'); host.repeat('desktop'); host.repeat('browser')
  await host.ready()
  assert.deepEqual(host.events, ['browser', 'desktop'])
  assert.equal(host.creations, 1)
  await host.ready()
  assert.deepEqual(host.events, ['browser', 'desktop'], 'marking ready again cannot repeat cold launches')
})

await test('ready launches share the existing desktop window in both entry orders', async () => {
  for (const initial of ['desktop', 'browser'] as const) {
    const host = harness(initial)
    await host.ready()
    host.repeat(initial === 'desktop' ? 'browser' : 'desktop')
    host.repeat('desktop'); host.repeat('desktop'); host.repeat('browser')
    await new Promise<void>(resolve => setImmediate(resolve))
    assert.equal(host.creations, 1)
    assert.equal(host.events.filter(entry => entry === 'browser').length, 2)
  }
})

await test('launch admission is checked on request and again before each queued presentation', async () => {
  let allowed = true, release!: () => void
  const held = new Promise<void>(resolve => { release = resolve }), events: Entry[] = [], failures: Entry[] = []
  const launch = createWorkspaceLaunch({ initial: 'browser', canOpen: () => allowed,
    openBrowser: async () => { events.push('browser'); await held }, showDesktop: () => { events.push('desktop') },
    presentationFailed: entry => { failures.push(entry) } })
  await launch.request('desktop')
  const ready = launch.ready()
  await new Promise<void>(resolve => setImmediate(resolve))
  allowed = false; release()
  await assert.rejects(ready, /HOST_SHUTTING_DOWN/)
  await assert.rejects(launch.request('browser'), /HOST_SHUTTING_DOWN/)
  assert.deepEqual(events, ['browser'])
  assert.deepEqual(failures, [], 'admission rejection is not a presentation failure')
})

await test('an unsuccessful Browser opening does not prevent an already queued Desktop opening', async () => {
  const events: string[] = []
  let attempts = 0
  const launch = createWorkspaceLaunch({ initial: 'browser', canOpen: () => true,
    openBrowser: async () => { events.push('browser'); if (++attempts === 1) throw Error('TEST_BROWSER_OPEN_FAILED') },
    showDesktop: () => { events.push('desktop') }, presentationFailed: entry => { events.push(`failed:${entry}`) } })
  await launch.request('desktop')
  await assert.rejects(launch.ready(), /TEST_BROWSER_OPEN_FAILED/)
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.deepEqual(events, ['browser', 'failed:browser', 'desktop'])
  await launch.request('browser')
  assert.deepEqual(events, ['browser', 'failed:browser', 'desktop', 'browser'])
})

await test('presentation failure feedback also covers an actual Desktop failure and retains the rejection', async () => {
  const failures: Entry[] = [], failure = Error('TEST_DESKTOP_OPEN_FAILED')
  const launch = createWorkspaceLaunch({ initial: 'desktop', canOpen: () => true, openBrowser: async () => {},
    showDesktop: () => { throw failure }, presentationFailed: entry => { failures.push(entry) } })
  await assert.rejects(launch.ready(), error => error === failure)
  assert.deepEqual(failures, ['desktop'])
})

await test('Main reports a failed Browser opening, preserves the Host, and supports retry plus the existing Desktop', async () => {
  const failure = Error('TEST_BROWSER_OPEN_FAILED')
  let attempts = 0
  const host = mainLaunchHarness('desktop', async () => { if (++attempts === 1) throw failure })
  await host.launch.ready()
  await assert.rejects(host.launch.request('browser'), error => error === failure)
  assert.deepEqual(host.notices, [{ title: 'DAM 浏览器版', message: browserFailureMessage }])
  host.repeat('desktop')
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal(host.creations, 1)
  assert.deepEqual(host.events, ['create-desktop', 'open-browser', 'show-desktop', 'focus-desktop'])
  await host.launch.request('browser')
  assert.equal(attempts, 2)
  assert.equal(host.notices.length, 1)
  assert.equal(host.quitCalls, 0)
  assert.equal(host.context.approvedExit, false)
  assert.equal(host.context.shutdownCoordinator.state, 'idle')
  host.context.shutdownCoordinator.state = 'draining'
  await assert.rejects(host.launch.request('browser'), /HOST_SHUTTING_DOWN/)
  assert.equal(host.notices.length, 1, 'Main does not show a Browser failure prompt for rejected admission')
})

await test('Main explicitly rejects Browser presentation when the local server is unavailable', async () => {
  const host = mainLaunchHarness('browser', async () => { assert.fail('must not invoke the system browser without a local server') }, false)
  await assert.rejects(host.launch.ready(), /LOCAL_HOST_UNAVAILABLE/)
  assert.deepEqual(host.events, [])
  assert.deepEqual(host.notices, [{ title: 'DAM 浏览器版', message: browserFailureMessage }])
})

await test('the visible Browser command uses launch feedback and retains its trusted success or rejection result', async () => {
  const failure = Error('TEST_BROWSER_OPEN_FAILED')
  let attempts = 0
  const host = mainLaunchHarness('desktop', async () => { if (++attempts === 1) throw failure })
  await host.launch.ready()
  const command = mainSource.split('\n').find(line => line.includes("registerWorkspaceCommand('app:open-browser'"))
  assert.ok(command)
  let invoke!: (event: unknown) => Promise<{ success: boolean }>
  const trusted = {}
  vm.runInNewContext(command, {
    registerWorkspaceCommand: (_channel: string, handler: typeof invoke) => { invoke = handler },
    isTrustedWorkspace: (event: unknown) => event === trusted, workspaceLaunch: host.launch,
    openBrowserWorkspace: () => { assert.fail('the visible command must use the shared launch owner') }
  })
  await assert.rejects(invoke(trusted), error => error === failure)
  assert.deepEqual(host.notices, [{ title: 'DAM 浏览器版', message: browserFailureMessage }])
  await assert.rejects(invoke({}), /UNTRUSTED_SENDER/)
  assert.equal(attempts, 1)
  assert.equal((await invoke(trusted)).success, true)
  assert.equal(attempts, 2)
  assert.equal(host.notices.length, 1)
  assert.equal(host.quitCalls, 0)
})

await test('Main startup failure reports fixed safe guidance, approves cleanup exit, and returns before presenting any workspace', async () => {
  for (const failAt of ['storage', 'server'] as const) {
    const result = await mainStartup(failAt)
    assert.deepEqual(result.notices, [{ title: 'DAM 启动失败', message: startupFailureMessage }])
    assert.deepEqual(result.quitApproved, [true, true], 'both initial quit and the drained quit bypass workspace review')
    assert.equal(result.state, 'completed')
    assert.ok(result.effects.indexOf('feedback') < result.effects.indexOf('quit'))
    assert.equal(result.effects.filter(effect => effect === 'prevent-quit').length, 1)
    assert.ok(result.effects.includes('cancel-files') && result.effects.includes('drain-library'))
    if (failAt === 'server') {
      assert.ok(result.effects.includes('flush-drafts') && result.effects.includes('drain-connected') && result.effects.includes('close-storage'), 'partly initialized resources use the existing shutdown drain')
    }
    assert.ok(!result.effects.some(effect => ['configure-workspace', 'register-preview', 'open-browser', 'create-desktop', 'review-exit'].includes(effect)))
    assert.equal(result.handlers.has('activate'), false)
    assert.doesNotMatch(JSON.stringify([result.notices, result.logs]), /DO_NOT_REPORT_SYNTHETIC_STARTUP_DETAIL/)
  }
})

await test('Main cold Browser presentation failure keeps activation and repeated launch recovery available', async () => {
  const result = await mainStartup('browser')
  assert.deepEqual(result.notices, [{ title: 'DAM 浏览器版', message: browserFailureMessage }])
  assert.deepEqual(result.quitApproved, [])
  assert.equal(result.state, 'idle')
  assert.equal(result.handlers.has('activate'), true)
  result.handlers.get('activate')?.()
  await new Promise<void>(resolve => setImmediate(resolve))
  result.handlers.get('second-instance')?.(undefined, [])
  result.handlers.get('second-instance')?.(undefined, ['--dam-browser'])
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal(result.desktopCreations, 1)
  assert.ok(result.effects.includes('show-desktop') && result.effects.includes('focus-desktop'))
  assert.equal(result.browserAttempts, 2)
  assert.equal(result.notices.length, 1)
  assert.ok(!result.effects.some(effect => effect.startsWith('drain-') || effect.startsWith('close-')))
})

await test('Main uses one cold/repeated launch owner and rejects presentation during exit or drain', () => {
  assert.match(mainSource, /initial: browserEntryRequested \? 'browser' : 'desktop'/)
  assert.match(mainSource, /canOpen: \(\) => shutdownCoordinator\.state === 'idle' && !approvedExit && !workspaceTransitions\.applying\(\)/)
  assert.match(mainSource, /await workspaceLaunch\.ready\(\)/)
  assert.match(registration, /workspaceLaunch\.request\(argv\.includes\('--dam-browser'\) \? 'browser' : 'desktop'\)/)
  assert.doesNotMatch(registration, /app\.isReady\(\)|createWindow\(\)|openBrowserWorkspace\(\)/)
})

await test('Windows Browser Start menu shortcut targets the same installed executable and is removed on uninstall', async () => {
  const config = JSON.parse(await fs.readFile('package.json', 'utf8'))
  assert.equal(config.build.nsis.include, 'build/installer.nsh')
  const installer = await fs.readFile(path.join('build', 'installer.nsh'), 'utf8')
  const install = installer.match(/!macro customInstall\b([\s\S]*?)!macroend/)?.[1]
  const uninstall = installer.match(/!macro customUnInstall\b([\s\S]*?)!macroend/)?.[1]
  assert.ok(install && uninstall, 'Browser launch shortcut has paired installer/uninstaller hooks')
  assert.match(install, /CreateShortCut "\$SMPROGRAMS\\\$\{DAM_BROWSER_SHORTCUT_NAME\}\.lnk" "\$INSTDIR\\\$\{APP_EXECUTABLE_FILENAME\}" "--dam-browser"/)
  assert.match(uninstall, /Delete "\$SMPROGRAMS\\\$\{DAM_BROWSER_SHORTCUT_NAME\}\.lnk"/)
  assert.match(installer, /!define DAM_BROWSER_SHORTCUT_NAME "DAM 浏览器版"/)
  assert.doesNotMatch(install + uninstall, /\$DESKTOP|\$\{SHORTCUT_NAME\}/, 'the existing Desktop shortcut is owned by electron-builder')
})
