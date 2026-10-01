#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Ajv from 'ajv'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..')
const REALITIES = new Set([
  'Current Implementation',
  'Validated Tracer',
  'Target Architecture'
])
const CONTEXT_ROLES = new Set([
  'composition',
  'interface',
  'contract',
  'caller',
  'implementation',
  'adapter',
  'test',
  'readme'
])
const MAX_ERROR_FINDINGS = 20
const MAX_WARNING_FINDINGS = 20
const MAX_METADATA_TOKENS = 4000
const CONSERVATIVE_BYTES_PER_TOKEN = 3
const SHELL_META_CHARACTERS = new Set([
  '\r', '\n', ';', '&', '|', '<', '>', '`', '$', '(', ')', '{', '}', '[', ']',
  '*', '?', '!', '~', '#', "'", '"', '\\'
])
const REQUIRED_FORBIDDEN_DIRECTORIES = new Set([
  'docs/',
  'ai-service/models_cache/',
  'dist-packages/',
  'dist-temp/',
  'runtime-data/'
])
const REQUIRED_CONTEXT_PROTECTED_DIRECTORIES = new Set([
  'ai-service/models_cache/',
  'dist-packages/',
  'dist-temp/',
  'runtime-data/',
  'src/main/extensions/photoshow/unpacked/'
])
const REQUIRED_BLOCKING_SUFFIXES = new Set([
  '.onnx', '.safetensors', '.pt', '.pth', '.ckpt', '.bin', '.gguf',
  '.db', '.sqlite', '.sqlite-journal', '.sqlite-wal', '.sqlite-shm'
])
const APPROVED_PYTHON_CHECKS = new Set([
  'scripts/check-adr-router.py',
  'scripts/check-agent-context.py',
  'scripts/check-docs-sync.py',
  'scripts/check-forbidden-paths.py',
  'scripts/check-forbidden-paths.test.py'
])

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function normalizeRepoPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '')
}

function isSafeRepoPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) return false
  if (path.isAbsolute(value) || value.includes('\\')) return false
  const normalized = path.posix.normalize(value)
  return normalized !== '..' && !normalized.startsWith('../') && normalized === value
}

function globToRegExp(glob) {
  let expression = '^'
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index]
    if (char === '*') {
      const next = glob[index + 1]
      if (next === '*') {
        const after = glob[index + 2]
        if (after === '/') {
          expression += '(?:.*/)?'
          index += 2
        } else {
          expression += '.*'
          index += 1
        }
      } else {
        expression += '[^/]*'
      }
      continue
    }
    if (char === '?') {
      expression += '[^/]'
      continue
    }
    expression += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
  }
  return new RegExp(`${expression}$`)
}

function matchesAny(repoPath, patterns = []) {
  return patterns.some((pattern) => globToRegExp(pattern).test(repoPath))
}

function gitFiles(root, args) {
  const output = execFileSync(
    'git',
    ['ls-files', ...args, '-z'],
    { cwd: root, encoding: 'buffer' }
  )
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(normalizeRepoPath)
    .sort()
}

function trackedRepositoryFiles(root) {
  return gitFiles(root, ['--cached'])
}

function untrackedRepositoryFiles(root) {
  return gitFiles(root, ['--others', '--exclude-standard'])
}

function gitValue(root, args, fallback = 'unknown') {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim() || fallback
  } catch {
    return fallback
  }
}

function repositorySnapshot(root) {
  const changed = gitValue(root, ['status', '--porcelain'], '')
  return {
    head: gitValue(root, ['rev-parse', '--short=12', 'HEAD']),
    dirty: changed.length > 0
  }
}

function makeFinding(code, message, locator) {
  return locator ? { code, message, locator } : { code, message }
}

function limitFindings(findings, limit, kind) {
  if (findings.length <= limit) return findings
  return [
    ...findings.slice(0, limit - 1),
    makeFinding(`${kind}_FINDINGS_TRUNCATED`, `${findings.length - (limit - 1)} additional ${kind.toLowerCase()} finding(s) were omitted.`)
  ]
}

function emptyCoverage(trackedFiles = [], untrackedFiles = []) {
  return {
    trackedRepositoryFiles: trackedFiles.length,
    repositoryFiles: trackedFiles.length,
    relevantSourceFiles: 0,
    indexableSourceFiles: 0,
    ownedSourceFiles: 0,
    excludedSourceFiles: 0,
    unownedSourceFiles: 0,
    duplicateSourceFiles: 0,
    untrackedFirstPartySourceFiles: untrackedFiles.length
  }
}

const schemaValidatorCache = new WeakMap()

function validateModuleMapSchema(catalog, schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return [makeFinding('SCHEMA_VALIDATOR_FAILURE', 'module-map.schema.json must contain a JSON object.')]
  }
  try {
    let validate = schemaValidatorCache.get(schema)
    if (!validate) {
      const ajv = new Ajv({ allErrors: true, jsonPointers: true, schemaId: 'auto' })
      validate = ajv.compile(schema)
      schemaValidatorCache.set(schema, validate)
    }
    if (validate(catalog)) return []
    return (validate.errors ?? []).map((error) => {
      const locator = error.dataPath || '/'
      return makeFinding(
        'SCHEMA_VALIDATION',
        `${locator} ${error.message ?? 'does not match module-map.schema.json'}.`,
        locator
      )
    })
  } catch (error) {
    return [makeFinding(
      'SCHEMA_VALIDATOR_FAILURE',
      `Unable to compile module-map.schema.json: ${error instanceof Error ? error.message : String(error)}`
    )]
  }
}

function validateKnownKeys(value, allowed, context, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(makeFinding('INVALID_OBJECT', `${context} must be an object.`))
    return
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(makeFinding('UNKNOWN_FIELD', `${context} has unknown field ${key}.`))
  }
}

function validateStringList(value, context, errors, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    errors.push(makeFinding('INVALID_STRING_LIST', `${context} must be an array of non-empty strings.`))
    return
  }
  if (value.length < min || value.length > max) {
    errors.push(makeFinding('INVALID_LIST_SIZE', `${context} must contain ${min}-${max} entries.`))
  }
  if (new Set(value).size !== value.length) {
    errors.push(makeFinding('DUPLICATE_LIST_VALUE', `${context} must not contain duplicate values.`))
  }
}

function isProtectedContextPath(repoPath, pathPolicy = {}) {
  const normalized = normalizeRepoPath(repoPath).toLowerCase()
  const prefixes = Array.isArray(pathPolicy.context_protected_directories)
    ? pathPolicy.context_protected_directories
    : []
  const suffixes = Array.isArray(pathPolicy.blocking_suffixes) ? pathPolicy.blocking_suffixes : []
  return prefixes.some((prefix) => normalized.startsWith(normalizeRepoPath(prefix).toLowerCase())) ||
    suffixes.some((suffix) => normalized.endsWith(String(suffix).toLowerCase()))
}

function validatePathPolicy(pathPolicy, errors) {
  if (!pathPolicy || typeof pathPolicy !== 'object' || Array.isArray(pathPolicy)) {
    errors.push(makeFinding('INVALID_PATH_POLICY', 'forbidden-paths.json must contain an object.'))
    return
  }
  for (const key of ['forbidden_directories', 'context_protected_directories', 'blocking_suffixes']) {
    const values = pathPolicy[key]
    if (!Array.isArray(values) || values.length === 0 || values.length > 30 ||
      values.some((value) => typeof value !== 'string' || value.length === 0 || value.length > 240)) {
      errors.push(makeFinding('INVALID_PATH_POLICY', `forbidden-paths.json ${key} must contain 1-30 bounded strings.`))
      continue
    }
    if (new Set(values).size !== values.length) {
      errors.push(makeFinding('INVALID_PATH_POLICY', `forbidden-paths.json ${key} must not contain duplicates.`))
    }
  }
  for (const [key, required] of [
    ['forbidden_directories', REQUIRED_FORBIDDEN_DIRECTORIES],
    ['context_protected_directories', REQUIRED_CONTEXT_PROTECTED_DIRECTORIES],
    ['blocking_suffixes', REQUIRED_BLOCKING_SUFFIXES]
  ]) {
    const configured = new Set(Array.isArray(pathPolicy[key]) ? pathPolicy[key] : [])
    const missing = [...required].filter((value) => !configured.has(value))
    if (missing.length > 0) {
      errors.push(makeFinding('WEAKENED_PATH_POLICY', `forbidden-paths.json ${key} is missing required protection ${missing.join(', ')}.`))
    }
  }
}

function commandTargetsEvidence(command, evidencePath, packageScripts) {
  const npmMatch = command.match(/^npm run ([A-Za-z0-9:_-]+)$/)
  const executable = npmMatch ? packageScripts[npmMatch[1]] ?? '' : command
  return executable.split(/\s+/).some((part) => part === evidencePath)
}

