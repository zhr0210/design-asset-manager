import type { RegisteredDoctorCheck } from '../doctor.types'

async function getElectronDetails(): Promise<Record<string, unknown>> {
  try {
    const electron = await import('electron')
    const app = electron.app
    return {
      electronImportable: true,
      appAvailable: Boolean(app),
      packaged: app ? app.isPackaged : null
    }
  } catch (err) {
    return {
      electronImportable: false,
      appAvailable: false,
      packaged: null,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const systemCheck: RegisteredDoctorCheck = {
  id: 'system',
  label: 'System environment',
  async run(context) {
    const startedAt = Date.now()
    const electron = await getElectronDetails()
    const details = {
      platform: context.platformInfo.platform,
      arch: context.platformInfo.arch,
      profile: context.platformInfo.profile,
      nodeVersion: process.version,
      cwd: process.cwd(),
      electron
    }

    return {
      id: this.id,
      label: this.label,
      status: 'ok',
      message: `Detected ${context.platformInfo.profile} on Node ${process.version}.`,
      details,
      durationMs: Date.now() - startedAt
    }
  }
}
