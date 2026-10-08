import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')

/** Build-time deployment checks. Runtime independently checks the same pins. */
export async function windowsBackupBuildClosure(root = process.cwd()) {
  const identity = await fs.readFile(path.join(root, 'src/main/platform/windows-backup-native/source-identity.ts'), 'utf8')
  const pin = name => {
    const value = identity.match(new RegExp(`export const ${name} = "([A-Za-z0-9-]+)"`))?.[1]
    if (!value) throw Error('BUILD_BACKUP_PIN_MISSING')
    return value
  }
  const directory = pin('WINDOWS_BACKUP_RUNTIME_DIRECTORY')
  if (!/^bundle-[A-Za-z0-9]+$/u.test(directory)) throw Error('BUILD_BACKUP_DIRECTORY_REFUSED')
  const base = `build/windows-backup-runtime/win32-x64/${directory}`
  const packageBase = `build/windows-backup-runtime/package/win32-x64/${directory}`
  const files = {}
  const read = async name => {
    const absolute = path.join(root, name), info = await fs.lstat(absolute)
    if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > 16777216) throw Error('BUILD_BACKUP_INPUT_REFUSED')
    return fs.readFile(absolute)
  }
  const bytes = await read(`${base}/manifest.json`)
  if (sha(bytes) !== pin('WINDOWS_BACKUP_RUNTIME_MANIFEST_SHA256')) throw Error('BUILD_BACKUP_MANIFEST_DRIFT')
  const manifest = JSON.parse(bytes)
  if (manifest.sourceDigest !== pin('WINDOWS_BACKUP_RUNTIME_SOURCE_DIGEST')) throw Error('BUILD_BACKUP_SOURCE_DRIFT')
  const locations = {builder: 'scripts/build-windows-backup-runtime.mjs',
    'sqlite3.h': 'node_modules/better-sqlite3/deps/sqlite3/sqlite3.h', 'sqlite3ext.h': 'node_modules/better-sqlite3/deps/sqlite3/sqlite3ext.h'}
  for (const input of manifest.inputs) {
    const name = locations[input.name] ?? `src/main/platform/windows-backup-native/${input.name}`
    if (!/^(?:supervisor\.cpp|source-vfs\.c|launcher\.cs|target\.cs|builder|sqlite3\.h|sqlite3ext\.h)$/u.test(input.name) ||
      sha(await read(name)) !== input.sha256) throw Error('BUILD_BACKUP_SOURCE_DRIFT')
    files[name] = input.sha256
  }
  if (sha(Buffer.from(JSON.stringify(manifest.inputs))) !== manifest.sourceDigest) throw Error('BUILD_BACKUP_SOURCE_DRIFT')
  if (sha(await read('node_modules/better-sqlite3/build/Release/better_sqlite3.node')) !== manifest.sqliteNativeSha256) throw Error('BUILD_BACKUP_SQLITE_DRIFT')
  const names = ['manifest.json', ...Object.values(manifest.artifacts).map(value => value.name)]
  if (names.length !== 5 || new Set(names).size !== 5 || names.some(name => !/^(?:manifest\.json|supervisor\.node|source\.dll|launcher\.exe|target\.exe)$/u.test(name))) throw Error('BUILD_BACKUP_ARTIFACT_REFUSED')
  for (const name of names) {
    const artifact = await read(`${base}/${name}`), packaged = await read(`${packageBase}/${name}`)
    const expected = name === 'manifest.json' ? {sha256: sha(bytes), bytes: bytes.length} : Object.values(manifest.artifacts).find(value => value.name === name)
    if (artifact.length !== expected.bytes || sha(artifact) !== expected.sha256 || !artifact.equals(packaged)) throw Error('BUILD_BACKUP_ARTIFACT_DRIFT')
    files[`${base}/${name}`] = sha(artifact)
    files[`${packageBase}/${name}`] = sha(packaged)
  }
  const packagedDirectories = await fs.readdir(path.join(root, 'build/windows-backup-runtime/package/win32-x64'))
  if (packagedDirectories.length !== 1 || packagedDirectories[0] !== directory) throw Error('BUILD_BACKUP_PACKAGE_CLOSURE_REFUSED')
  return {files, directory, manifestSha256: sha(bytes), sourceDigest: manifest.sourceDigest, runtime: manifest.runtime}
}
