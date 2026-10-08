import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

/** Ordinary executable/profile; observes only a non-secret receipt and health.
 * This proves packaged Host startup, never UI/model/installation acceptance. */
export async function smokeOrdinaryPackageStartup({ binaryPath, workRoot, timeoutMs = 30000 }) {
  await fs.mkdir(workRoot, { recursive: true })
  const profile = await fs.mkdtemp(path.join(workRoot, 'ordinary-profile-'))
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const child = spawn(binaryPath, ['--dam-browser', '--dam-profile=' + profile], {
    cwd: path.dirname(binaryPath), env, shell: false, windowsHide: true, stdio: 'ignore'
  })
  let exited = false, launchError = false
  const closed = new Promise(resolve => {
    child.once('error', () => { launchError = true; exited = true; resolve() })
    child.once('close', () => { exited = true; resolve() })
  })
  const started = Date.now()
  let observation = null
  try {
    while (!exited && Date.now() - started < timeoutMs) {
      try {
        const receipt = JSON.parse(await fs.readFile(path.join(profile, 'host-startup.json'), 'utf8'))
        const origin = new URL(receipt.origin)
        if (receipt.schema !== 1 || receipt.pid !== child.pid || origin.protocol !== 'http:' ||
            origin.hostname !== '127.0.0.1' || !origin.port || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw Error('RECEIPT_INVALID')
        const response = await fetch(origin.origin + '/api/health', { redirect: 'error', signal: AbortSignal.timeout(2000) })
        const text = await response.text()
        if (!response.ok || text.length > 4096) throw Error('HEALTH_UNAVAILABLE')
        const health = JSON.parse(text)
        if (health.state !== 'ready' || health.schema !== 1 || health.buildId !== receipt.buildId ||
            health.platform !== receipt.platform || health.arch !== receipt.arch || health.version !== receipt.version) throw Error('HEALTH_MISMATCH')
        observation = { ...health, pid: child.pid, startupMs: Date.now() - started, origin: origin.origin,
          startupKind: 'ordinary packaged Browser Host; not UI/model acceptance' }
        break
      } catch { await new Promise(resolve => setTimeout(resolve, 250)) }
    }
  } finally {
    if (!exited) child.kill('SIGTERM')
    await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 5000))])
    if (!exited) {
      child.kill('SIGKILL')
      await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 5000))])
    }
    // Retain this newly created profile for inspection if physical close is unknown.
    if (exited) {
      const realRoot = await fs.realpath(workRoot), realProfile = await fs.realpath(profile)
      if (path.dirname(realProfile) !== realRoot || !path.basename(realProfile).startsWith('ordinary-profile-')) throw Error('SMOKE_CLEANUP_SCOPE_INVALID')
      await fs.rm(realProfile, { recursive: true, force: true })
    }
  }
  return { passed: !!observation && exited && !launchError, observation, processExited: exited, logsRead: false,
    unsafeStartupFlags: false, signatureVerified: false, uiVerified: false }
}
