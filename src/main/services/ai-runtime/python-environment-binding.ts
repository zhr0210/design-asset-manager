import fs from 'node:fs/promises'
import path from 'node:path'
import type { Hash } from 'node:crypto'

/** Preserve the selected venv entry: resolving its symlink selects the base
 * interpreter and silently discards the environment's installed packages. */
export async function pythonPackageRoots(python: string) {
  const entry = path.resolve(python)
  await fs.realpath(entry)
  const bin = path.dirname(entry)
  const environment = /^(bin|scripts)$/i.test(path.basename(bin)) ? path.dirname(bin) : bin
  const roots = [environment]
  let configuration = ''
  try { configuration = await fs.readFile(path.join(environment, 'pyvenv.cfg'), 'utf8') }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  if (configuration.length > 16384) throw Error('LOCAL_DEPENDENCY_MISSING')
  if (/^include-system-site-packages\s*=\s*true\s*$/im.test(configuration)) {
    const home = configuration.match(/^home\s*=\s*(.+)\s*$/im)?.[1]?.trim()
    if (!home || !path.isAbsolute(home)) throw Error('LOCAL_DEPENDENCY_MISSING')
    const base = await fs.realpath(home)
    roots.push(path.basename(base) === 'bin' ? path.dirname(base) : base)
  }
  const version = configuration.match(/^version\s*=\s*(3\.\d+)\./im)?.[1]
  const packages: string[] = []
  for (const root of roots) {
    if (process.platform === 'win32') { packages.push(path.join(root, 'Lib/site-packages')); continue }
    const lib = path.join(root, 'lib')
    const versions = (await fs.readdir(lib)).filter(name => /^python3\.\d+$/.test(name) && (!version || name === 'python' + version))
    if (versions.length !== 1) throw Error('LOCAL_DEPENDENCY_MISSING')
    packages.push(path.join(lib, versions[0], 'site-packages'))
  }
  return { packages, configuration, entry }
}

/** Bind selected installed metadata without reading environment or credentials. */
export async function bindPythonDependencies(python: string, digest: Hash, prefixes: string[], signal?: AbortSignal) {
  const { packages, configuration, entry } = await pythonPackageRoots(python)
  digest.update(entry).update(configuration)
  const entries = await Promise.all(packages.map(async root => ({ root, names: await fs.readdir(root) })))
  for (const prefix of prefixes) {
    signal?.throwIfAborted()
    const matches = entries.flatMap(e => e.names.filter(n => n.toLowerCase().startsWith(prefix) && n.endsWith('.dist-info')).map(name => ({ root: e.root, name })))
    if (!matches.length) throw Error('LOCAL_DEPENDENCY_MISSING')
    for (const { root, name } of matches) {
      signal?.throwIfAborted()
      digest.update(root).update(name).update(await fs.readFile(path.join(root, name, 'RECORD')))
    }
  }
  for (const { root, names } of entries) for (const name of names.filter(n => n.endsWith('.pth')).sort()) {
    signal?.throwIfAborted()
    digest.update(root).update(name).update(await fs.readFile(path.join(root, name)))
  }
}
