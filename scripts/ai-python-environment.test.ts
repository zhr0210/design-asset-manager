import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  AiPythonEnvironment,
  type AiPythonEnvironmentHost,
  type AiPythonEnvironmentIo
} from '../src/main/services/ai-python-environment'

interface FakeIoOptions {
  existing?: string[]
  directories?: Record<string, string[]>
  whereOutput?: string
  whereError?: string
  importable?: string[]
}

function fakeIo(options: FakeIoOptions = {}): AiPythonEnvironmentIo {
  const existing = new Set(options.existing ?? [])
  const importable = new Set(options.importable ?? [])
  return {
    exists: (candidate) => existing.has(candidate),
    readDirectory: (directory) => {
      const entries = options.directories?.[directory]
      if (!entries) throw new Error(`missing directory: ${directory}`)
      return [...entries]
    },
    findPythonOnPath: () => {
      if (options.whereError) throw new Error(options.whereError)
      return options.whereOutput ?? ''
    },
    canImport: (pythonExecutable, moduleName) => importable.has(`${pythonExecutable}:${moduleName}`)
  }
}

function host(input: Partial<AiPythonEnvironmentHost> = {}): AiPythonEnvironmentHost {
  return {
    platform: 'darwin',
    runtimeRoot: '/managed/runtime',
    environment: {},
    ...input
  }
}

const macManagedPython = '/managed/runtime/macos-ai-python/.venv/bin/python'
const macManaged = new AiPythonEnvironment(host(), fakeIo({
  existing: [macManagedPython],
  importable: [`${macManagedPython}:torch`]
}))
assert.deepEqual(macManaged.resolveManagedRuntime(), {
  runtimeDir: '/managed/runtime/macos-ai-python',
  venvDir: '/managed/runtime/macos-ai-python/.venv',
  pythonPath: macManagedPython,
  exists: true
})
assert.equal(macManaged.resolvePythonExecutable(), macManagedPython)

const oldMacPython = '/managed/runtime/macos-ai-python/.venv.old/bin/python'
const macFallback = new AiPythonEnvironment(host(), fakeIo({
  existing: [macManagedPython, oldMacPython],
  importable: [`${oldMacPython}:torch`]
}))
assert.equal(macFallback.resolvePythonExecutable(), oldMacPython)

const macManagedWithoutTorch = new AiPythonEnvironment(host(), fakeIo({
  existing: [macManagedPython]
}))
assert.equal(macManagedWithoutTorch.resolvePythonExecutable(), macManagedPython)

const macHomebrew = new AiPythonEnvironment(host(), fakeIo({
  existing: ['/opt/homebrew/bin/python3.13', '/opt/homebrew/bin/python3']
}))
assert.equal(macHomebrew.resolveBasePythonExecutable(), '/opt/homebrew/bin/python3.13')

const explicit = new AiPythonEnvironment(host({
  environment: {
    DESIGN_ASSET_MANAGER_PYTHON: '  explicit-python  ',
    TEXT_OCR_PYTHON: 'ocr-python',
    PYTHON: 'generic-python'
  }
}), fakeIo())
assert.equal(explicit.resolvePythonExecutable(), 'explicit-python')
assert.equal(explicit.resolveBasePythonExecutable(), 'explicit-python')

const secondaryEnvironment = new AiPythonEnvironment(host({
  environment: { TEXT_OCR_PYTHON: 'ocr-python', PYTHON: 'generic-python' }
}), fakeIo())
assert.equal(secondaryEnvironment.resolveBasePythonExecutable(), 'ocr-python')

const windowsHost = host({
  platform: 'win32',
  runtimeRoot: 'C:\\Managed\\runtime',
  environment: { USERPROFILE: 'C:\\Users\\Test' }
})
const windowsManaged = new AiPythonEnvironment(windowsHost, fakeIo())
assert.equal(windowsManaged.resolveManagedRuntime().pythonPath, 'C:\\Managed\\runtime\\macos-ai-python\\.venv\\Scripts\\python.exe')

const windowsWhere = new AiPythonEnvironment(windowsHost, fakeIo({
  whereOutput: 'C:\\Users\\Test\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe\r\nC:\\Python311\\python.exe\r\n'
}))
assert.equal(windowsWhere.resolveBasePythonExecutable(), 'C:\\Python311\\python.exe')