function validateCommand(command, packageScripts, root, errors, profile, trackedFiles, pathPolicy) {
  if ([...command].some((character) => SHELL_META_CHARACTERS.has(character))) {
    errors.push(makeFinding('UNSAFE_VALIDATION_COMMAND', `Test profile ${profile} contains shell metacharacters or a newline.`))
    return
  }

  const validateCommandPath = (repoPath, context) => {
    if (!isSafeRepoPath(repoPath) || isProtectedContextPath(repoPath, pathPolicy)) {
      errors.push(makeFinding('UNSAFE_VALIDATION_COMMAND', `${context} uses an unsafe or protected repository path.`, repoPath))
      return false
    }
    if (!trackedFiles.has(repoPath) || !fs.existsSync(path.join(root, repoPath))) {
      errors.push(makeFinding('MISSING_COMMAND_PATH', `${context} references an untracked or missing path ${repoPath}.`, repoPath))
      return false
    }
    return true
  }

  const validateNpmScript = (scriptName, seen = new Set()) => {
    if (!/^(?:test-|context:check$|ci:test-)/.test(scriptName)) {
      errors.push(makeFinding('UNSUPPORTED_VALIDATION_COMMAND', `Test profile ${profile} references a non-validation npm script.`))
      return
    }
    const script = packageScripts[scriptName]
    if (typeof script !== 'string' || script.length === 0) {
      errors.push(makeFinding('UNKNOWN_NPM_SCRIPT', `Test profile ${profile} references missing npm script ${scriptName}.`))
      return
    }
    if (seen.has(scriptName)) return
    seen.add(scriptName)
    for (const lifecycleName of [`pre${scriptName}`, `post${scriptName}`]) {
      if (packageScripts[lifecycleName]) {
        errors.push(makeFinding('UNSAFE_NPM_LIFECYCLE_HOOK', `Test profile ${profile} npm script ${scriptName} has an implicit ${lifecycleName} hook; use an explicit validated command instead.`))
      }
    }
    for (const segment of script.split(/\s*&&\s*/)) {
      const nestedNpm = segment.match(/^npm run ([A-Za-z0-9:_-]+)$/)
      if (nestedNpm) {
        validateNpmScript(nestedNpm[1], seen)
        continue
      }
      const testRunner = segment.match(/^node (scripts\/run-(?:ts|electron-node)-test\.mjs) (scripts\/(?:[A-Za-z0-9._/-]+\.test|test-[A-Za-z0-9._/-]+)\.(?:ts|tsx|js|mjs))$/)
      if (testRunner) {
        validateCommandPath(testRunner[1], `npm script ${scriptName}`)
        validateCommandPath(testRunner[2], `npm script ${scriptName}`)
        continue
      }
      const exactNode = segment.match(/^node (scripts\/(?:agent-context-router(?:\.test)?\.mjs|run-python-unittest\.mjs))(?: check)?$/)
      if (exactNode) {
        validateCommandPath(exactNode[1], `npm script ${scriptName}`)
        continue
      }
      const exactPython = segment.match(/^(?:python3?|py -3) (scripts\/[A-Za-z0-9._/-]+\.py)$/)
      if (exactPython && APPROVED_PYTHON_CHECKS.has(exactPython[1])) {
        validateCommandPath(exactPython[1], `npm script ${scriptName}`)
        continue
      }
      errors.push(makeFinding('UNSAFE_NPM_SCRIPT', `Test profile ${profile} npm script ${scriptName} expands to an unapproved command shape.`))
    }
  }

  const npmMatch = command.match(/^npm run ([A-Za-z0-9:_-]+)$/)
  if (npmMatch) {
    validateNpmScript(npmMatch[1])
    return
  }

  if (/^(?:python3?|py -3) -m unittest discover ai-service\/tests$/.test(command)) return

  const pythonMatch = command.match(/^(?:python3?|py -3) (scripts\/[A-Za-z0-9._/-]+\.py)(?: --mode (?:advisory|release|phase-summary))?$/)
  if (pythonMatch) {
    if (!APPROVED_PYTHON_CHECKS.has(pythonMatch[1])) {
      errors.push(makeFinding('UNSUPPORTED_VALIDATION_COMMAND', `Test profile ${profile} references an unapproved Python check.`))
      return
    }
    validateCommandPath(pythonMatch[1], `Test profile ${profile}`)
    return
  }

  const nodeMatch = command.match(/^node (scripts\/run-(?:ts|electron-node)-test\.mjs) (scripts\/(?:[A-Za-z0-9._/-]+\.test|test-[A-Za-z0-9._/-]+)\.(?:ts|tsx|js|mjs))$/)
  if (nodeMatch) {
    validateCommandPath(nodeMatch[1], `Test profile ${profile}`)
    validateCommandPath(nodeMatch[2], `Test profile ${profile}`)
    return
  }

  errors.push(makeFinding('UNSUPPORTED_VALIDATION_COMMAND', `Test profile ${profile} must use an approved npm, Node, or Python command shape.`))
}

function validatePathReference(root, repoPath, context, errors, pathPolicy, trackedFiles, anchor) {
  if (!isSafeRepoPath(repoPath)) {
    errors.push(makeFinding('UNSAFE_PATH', `${context} must use a normalized repository-relative path.`, repoPath))
    return
  }
  const absolute = path.join(root, repoPath)
  if (isProtectedContextPath(repoPath, pathPolicy)) {
    errors.push(makeFinding('PROTECTED_CONTEXT_PATH', `${context} must not route into protected path ${repoPath}.`, repoPath))
    return
  }
  if (!fs.existsSync(absolute)) {
    errors.push(makeFinding('MISSING_PATH', `${context} references missing path ${repoPath}.`, repoPath))
    return
  }
  if (!trackedFiles.has(repoPath)) {
    errors.push(makeFinding('UNTRACKED_CONTEXT_PATH', `${context} must reference a Git-tracked repository path.`, repoPath))
    return
  }
  if (anchor && fs.statSync(absolute).isFile()) {
    const source = fs.readFileSync(absolute, 'utf8')
    if (!source.includes(anchor)) {
      errors.push(makeFinding('MISSING_ANCHOR', `${context} anchor ${JSON.stringify(anchor)} is absent from ${repoPath}.`, repoPath))
    }
  }
}

