import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createOcrDependencyGovernancePlan, createOcrDoctorCheckPlan } from '../src/main/services/ocr-governance.service'
import { projectOcrSelectedProviderAvailability } from '../src/shared/workflows/ocr-dependency.workflow'

const easyPlan = createOcrDependencyGovernancePlan('easyocr')
assert.equal(easyPlan.autoInstall, false)
assert.equal(easyPlan.doctorCheckRequired, true)
assert.equal(easyPlan.installerDeferred, true)
assert.ok(easyPlan.blockingIssues.some((issue) => issue.includes('deferred')))
assert.ok(easyPlan.risks.some((risk) => risk.id === 'ocr-debug-log-managed-path'))
assert.ok(easyPlan.risks.every((risk) => !/C:\\Users\\[A-Za-z0-9_.-]+/i.test(risk.evidence)))

const mockPlan = createOcrDependencyGovernancePlan('mock')
assert.equal(mockPlan.runtimeProfile, 'mock-only')
assert.equal(mockPlan.blockingIssues.length, 0)

const mutablePlan = createOcrDependencyGovernancePlan('easyocr')
mutablePlan.risks[0].id = 'mutated-risk'
mutablePlan.blockingIssues.push('mutated-blocker')
const freshPlan = createOcrDependencyGovernancePlan('easyocr')
assert.notEqual(freshPlan.risks[0].id, 'mutated-risk')
assert.equal(freshPlan.blockingIssues.length, 1)

const paddlePlan = createOcrDependencyGovernancePlan('paddleocr')
assert.equal(paddlePlan.provider, 'paddleocr')
assert.equal(paddlePlan.runtimeProfile, 'local-ocr')
assert.equal(paddlePlan.autoInstall, false)

const doctorPlan = createOcrDoctorCheckPlan('rapidocr')
assert.equal(doctorPlan.readonly, true)
assert.equal(doctorPlan.autoFix, false)
assert.equal(doctorPlan.autoInstall, false)
assert.equal(createOcrDoctorCheckPlan('paddleocr').provider, 'paddleocr')

const providerAvailability = {
  easyocr: { installed: true, version: '1.0.0', available: true },
  rapidocr: { installed: false, version: null, available: false },
  paddleocr: { installed: true, version: '2.0.0', available: true }
}
assert.equal(projectOcrSelectedProviderAvailability('easyocr', providerAvailability), true)
assert.equal(projectOcrSelectedProviderAvailability('rapidocr', providerAvailability), false)
assert.equal(projectOcrSelectedProviderAvailability('paddleocr', providerAvailability), true)
assert.equal(projectOcrSelectedProviderAvailability('mock', providerAvailability), true)
assert.equal(projectOcrSelectedProviderAvailability('none', providerAvailability), false)

const manifest = JSON.parse(await fs.readFile('.codeindex/ocr-dependency-governance.json', 'utf8')) as {
  readOnlyAudit?: boolean
  autoInstall?: boolean
  installerDeferred?: boolean
  privacy?: { containsRealUserPaths?: boolean }
}
assert.equal(manifest.readOnlyAudit, true)
assert.equal(manifest.autoInstall, false)
assert.equal(manifest.installerDeferred, true)
assert.equal(manifest.privacy?.containsRealUserPaths, false)

const governanceSource = await fs.readFile('src/main/services/ocr-governance.service.ts', 'utf8')
assert.match(governanceSource, /OCR_DEPENDENCY_PROVIDER_GOVERNANCE_POLICIES/)
assert.match(governanceSource, /OCR_DEPENDENCY_RISK_REGISTRY/)
assert.doesNotMatch(governanceSource, /spawn\s*\(|execSync\s*\(|writeFile\s*\(|appendFile\s*\(|mkdirSync\s*\(/)
assert.doesNotMatch(governanceSource, /C:\\Users\\[A-Za-z0-9_.-]+/i)
assert.doesNotMatch(governanceSource, /provider === 'mock'|provider !== 'mock'/)

const dependencySource = await fs.readFile('src/main/services/ocr-dependency.service.ts', 'utf8')
const dependencyWorkflowSource = await fs.readFile('src/shared/workflows/ocr-dependency.workflow.ts', 'utf8')
const pythonEnvironmentSource = await fs.readFile('src/main/services/ai-python-environment.ts', 'utf8')
const pythonRuntimeAdapterSource = await fs.readFile('src/main/services/ai-python-runtime.service.ts', 'utf8')
const factorySource = await fs.readFile('src/main/services/text-detection/text-box-provider.factory.ts', 'utf8')
const paddleWorkerSource = await fs.readFile('ai-service/ocr_workers/paddleocr_color_worker.py', 'utf8')
assert.doesNotMatch(dependencySource, /C:\\\\Users\\\\[A-Za-z0-9_.-]+/i)
assert.doesNotMatch(dependencySource, /\.gemini[\\/]+antigravity[\\/]+scratch/i)
assert.match(pythonRuntimeAdapterSource, /resolveDebugLogPath\('ocr-dependency'/)
assert.match(pythonRuntimeAdapterSource, /redactDebugMessage/)
assert.match(pythonEnvironmentSource, /class AiPythonEnvironment/)
assert.match(pythonEnvironmentSource, /AI_PYTHON_ENVIRONMENT_PLATFORM_ADAPTERS/)
assert.match(pythonEnvironmentSource, /resolveAiPythonEnvironmentPlatformAdapter/)
assert.match(pythonEnvironmentSource, /resolveBasePythonExecutable: resolveWindowsBasePythonExecutable/)
assert.match(pythonEnvironmentSource, /resolveBasePythonExecutable: resolveMacOSHomebrewPythonExecutable/)
assert.doesNotMatch(pythonEnvironmentSource, /const resolvers: BasePythonResolver\[\]/)
assert.doesNotMatch(dependencySource, /searchWindowsPythonPaths|resolveWindowsBasePythonExecutable|resolveMacOSHomebrewPythonExecutable/)
assert.match(dependencySource, /projectOcrSelectedProviderAvailability/)
assert.match(dependencyWorkflowSource, /OCR_SELECTED_PROVIDER_AVAILABILITY_READERS/)
assert.match(dependencyWorkflowSource, /paddleocr:\s*\(providers\) => providers\.paddleocr\.available/)
assert.doesNotMatch(dependencySource, /selectedProvider === 'easyocr'|selectedProvider === 'rapidocr'|selectedProvider === 'paddleocr'|selectedProvider === 'mock'/)
assert.match(dependencySource, /pythonExe.*-m.*pip|pip', 'install/s)
assert.match(dependencySource, /paddleocr/)
assert.match(factorySource, /paddleocr_detection/)
assert.match(paddleWorkerSource, /ocr\.paddle\.color/)
assert.match(paddleWorkerSource, /Initializing PaddleOCR text detection/)

const doc = await fs.readFile('docs/platform/OCR_DEPENDENCY_GOVERNANCE.md', 'utf8')
assert.match(doc, /autoInstall: false/)
assert.match(doc, /AI Python Environment/)
assert.match(doc, /separately approved user action/)
assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
