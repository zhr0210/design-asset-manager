import fs from 'node:fs/promises'
import path from 'node:path'
import type { Hash } from 'node:crypto'

/** Bind the selected interpreter's own and explicitly inherited installed packages.
 * This reads only runtime metadata, never process environment or account configuration. */
export async function bindPythonDependencies(
  python: string,
  digest: Hash,
  prefixes: string[],
  signal?: AbortSignal,
) {
  const executable = await fs.realpath(python),
    directory = path.dirname(executable)
  const roots = [
    process.platform === 'win32' && path.basename(directory).toLowerCase() === 'scripts'
      ? path.dirname(directory)
      : directory,
  ]
  const environment = roots[0],
    cfg = path.join(environment, 'pyvenv.cfg')
  let configuration: string | undefined
  try {
    configuration = await fs.readFile(cfg, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
  }
  if (configuration) {
    digest.update(configuration)
    if (/^include-system-site-packages\s*=\s*true\s*$/im.test(configuration)) {
      const base = configuration.match(/^home\s*=\s*(.+)\s*$/im)?.[1]?.trim()
      if (!base || !path.isAbsolute(base)) throw Error('LOCAL_DEPENDENCY_MISSING')
      roots.push(await fs.realpath(base))
    }
  }
  const packages = roots.map((root) =>
    process.platform === 'win32'
      ? path.join(root, 'Lib/site-packages')
      : path.join(root, 'lib/python3.11/site-packages'),
  )
  const entries = await Promise.all(packages.map(async (root) => ({ root, names: await fs.readdir(root) })))
  for (const prefix of prefixes) {
    signal?.throwIfAborted()
    const matches = entries.flatMap((e) =>
      e.names
        .filter((n) => n.toLowerCase().startsWith(prefix) && n.endsWith('.dist-info'))
        .map((name) => ({ root: e.root, name })),
    )
    if (!matches.length) throw Error('LOCAL_DEPENDENCY_MISSING')
    for (const { root, name } of matches) {
      signal?.throwIfAborted()
      digest
        .update(root)
        .update(name)
        .update(await fs.readFile(path.join(root, name, 'RECORD')))
    }
  }
  for (const { root, names } of entries)
    for (const name of names.filter((n) => n.endsWith('.pth')).sort()) {
      signal?.throwIfAborted()
      digest
        .update(root)
        .update(name)
        .update(await fs.readFile(path.join(root, name)))
    }
}
