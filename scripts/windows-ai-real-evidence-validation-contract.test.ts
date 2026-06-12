import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const source = await fs.readFile('scripts/windows-ai-real-evidence-validation.ps1', 'utf8')

assert.match(source, /function ConvertTo-RedactedText/)
assert.match(source, /\.Replace\(\$env:USERPROFILE, "<USERPROFILE>"\)/)
assert.match(source, /\.Replace\(\$env:TEMP, "<TEMP>"\)/)
assert.match(source, /\.Replace\(\$RepoRoot, "<REPO_ROOT>"\)/)
assert.ok(source.includes('$redacted = $redacted.Replace($RepoRoot.Replace("\\", "/"), "<REPO_ROOT>")'))

assert.match(source, /\$output = @\(& \$Command @Arguments 2>&1\)/)
assert.match(source, /Write-Log \(\[string\]\$item\)/)
assert.doesNotMatch(source, /dam-native-(?:stdout|stderr)/)
assert.doesNotMatch(source, /> \$stdoutPath 2> \$stderrPath/)
assert.doesNotMatch(source, /\(\$item \| Out-String\)\.TrimEnd\(\)/)

console.log('windows-ai-real-evidence-validation-contract passed')
