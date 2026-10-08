import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { test } from 'node:test'

const execute = promisify(execFile)
const bundlePath = 'build/macos/DAM 浏览器版.app'
const executablePath = `${bundlePath}/Contents/MacOS/launch-browser`
const launcher = await fs.readFile(executablePath, 'utf8')
const config = JSON.parse(await fs.readFile('package.json', 'utf8'))
const shell = process.platform === 'win32'
  ? path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git', 'bin', 'bash.exe')
  : '/bin/sh'
const shellPath = value => process.platform === 'win32'
  ? value.replaceAll('\\', '/').replace(/^([a-z]):\//i, (_match, drive) => `/${drive.toLowerCase()}/`)
  : value

await test('companion metadata declares a distinct background launcher with an existing shell executable', async () => {
  const plist = await fs.readFile(`${bundlePath}/Contents/Info.plist`, 'utf8')
  assert.match(plist, /<key>CFBundleIdentifier<\/key>\s*<string>com\.antigravity\.design-asset-manager\.browser-launcher<\/string>/)
  assert.notEqual(config.build.appId, 'com.antigravity.design-asset-manager.browser-launcher')
  assert.match(plist, /<key>CFBundleExecutable<\/key>\s*<string>launch-browser<\/string>/)
  assert.match(plist, /<key>LSUIElement<\/key>\s*<true\/>/)
  assert.match(plist, /<key>CFBundlePackageType<\/key>\s*<string>APPL<\/string>/)
  assert.match(launcher, /^#!\/bin\/sh\n/)
  assert.doesNotMatch(launcher, /\r/, 'the executable template requires POSIX line endings')
})

await test('DMG retains the main application and Applications drag target beside the named Browser bundle', () => {
  const contents = config.build.dmg.contents
  assert.equal(contents.length, 3)
  assert.equal(contents.filter(entry => entry.type === 'file' && !entry.path).length, 1)
  assert.equal(contents.filter(entry => entry.type === 'link' && entry.path === '/Applications').length, 1)
  const companion = contents.find(entry => entry.path === bundlePath)
  assert.deepEqual(companion, { x: 170, y: 290, type: 'dir', path: bundlePath, name: 'DAM 浏览器版.app' })
  for (const entry of contents) {
    assert.ok(entry.x > 0 && entry.x < config.build.dmg.window.width)
    assert.ok(entry.y > 0 && entry.y < config.build.dmg.window.height)
  }
  assert.equal(config.build.publish, null)
  assert.equal(config.build.mac.identity, null)
  assert.equal(config.build.mac.hardenedRuntime, true)
  assert.equal(config.build.afterSign, 'scripts/notarize.js')
})

await test('launcher presents only the fixed installed Host with Browser arguments and no installer/download action', () => {
  assert.match(launcher, /exec \/usr\/bin\/open -n "\$bundle" --args --dam-browser/)
  assert.doesNotMatch(launcher, /\b(curl|wget|sudo|npm|codesign|spctl|eval)\b|https?:\/\//)
  assert.match(launcher, /\/usr\/bin\/osascript -e 'display alert "无法启动 DAM 浏览器版"/)
})

async function fixture(locations) {
  const temporary = path.resolve(os.tmpdir())
  const root = await fs.mkdtemp(path.join(temporary, 'dam-macos-browser-launcher-'))
  const adjacent = path.join(root, '含空格 入口'), global = path.join(root, 'global Applications'), user = path.join(root, 'user Applications')
  const copiedBundle = path.join(adjacent, 'DAM 浏览器版.app'), executable = path.join(copiedBundle, 'Contents', 'MacOS', 'launch-browser')
  const open = path.join(root, 'mock-open'), alert = path.join(root, 'mock-alert'), receipt = path.join(root, 'open-receipt'), alertReceipt = path.join(root, 'alert-receipt')
  await fs.mkdir(path.dirname(executable), { recursive: true })
  // Replace only OS ports and installation roots in the fixture copy. The actual
  // target-selection, quoting, qualification and exec shell code remain intact.
  const isolated = launcher.replace('/usr/bin/open', '"$DAM_TEST_OPEN"')
    .replace('/usr/bin/osascript', '"$DAM_TEST_ALERT"')
    .replace('"/Applications/Design Asset Manager.app"', '"${DAM_TEST_GLOBAL_APPLICATIONS}/Design Asset Manager.app"')
    .replace('"${HOME}/Applications/Design Asset Manager.app"', '"${DAM_TEST_USER_APPLICATIONS}/Design Asset Manager.app"')
  await fs.writeFile(executable, isolated, { mode: 0o755 })
  await fs.writeFile(open, '#!/bin/sh\nprintf "%s\\n" "$@" > "$DAM_TEST_RECEIPT"\n', { mode: 0o755 })
  await fs.writeFile(alert, '#!/bin/sh\nprintf "%s\\n" "$@" > "$DAM_TEST_ALERT_RECEIPT"\n', { mode: 0o755 })
  const roots = { adjacent, global, user }
  for (const location of locations) {
    const host = path.join(roots[location], 'Design Asset Manager.app')
    await fs.mkdir(path.join(host, 'Contents', 'MacOS'), { recursive: true })
    await fs.writeFile(path.join(host, 'Contents', 'Info.plist'), '<plist version="1.0"><dict/></plist>')
    await fs.writeFile(path.join(host, 'Contents', 'MacOS', 'Design Asset Manager'), '#!/bin/sh\nexit 91\n', { mode: 0o755 })
  }
  return {
    roots, receipt, alertReceipt,
    run: () => execute(shell, [...(process.platform === 'win32' ? ['--noprofile', '--norc'] : []), shellPath(executable)], {
      env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT,
        DAM_TEST_OPEN: shellPath(open), DAM_TEST_ALERT: shellPath(alert), DAM_TEST_RECEIPT: shellPath(receipt),
        DAM_TEST_ALERT_RECEIPT: shellPath(alertReceipt), DAM_TEST_GLOBAL_APPLICATIONS: shellPath(global), DAM_TEST_USER_APPLICATIONS: shellPath(user) }
    }),
    close: async () => {
      assert.equal(path.dirname(path.resolve(root)), temporary)
      assert.ok(path.basename(root).startsWith('dam-macos-browser-launcher-'))
      await fs.rm(root, { recursive: true, force: true })
    }
  }
}

for (const [locations, selected] of [
  [['adjacent', 'global', 'user'], 'adjacent'],
  [['global', 'user'], 'global'],
  [['user'], 'user']
]) {
  await test(`shell target priority selects ${selected} and passes one quoted bundle argument`, async () => {
    const f = await fixture(locations)
    try {
      await f.run()
      const argumentsReceived = (await fs.readFile(f.receipt, 'utf8')).trimEnd().split('\n')
      assert.deepEqual(argumentsReceived, ['-n', shellPath(path.join(f.roots[selected], 'Design Asset Manager.app')), '--args', '--dam-browser'])
      await assert.rejects(fs.access(f.alertReceipt), { code: 'ENOENT' })
    } finally { await f.close() }
  })
}

await test('missing Host gives a local installation prompt and never invokes open', async () => {
  const f = await fixture([])
  try {
    await assert.rejects(f.run(), error => error.code === 1 && /请先将主应用 Design Asset Manager\.app/.test(error.stderr))
    await assert.rejects(fs.access(f.receipt), { code: 'ENOENT' })
    assert.match(await fs.readFile(f.alertReceipt, 'utf8'), /无法启动 DAM 浏览器版.*请先将主应用/s)
  } finally { await f.close() }
})
