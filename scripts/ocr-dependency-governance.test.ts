import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createOcrDependencyGovernancePlan, createOcrDoctorCheckPlan } from '../src/main/services/ocr-governance.service'

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

const paddlePlan = createOcrDependencyGovernancePlan('paddleocr')
assert.equal(paddlePlan.provider, 'paddleocr')
assert.equal(paddlePlan.runtimeProfile, 'local-ocr')
assert.equal(paddlePlan.autoInstall, false)

const doctorPlan = createOcrDoctorCheckPlan('rapidocr')
assert.equal(doctorPlan.readonly, true)
assert.equal(doctorPlan.autoFix, false)
assert.equal(doctorPlan.autoInstall, false)
assert.equal(createOcrDoctorCheckPlan('paddleocr').provider, 'paddleocr')

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
assert.doesNotMatch(governanceSource, /spawn\s*\(|execSync\s*\(|writeFile\s*\(|appendFile\s*\(|mkdirSync\s*\(/)
assert.doesNotMatch(governanceSource, /C:\\Users\\[A-Za-z0-9_.-]+/i)

const dependencySource = await fs.readFile('src/main/services/ocr-dependency.service.ts', 'utf8')
const factorySource = await fs.readFile('src/main/services/text-detection/text-box-provider.factory.ts', 'utf8')
const paddleWorkerSource = await fs.readFile('ai-service/ocr_workers/paddleocr_color_worker.py', 'utf8')
assert.doesNotMatch(dependencySource, /C:\\\\Users\\\\[A-Za-z0-9_.-]+/i)
assert.doesNotMatch(dependencySource, /\.gemini[\\/]+antigravity[\\/]+scratch/i)
assert.match(dependencySource, /resolveDebugLogPath\('ocr-dependency'/)
assert.match(dependencySource, /redactDebugMessage/)
assert.match(dependencySource, /pythonExe.*-m.*pip|pip', 'install/s)
assert.match(dependencySource, /paddleocr/)
assert.match(dependencySource, /selectedProviderAvailable.*paddleocr|selectedProvider === 'paddleocr'/)
assert.match(factorySource, /paddleocr_detection/)
assert.match(paddleWorkerSource, /ocr\.paddle\.color/)
assert.match(paddleWorkerSource, /Initializing PaddleOCR text detection/)

const doc = await fs.readFile('docs/platform/OCR_DEPENDENCY_GOVERNANCE.md', 'utf8')
assert.match(doc, /autoInstall: false/)
assert.match(doc, /Phase 12B/)
assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
