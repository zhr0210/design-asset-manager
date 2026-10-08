import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex')
export interface WindowsNativeQualificationArtifact { path: string; artifactSha256: string; sourceSha256: string; compilerSha256: string }

/** Explicit test build using already installed tools. This is trusted Host test
 * preparation, never work performed inside a helper resource permit. */
export async function buildWindowsQualificationNative(input: { sourcePath: string; outputName: string; napi?: boolean; libraries?: string[]; includeDirectories?: string[] }): Promise<WindowsNativeQualificationArtifact> {
  assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64')
  assert.match(input.outputName, /^[a-z0-9-]+\.(?:dll|node)$/)
  const toolRoot = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\14.44.35207'
  const sdkRoot = 'C:\\Program Files (x86)\\Windows Kits\\10'
  const compiler = path.join(toolRoot, 'bin/Hostx64/x64/cl.exe')
  const linker = path.join(toolRoot, 'bin/Hostx64/x64/link.exe')
  const sdk = '10.0.26100.0'
  const [sourceBytes, compilerBytes, linkerBytes] = await Promise.all([fs.readFile(input.sourcePath), fs.readFile(compiler), fs.readFile(linker)])
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-native-qualification-build-'))
  const source = path.join(directory, 'source' + path.extname(input.sourcePath)), output = path.join(directory, input.outputName)
  await fs.writeFile(source, sourceBytes, { flag: 'wx' })
  const include = [path.join(toolRoot, 'include'), ...['ucrt', 'shared', 'um'].map(name => path.join(sdkRoot, 'Include', sdk, name)), ...(input.includeDirectories ?? [])]
  const libs = [path.join(toolRoot, 'lib/x64'), ...['ucrt', 'um'].map(name => path.join(sdkRoot, 'Lib', sdk, name, 'x64'))]
  const napiCache = path.join(process.env.LOCALAPPDATA ?? '', 'node-gyp/Cache/25.7.0')
  if (input.napi) include.push(path.join(napiCache, 'include/node'))
  await run(compiler, ['/nologo', '/LD', '/O2', '/MT', '/EHsc', '/std:c++17', '/DWIN32_LEAN_AND_MEAN', ...(input.napi ? ['/DNAPI_VERSION=8'] : []), ...include.map(value => '/I' + value), source,
    '/Fo' + path.join(directory, 'source.obj'), '/link', '/OUT:' + output, ...libs.map(value => '/LIBPATH:' + value), ...(input.libraries ?? []), ...(input.napi ? [path.join(napiCache, 'x64/node.lib'), 'delayimp.lib', '/DELAYLOAD:node.exe'] : [])], {
    cwd: directory, env: { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows', WINDIR: process.env.SystemRoot ?? 'C:\\Windows', TEMP: os.tmpdir(), TMP: os.tmpdir() }, windowsHide: true, timeout: 30000, maxBuffer: 16384
  })
  return { path: output, artifactSha256: digest(await fs.readFile(output)), sourceSha256: digest(sourceBytes), compilerSha256: digest(Buffer.concat([compilerBytes, linkerBytes])) }
}
