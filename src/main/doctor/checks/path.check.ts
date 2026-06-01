import fs from 'fs/promises'
import type { ManagedPaths } from '../../../shared/types/platform.types'
import type { RegisteredDoctorCheck } from '../doctor.types'

async function pathState(pathValue: string) {
  try {
    const stat = await fs.stat(pathValue)
    return { path: pathValue, exists: true, isDirectory: stat.isDirectory() }
  } catch {
    return { path: pathValue, exists: false, isDirectory: false }
  }
}

export const pathCheck: RegisteredDoctorCheck = {
  id: 'path',
  label: 'Managed paths',
  async run(context) {
    const startedAt = Date.now()
    const entries = Object.entries(context.managedPaths) as Array<[keyof ManagedPaths, string]>
    const paths = Object.fromEntries(
      await Promise.all(entries.map(async ([key, value]) => [key, await pathState(value)]))
    )

    return {
      id: this.id,
      label: this.label,
      status: 'ok',
      message: 'Managed paths resolved.',
      details: { paths },
      durationMs: Date.now() - startedAt
    }
  }
}