export function validateCatalog({
  catalog,
  catalogSchema,
  testsMap,
  packageJson,
  pathPolicy = {},
  root = DEFAULT_ROOT,
  files,
  untrackedFiles
}) {
  const errors = []
  const warnings = []
  const repoFiles = files ?? trackedRepositoryFiles(root)
  const localUntrackedFiles = untrackedFiles ?? untrackedRepositoryFiles(root)
  const trackedFiles = new Set(repoFiles)
  const packageScripts = packageJson.scripts ?? {}

  validatePathPolicy(pathPolicy, errors)

  const schemaErrors = validateModuleMapSchema(catalog, catalogSchema)
  if (schemaErrors.length > 0) {
    const limitedErrors = limitFindings(schemaErrors, MAX_ERROR_FINDINGS, 'ERROR')
    return {
      ok: false,
      errors: limitedErrors,
      warnings: [],
      coverage: emptyCoverage(repoFiles, localUntrackedFiles)
    }
  }

  validateKnownKeys(
    catalog,
    new Set(['$schema', 'schema_version', 'current_context', 'defaults', 'coverage', 'modules', 'routes']),
    'module-map.json',
    errors
  )

  if (catalog.schema_version !== 2) {
    errors.push(makeFinding('SCHEMA_VERSION', 'module-map.json schema_version must be 2.'))
  }
  if (catalog.$schema !== './module-map.schema.json') {
    errors.push(makeFinding('SCHEMA_REFERENCE', 'module-map.json must reference ./module-map.schema.json.'))
  }
  const contextFiles = JSON.stringify(catalog.current_context?.files_read)
  if (![JSON.stringify(['AGENTS.md']), JSON.stringify(['AGENTS.md', 'TASK.md'])].includes(contextFiles)) {
    errors.push(makeFinding('STARTUP_CONTEXT', 'current_context.files_read must contain AGENTS.md, optionally followed by TASK.md.'))
  }

  const defaults = catalog.defaults ?? {}
  validateKnownKeys(defaults, new Set(['max_files', 'max_estimated_tokens', 'max_routes', 'max_adrs', 'max_tests']), 'defaults', errors)
  const numericLimits = [
    ['max_files', 1, 12],
    ['max_estimated_tokens', 1000, 48000],
    ['max_routes', 1, 3],
    ['max_adrs', 0, 3],
    ['max_tests', 1, 6]
  ]
  for (const [key, minimum, maximum] of numericLimits) {
    const value = defaults[key]
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      errors.push(makeFinding('INVALID_BUDGET', `defaults.${key} must be an integer from ${minimum} to ${maximum}.`))
    }
  }

  const modules = catalog.modules ?? {}
  const routes = catalog.routes ?? {}
  const coverageConfig = catalog.coverage ?? {}
  validateKnownKeys(coverageConfig, new Set(['roots', 'extensions', 'exclude']), 'coverage', errors)
  validateStringList(coverageConfig.roots, 'coverage.roots', errors, { min: 1 })
  validateStringList(coverageConfig.extensions, 'coverage.extensions', errors, { min: 1 })
  validateStringList(coverageConfig.exclude, 'coverage.exclude', errors)
  if (Object.keys(modules).length === 0) errors.push(makeFinding('NO_MODULES', 'Catalog must define at least one ownership Module.'))
  if (Object.keys(routes).length === 0) errors.push(makeFinding('NO_ROUTES', 'Catalog must define at least one capability route.'))

  for (const [moduleId, module] of Object.entries(modules)) {
    validateKnownKeys(module, new Set(['purpose', 'owns', 'exclude', 'readme']), `Module ${moduleId}`, errors)
    if (!/^[a-z0-9-]+$/.test(moduleId)) {
      errors.push(makeFinding('INVALID_MODULE_ID', `Module id ${moduleId} must use lowercase kebab-case.`))
    }
    if (typeof module.purpose !== 'string' || module.purpose.length === 0 || module.purpose.length > 200) {
      errors.push(makeFinding('INVALID_MODULE_PURPOSE', `Module ${moduleId} purpose must contain 1-200 characters.`))
    }
    if (!Array.isArray(module.owns) || module.owns.length === 0) {
      errors.push(makeFinding('MISSING_OWNERSHIP', `Module ${moduleId} must declare at least one owns pattern.`))
    }
    validateStringList(module.owns, `Module ${moduleId}.owns`, errors, { min: 1 })
    if (module.exclude) validateStringList(module.exclude, `Module ${moduleId}.exclude`, errors)
    for (const pattern of [...(module.owns ?? []), ...(module.exclude ?? [])]) {
      if (!isSafeRepoPath(pattern.replace(/\*+/g, 'x').replace(/\?/g, 'x'))) {
        errors.push(makeFinding('UNSAFE_GLOB', `Module ${moduleId} has unsafe ownership pattern ${pattern}.`))
      }
    }
    if (module.readme) validatePathReference(root, module.readme, `Module ${moduleId} README`, errors, pathPolicy, trackedFiles)
  }

  for (const [profile, commands] of Object.entries(testsMap)) {
    if (!Array.isArray(commands) || commands.length === 0 || commands.some((command) => typeof command !== 'string')) {
      errors.push(makeFinding('INVALID_TEST_PROFILE', `Test profile ${profile} must be a non-empty string array.`))
      continue
    }
    for (const command of commands) validateCommand(command, packageScripts, root, errors, profile, trackedFiles, pathPolicy)
  }

  for (const [routeId, route] of Object.entries(routes)) {
    validateKnownKeys(
      route,
      new Set(['summary', 'aliases', 'keywords', 'modules', 'states', 'read_first', 'test_profiles', 'adrs', 'avoid', 'warnings']),
      `Route ${routeId}`,
      errors
    )
    if (!/^[a-z0-9-]+$/.test(routeId)) {
      errors.push(makeFinding('INVALID_ROUTE_ID', `Route id ${routeId} must use lowercase kebab-case.`))
    }
    if (typeof route.summary !== 'string' || route.summary.length === 0 || route.summary.length > 200) {
      errors.push(makeFinding('INVALID_ROUTE_SUMMARY', `Route ${routeId} summary must contain 1-200 characters.`))
    }
    for (const key of ['aliases', 'keywords', 'modules', 'states', 'read_first', 'test_profiles', 'adrs', 'avoid', 'warnings']) {
      if (!Array.isArray(route[key])) errors.push(makeFinding('INVALID_ROUTE_FIELD', `Route ${routeId}.${key} must be an array.`))
    }
    if ((route.states ?? []).length === 0) errors.push(makeFinding('ROUTE_WITHOUT_STATE', `Route ${routeId} needs at least one evidence state.`))
    if ((route.read_first ?? []).length === 0) errors.push(makeFinding('ROUTE_WITHOUT_CONTEXT', `Route ${routeId} needs at least one first-read item.`))
    if ((route.adrs ?? []).length > 6) errors.push(makeFinding('TOO_MANY_ADRS', `Route ${routeId} may route at most six ADRs.`))
    validateStringList(route.aliases, `Route ${routeId}.aliases`, errors, { min: 1 })
    validateStringList(route.keywords, `Route ${routeId}.keywords`, errors, { min: 1 })
    validateStringList(route.modules, `Route ${routeId}.modules`, errors, { min: 1 })
    validateStringList(route.test_profiles, `Route ${routeId}.test_profiles`, errors, { min: 1 })
    validateStringList(route.avoid, `Route ${routeId}.avoid`, errors)
    validateStringList(route.warnings, `Route ${routeId}.warnings`, errors)
    for (const moduleId of route.modules ?? []) {
      if (!modules[moduleId]) errors.push(makeFinding('UNKNOWN_MODULE', `Route ${routeId} references unknown Module ${moduleId}.`))
    }
    for (const profile of route.test_profiles ?? []) {
      if (!testsMap[profile]) errors.push(makeFinding('UNKNOWN_TEST_PROFILE', `Route ${routeId} references unknown test profile ${profile}.`))
    }

    let hasTracer = false
    let hasTarget = false
    for (const state of route.states ?? []) {
      validateKnownKeys(state, new Set(['reality', 'summary', 'evidence']), `Route ${routeId} state`, errors)
      if (!REALITIES.has(state.reality)) {
        errors.push(makeFinding('INVALID_REALITY', `Route ${routeId} has invalid reality ${state.reality}.`))
      }
      if (typeof state.summary !== 'string' || state.summary.length === 0 || state.summary.length > 260) {
        errors.push(makeFinding('INVALID_STATE_SUMMARY', `Route ${routeId} has an invalid state summary.`))
      }
      if (!Array.isArray(state.evidence) || state.evidence.length === 0) {
        errors.push(makeFinding('MISSING_STATE_EVIDENCE', `Route ${routeId} state ${state.reality} needs evidence.`))
      }
      validateStringList(state.evidence, `Route ${routeId} state ${state.reality} evidence`, errors, { min: 1 })
      for (const evidence of state.evidence ?? []) {
        validatePathReference(root, evidence, `Route ${routeId} state evidence`, errors, pathPolicy, trackedFiles)
      }
      const stateEvidence = new Set(state.evidence ?? [])
      const routedStateEvidence = (route.read_first ?? []).filter((item) =>
        item.reality === state.reality && stateEvidence.has(item.path)
      )
      const profileCommands = (route.test_profiles ?? []).flatMap((profile) => testsMap[profile] ?? [])
      const hasExecutableEvidence = routedStateEvidence
        .filter((item) => item.role === 'test' || /^scripts\/check-[^/]+\.py$/.test(item.path))
        .some((item) => profileCommands.some((command) => commandTargetsEvidence(command, item.path, packageScripts)))

      if (state.reality === 'Current Implementation') {
        const hasRuntimeAnchor = routedStateEvidence.some((item) =>
          ['composition', 'caller', 'adapter', 'implementation'].includes(item.role) && item.anchor
        )
        if (routedStateEvidence.length === 0) {
          errors.push(makeFinding('CURRENT_EVIDENCE_NOT_ROUTED', `Route ${routeId} Current Implementation evidence must match a Current first-read item.`))
        }
        if (!hasRuntimeAnchor && !hasExecutableEvidence) {
          errors.push(makeFinding('CURRENT_WITHOUT_RUNTIME_EVIDENCE', `Route ${routeId} Current Implementation needs a routed composition/caller/adapter/implementation anchor or executable governance evidence.`))
        }
      }
      if (state.reality === 'Validated Tracer') {
        hasTracer = true
        const hasTracerSeam = routedStateEvidence.some((item) =>
          ['interface', 'adapter', 'implementation'].includes(item.role) && item.anchor
        )
        if (routedStateEvidence.length === 0) {
          errors.push(makeFinding('TRACER_EVIDENCE_NOT_ROUTED', `Route ${routeId} Validated Tracer evidence must match a Tracer first-read item.`))
        }
        if (!hasTracerSeam) {
          errors.push(makeFinding('TRACER_WITHOUT_SEAM', `Route ${routeId} Validated Tracer needs a routed Interface, Adapter or Implementation anchor.`))
        }
        if (!hasExecutableEvidence) {
          errors.push(makeFinding('TRACER_WITHOUT_EXECUTABLE_EVIDENCE', `Route ${routeId} Validated Tracer needs focused executable test evidence.`))
        }
      }
      if (state.reality === 'Target Architecture') {
        hasTarget = true
        if (!(state.evidence ?? []).some((item) => item.startsWith('docs/adr/'))) {
          errors.push(makeFinding('TARGET_WITHOUT_ADR', `Route ${routeId} Target Architecture needs ADR evidence.`))
        }
      }
    }
    if (hasTracer && (route.test_profiles ?? []).length === 0) {
      errors.push(makeFinding('TRACER_WITHOUT_TEST', `Route ${routeId} Validated Tracer needs a test profile.`))
    }
    if (hasTarget && (route.adrs ?? []).length === 0) {
      errors.push(makeFinding('TARGET_WITHOUT_ROUTE', `Route ${routeId} Target Architecture needs at least one routed ADR.`))
    }

    if ((route.read_first ?? []).length > 13) {
      errors.push(makeFinding('OVERSIZED_ROUTE', `Route ${routeId} has more than 13 first-read items.`))
    }
    for (const item of route.read_first ?? []) {
      validateKnownKeys(
        item,
        new Set(['path', 'anchor', 'triggers', 'role', 'reality', 'reason', 'read_mode', 'priority', 'required']),
        `Route ${routeId} first-read item`,
        errors
      )
      if (!REALITIES.has(item.reality)) errors.push(makeFinding('INVALID_ITEM_REALITY', `Route ${routeId} item ${item.path} has invalid reality.`))
      if (!CONTEXT_ROLES.has(item.role)) errors.push(makeFinding('INVALID_ITEM_ROLE', `Route ${routeId} item ${item.path} has invalid role ${item.role}.`))
      if (!['full', 'symbol'].includes(item.read_mode)) errors.push(makeFinding('INVALID_READ_MODE', `Route ${routeId} item ${item.path} has invalid read_mode.`))
      if (!Number.isInteger(item.priority) || item.priority < 1 || item.priority > 100) {
        errors.push(makeFinding('INVALID_PRIORITY', `Route ${routeId} item ${item.path} priority must be 1-100.`))
      }
      if (item.read_mode === 'symbol' && !item.anchor) {
        errors.push(makeFinding('SYMBOL_WITHOUT_ANCHOR', `Route ${routeId} symbol read for ${item.path} needs an anchor.`))
      }
      if (item.triggers && (!Array.isArray(item.triggers) || item.triggers.length === 0)) {
        errors.push(makeFinding('INVALID_ITEM_TRIGGERS', `Route ${routeId} item ${item.path} triggers must be a non-empty array.`))
      }
      if (item.triggers) validateStringList(item.triggers, `Route ${routeId} item ${item.path} triggers`, errors, { min: 1 })
      if (item.required !== undefined && typeof item.required !== 'boolean') {
        errors.push(makeFinding('INVALID_REQUIRED_FLAG', `Route ${routeId} item ${item.path} required must be boolean.`))
      }
      if (typeof item.reason !== 'string' || item.reason.length === 0 || item.reason.length > 240) {
        errors.push(makeFinding('INVALID_ITEM_REASON', `Route ${routeId} item ${item.path} reason must contain 1-240 characters.`))
      }
      validatePathReference(root, item.path, `Route ${routeId} first-read item`, errors, pathPolicy, trackedFiles, item.anchor)
    }
    for (const adr of route.adrs ?? []) {
      validateKnownKeys(adr, new Set(['path', 'triggers', 'reason', 'required_on_match']), `Route ${routeId} ADR`, errors)
      if (!adr.path?.startsWith('docs/adr/')) errors.push(makeFinding('INVALID_ADR_PATH', `Route ${routeId} ADR must live under docs/adr/.`))
      if (!Array.isArray(adr.triggers) || adr.triggers.length === 0) errors.push(makeFinding('ADR_WITHOUT_TRIGGER', `Route ${routeId} ADR ${adr.path} needs triggers.`))
      validateStringList(adr.triggers, `Route ${routeId} ADR ${adr.path} triggers`, errors, { min: 1 })
      if (adr.required_on_match !== undefined && typeof adr.required_on_match !== 'boolean') {
        errors.push(makeFinding('INVALID_ADR_REQUIRED_FLAG', `Route ${routeId} ADR ${adr.path} required_on_match must be boolean.`))
      }
      validatePathReference(root, adr.path, `Route ${routeId} ADR`, errors, pathPolicy, trackedFiles)
    }
  }

  const coverage = catalog.coverage ?? {}
  const roots = coverage.roots ?? []
  const extensions = new Set(coverage.extensions ?? [])
  const excludedPatterns = coverage.exclude ?? []
  const relevantFiles = repoFiles.filter((repoPath) =>
    roots.some((rootPath) => repoPath === rootPath || repoPath.startsWith(`${rootPath}/`)) &&
    extensions.has(path.posix.extname(repoPath))
  )
  const excluded = relevantFiles.filter((repoPath) => matchesAny(repoPath, excludedPatterns))
  const indexable = relevantFiles.filter((repoPath) => !matchesAny(repoPath, excludedPatterns))
  const untrackedFirstPartySource = localUntrackedFiles.filter((repoPath) =>
    roots.some((rootPath) => repoPath === rootPath || repoPath.startsWith(`${rootPath}/`)) &&
    extensions.has(path.posix.extname(repoPath)) &&
    !matchesAny(repoPath, excludedPatterns)
  )
  const unowned = []
  const duplicate = []
  for (const repoPath of indexable) {
    const owners = Object.entries(modules)
      .filter(([, module]) => matchesAny(repoPath, module.owns ?? []) && !matchesAny(repoPath, module.exclude ?? []))
      .map(([moduleId]) => moduleId)
    if (owners.length === 0) unowned.push(repoPath)
    if (owners.length > 1) duplicate.push({ path: repoPath, owners })
  }
  for (const repoPath of unowned.slice(0, 25)) errors.push(makeFinding('UNOWNED_SOURCE', `Indexable source has no owning Module: ${repoPath}.`, repoPath))
  if (unowned.length > 25) errors.push(makeFinding('UNOWNED_SOURCE_MORE', `${unowned.length - 25} additional source files have no owning Module.`))
  for (const entry of duplicate.slice(0, 25)) errors.push(makeFinding('DUPLICATE_OWNERSHIP', `${entry.path} is owned by ${entry.owners.join(', ')}.`, entry.path))
  if (duplicate.length > 25) errors.push(makeFinding('DUPLICATE_OWNERSHIP_MORE', `${duplicate.length - 25} additional source files have duplicate ownership.`))
  if (untrackedFirstPartySource.length > 0) {
    warnings.push(makeFinding(
      'UNTRACKED_FIRST_PARTY_SOURCE',
      `${untrackedFirstPartySource.length} untracked first-party source file(s) were excluded from trusted ownership coverage.`
    ))
  }

  const limitedErrors = limitFindings(errors, MAX_ERROR_FINDINGS, 'ERROR')
  const limitedWarnings = limitFindings(warnings, MAX_WARNING_FINDINGS, 'WARNING')

  return {
    ok: errors.length === 0,
    errors: limitedErrors,
    warnings: limitedWarnings,
    coverage: {
      trackedRepositoryFiles: repoFiles.length,
      repositoryFiles: repoFiles.length,
      relevantSourceFiles: relevantFiles.length,
      indexableSourceFiles: indexable.length,
      ownedSourceFiles: indexable.length - unowned.length,
      excludedSourceFiles: excluded.length,
      unownedSourceFiles: unowned.length,
      duplicateSourceFiles: duplicate.length,
      untrackedFirstPartySourceFiles: untrackedFirstPartySource.length
    }
  }
}

