import fs from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import archiver from 'archiver'
import { windowsBackupBuildClosure } from './windows-backup-build-closure.mjs'

// Local source artifact only. No credentials/profile/library/runtime state,
// Git commit, stage, remote, model installation or product build is performed.
if (process.argv.length !== 2) throw Error('This export has one fixed local scope and no arbitrary output option')
const root = await fs.realpath(process.cwd())
const base = path.join(root, '.scratch/macos-handoff-20261008')
await fs.mkdir(base, { recursive: true })
const run = await fs.mkdtemp(path.join(base, 'candidate-'))
const source = path.join(run, 'source')
await fs.mkdir(source)
const git = args => execFileSync('git', args, { cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 ** 2 })
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const hashFile = async file => { const hash = createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('hex') }
const originalHead = git(['rev-parse', 'HEAD']).trim(), originalBranch = git(['branch', '--show-current']).trim()
const indexBefore = await hashFile(path.join(root, '.git/index'))
const names = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))]
const roots = ['src/', 'scripts/', 'docs/', 'ai-service/', 'pi-runtime/', 'eagle-companion/', '.codeindex/', '.github/']
const exact = new Set(['AGENTS.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md', 'CONTEXT.md', 'DESIGN.md', 'ORIGINAL_REQUEST.md', 'PROJECT.md', 'README.md', 'TASK.md',
  '.gitattributes', '.gitignore', 'package.json', 'package-lock.json', 'electron.vite.config.ts', 'postcss.config.js', 'tailwind.config.js', 'tsconfig.json',
  'build/installer.nsh', 'build/entitlements.mac.plist', 'build/release-branding.example.json', 'build/release-signing-environment.example.json', 'build/macos/DAM 浏览器版.app/Contents/Info.plist',
  'build/macos/DAM 浏览器版.app/Contents/MacOS/launch-browser'])
for (const name of exact) if (!names.includes(name)) names.push(name)
const excluded = {}
function exclusion(name) {
  if (!exact.has(name) && !roots.some(prefix => name.startsWith(prefix))) return 'outside-selected-source'
  if (/(^|\/)(node_modules|\.venv|venv|__pycache__|\.pytest_cache|\.cache|\.git|models_cache)(\/|$)/i.test(name) || name.startsWith('pi-runtime/runtime/') ||
    !name.startsWith('src/') && /(^|\/)(profiles?|auth_states)(\/|$)/i.test(name)) return 'environment-or-runtime-state'
  if (/(^|\/)\.env|\.(db(?:-.*)?|sqlite(?:3)?(?:-.*)?|log|pem|key|p12|pfx|exe|dll|node|pyd|so|dylib|pyc|zip|gguf|onnx|safetensors|pt|pth|ckpt|bin)$/i.test(name)) return 'secret-data-or-platform-binary'
  if (/\.(env)(?:\.|$)/i.test(name) || /(^|\/)(?:auth|credentials?|settings|storage_state|account|tokens?|secrets?|runtime-artifact)\.json$/i.test(name)) return 'account-or-settings-state'
  if (/real-auth-acceptance|(^|\/)evidence\/|docs\/design\/artifacts\/|ai-service\/eval\/datasets\//i.test(name) || name.startsWith('docs/handoff/development-history/')) return 'local-evidence-or-dataset'
  return null
}
const entries = [], fileHashes = {}, foldedNames = new Set()
for (const name of names.sort((a, b) => a.localeCompare(b))) {
  const refused = exclusion(name)
  if (refused) { excluded[refused] = (excluded[refused] ?? 0) + 1; continue }
  if (name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')) throw Error('SOURCE_PATH_INVALID')
  const original = path.resolve(root, name)
  if (!original.startsWith(root + path.sep)) throw Error('SOURCE_SCOPE_ESCAPE')
  let parent = root
  for (const part of name.split('/').slice(0, -1)) {
    parent = path.join(parent, part)
    const info = await fs.lstat(parent).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error))
    if (!info) break
    if (!info.isDirectory() || info.isSymbolicLink()) throw Error('SOURCE_LINK_REFUSED:' + name)
  }
  const before = await fs.lstat(original).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error))
  if (!before) { excluded['deleted-or-missing'] = (excluded['deleted-or-missing'] ?? 0) + 1; continue }
  if (!before.isFile() || before.isSymbolicLink()) throw Error('SOURCE_TYPE_REFUSED:' + name)
  const folded = name.normalize('NFC').toLowerCase()
  if (foldedNames.has(folded)) throw Error('MACOS_CASE_COLLISION:' + name)
  foldedNames.add(folded)
  const digest = await hashFile(original), target = path.join(source, name)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.copyFile(original, target, fs.constants.COPYFILE_EXCL)
  const after = await fs.lstat(original)
  if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || await hashFile(target) !== digest) throw Error('SOURCE_CHANGED_DURING_EXPORT:' + name)
  fileHashes[name] = digest
  entries.push({ path: name, bytes: after.size, sha256: digest, archiveMode: name.endsWith('/MacOS/launch-browser') ? 0o755 : 0o644 })
}