const userPythonRoot = 'C:\\Users\\Test\\AppData\\Local\\Programs\\Python'
const windowsSearch = new AiPythonEnvironment(windowsHost, fakeIo({
  whereError: 'not on PATH',
  existing: [
    userPythonRoot,
    `${userPythonRoot}\\Python311\\python.exe`,
    `${userPythonRoot}\\Python313\\python.exe`
  ],
  directories: {
    [userPythonRoot]: ['Python311', 'Python313']
  }
}))
assert.equal(windowsSearch.resolveBasePythonExecutable(), `${userPythonRoot}\\Python313\\python.exe`)

const programFilesPythonRoot = 'C:\\Program Files\\Python'
const windowsProgramFilesSearch = new AiPythonEnvironment(host({
  ...windowsHost,
  environment: {}
}), fakeIo({
  whereError: 'not on PATH',
  existing: [
    programFilesPythonRoot,
    `${programFilesPythonRoot}\\Python312\\python.exe`
  ],
  directories: {
    [programFilesPythonRoot]: ['Python312']
  }
}))
assert.equal(
  windowsProgramFilesSearch.resolveBasePythonExecutable(),
  `${programFilesPythonRoot}\\Python312\\python.exe`
)

const homePathPythonRoot = '\\Users\\PathOnly\\AppData\\Local\\Programs\\Python'
const windowsHomePathSearch = new AiPythonEnvironment(host({
  ...windowsHost,
  environment: { HOMEPATH: '\\Users\\PathOnly' }
}), fakeIo({
  whereError: 'not on PATH',
  existing: [
    homePathPythonRoot,
    `${homePathPythonRoot}\\Python310\\python.exe`
  ],
  directories: {
    [homePathPythonRoot]: ['Python310']
  }
}))
assert.equal(
  windowsHomePathSearch.resolveBasePythonExecutable(),
  `${homePathPythonRoot}\\Python310\\python.exe`
)

const linux = new AiPythonEnvironment(host({ platform: 'linux' }), fakeIo())
assert.equal(linux.resolveManagedRuntime().pythonPath, '/managed/runtime/macos-ai-python/.venv/bin/python')
assert.equal(linux.resolveBasePythonExecutable(), 'python')

const coreSource = await fs.readFile('src/main/services/ai-python-environment.ts', 'utf8')
const adapterSource = await fs.readFile('src/main/services/ai-python-runtime.service.ts', 'utf8')
const dependencySource = await fs.readFile('src/main/services/ocr-dependency.service.ts', 'utf8')
const rapidOcrSource = await fs.readFile('src/main/services/text-detection/rapidocr-text-box-provider.ts', 'utf8')
const healthcheckSource = await fs.readFile('src/main/services/ocr-healthcheck.service.ts', 'utf8')
assert.doesNotMatch(coreSource, /from ['"]electron['"]|child_process|node:child_process|process\.platform|process\.env|execSync|spawn\s*\(/)
assert.match(coreSource, /AI_PYTHON_ENVIRONMENT_PLATFORM_ADAPTERS/)
assert.match(coreSource, /resolveAiPythonEnvironmentPlatformAdapter/)
assert.doesNotMatch(coreSource, /host\.platform === 'win32' \? path\.win32 : path\.posix/)
assert.doesNotMatch(coreSource, /MANAGED_PYTHON_PATH_ADAPTERS/)
assert.match(adapterSource, /new AiPythonEnvironment/)
assert.match(adapterSource, /execFileSync\(pythonExecutable, \['-c', `import \$\{moduleName\}`\]/)
assert.doesNotMatch(dependencySource, /MANAGED_PYTHON_PATH_ADAPTERS|OCR_BASE_PYTHON_RESOLVERS|searchWindowsPythonPaths|resolveWindowsBasePythonExecutable/)
assert.match(rapidOcrSource, /from '..\/ai-python-runtime\.service'/)
assert.match(healthcheckSource, /from '.\/ai-python-runtime\.service'/)
assert.doesNotMatch(rapidOcrSource, /function resolvePythonExecutable/)
assert.doesNotMatch(healthcheckSource, /function resolvePythonExecutable/)

console.log('ai-python-environment passed')
