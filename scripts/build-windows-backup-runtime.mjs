import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = process.cwd()
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('WINDOWS_BACKUP_BUILD_PLATFORM_UNSUPPORTED')
const outputArg = process.argv.find(argument => argument.startsWith('--output='))
const baseOutput = path.resolve(outputArg?.slice(9) ?? 'build/windows-backup-runtime/win32-x64')
await fs.mkdir(baseOutput, { recursive: true })
// Build a fresh complete bundle. Never overwrite a DLL/EXE currently mapped by
// an admitted Host, and never publish a mixture from a failed compilation.
const output = await fs.mkdtemp(path.join(baseOutput, 'bundle-'))
const sourceRoot = path.join(root, 'src/main/platform/windows-backup-native')
// Explicit compiler inputs let a fresh host rebuild and seal its own bundle.
// These options select build tools, never weaken the runtime's artifact pins.
const argument = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const toolRoot = path.resolve(argument('tool-root', 'C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207'))
const sdkRoot = path.resolve(argument('sdk-root', 'C:/Program Files (x86)/Windows Kits/10'))
const sdkVersion = argument('sdk-version', '10.0.26100.0')
if (!/^\d+\.\d+\.\d+\.\d+$/u.test(sdkVersion)) throw Error('WINDOWS_BACKUP_BUILD_SDK_VERSION_INVALID')
const compiler = path.join(toolRoot, 'bin/Hostx64/x64/cl.exe')
const linker = path.join(toolRoot, 'bin/Hostx64/x64/link.exe')
const systemRoot = process.env.SystemRoot ?? 'C:/Windows'
const csc = path.join(systemRoot, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe')
const cache = path.resolve(argument('node-headers-root', path.join(process.env.LOCALAPPDATA ?? '', 'node-gyp/Cache/25.7.0')))
const sources = ['supervisor.cpp', 'source-vfs.c', 'launcher.cs', 'target.cs']
const headers = ['sqlite3.h', 'sqlite3ext.h']
const inputs = []
await fs.mkdir(path.join(output, 'sources'), { recursive: true })
for (const name of sources) {
  const bytes = await fs.readFile(path.join(sourceRoot, name))
  await fs.writeFile(path.join(output, 'sources', name), bytes)
  inputs.push({ name, sha256: sha(bytes) })
}
for (const name of headers) {
  const bytes = await fs.readFile(path.join(root, 'node_modules/better-sqlite3/deps/sqlite3', name))
  await fs.writeFile(path.join(output, 'sources', name), bytes)
  inputs.push({ name, sha256: sha(bytes) })
}
inputs.push({ name: 'builder', sha256: sha(await fs.readFile(new URL(import.meta.url))) })
const sourceDigest = sha(Buffer.from(JSON.stringify(inputs)))
const environment = { SystemRoot: systemRoot, WINDIR: systemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP }
const options = { cwd: output, env: environment, windowsHide: true, timeout: 30000, maxBuffer: 65536 }
const includes = [path.join(toolRoot, 'include'), ...['ucrt', 'shared', 'um'].map(name => path.join(sdkRoot, 'Include', sdkVersion, name)), path.join(output, 'sources')]
const libs = [path.join(toolRoot, 'lib/x64'), ...['ucrt', 'um'].map(name => path.join(sdkRoot, 'Lib', sdkVersion, name, 'x64'))]
const compile = async (name, artifact, napi = false) => run(compiler, ['/nologo', '/LD', '/O2', '/MT', '/EHsc', '/std:c++17', '/DWIN32_LEAN_AND_MEAN', ...includes.map(value => '/I' + value), ...(napi ? ['/DNAPI_VERSION=8', '/I' + path.join(cache, 'include/node')] : []), path.join(output, 'sources', name), '/Fo' + path.join(output, name + '.obj'), '/link', '/OUT:' + path.join(output, artifact), ...libs.map(value => '/LIBPATH:' + value), 'bcrypt.lib', ...(napi ? ['psapi.lib', path.join(cache, 'x64/node.lib'), 'delayimp.lib', '/DELAYLOAD:node.exe'] : [])], options)
const compilations = await Promise.allSettled([
  compile('supervisor.cpp', 'supervisor.node', true),
  compile('source-vfs.c', 'source.dll'),
  ...['launcher', 'target'].map(name => run(csc, ['/nologo', '/target:exe', '/platform:x64', '/optimize+', ...(name === 'target' ? ['/reference:System.Web.Extensions.dll'] : []), '/out:' + path.join(output, name + '.exe'), path.join(output, 'sources', name + '.cs')], options))
])
const failed = compilations.find(result => result.status === 'rejected')
if (failed) throw failed.reason
const logs = compilations.map(result => result.value)
const electronPackage = JSON.parse(await fs.readFile(path.join(root, 'node_modules/electron/package.json'), 'utf8'))
const electron = path.join(root, 'node_modules/electron/dist/electron.exe')
const native = path.join(root, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node')
const observed = await run(electron, ['-e', "const D=require('better-sqlite3');const d=new D(':memory:');process.stdout.write(JSON.stringify({electron:process.versions.electron,node:process.versions.node,abi:process.versions.modules,napi:process.versions.napi,sqliteVersion:d.prepare('SELECT sqlite_version()').pluck().get(),sqliteSource:d.prepare('SELECT sqlite_source_id()').pluck().get()}));d.close()"], { cwd: root, windowsHide: true, env: { ...environment, ELECTRON_RUN_AS_NODE: '1' }, timeout: 15000, maxBuffer: 4096 })
const runtime = JSON.parse(observed.stdout)
if (runtime.electron !== electronPackage.version) throw Error('WINDOWS_BACKUP_BUILD_ELECTRON_MISMATCH')
const artifacts = {}
for (const [role, name] of Object.entries({ supervisor: 'supervisor.node', source: 'source.dll', launcher: 'launcher.exe', target: 'target.exe' })) {
  const bytes = await fs.readFile(path.join(output, name))
  artifacts[role] = { name, bytes: bytes.length, sha256: sha(bytes) }
}
const manifest = { protocol: 1, platform: 'win32', arch: 'x64', sourceDigest, inputs, runtime, sqliteNativeSha256: sha(await fs.readFile(native)), compilers: { native: sha(Buffer.concat([await fs.readFile(compiler), await fs.readFile(linker)])), managed: sha(await fs.readFile(csc)), sdkVersion, nodeHeaders: sha(await fs.readFile(path.join(cache, 'include/node/node_api.h'))) }, artifacts, profile: { maxImageBytes: 4194304, processCommitBytes: 134217728, jobCommitBytes: 268435456, rssHardLimited: false }, loadBoundary: 'trusted-application-bundle' }
const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(path.join(output, 'manifest.json'), bytes)
await fs.writeFile(path.join(output, 'build-log.json'), JSON.stringify(logs, null, 2) + '\n')
const packageParent = path.dirname(baseOutput), packageRoot = path.join(packageParent, 'package')
if (path.basename(baseOutput) !== 'win32-x64' || path.relative(root, packageParent).startsWith('..') || path.isAbsolute(path.relative(root, packageParent))) throw Error('WINDOWS_BACKUP_PACKAGE_SCOPE_REFUSED')
const staging = await fs.mkdtemp(path.join(packageParent, 'package-staging-'))
const publishedBundle = path.join(staging, 'win32-x64', path.basename(output))
await fs.mkdir(publishedBundle, { recursive: true })
await fs.writeFile(path.join(publishedBundle, 'manifest.json'), bytes)
for (const artifact of Object.values(artifacts)) {
  const artifactBytes = await fs.readFile(path.join(output, artifact.name))
  if (artifactBytes.length !== artifact.bytes || sha(artifactBytes) !== artifact.sha256) throw Error('WINDOWS_BACKUP_PACKAGE_ARTIFACT_CHANGED')
  await fs.writeFile(path.join(publishedBundle, artifact.name), artifactBytes, { flag: 'wx' })
}
await fs.writeFile(path.join(staging, '.builder-owned.json'), JSON.stringify({ protocol: 1, owner: 'dam-windows-backup-runtime', directory: path.basename(output), manifestSha256: sha(bytes) }) + '\n')
try {
  const previous = JSON.parse(await fs.readFile(path.join(packageRoot, '.builder-owned.json'), 'utf8'))
  if (previous.protocol !== 1 || previous.owner !== 'dam-windows-backup-runtime' || !/^bundle-[A-Za-z0-9]+$/u.test(previous.directory)) throw Error('WINDOWS_BACKUP_PACKAGE_OWNER_REFUSED')
  const history = path.join(packageParent, path.basename(staging).replace('package-staging-', 'package-history-'))
  if (path.dirname(await fs.realpath(packageRoot)) !== await fs.realpath(packageParent) || path.dirname(history) !== packageParent) throw Error('WINDOWS_BACKUP_PACKAGE_MOVE_SCOPE_REFUSED')
  await fs.rename(packageRoot, history)
} catch (error) { if (error?.code !== 'ENOENT') throw error }
await fs.rename(staging, packageRoot)
await fs.writeFile(path.join(baseOutput, 'current.json'), JSON.stringify({ protocol: 1, directory: path.basename(output), manifestSha256: sha(bytes) }) + '\n')
await fs.writeFile(path.join(sourceRoot, 'source-identity.ts'), '// Generated by the offline native Runtime builder. Never generated by Runtime.\nexport const WINDOWS_BACKUP_RUNTIME_DIRECTORY = ' + JSON.stringify(path.basename(output)) + '\nexport const WINDOWS_BACKUP_RUNTIME_MANIFEST_SHA256 = ' + JSON.stringify(sha(bytes)) + '\nexport const WINDOWS_BACKUP_RUNTIME_SOURCE_DIGEST = ' + JSON.stringify(sourceDigest) + '\n')
process.stdout.write(JSON.stringify({ output, packageRoot, manifestSha256: sha(bytes), sourceDigest, artifacts }, null, 2) + '\n')