// Independently account the published build-input recipe, without changing
// generated identity. Source/resource drift blocks export as this candidate.
const product = {}, generated = 'src/shared/build-identity.generated.ts'
async function productWalk(directory) {
  for (const item of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    const name = path.posix.join(directory, item.name)
    if (item.isSymbolicLink()) throw Error('PRODUCT_INPUT_LINK_REFUSED')
    if (item.isDirectory()) await productWalk(name)
    else if (name !== generated && /\.(ts|tsx|css|js|mjs|cjs|json|cpp|c|cs|py)$/.test(name)) product[name] = await hashFile(path.join(root, name))
  }
}
await productWalk('src'); await productWalk('ai-service/tools')
const fixed = ['build/installer.nsh', 'scripts/run-electron-builder.mjs', 'scripts/electron-builder-runner-options.mjs', 'scripts/native-package-inputs.mjs',
  'package.json', 'package-lock.json', 'electron.vite.config.ts', 'scripts/build-identity.mjs', 'scripts/build-eagle-companion.mjs',
  'pi-runtime/worker.mjs', 'pi-runtime/provider-policy.json', 'pi-runtime/auth-interaction.mjs', 'pi-runtime/openai-chatgpt-auth.mjs', 'pi-runtime/model-reasoning.mjs', 'pi-runtime/release.json',
  'scripts/windows-backup-build-closure.mjs']
for (const name of ['manifest.json', 'index.html', 'js/plugin.cjs', 'js/pairing.cjs', 'README.md']) fixed.push('eagle-companion/' + name)
for (const name of fixed) product[name] = await hashFile(path.join(root, name))
if (process.platform === 'win32') Object.assign(product, (await windowsBackupBuildClosure(root)).files)
const sourceBuildText = await fs.readFile(path.join(root, generated), 'utf8')
const sourceBuild = JSON.parse(sourceBuildText.slice(sourceBuildText.indexOf('{'), sourceBuildText.lastIndexOf('}') + 1))
const sortedHashes = hashes => Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)))
const productDigest = sha(JSON.stringify(sortedHashes(product)))
if (sourceBuild.sourceDigest !== productDigest || sourceBuild.sourceCount !== Object.keys(product).length) throw Error('CURRENT_SOURCE_NO_LONGER_MATCHES_CANDIDATE_BUILD')
const includedSourceHashes = {}, omitted = []
for (const [name, digest] of Object.entries(product)) {
  if (fileHashes[name] === digest) includedSourceHashes[name] = digest
  else if (name.startsWith('build/windows-backup-runtime/') || name.startsWith('node_modules/')) omitted.push({ path: name, sha256: digest, reason: 'Windows generated resource or platform dependency; rebuild on target' })
  else throw Error('REQUIRED_PRODUCT_SOURCE_NOT_EXPORTED:' + name)
}
const status = git(['status', '--porcelain=v1', '-z']).split('\0').filter(Boolean)
const manifest = { schema: 1, kind: 'portable-development-source', exportedAt: new Date().toISOString(), originalHead, originalBranch,
  originalIndexSha256: indexBefore, sourceBuild, sourceSnapshotSha256: sha(JSON.stringify(sortedHashes(fileHashes))),
  files: entries, excludedCounts: excluded,
  productInputs: { validatedOriginalCount: Object.keys(product).length, includedSourceHashes, omitted },
  workingTree: { trackedOrUntrackedRecords: status.length, includesAdoptedUncommittedImplementations: true, historicalCommitsBundled: false },
  evidence: 'Top-level handoffs included. Original scratch evidence/data/models/accounts remain on Windows.',
  target: { macOS: 'NOT_RUN', platformDependenciesBundled: false, modelsBundled: false, userDataBundled: false, secretsRead: false, published: false } }
await fs.writeFile(path.join(source, 'SOURCE-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(path.join(source, 'RESTORE.md'), '# Restore this source snapshot\n\nRead docs/handoff/MACOS-CONTINUATION-20261008.md first. Run node scripts/verify-candidate-source.mjs before installing dependencies or resealing Pi. This directory has no Git history or environment; current Windows product provenance is not macOS acceptance.\n')
const zipPath = path.join(run, 'DAM-macos-source-20261008.zip')
const output = createWriteStream(zipPath, { flags: 'wx' })
const archive = archiver('zip', { zlib: { level: 6 } })
const closed = new Promise((resolve, reject) => { output.once('close', resolve); output.once('error', reject); archive.once('error', reject) })
archive.pipe(output)
for (const entry of entries) archive.file(path.join(source, entry.path), { name: entry.path, mode: entry.archiveMode })
for (const name of ['SOURCE-MANIFEST.json', 'RESTORE.md']) archive.file(path.join(source, name), { name, mode: 0o644 })
await archive.finalize(); await closed
const indexAfter = await hashFile(path.join(root, '.git/index'))
if (indexBefore !== indexAfter || git(['rev-parse', 'HEAD']).trim() !== originalHead) throw Error('ORIGINAL_GIT_STATE_CHANGED')
const transfer = { schema: 1, generatedAt: new Date().toISOString(), sourceBuild: sourceBuild.buildId,
  archive: { name: path.basename(zipPath), bytes: (await fs.stat(zipPath)).size, sha256: await hashFile(zipPath) },
  files: entries.length, sourceSnapshotSha256: manifest.sourceSnapshotSha256,
  includedProductSourceFiles: Object.keys(includedSourceHashes).length, omittedPlatformInputs: omitted.length,
  originalHeadUnchanged: true, originalIndexUnchanged: true, signed: false, macOSValidated: false, published: false }
await fs.writeFile(path.join(run, 'TRANSFER-MANIFEST.json'), JSON.stringify(transfer, null, 2) + '\n')
await fs.writeFile(path.join(base, 'selected-run.txt'), path.relative(root, run).split(path.sep).join('/') + '\n')
console.log(JSON.stringify({ run: path.relative(root, run).split(path.sep).join('/'), ...transfer }, null, 2))
