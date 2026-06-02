import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const source = await fs.readFile('scripts/package-smoke.mjs', 'utf8')

assert.match(source, /package-smoke/)
assert.match(source, /--build/)
assert.match(source, /--launch-unpacked/)
assert.match(source, /--sandbox/)
assert.match(source, /--sandbox-install/)
assert.match(source, /--work-root=/)
assert.match(source, /G:\\\\codex\\\\DesignAssetManagerPackageSmoke/)
assert.match(source, /WindowsSandbox\.exe/)
assert.match(source, /<VGpu>Disable<\/VGpu>/)
assert.match(source, /Start-Sleep -Seconds 15/)
assert.match(source, /NO_PROXY: '\*'/)
assert.match(source, /Get-AuthenticodeSignature/)
assert.match(source, /Get-FileHash/)
assert.match(source, /installer-subfolder/)
assert.match(source, /Start-Process -FilePath \$installer/)
assert.doesNotMatch(source, /spawn\(installerPath/)

const doc = await fs.readFile('docs/platform/PACKAGE_SMOKE_TOOL.md', 'utf8')
assert.match(doc, /node scripts\/package-smoke\.mjs --sandbox/)
assert.match(doc, /--sandbox-install/)
assert.match(doc, /G:\\codex\\DesignAssetManagerPackageSmoke/)
assert.match(doc, /host tool does not run the NSIS installer/i)
