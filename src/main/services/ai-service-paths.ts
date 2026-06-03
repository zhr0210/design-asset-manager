import fs from 'fs'
import path from 'path'

export type AiServicePathRuntime = {
  cwd?: string
  dirname?: string
  resourcesPath?: string
  isPackaged?: boolean
  existsSync?: (candidate: string) => boolean
  envAiServiceDir?: string
}

function getModuleDir(): string | null {
  try {
    if (typeof __dirname !== 'undefined') {
      return __dirname
    }
  } catch {
    // Ignore.
  }
  return null
}

function pushCandidate(candidates: string[], candidate: string | null | undefined): void {
  if (!candidate || !candidate.trim()) return
  const normalized = path.resolve(candidate)
  if (!candidates.includes(normalized)) {
    candidates.push(normalized)
  }
}

function pushAiServiceNear(candidates: string[], start: string | null | undefined): void {
  if (!start || !start.trim()) return
  let current = path.resolve(start)
  for (let depth = 0; depth < 8; depth += 1) {
    pushCandidate(candidates, path.join(current, 'ai-service'))
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
}

export function resolveAiServiceRoot(runtime: AiServicePathRuntime = {}): string {
  const existsSync = runtime.existsSync ?? fs.existsSync
  const candidates: string[] = []

  pushCandidate(candidates, runtime.envAiServiceDir ?? process.env.DESIGN_ASSET_MANAGER_AI_SERVICE_DIR)

  const resourcesPath = runtime.resourcesPath ?? process.resourcesPath
  const isPackaged = runtime.isPackaged ?? Boolean(process.versions.electron && !process.defaultApp)
  if (isPackaged && resourcesPath) {
    pushCandidate(candidates, path.join(resourcesPath, 'ai-service'))
  }

  pushAiServiceNear(candidates, runtime.cwd ?? process.cwd())
  pushAiServiceNear(candidates, runtime.dirname ?? getModuleDir())

  const existing = candidates.find((candidate) => existsSync(candidate))
  if (existing) {
    return existing
  }

  if (isPackaged && resourcesPath) {
    return path.join(resourcesPath, 'ai-service')
  }

  return path.join(runtime.cwd ?? process.cwd(), 'ai-service')
}

export function resolveAiServicePath(segments: string[], runtime: AiServicePathRuntime = {}): string {
  return path.join(resolveAiServiceRoot(runtime), ...segments)
}