function normalizedText(value) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/qwen3[\s\-‐‑‒–—]*vl/g, 'qwen3vl')
    .replace(/[–—]+/g, ', ')
    .replace(/[-‐‑‒]+/g, ' ')
    .replace(/\bmulti\s+selection\b/g, 'multi select')
    .replace(/\blook\s+online\b/g, 'web search')
    .replace(/用户(?:手工|手动)(?:改了|修改|编辑|改动)/g, '用户编辑')
    .replace(/结果(?:没有|未|无法)写入/g, '结果写入')
    .replace(/\s+/g, ' ')
    .trim()
}

const ROUTING_WORD_EQUIVALENTS = new Map([
  ['activated', 'readiness'],
  ['activation', 'readiness'],
  ['activate', 'readiness'],
  ['assets', 'asset'],
  ['automatically', 'automatic'],
  ['brought', 'import'],
  ['bring', 'import'],
  ['captions', 'caption'],
  ['captioning', 'caption'],
  ['captured', 'capture'],
  ['checkpoints', 'checkpoint'],
  ['descriptions', 'description'],
  ['directories', 'path'],
  ['directory', 'path'],
  ['downloaded', 'download'],
  ['downloads', 'download'],
  ['dropped', 'drop'],
  ['fetched', 'download'],
  ['fetching', 'download'],
  ['generated', 'generate'],
  ['generating', 'generate'],
  ['analyzed', 'analysis'],
  ['asynchronously', 'asynchronous'],
  ['installation', 'install'],
  ['installed', 'install'],
  ['installing', 'install'],
  ['locally', 'local'],
  ['located', 'search'],
  ['locate', 'search'],
  ['logs', 'log'],
  ['matched', 'match'],
  ['models', 'model'],
  ['notarized', 'notarize'],
  ['notarizing', 'notarize'],
  ['online', 'web'],
  ['proposed', 'suggestion'],
  ['produced', 'generate'],
  ['promote', 'promotion'],
  ['promoted', 'promotion'],
  ['quantized', 'quantization'],
  ['quantizations', 'quantization'],
  ['retrieve', 'search'],
  ['retrieved', 'search'],
  ['suggestions', 'suggestion'],
  ['signed', 'sign'],
  ['tags', 'tag'],
  ['tagged', 'tag'],
  ['tagging', 'tag'],
  ['validated', 'readiness'],
  ['validation', 'readiness'],
  ['validate', 'readiness'],
  ['websites', 'website'],
  ['weights', 'weight'],
  ['typed', 'edit'],
  ['entered', 'edit'],
  ['labels', 'tag'],
  ['collections', 'library'],
  ['collection', 'library'],
  ['written', 'write']
])

