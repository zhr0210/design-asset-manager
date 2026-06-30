import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import { app } from 'electron'
import { resolveDebugLogPath } from '../platform/log-path-resolver'
import { resolveManagedPaths } from '../platform/path-resolver'
import {
  AiPythonEnvironment,
  type ManagedAiPythonRuntime
} from './ai-python-environment'
import { createAiPythonRuntimeHostContext } from './ai-python-runtime-host-context'

function resolveElectronManagedPaths() {
  return resolveManagedPaths({
    getPath: (name) => app.getPath(name)
  })
}

function redactDebugMessage(message: string): string {
  const homeValues = [
    process.env.USERPROFILE,
    process.env.HOME,
    process.env.HOMEPATH
  ].filter((value): value is string => Boolean(value?.trim()))
  return homeValues.reduce((current, value) => current.split(value).join('<user-home>'), message)
}

function writeDebugLog(message: string): void {
  try {
    const managedPaths = resolveElectronManagedPaths()
    const logPath = resolveDebugLogPath('ocr-dependency', {
      managedPaths,
      fileName: 'ocr-dependency.log'
    })
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${redactDebugMessage(message)}\n`, 'utf8')
  } catch {
    // Python discovery must remain usable when debug logging is unavailable.
  }
}

function createAiPythonEnvironment(): AiPythonEnvironment {
  const managedPaths = resolveElectronManagedPaths()
  const hostContext = createAiPythonRuntimeHostContext()
  return new AiPythonEnvironment({
    platform: hostContext.platform,
    runtimeRoot: managedPaths.runtimeDir,
    environment: hostContext.environment
  }, {
    exists: (candidate) => fs.existsSync(candidate),
    readDirectory: (directory) => fs.readdirSync(directory),
    findPythonOnPath: () => execSync('where python', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }),
    canImport: (pythonExecutable, moduleName) => {
      try {
        execFileSync(pythonExecutable, ['-c', `import ${moduleName}`], {
          timeout: 5000,
          stdio: 'ignore'
        })
        return true
      } catch {
        return false
      }
    },
    log: writeDebugLog
  })
}

export function resolveManagedAiPythonRuntime(): ManagedAiPythonRuntime {
  return createAiPythonEnvironment().resolveManagedRuntime()
}

export function resolveMacOSAiPythonRuntime(): ManagedAiPythonRuntime {
  return resolveManagedAiPythonRuntime()
}

export function resolveBasePythonExecutable(): string {
  return createAiPythonEnvironment().resolveBasePythonExecutable()
}

export function resolvePythonExecutable(): string {
  return createAiPythonEnvironment().resolvePythonExecutable()
}
