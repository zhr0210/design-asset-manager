import type { RegisteredDoctorCheck } from '../doctor.types'

export type NativeDependencyImporter = (name: string) => Promise<unknown>

async function defaultImporter(name: string) {
  return import(name)
}

async function importDependency(name: string, importer: NativeDependencyImporter) {
  try {
    await importer(name)
    return { available: true }
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export function createNativeDepsCheck(importer: NativeDependencyImporter = defaultImporter): RegisteredDoctorCheck {
  return {
    id: 'native-deps',
    label: 'Native dependencies',
    async run() {
      const startedAt = Date.now()
      const betterSqlite3 = await importDependency('better-sqlite3', importer)
      const sharp = await importDependency('sharp', importer)
      const status = betterSqlite3.available && sharp.available ? 'ok' : 'warning'

      return {
        id: this.id,
        label: this.label,
        status,
        message: status === 'ok' ? 'Native dependencies are importable.' : 'One or more native dependencies failed to import.',
        details: { betterSqlite3, sharp },
        fixSuggestion: status === 'ok' ? undefined : 'Run the project native dependency rebuild/install flow manually; Doctor will not rebuild automatically.',
        durationMs: Date.now() - startedAt
      }
    }
  }
}

export const nativeDepsCheck = createNativeDepsCheck()
