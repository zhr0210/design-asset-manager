import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { resolveNodeElectronExecutableCandidates } from './node-host-platform-defaults.mjs'

const repo = process.cwd()
const outputRoot = path.join(repo, 'dist-temp', 'ai-console-ui-smoke')
const userData = path.join(os.tmpdir(), `dam-ai-console-smoke-${Date.now()}`)
const screenshot = path.join(outputRoot, 'platform-ai-branch-status.png')

await fs.mkdir(outputRoot, { recursive: true })
await fs.mkdir(userData, { recursive: true })

function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  for (const [label, raw] of [
    ['<REPO_ROOT>', repo],
    ['<USER_DATA>', userData],
    ['<HOME>', os.homedir()],
    ['<TEMP>', os.tmpdir()]
  ]) {
    if (raw) text = text.split(raw).join(label)
  }
  return text.replace(/\b[A-Z]:[\\/][^"\r\n]*/gi, '<LOCAL_PATH>')
}

async function pathExists(candidate) {
  try {
    await fs.access(candidate)
    return true
  } catch {
    return false
  }
}

async function resolveElectronExecutable() {
  for (const candidate of resolveNodeElectronExecutableCandidates(process.platform, repo)) {
    if (await pathExists(candidate)) return candidate
  }

  return undefined
}

const launchOptions = {
  args: [
    repo,
    `--user-data-dir=${userData}`,
    '--disable-gpu',
    '--disable-dev-shm-usage'
  ],
  cwd: repo,
  timeout: 60_000,
  env: {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
  }
}

const executablePath = await resolveElectronExecutable()
if (executablePath) {
  launchOptions.executablePath = executablePath
}

const app = await electron.launch(launchOptions)

try {
  const page = await app.firstWindow()
  await page.bringToFront()
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 })
  await page.evaluate(() => {
    location.hash = '#/ai-console'
  })

  const panel = page.getByTestId('platform-ai-branch-status')
  await panel.waitFor({ state: 'visible', timeout: 30_000 })
  await panel.scrollIntoViewIfNeeded()

  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    body: document.body.scrollWidth > document.body.clientWidth,
    viewport: { width: innerWidth, height: innerHeight }
  }))

  if (overflow.doc || overflow.body) {
    throw new Error(`AI Console overflow detected: ${JSON.stringify(overflow)}`)
  }

  await panel.screenshot({ path: screenshot })
  console.log('AI_CONSOLE_UI_SMOKE_SCREENSHOT', redact(screenshot))
  console.log('AI_CONSOLE_UI_SMOKE_OVERFLOW', JSON.stringify(overflow))
} finally {
  await app.close().catch(() => undefined)
  await fs.rm(userData, { recursive: true, force: true }).catch(() => undefined)
}