function routingWords(value) {
  return (value.match(/[\p{L}\p{N}_]+/gu) ?? [])
    .map((word) => ROUTING_WORD_EQUIVALENTS.get(word) ?? word)
    .map((word) => /^q(?:4|5|6|8)(?:_[a-z0-9]+)*$/u.test(word) ? 'quantization' : word)
}

function containsCandidate(query, candidate) {
  if (/\p{Script=Han}/u.test(candidate)) return query.includes(candidate)
  const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'u').test(query)
}

function matchesKeyword(query, candidate) {
  if (/\p{Script=Han}/u.test(candidate)) return query.includes(candidate)
  const candidateWords = routingWords(candidate)
  if (candidateWords.length === 0) return false
  const queryWords = new Set(routingWords(query))
  return candidateWords.every((word) => queryWords.has(word))
}

function isConstraintClause(value) {
  const clause = value.trim()
  if (/^(?:please\s+)?(?:keep\b|preserve\b|leave\b|do not\b|don't\b|avoid\b|exclude\b|without\b|while\s+(?:keeping|preserving|leaving)\b)/u.test(clause)) {
    return true
  }
  if (/^(?:请)?(?:保持|维持|不要|请勿|严禁修改|禁止修改|保留|不修改|避免|在不|不改变)/u.test(clause)) return true
  if (!/^(?:fix|change|add|implement|repair|optimize|update|debug|refactor)\b/u.test(clause) &&
    /^[^,;:.!?，；。：]{1,100}\b(?:(?:(?:cannot|can't|must\s+not|should\s+not)\s+(?:change|regress|be\s+(?:changed|modified|touched|affected)))|(?:unchanged|untouched|intact|as\s+is|(?:is\s+)?out\s+of\s+scope|(?:is\s+)?(?:explicitly\s+)?excluded\s+from\s+(?:this|the)\s+change|(?:is\s+)?not\s+part\s+of\s+(?:this|the)\s+(?:task|change))\b)/u.test(clause)) {
    return true
  }
  if (!/^(?:fix|change|add|implement|repair|optimize|update|debug|refactor)\b/u.test(clause) &&
    /^[^,;:.!?，；。：]{1,100}\b(?:must\s+)?(?:stay|remain)\s+unchanged\b/u.test(clause)) {
    return true
  }
  return !/^(?:修复|修改|增加|实现|优化|调整|调试|重构)/u.test(clause) && (
    /^[^，；。：,;:.!?]{1,100}(?:必须)?(?:保持|维持)[^，；。：,;:.!?]*不变/u.test(clause) ||
    /^[^，；。：,;:.!?]{1,100}(?:不能|无法|不可|不得)(?:被)?(?:修改|改变|变更|改动|改|动|受影响|回归)/u.test(clause) ||
    /^[^，；。：,;:.!?]{1,100}不在(?:本次)?修改范围内/u.test(clause)
  )
}

function beginsWithConstraint(value) {
  return isConstraintClause(value)
}

function actionAfterLeadingConstraint(value) {
  if (!beginsWithConstraint(value)) return null
  const boundary = /[;,:.!?，；。：]\s*/u.exec(value)
  if (!boundary) return null
  const index = boundary.index + boundary[0].length
  return index >= value.length ? null : { index, value: value.slice(index) }
}

function focusReplacementTarget(value) {
  const switchObject = /\bswitch\s+(.+?)\s+from\s+.+?\s+to\s+(.+)/u.exec(value)
  if (switchObject) return `switch ${switchObject[1]} to ${switchObject[2]}`

  const switchFrom = /\bswitch\s+from\s+.+?\s+to\s+/u.exec(value)
  if (switchFrom) return `switch to ${value.slice(switchFrom.index + switchFrom[0].length).trim()}`

  const replaceWith = /\breplace\s+(.+?)\s+(?:with|by|via|using)\s+(.+)/u.exec(value)
  if (replaceWith && /\b(?:provider|backend|prompt|inference)\b/u.test(value)) {
    const promptDomain = /\bprompt\s+(?:provider|backend)\b/u.exec(replaceWith[1])?.[0] ?? 'prompt provider'
    return `replace ${promptDomain} with ${replaceWith[2]}`
  }

  const providerContext = /\b(?:provider|backend|prompt|inference)\b|反推|提示词/u.test(value)
  const moveOff = /\b(move|migrate|switch)\s+(.+?)\s+off\s+.+?\s+and\s+onto\s+(.+)/u.exec(value)
  if (providerContext && moveOff) return `${moveOff[1]} ${moveOff[2]} onto ${moveOff[3]}`

  const routeAway = /\b(route|move|migrate|switch)\s+(.+?)\s+away\s+from\s+.+?\s+and\s+(?:through|via|to|onto)\s+(.+)/u.exec(value)
  if (providerContext && routeAway) return `${routeAway[1]} ${routeAway[2]} through ${routeAway[3]}`

  const changeObject = /\b(change|move|migrate|route)\s+(.+?)\s+from\s+.+?\s+to\s+(.+)/u.exec(value)
  if (providerContext && changeObject) return `${changeObject[1]} ${changeObject[2]} to ${changeObject[3]}`

  const chineseSwitch = /^(?:把|将)?(.+?)(?:从|由).+?(?:改成|改为|切换到|切换至|切到|换成|换回)(.+)$/u.exec(value)
  if (providerContext && chineseSwitch) return `${chineseSwitch[1]} ${chineseSwitch[2]}`

  const chineseMigration = /^(?:把|将)(.+?)(?:迁移至|替换为|切换至|改用)(.+)$/u.exec(value)
  if (providerContext && chineseMigration) return `反推提示词 ${chineseMigration[2]}`
  return value
}

function focusFailedContrast(value) {
  const contrasts = [' but ', '，但', ', 但', '但']
  const contrast = contrasts
    .map((separator) => ({ separator, index: value.indexOf(separator) }))
    .filter((entry) => entry.index > 0)
    .sort((left, right) => left.index - right.index)[0]
  if (!contrast) return value
  const suffix = value.slice(contrast.index + contrast.separator.length).trim()
  if (isConstraintClause(suffix)) return value.slice(0, contrast.index).trim()
  return /\b(?:cannot|can't|unable)\b|\bfail(?:s|ed|ure)?\b|无法|不能|失败/u.test(suffix)
    ? suffix
    : value
}

function focusDownstreamWorkspaceNotification(value) {
  if (!/\bai\b|分析|自动生成|结果写|结果同步|结果持久化/u.test(value)) return value
  const notifications = [
    ' and refresh asset workspace',
    ' and notify asset workspace',
    ' and update asset workspace',
    '并刷新素材工作区',
    '并通知素材工作区',
    '也没有通知素材工作区',
    '通知素材工作区刷新'
  ]
  const boundary = notifications
    .map((marker) => value.indexOf(marker))
    .filter((index) => index > 0)
    .sort((left, right) => left - right)[0]
  return boundary === undefined ? value : value.slice(0, boundary).trim()
}

function focusUserAuthoredState(value) {
  const userEdit = /\buser[\s-]+edit(?:ed|ing)?\b|用户编辑/u.exec(value)
  if (!userEdit) return value
  const aiOrigin = /\bai\s+(?:generated?|tagged|suggested)\b|ai\s*(?:自动生成|生成|标签建议)/u.exec(value)
  if (aiOrigin && aiOrigin.index < userEdit.index) return value
  return value
    .replace(/\bai\s+(?:generated?|tagged|suggested)\b/gu, ' ')
    .replace(/ai\s*(?:自动生成|生成|标签建议)/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function alternativePurpose(value) {
  const purpose = /(?:^|[\s,，:：])(?:(?:for|to|when|while\s+running)\b|用于|用来|来|进行|以便)/u.exec(value)
  if (!purpose || purpose.index === 0) return ''
  return value.slice(purpose.index).replace(/^[\s,，:：]+/u, '').trim()
}

function routingFocusText(query) {
  let focusQuery = query
  const leadingAction = actionAfterLeadingConstraint(focusQuery)
  if (leadingAction) focusQuery = focusQuery.slice(leadingAction.index).trim()

  const trailingAction = [
    /\s+(?:while|and)\s+(?:only\s+)?(?:fix(?:ing)?|chang(?:e|ing)|add(?:ing)?|implement(?:ing)?|repair(?:ing)?|optimiz(?:e|ing)|updat(?:e|ing)|debug(?:ging)?|refactor(?:ing)?|relocat(?:e|ing)|mov(?:e|ing)|migrat(?:e|ing)|configur(?:e|ing)?)\s+/u,
    /(?:同时|并)(?:只|仅)?(?:修复|修改|增加|实现|优化|调整|调试|重构|移动|迁移|更换|配置)/u
  ]
    .map((pattern) => pattern.exec(focusQuery))
    .filter((match) => match && match.index > 0)
    .map((match) => ({ index: match.index, end: match.index + match[0].length }))
    .sort((left, right) => left.index - right.index)[0]
  if (trailingAction && beginsWithConstraint(focusQuery.slice(0, trailingAction.index).trim())) {
    focusQuery = focusQuery.slice(trailingAction.end).trim()
  }

  focusQuery = focusReplacementTarget(focusQuery)
  focusQuery = focusFailedContrast(focusQuery)
  focusQuery = focusDownstreamWorkspaceNotification(focusQuery)

  const trailingConstraintSeparators = [
    ' without ',
    ' while keeping ',
    ' while preserving ',
    ' while leaving ',
    ' while not ',
    ' but keep ',
    ' but preserve ',
    ' but do not ',
    " but don't ",
    ' and leave ',
    '; leave ',
    ', leave ',
    ': leave ',
    ', leaving ',
    '; leaving ',
    ' leaving ',
    ' and keep ',
    ' and preserve ',
    '不要',
    '同时保持',
    '但保持',
    '并保持',
    '并弃用',
    ',保持',
    ',弃用',
    '，保持',
    '，弃用',
    ';保持',
    '；保持',
    ':保持',
    '：保持'
  ]
  const boundaries = trailingConstraintSeparators
    .map((separator) => focusQuery.indexOf(separator))
    .filter((index) => index > 0)
  if (boundaries.length > 0) {
    focusQuery = focusQuery.slice(0, Math.min(...boundaries)).trim()
  }

  const alternativeSeparators = [
    ' rather than ',
    ' instead of ',
    ', not ',
    '; not ',
    ' but not ',
    '而不是'
  ]
  const alternative = alternativeSeparators
    .map((separator) => ({ separator, index: focusQuery.indexOf(separator) }))
    .filter((entry) => entry.index > 0)
    .sort((left, right) => left.index - right.index)[0]
  if (alternative) {
    const before = focusQuery.slice(0, alternative.index).trim()
    const excluded = focusQuery.slice(alternative.index + alternative.separator.length)
    const purpose = alternativePurpose(excluded)
    focusQuery = `${before}${purpose ? ` ${purpose}` : ''}`.trim()
  }

  focusQuery = focusUserAuthoredState(focusQuery)

  return focusQuery
}

function routeScores(catalog, task) {
  const query = normalizedText(task)
  const scoringQuery = routingFocusText(query) || query
  return Object.entries(catalog.routes)
    .map(([routeId, route]) => {
      let score = 0
      const matched = []
      const matchedAliasCandidates = []
      const normalizedId = normalizedText(routeId.replaceAll('-', ' '))
      if (scoringQuery === normalizedId || scoringQuery === routeId) {
        score += 120
        matched.push(routeId)
      } else if (containsCandidate(scoringQuery, normalizedId)) {
        score += 45
        matched.push(routeId)
      }
      for (const alias of route.aliases) {
        const candidate = normalizedText(alias)
        if (candidate === normalizedId) continue
        if (scoringQuery === candidate) {
          score += 100
          matched.push(alias)
          matchedAliasCandidates.push(candidate)
        } else if (candidate.length >= 2 && containsCandidate(scoringQuery, candidate)) {
          score += 35 + Math.min(candidate.length, 20)
          matched.push(alias)
          matchedAliasCandidates.push(candidate)
        }
      }
      for (const keyword of route.keywords) {
        const candidate = normalizedText(keyword)
        if (matchedAliasCandidates.some((alias) => alias.includes(candidate))) continue
        if (candidate.length >= 2 && matchesKeyword(scoringQuery, candidate)) {
          score += 10 + Math.min(candidate.length, 12)
          matched.push(keyword)
        }
      }
      for (const item of route.read_first) {
        const base = normalizedText(path.posix.basename(item.path))
        if (scoringQuery.includes(base)) {
          score += 70
          matched.push(item.path)
        }
        if (item.anchor && scoringQuery.includes(normalizedText(item.anchor))) {
          score += 70
          matched.push(item.anchor)
        }
      }
      return { routeId, route, score, matched: [...new Set(matched)] }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.routeId.localeCompare(right.routeId))
}

function estimateTokens(root, item) {
  const bytes = fs.statSync(path.join(root, item.path)).size
  return Math.max(1, Math.ceil(bytes / CONSERVATIVE_BYTES_PER_TOKEN))
}

function estimateMetadataTokens(value) {
  return Math.max(
    1,
    Math.ceil(Buffer.byteLength(JSON.stringify(value), 'utf8') / CONSERVATIVE_BYTES_PER_TOKEN) + 128
  )
}

function uniqueBy(values, keyOf) {
  const seen = new Set()
  return values.filter((value) => {
    const key = keyOf(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function matchedAdrs(routeEntries, task) {
  const query = normalizedText(task)
  const adrs = []
  for (const entry of routeEntries) {
    for (const adr of entry.route.adrs) {
      const triggers = adr.triggers.filter((trigger) => matchesKeyword(query, normalizedText(trigger)))
      if (triggers.length > 0) {
        adrs.push({
          path: adr.path,
          role: 'adr',
          reality: 'Target Architecture',
          reason: adr.reason,
          read_mode: 'full',
          priority: 90,
          required: adr.required_on_match === true,
          routeId: entry.routeId,
          matched: triggers
        })
      }
    }
  }
  return uniqueBy(adrs, (adr) => adr.path)
}

function makeRouteError(code, message, detail = {}) {
  return { ok: false, error: { code, message, ...detail } }
}

export function buildContextPack({
  catalog,
  testsMap,
  root = DEFAULT_ROOT,
  task = '',
  explicitRoute,
  maxFiles,
  maxEstimatedTokens,
  maxRoutes,
  maxAdrs,
  maxTests,
  expand = false,
  snapshot = repositorySnapshot(root)
}) {
  const defaults = catalog.defaults
  const limits = {
    maxFiles: Math.min(maxFiles ?? (expand ? defaults.max_files * 2 : defaults.max_files), 12),
    maxEstimatedTokens: Math.min(maxEstimatedTokens ?? (expand ? defaults.max_estimated_tokens * 2 : defaults.max_estimated_tokens), 48000),
    maxRoutes: Math.min(maxRoutes ?? defaults.max_routes, 3),
    maxAdrs: Math.min(maxAdrs ?? (expand ? 3 : defaults.max_adrs), 3),
    maxTests: Math.min(maxTests ?? (expand ? 6 : defaults.max_tests), 6)
  }

  let selected
  let candidates
  let secondaryRouteHint = null
  if (explicitRoute) {
    const route = catalog.routes[explicitRoute]
    if (!route) {
      return makeRouteError('NO_ROUTE', `Unknown explicit route ${explicitRoute}.`, { candidates: Object.keys(catalog.routes).sort() })
    }
    candidates = [{ routeId: explicitRoute, route, score: Number.POSITIVE_INFINITY, matched: ['explicit route'] }]
    selected = candidates
  } else {
    if (!task.trim()) return makeRouteError('TASK_REQUIRED', 'A task description or --module route id is required.')
    candidates = routeScores(catalog, task)
    if (candidates.length === 0 || candidates[0].score < 10) {
      return makeRouteError('NO_ROUTE', 'No high-confidence capability route matched the task.', {
        candidates: Object.keys(catalog.routes).sort(),
        suggestion: 'Add a domain term, file name, Interface symbol, or use --module.'
      })
    }
    const words = normalizedText(task).split(' ').filter(Boolean)
    if (
      candidates.length > 1 &&
      candidates[0].score - candidates[1].score <= 2 &&
      words.length <= 3
    ) {
      return makeRouteError('AMBIGUOUS_ROUTE', 'The task is too broad to choose a safe first-read pack.', {
        candidates: candidates.slice(0, 3).map((entry) => ({ route: entry.routeId, score: entry.score, matched: entry.matched.slice(0, 8) }))
      })
    }
    const threshold = limits.maxRoutes > 1
      ? 12
      : Math.max(12, candidates[0].score * 0.7)
    const qualified = candidates.filter((candidate) => candidate.score >= threshold)
    selected = qualified.slice(0, limits.maxRoutes)
    const secondaryCandidate = candidates.find((candidate) =>
      candidate.routeId !== selected[0].routeId && candidate.score >= 12
    )
    if (limits.maxRoutes === 1 && secondaryCandidate) {
      secondaryRouteHint = `Secondary route ${secondaryCandidate.routeId} also matched; split the task, or retry with --max-routes 2 --expand when both capability packs are required.`
    }
  }

  const normalizedTask = normalizedText(task)
  const routeTriggerTask = routingFocusText(normalizedTask) || normalizedTask
  const routeItems = selected.flatMap((entry, routeIndex) =>
    entry.route.read_first
      .filter((item) =>
        !item.triggers || (
          routeTriggerTask.length > 0
          && item.triggers.some((trigger) => matchesKeyword(routeTriggerTask, normalizedText(trigger)))
        )
      )
      .map((item) => ({ ...item, routeId: entry.routeId, routeIndex }))
  )
  const allAdrItems = matchedAdrs(selected, task)
  const requiredAdrItems = allAdrItems.filter((item) => item.required)
  if (requiredAdrItems.length > limits.maxAdrs) {
    return makeRouteError('BUDGET_UNSATISFIABLE', 'Matched safety ADRs exceed the requested ADR limit.', {
      requiredAdrs: requiredAdrItems.map((item) => item.path),
      limits,
      suggestion: 'Increase --max-adrs within the hard limit or split the task.'
    })
  }
  const adrItems = [
    ...requiredAdrItems,
    ...allAdrItems.filter((item) => !item.required)
  ].slice(0, limits.maxAdrs)
  const selectedAdrPaths = new Set(adrItems.map((item) => item.path))
  const deferredAdrItems = allAdrItems.filter((item) => !selectedAdrPaths.has(item.path))
  const candidatesForPack = uniqueBy(
    [...routeItems, ...adrItems],
    (item) => item.path
  ).map((item) => ({ ...item, estimatedTokens: estimateTokens(root, item) }))

  const required = candidatesForPack
    .filter((item) => item.required)
    .sort((left, right) => (left.routeIndex ?? 99) - (right.routeIndex ?? 99) || left.priority - right.priority)
  const optional = candidatesForPack
    .filter((item) => !item.required)
    .sort((left, right) => (left.routeIndex ?? 99) - (right.routeIndex ?? 99) || left.priority - right.priority)
  const requiredTokens = required.reduce((total, item) => total + item.estimatedTokens, 0)
  if (required.length > limits.maxFiles || requiredTokens > limits.maxEstimatedTokens) {
    return makeRouteError('BUDGET_UNSATISFIABLE', 'Required safety and Interface context cannot fit the requested budget.', {
      requiredFiles: required.length,
      requiredEstimatedTokens: requiredTokens,
      limits,
      suggestion: 'Increase the budget within the hard limit or split the task.'
    })
  }

  const items = [...required]
  let estimatedFileTokens = requiredTokens
  const deferred = deferredAdrItems.map((item) => ({ ...item, estimatedTokens: estimateTokens(root, item) }))
  for (const item of optional) {
    if (items.length >= limits.maxFiles || estimatedFileTokens + item.estimatedTokens > limits.maxEstimatedTokens) {
      deferred.push(item)
      continue
    }
    items.push(item)
    estimatedFileTokens += item.estimatedTokens
  }
  items.sort((left, right) => (left.routeIndex ?? 99) - (right.routeIndex ?? 99) || left.priority - right.priority)

  const validations = uniqueBy(
    selected.flatMap((entry) =>
      entry.route.test_profiles.flatMap((profile) => testsMap[profile] ?? [])
    ),
    (command) => command
  )
  const selectedValidations = validations.slice(0, limits.maxTests)
  const deferredValidations = validations.slice(limits.maxTests)
  const projectPackMetadata = () => {
    const warnings = uniqueBy(
      [
        ...selected.flatMap((entry) => entry.route.warnings),
        ...(secondaryRouteHint ? [secondaryRouteHint] : []),
        ...(deferred.length > 0 ? [`Budget deferred ${deferred.length} context item(s); use --expand only if the first pass is insufficient.`] : []),
        ...(deferredValidations.length > 0 ? [`Validation limit deferred ${deferredValidations.length} additional command(s).`] : [])
      ],
      (warning) => warning
    )
    return {
      ok: true,
      snapshot,
      query: { provided: task.trim().length > 0, explicitRoute: explicitRoute ?? null },
      routes: selected.map((entry) => ({
        id: entry.routeId,
        summary: entry.route.summary,
        score: Number.isFinite(entry.score) ? entry.score : null,
        matched: entry.matched.slice(0, 8),
        modules: entry.route.modules
      })),
      states: selected.flatMap((entry) => entry.route.states.map((state) => ({ route: entry.routeId, ...state }))),
      firstRead: items.map(({ routeIndex, priority, required: isRequired, triggers, ...item }) => ({ ...item, required: isRequired === true })),
      validations: selectedValidations,
      avoid: uniqueBy(selected.flatMap((entry) => entry.route.avoid), (value) => value),
      warnings,
      deferred: {
        context: deferred.map(({ routeIndex, priority, required: isRequired, triggers, ...item }) => ({ ...item, required: isRequired === true })),
        validations: deferredValidations
      }
    }
  }

  let packMetadata = projectPackMetadata()
  let estimatedMetadataTokens = estimateMetadataTokens(packMetadata)
  while (estimatedFileTokens + estimatedMetadataTokens > limits.maxEstimatedTokens) {
    let optionalIndex = -1
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!items[index].required) {
        optionalIndex = index
        break
      }
    }
    if (optionalIndex < 0) break
    const [removed] = items.splice(optionalIndex, 1)
    estimatedFileTokens -= removed.estimatedTokens
    deferred.push(removed)
    packMetadata = projectPackMetadata()
    estimatedMetadataTokens = estimateMetadataTokens(packMetadata)
  }

  if (estimatedMetadataTokens > MAX_METADATA_TOKENS) {
    return makeRouteError('BUDGET_UNSATISFIABLE', 'Context-pack metadata exceeds the hard metadata budget.', {
      estimatedMetadataTokens,
      maxMetadataTokens: MAX_METADATA_TOKENS,
      suggestion: 'Split the task or reduce route metadata.'
    })
  }
  const estimatedTokens = estimatedFileTokens + estimatedMetadataTokens
  if (estimatedTokens > limits.maxEstimatedTokens) {
    return makeRouteError('BUDGET_UNSATISFIABLE', 'Required context and metadata cannot fit the requested budget.', {
      requiredFiles: items.length,
      estimatedFileTokens,
      estimatedMetadataTokens,
      limits,
      suggestion: 'Increase the budget within the hard limit or split the task.'
    })
  }

  return {
    ...packMetadata,
    budget: {
      basis: 'full-file-conservative',
      bytesPerToken: CONSERVATIVE_BYTES_PER_TOKEN,
      selectedFiles: items.length,
      estimatedFileTokens,
      estimatedMetadataTokens,
      outputEstimatedTokens: estimatedMetadataTokens,
      maxMetadataTokens: MAX_METADATA_TOKENS,
      estimatedTokens,
      maxFiles: limits.maxFiles,
      maxEstimatedTokens: limits.maxEstimatedTokens,
      truncated: deferred.length > 0 || deferredValidations.length > 0
    }
  }
}

function renderCheck(report, snapshot) {
  console.log(`Agent Context Router check: ${report.ok ? 'PASS' : 'FAIL'}`)
  console.log(`Snapshot: ${snapshot.head} (${snapshot.dirty ? 'dirty working tree' : 'clean working tree'})`)
  console.log(`Tracked first-party source ownership: ${report.coverage.ownedSourceFiles}/${report.coverage.indexableSourceFiles} owned; ${report.coverage.excludedSourceFiles} excluded`)
  for (const finding of report.errors) console.log(`ERROR ${finding.code}: ${finding.message}`)
  for (const finding of report.warnings) console.log(`WARN ${finding.code}: ${finding.message}`)
}

function renderPack(pack) {
  console.log(`Context route: ${pack.routes.map((route) => route.id).join(', ')}`)
  console.log(`Snapshot: ${pack.snapshot.head} (${pack.snapshot.dirty ? 'dirty working tree' : 'clean working tree'})`)
  console.log(`Budget: ${pack.budget.selectedFiles}/${pack.budget.maxFiles} files, ~${pack.budget.estimatedTokens}/${pack.budget.maxEstimatedTokens} tokens`)
  console.log('\nReality:')
  for (const state of pack.states) console.log(`- [${state.reality}] ${state.route}: ${state.summary}`)
  console.log('\nFirst read:')
  pack.firstRead.forEach((item, index) => {
    const locator = item.anchor ? `${item.path}#${item.anchor}` : item.path
    console.log(`${index + 1}. [${item.reality}] [${item.role}/${item.read_mode}] ${locator} (~${item.estimatedTokens} tokens) — ${item.reason}`)
  })
  console.log('\nValidation:')
  for (const command of pack.validations) console.log(`- ${command}`)
  if (pack.warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of pack.warnings) console.log(`- ${warning}`)
  }
  if (pack.avoid.length > 0) {
    console.log('\nAvoid:')
    for (const avoid of pack.avoid) console.log(`- ${avoid}`)
  }
  if (pack.deferred.context.length > 0 || pack.deferred.validations.length > 0) {
    console.log(`\nDeferred: ${pack.deferred.context.length} context item(s), ${pack.deferred.validations.length} validation(s).`)
  }
}

class CliArgumentError extends Error {
  constructor(message, code = 'INVALID_ARGUMENT') {
    super(message)
    this.name = 'CliArgumentError'
    this.code = code
  }
}

function parseInteger(value, option, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) {
    throw new CliArgumentError(`${option} requires a base-10 integer.`)
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new CliArgumentError(`${option} requires an integer from ${minimum} to ${maximum}.`)
  }
  return parsed
}

function readOptionValue(argv, index, option) {
  const value = argv[index + 1]
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('--')) {
    throw new CliArgumentError(`${option} requires a value.`)
  }
  return value
}

function parseRouteArgs(argv) {
  const options = { taskParts: [] }
  const seen = new Set()
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument.startsWith('--')) {
      if (seen.has(argument)) throw new CliArgumentError(`Duplicate option ${argument}.`)
      seen.add(argument)
    }
    if (argument === '--task') {
      options.task = readOptionValue(argv, index, argument)
      index += 1
    } else if (argument === '--module') {
      options.explicitRoute = readOptionValue(argv, index, argument)
      index += 1
    } else if (argument === '--json') options.json = true
    else if (argument === '--expand') options.expand = true
    else if (argument === '--list') options.list = true
    else if (argument === '--max-files') {
      options.maxFiles = parseInteger(readOptionValue(argv, index, argument), argument, 1, 12)
      index += 1
    } else if (argument === '--budget') {
      options.maxEstimatedTokens = parseInteger(readOptionValue(argv, index, argument), argument, 1, 48000)
      index += 1
    } else if (argument === '--max-routes') {
      options.maxRoutes = parseInteger(readOptionValue(argv, index, argument), argument, 1, 3)
      index += 1
    } else if (argument === '--max-adrs') {
      options.maxAdrs = parseInteger(readOptionValue(argv, index, argument), argument, 0, 3)
      index += 1
    } else if (argument === '--max-tests') {
      options.maxTests = parseInteger(readOptionValue(argv, index, argument), argument, 1, 6)
      index += 1
    } else if (argument.startsWith('--')) throw new CliArgumentError(`Unknown option ${argument}.`)
    else options.taskParts.push(argument)
  }
  if (options.task && options.taskParts.length > 0) {
    throw new CliArgumentError('Use either --task or positional task text, not both.')
  }
  if (!options.task) options.task = options.taskParts.join(' ')
  if (options.list && (
    options.task || options.explicitRoute || options.expand ||
    options.maxFiles !== undefined || options.maxEstimatedTokens !== undefined ||
    options.maxRoutes !== undefined || options.maxAdrs !== undefined || options.maxTests !== undefined
  )) {
    throw new CliArgumentError('--list may only be combined with --json.')
  }
  return options
}

function parseCheckArgs(argv) {
  const options = { json: false }
  for (const argument of argv) {
    if (argument === '--json' && !options.json) options.json = true
    else if (argument === '--json') throw new CliArgumentError('Duplicate option --json.')
    else throw new CliArgumentError(`Unknown option ${argument}.`)
  }
  return options
}

function usage() {
  console.log('Usage:')
  console.log('  node scripts/agent-context-router.mjs route --task "task description" [--json] [--expand]')
  console.log('  node scripts/agent-context-router.mjs route --module asset-lifecycle [--json]')
  console.log('  node scripts/agent-context-router.mjs route --list')
  console.log('  node scripts/agent-context-router.mjs check [--json]')
}

export function loadRepositoryContext(root = DEFAULT_ROOT) {
  return {
    catalog: readJson(path.join(root, '.codeindex/module-map.json')),
    catalogSchema: readJson(path.join(root, '.codeindex/module-map.schema.json')),
    testsMap: readJson(path.join(root, '.codeindex/tests-map.json')),
    packageJson: readJson(path.join(root, 'package.json')),
    pathPolicy: readJson(path.join(root, '.codeindex/forbidden-paths.json'))
  }
}

function emitCliError(code, message, json) {
  const envelope = makeRouteError(code, message)
  if (json) console.log(JSON.stringify(envelope, null, 2))
  else console.error(`${code}: ${message}`)
}

function runMain(argv, root) {
  const command = argv[0]
  if (!command || ['-h', '--help', 'help'].includes(command)) {
    usage()
    return command ? 0 : 1
  }

  if (!['check', 'route'].includes(command)) {
    throw new CliArgumentError(`Unknown command ${command}.`, 'UNKNOWN_COMMAND')
  }

  const options = command === 'check' ? parseCheckArgs(argv.slice(1)) : parseRouteArgs(argv.slice(1))

  const context = loadRepositoryContext(root)
  const files = trackedRepositoryFiles(root)
  const untrackedFiles = untrackedRepositoryFiles(root)
  const snapshot = repositorySnapshot(root)
  const report = validateCatalog({ ...context, root, files, untrackedFiles })

  if (command === 'check') {
    if (options.json) console.log(JSON.stringify({ ...report, snapshot }, null, 2))
    else renderCheck(report, snapshot)
    return report.ok ? 0 : 3
  }

  if (!report.ok) {
    const error = makeRouteError('INDEX_DRIFT', 'The context index failed validation; route is closed until drift is resolved.', {
      findings: report.errors
    })
    if (options.json) console.log(JSON.stringify(error, null, 2))
    else {
      console.error(`${error.error.code}: ${error.error.message}`)
      for (const finding of report.errors) console.error(`- ${finding.code}: ${finding.message}`)
    }
    return 3
  }
  if (options.list) {
    const routes = Object.entries(context.catalog.routes).map(([id, route]) => ({ id, summary: route.summary }))
    if (options.json) console.log(JSON.stringify(routes, null, 2))
    else routes.forEach((route) => console.log(`${route.id}: ${route.summary}`))
    return 0
  }

  const pack = buildContextPack({ ...context, root, snapshot, ...options })
  if (options.json) console.log(JSON.stringify(pack, null, 2))
  else if (pack.ok) renderPack(pack)
  else {
    console.error(`${pack.error.code}: ${pack.error.message}`)
    if (pack.error.candidates) console.error(`Candidates: ${JSON.stringify(pack.error.candidates)}`)
    if (pack.error.suggestion) console.error(`Suggestion: ${pack.error.suggestion}`)
  }
  return pack.ok ? 0 : 2
}

export function main(argv = process.argv.slice(2), root = DEFAULT_ROOT) {
  const json = argv.includes('--json')
  try {
    return runMain(argv, root)
  } catch (error) {
    const code = error instanceof CliArgumentError ? error.code : 'ROUTER_FAILURE'
    emitCliError(code, error instanceof Error ? error.message : String(error), json)
    return 1
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  process.exitCode = main()
}
