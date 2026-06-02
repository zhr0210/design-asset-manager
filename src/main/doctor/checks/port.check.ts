import net from 'net'
import type { RegisteredDoctorCheck } from '../doctor.types'

async function probePort(port: number, timeoutMs: number): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    let settled = false
    const finish = (value: Record<string, unknown>) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish({ port, reachable: true, occupied: true }))
    socket.once('timeout', () => finish({ port, reachable: false, occupied: false, timedOut: true }))
    socket.once('error', (err: NodeJS.ErrnoException) => {
      finish({ port, reachable: false, occupied: false, code: err.code })
    })
  })
}

export const portCheck: RegisteredDoctorCheck = {
  id: 'port',
  label: 'Local service ports',
  async run(context) {
    const startedAt = Date.now()
    const timeoutMs = Math.min(context.timeoutMs, 1500)
    const ports = await Promise.all([8000, 8080, 11434, 1234].map((port) => probePort(port, timeoutMs)))
    const aiWorkerPort = ports.find((item) => item.port === 8000)
    const status = aiWorkerPort?.occupied ? 'warning' : 'warning'

    return {
      id: this.id,
      label: this.label,
      status,
      message: aiWorkerPort?.occupied ? 'Default AI Worker port appears occupied.' : 'Default AI Worker port is not reachable.',
      details: { ports },
      fixSuggestion: aiWorkerPort?.occupied
        ? 'Confirm whether the process on port 8000 is the intended AI Worker.'
        : 'Start the AI Worker manually if local AI features are expected.',
      durationMs: Date.now() - startedAt
    }
  }
}
