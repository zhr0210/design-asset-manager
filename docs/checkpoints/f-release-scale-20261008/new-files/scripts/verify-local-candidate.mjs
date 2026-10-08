import fs from 'node:fs/promises'
import path from 'node:path'
import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import asar from '@electron/asar'

assert.equal(process.platform, 'win32', 'Current F verifier covers Windows only; macOS must use its native candidate resources')
assert.equal(process.arch, 'x64', 'Current F candidate is Windows x64')

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--(directory|output)=(.+)$/.exec(arg)
  if (!match) throw Error('Expected --directory and --output only')
  return [match[1], match[2]]
}))
if (!args.directory || !args.output) throw Error('Candidate directory/output required')
const directory = await fs.realpath(path.resolve(args.directory))
const resources = path.join(directory, 'resources'), archive = path.join(resources, 'app.asar')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const fileSha = async file => { const hash = createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('hex') }
const identityText = await fs.readFile('src/shared/build-identity.generated.ts', 'utf8')
const build = JSON.parse(identityText.slice(identityText.indexOf('{'), identityText.lastIndexOf('}') + 1))
const members = asar.listPackage(archive).map(file => file.replaceAll('\\', '/').replace(/^\//,''))
assert.ok(members.includes('out/main/index.js'))
const nativeName = name => name.split('/').join(path.sep)
const main = asar.extractFile(archive, nativeName('out/main/index.js')).toString('utf8')
assert.ok(main.includes(build.sourceDigest), 'packaged Main must contain the exact current source identity')
for (const name of ['out/preload/index.cjs','out/preload/asset-card.cjs','out/preload/work-window.cjs',
  'out/main/windows-video/video.exe','out/main/eagle-companion/DAM-Eagle-Companion-0.2.0.eagleplugin']) {
  assert.ok(members.includes(name), 'missing packaged entry/resource: ' + name)
  assert.equal(sha(asar.extractFile(archive, nativeName(name))), await fileSha(name), 'packaged bytes differ: ' + name)
}
const packageData = JSON.parse(await fs.readFile('package.json','utf8'))
assert.equal(packageData.build.nsis.deleteAppDataOnUninstall, false)
const packagedPackage = JSON.parse(asar.extractFile(archive,'package.json').toString('utf8'))
assert.equal(packagedPackage.version, packageData.version)
const piBytes = await fs.readFile(path.join(resources,'pi-runtime/release.json'))
assert.equal(sha(piBytes), sha(await fs.readFile('pi-runtime/release.json')))
const pi = JSON.parse(piBytes)
assert.equal(pi.platform, process.platform); assert.equal(pi.arch, process.arch)
let piFiles = 0
for (const [name, digest] of Object.entries(pi.files)) {
  const file = path.resolve(resources,'pi-runtime',name)
  assert.ok(file.startsWith(path.resolve(resources,'pi-runtime') + path.sep))
  assert.equal(await fileSha(file), digest, 'Pi sealed resource differs: ' + name); piFiles++
}
const backupIdentity = await fs.readFile('src/main/platform/windows-backup-native/source-identity.ts','utf8')
const bundle = /WINDOWS_BACKUP_RUNTIME_DIRECTORY = "([a-zA-Z0-9_-]+)"/.exec(backupIdentity)?.[1]
const manifestDigest = /WINDOWS_BACKUP_RUNTIME_MANIFEST_SHA256 = "([a-f0-9]{64})"/.exec(backupIdentity)?.[1]
assert.ok(bundle && manifestDigest, 'generated backup identity required')
const backupSource = path.join('build/windows-backup-runtime/package', process.platform + '-' + process.arch, bundle)
const nativeBytes = await fs.readFile(path.join(backupSource,'manifest.json'))
assert.equal(sha(nativeBytes), manifestDigest, 'backup manifest must match generated identity')
const native = JSON.parse(nativeBytes)
const backupRoot = path.join(resources,'windows-backup-runtime',process.platform + '-' + process.arch,bundle)
assert.deepEqual(await fs.readFile(path.join(backupRoot,'manifest.json')),
  nativeBytes)
for (const artifact of Object.values(native.artifacts)) {
  const file = path.resolve(backupRoot,artifact.name)
  assert.equal(path.dirname(file), path.resolve(backupRoot), 'backup artifact must stay within its exact bundle')
  assert.equal(await fileSha(file),artifact.sha256)
}
const allFiles = []
async function walk(root, prefix = '') {
  for (const entry of await fs.readdir(root,{withFileTypes:true})) {
    const name = path.posix.join(prefix,entry.name), file = path.join(root,entry.name)
    if (entry.isSymbolicLink()) throw Error('CANDIDATE_LINK_UNASSESSED')
    if (entry.isDirectory()) await walk(file,name)
    else if (entry.isFile()) {
      // Reject material/cache files before reading their bytes. Never inspect a secret to classify it.
      if (name.startsWith('resources/ai-service/') && /(^|\/)(models|\.venv|__pycache__|\.cache|\.git)(\/|$)|(^|\/)\.env|\.(db|sqlite(?:-.*)?|log)$/i.test(name)) throw Error('UNWANTED_AI_SERVICE_PAYLOAD:' + name)
      allFiles.push({ name, bytes:(await fs.stat(file)).size, sha256:await fileSha(file) })
    }
  }
}
await walk(directory)
const locks = JSON.parse(await fs.readFile('package-lock.json','utf8'))
const dependencyVersions = Object.fromEntries(Object.keys(packageData.dependencies).sort().map(name => [name,locks.packages['node_modules/'+name]?.version ?? null]))
const inputHashes = {}
for (const name of ['package.json','package-lock.json','electron.vite.config.ts','build/installer.nsh',
  'scripts/run-electron-builder.mjs','scripts/native-package-inputs.mjs','scripts/package-startup-smoke.mjs',
  'scripts/package-smoke.mjs','scripts/verify-local-candidate.mjs']) inputHashes[name] = await fileSha(name)
const manifest = { schema:1, generatedAt:new Date().toISOString(), kind:'local unsigned candidate; not approved distribution',
  build, productVersion:packageData.version, platform:process.platform, arch:process.arch, inputHashes, dependencyVersions,
  artifacts:allFiles.sort((a,b)=>a.name.localeCompare(b.name)),
  runtimeDistribution:{pi:{platform:pi.platform,arch:pi.arch,nodeVersion:pi.nodeVersion,piVersion:pi.piVersion,verifiedFiles:piFiles,releaseSha256:sha(piBytes)},
    backup:{sourceDigest:native.sourceDigest,profile:native.profile},models:{bundled:false,source:'user-selected China ModelScope sources',qualification:'installation is not activation'}},
  supportScope:{core:'subject to current per-client functional acceptance',eagle:'development/acceptance deferred to macOS by user',
    nativeDesktop:'deferred combined acceptance',macOS:'NOT_RUN on this Windows host'},
  promotion:{signed:false,published:false,installationUpgradeUninstall:'NOT_RUN; deferred native acceptance',
    branding:'default Electron icon; not approved product branding',distributionReady:false},
  privacy:{secretsRead:false,userLibraryBundled:false,generatedTranslationCacheBundled:false} }
await fs.mkdir(path.dirname(path.resolve(args.output)),{recursive:true})
await fs.writeFile(args.output,JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({build:build.buildId,files:allFiles.length,piVerified:piFiles,bytes:allFiles.reduce((n,f)=>n+f.bytes,0),distributionReady:false}))
