import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const runtimePackageTests = [
  'scripts/runtime-package-downloader.test.ts',
  'scripts/runtime-package-verifier-extractor.test.ts',
  'scripts/runtime-package-installer.test.ts',
  'scripts/runtime-package-executor.test.ts',
  'scripts/runtime-package-session.test.ts'
]

for (const testPath of runtimePackageTests) {
  const source = await fs.readFile(testPath, 'utf8')
  assert.doesNotMatch(
    source,
    /dist-temp\/runtime-|['"]dist-temp['"]\s*,\s*['"]runtime-|dist-temp\/outside-/,
    `${testPath} must keep generated Runtime Package fixtures under dist-temp/tests.`
  )
}

const executorSource = await fs.readFile('scripts/runtime-package-executor.test.ts', 'utf8')
assert.match(executorSource, /['"]dist-temp['"]\s*,\s*['"]tests['"]\s*,\s*['"]runtime-package-executor-tests['"]/)

const sessionSource = await fs.readFile('scripts/runtime-package-session.test.ts', 'utf8')
assert.match(sessionSource, /['"]dist-temp['"]\s*,\s*['"]tests['"]\s*,\s*['"]runtime-package-session-tests['"]/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-runtime-package-test-hygiene'],
  'node scripts/run-ts-test.mjs scripts/runtime-package-test-hygiene.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-runtime-package-test-hygiene/)

const testsMap = JSON.parse(await fs.readFile('.codeindex/tests-map.json', 'utf8')) as {
  cross_platform_runtime?: string[]
}
assert.ok(
  testsMap.cross_platform_runtime?.includes('npm run test-runtime-package-test-hygiene'),
  'cross_platform_runtime tests-map must include Runtime Package fixture hygiene.'
)
