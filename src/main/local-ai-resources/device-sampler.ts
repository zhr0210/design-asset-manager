import { execFile } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import type { AiDeviceResourceSample } from '../../shared/contracts/local-ai-resources.contract'

/** Fixed bounded device query only: no process, account, environment or file inventory. */
export function createLocalAiDeviceSampler() {
  let memory = { free: os.freemem(), total: os.totalmem() }, memoryAt = 0
  let metalName: string | undefined
  let devices: AiDeviceResourceSample[] = [], inFlight: Promise<void> | undefined, stopped = false
  const query = () => {
    if (inFlight || stopped) return inFlight ?? Promise.resolve()
    if (process.platform === 'darwin') {
      inFlight = new Promise<void>(resolve => {
        execFile('/usr/bin/memory_pressure', ['-Q'], { timeout: 2000, maxBuffer: 8192, shell: false }, (error, stdout) => {
          const percent = /System-wide memory free percentage:\s*(\d+)%/.exec(stdout)?.[1]
          if (!error && percent !== undefined && Number(percent) <= 100) {
            memory = { total: os.totalmem(), free: Math.floor(os.totalmem() * Number(percent) / 100) }; memoryAt = Date.now()
          }
          if (metalName) devices = [{ id: '0:METAL', name: metalName, topology: 'shared', source: 'macos-system',
            sampledAt: memoryAt || null, state: memoryAt && Date.now() - memoryAt < 5000 ? 'known' : 'unknown',
            totalBytes: memory.total, freeBytes: memoryAt ? memory.free : null, driver: os.release() }]
          resolve()
        })
      }).finally(() => { inFlight = undefined })
      return inFlight
    }
    if (process.platform !== 'win32') { devices = []; return Promise.resolve() }
    const executable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'nvidia-smi.exe')
    inFlight = new Promise<void>(resolve => {
      execFile(executable, ['--query-gpu=index,uuid,name,memory.total,memory.free,driver_version,compute_cap', '--format=csv,noheader,nounits'],
        { windowsHide: true, shell: false, timeout: 2000, maxBuffer: 8192 }, (error, stdout) => {
          if (error) { devices = devices.map(device => ({ ...device, state: 'unknown', freeBytes: null })); resolve(); return }
          const sampledAt = Date.now(), parsed: AiDeviceResourceSample[] = []
          for (const line of stdout.trim().split(/\r?\n/).slice(0, 16)) {
            const [index, uuid, name, total, free, driver, cc] = line.split(',').map(value => value.trim())
            if (!/^\d{1,2}$/.test(index ?? '') || !/^GPU-[a-f0-9-]{36}$/i.test(uuid ?? '') || !name || name.length > 120) continue
            const totalBytes = Math.floor(Number(total) * 1024 ** 2), freeBytes = Math.floor(Number(free) * 1024 ** 2)
            const known = Number.isSafeInteger(totalBytes) && totalBytes > 0 && Number.isSafeInteger(freeBytes) && freeBytes >= 0 && freeBytes <= totalBytes
            parsed.push({ id: `${index}:${uuid}`, name, topology: 'dedicated', source: 'nvidia-smi', sampledAt,
              state: known ? 'known' : 'unknown', totalBytes: known ? totalBytes : null, freeBytes: known ? freeBytes : null,
              driver: /^\d+(?:\.\d+)+$/.test(driver ?? '') ? driver : undefined,
              computeCapability: /^\d+\.\d+$/.test(cc ?? '') ? cc : undefined })
          }
          devices = parsed; resolve()
        })
    }).finally(() => { inFlight = undefined })
    return inFlight
  }
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    // Displays only: never request serial numbers, process inventory or accounts.
    execFile('/usr/sbin/system_profiler', ['SPDisplaysDataType', '-json'], { timeout: 5000, maxBuffer: 65536, shell: false }, (error, stdout) => {
      if (error || stopped) return
      try { const display = JSON.parse(stdout).SPDisplaysDataType?.find((value: any) => value.sppci_model && (value.spdisplays_metal || value.spdisplays_mtlgpufamilysupport))
        if (display && /^Apple /.test(display.sppci_model)) { metalName = String(display.sppci_model).slice(0, 120); void query() }
      } catch { /* Unknown stays unknown; CPU remains available. */ }
    })
  }
  void query()
  const timer = setInterval(() => { void query() }, 2000); timer.unref?.()
  return { memory: () => process.platform === 'darwin' && memoryAt && Date.now() - memoryAt < 5000 ? { ...memory } : { free: os.freemem(), total: os.totalmem() }, read: () => devices.map(device => ({ ...device })), refresh: query,
    async stop() { stopped = true; clearInterval(timer); await inFlight } }
}
