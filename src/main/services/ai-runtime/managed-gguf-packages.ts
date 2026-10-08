import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import extractZip from 'extract-zip'
import * as tar from 'tar'
import type Database from 'better-sqlite3'
import { transferModelFile, verifyTransferredFile } from '../../model-library-workspace/model-file-transfer'
import type { PublicModelFetch } from '../../model-library-workspace/huggingface-model-source'
import type { VisionModelFile } from '../../model-library/vision-model-artifact'
import { LLAMA_MIT_NOTICE } from './llama-mit-notice'

type Variant = 'cpu' | 'cuda-13.4' | 'macos-arm64' | 'macos-x64'
export interface NativeGgufRuntimeBinding {
  executable: string; root: string; variant: Variant; release: string; fingerprint: string;
  files: VisionModelFile[];
}
const RELEASE = 'b11429', COMMIT = 'd81235049384534c167caea52b85a694f6103d14'
const SOURCES = {
  'macos-arm64': [{name:'llama-b11429-bin-macos-arm64.tar.gz',bytes:11971406,sha256:'740288ec6887be94280a5dfa25b5e23a78285cab104519e6c7e218904ee82459'}],
  'macos-x64': [{name:'llama-b11429-bin-macos-x64.tar.gz',bytes:11487431,sha256:'29ac3ea02be6bd143e824973f2cc5fa74bc4094393a9eaab0ff6814f19dd8522'}],
  cpu: [{ name: 'llama-b11429-bin-win-cpu-x64.zip', bytes: 19398918, sha256: '1283323272b04cd07905816a597a0da810918102de958f4ff6f7bbaa70ed2efe' }],
  'cuda-13.4': [
    { name: 'llama-b11429-bin-win-cuda-13.4-x64.zip', bytes: 153089864, sha256: '76ddc6eff2389570789ed608881efc6977751a722015d8e8c94f302224ff1a3a' },
    { name: 'cudart-llama-bin-win-cuda-13.4-x64.zip', bytes: 423535356, sha256: '738f8c251ac22b70c3ae6f83a10cf222725df0395246a2cf58f32bdb85fbe668' },
  ],
} as const
const VARIANTS = Object.keys(SOURCES) as Variant[]
const target = (variant: Variant) => variant.startsWith('macos-') ? 'darwin-' + variant.slice(6) : 'win32-x64'
const executableName = (variant: Variant) => variant.startsWith('macos-') ? 'llama-server' : 'llama-server.exe'
const allowedNative = (name: string, variant: Variant) => variant.startsWith('macos-') ? name === 'llama-server' || /\.(dylib|metallib|txt|md)$/.test(name) : /\.(exe|dll|txt|md)$/i.test(name)
const MARKER = '.dam-native-runtime-store'
const sourceUrl = (name: string) => `https://github.com/ggml-org/llama.cpp/releases/download/${RELEASE}/${name}`
export function assertNativeRuntimeUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
    !['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(url.hostname))
    throw Error('MODEL_SOURCE_REDIRECT_REJECTED')
}
interface PackageRecord {
  variant: Variant; stage: string; state: 'preparing' | 'interrupted' | 'failed' | 'ready';
  error: string | null; completedBytes: number; intent?: boolean; files?: VisionModelFile[]; fingerprint?: string;
}

/** Shipped public release digests, owned staging, bounded ZIP extraction and
 * byte-bound executables. No scripts, PATH discovery or publisher-signature claim. */
export function createManagedGgufPackages(d: { database: Database.Database; root: string; fetch: PublicModelFetch; changed(): void }) {
  d.database.exec('CREATE TABLE IF NOT EXISTS managed_gguf_packages(variant TEXT PRIMARY KEY,record TEXT NOT NULL)')
  const root = path.resolve(d.root)
  let active: Promise<NativeGgufRuntimeBinding> | undefined, controller: AbortController | undefined
  let last: PackageRecord | undefined
  const read = (variant: Variant): PackageRecord | undefined => {
    const row = d.database.prepare('SELECT record FROM managed_gguf_packages WHERE variant=?').get(variant) as { record: string } | undefined
    if (!row) return
    const record = JSON.parse(row.record) as PackageRecord
    if (record.variant !== variant || !/^[a-f0-9-]{36}$/.test(record.stage) || !['preparing', 'interrupted', 'failed', 'ready'].includes(record.state))
      throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
    return record
  }
  const save = (record: PackageRecord) => {
    d.database.prepare('INSERT INTO managed_gguf_packages VALUES(?,?) ON CONFLICT(variant) DO UPDATE SET record=excluded.record').run(record.variant, JSON.stringify(record))
    last = record; d.changed()
  }
  for (const variant of VARIANTS) {
    const record = read(variant)
    if (record?.state === 'preparing') { record.state = 'interrupted'; save(record) }
  }
  const childPath = (name: string) => {
    const resolved = path.resolve(root, name), relative = path.relative(root, resolved)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
    return resolved
  }
  async function ensureStore() {
    try { await fs.mkdir(root, { mode: 0o700 }); await fs.writeFile(path.join(root, MARKER), 'dam-gguf-native-v1', { flag: 'wx', mode: 0o600 }) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error }
    const stat = await fs.lstat(root), marker = await fs.lstat(path.join(root, MARKER))
    if (!stat.isDirectory() || stat.isSymbolicLink() || !marker.isFile() || marker.isSymbolicLink() || marker.size > 128 ||
      await fs.readFile(path.join(root, MARKER), 'utf8') !== 'dam-gguf-native-v1') throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
  }
  async function checkedDirectory(record: PackageRecord, published = false) {
    await ensureStore()
    const directory = childPath(published ? `${record.variant}-${RELEASE}` : record.stage)
    const stat = await fs.lstat(directory), marker = await fs.lstat(path.join(directory, MARKER))
    if (!stat.isDirectory() || stat.isSymbolicLink() || !marker.isFile() || marker.isSymbolicLink() || marker.size > 256 ||
      await fs.readFile(path.join(directory, MARKER), 'utf8') !== `${record.stage}:${record.variant}:${COMMIT}`) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
    return directory
  }
  async function verify(record: PackageRecord, published: boolean, signal: AbortSignal): Promise<NativeGgufRuntimeBinding> {
    const directory = await checkedDirectory(record, published)
    if (!record.files?.length || record.files.length > 300 || !record.fingerprint) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
    const native = path.join(directory, 'native'), stat = await fs.lstat(native)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
    const names = await fs.readdir(native)
    if (names.length !== record.files.length || names.some(name => !record.files!.some(file => file.name === name))) throw Error('LOCAL_MODEL_CHANGED')
    for (const file of record.files) {
      if (!/^[A-Za-z0-9._-]+$/.test(file.name) || !allowedNative(file.name, record.variant)) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
      await verifyTransferredFile(path.join(native, file.name), file, signal)
    }
    if (!record.files.some(file => file.name === executableName(record.variant))) throw Error('NATIVE_RUNTIME_EXECUTABLE_MISSING')
    const fingerprint = createHash('sha256').update(JSON.stringify({ release: RELEASE, commit: COMMIT, variant: record.variant,
      platform: target(record.variant), sources: SOURCES[record.variant], files: record.files })).digest('hex')
    if (fingerprint !== record.fingerprint) throw Error('LOCAL_MODEL_CHANGED')
    return { root: native, executable: path.join(native, executableName(record.variant)), variant: record.variant, release: RELEASE, fingerprint, files: record.files }
  }
  async function open(name: string, offset: number, signal: AbortSignal) {
    let url = sourceUrl(name)
    for (let redirect = 0; redirect <= 5; redirect++) {
      assertNativeRuntimeUrl(url)
      const response = await d.fetch(url, { signal, credentials: 'omit', redirect: 'manual',
        headers: { 'Accept-Encoding': 'identity', ...(offset ? { Range: `bytes=${offset}-` } : {}) } })
      if (![301, 302, 303, 307, 308].includes(response.status)) return response
      const location = response.headers.get('location'); await response.body?.cancel()
      if (!location) throw Error('MODEL_SOURCE_REDIRECT_REJECTED')
      url = new URL(location, url).href
    }
    throw Error('MODEL_SOURCE_REDIRECT_REJECTED')
  }
  async function acquire(variant: Variant, signal: AbortSignal) {
    if (`${process.platform}-${process.arch}` !== target(variant)) throw Error('LOCAL_RUNTIME_PLATFORM_UNSUPPORTED')
    await ensureStore()
    let record = read(variant)
    if (record?.state === 'ready') {
      const binding = await verify(record, true, signal)
      if (!record.files!.some(file => file.name === 'LLAMA-LICENSE.txt')) {
        // Upgrade only a fully verified owned package's attribution. No model
        // or user files are adopted, overwritten or granted qualification.
        const bytes = Buffer.from(LLAMA_MIT_NOTICE)
        await fs.writeFile(path.join(binding.root, 'LLAMA-LICENSE.txt'), bytes, { flag: 'wx', mode: 0o600 })
        record.files!.push({ name: 'LLAMA-LICENSE.txt', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
        record.files!.sort((left, right) => left.name.localeCompare(right.name))
        record.fingerprint = createHash('sha256').update(JSON.stringify({ release: RELEASE, commit: COMMIT, variant,
          platform: target(record.variant), sources: SOURCES[variant], files: record.files })).digest('hex')
        save(record)
        return verify(record, true, signal)
      }
      return binding
    }
    if (!record) {
      record = { variant, stage: randomUUID(), state: 'preparing', completedBytes: 0, error: null }
      const directory = childPath(record.stage)
      await fs.mkdir(directory, { mode: 0o700 })
      await fs.writeFile(path.join(directory, MARKER), `${record.stage}:${record.variant}:${COMMIT}`, { flag: 'wx', mode: 0o600 })
    }
    const ownedRecord = record
    save(ownedRecord)
    try {
      if (ownedRecord.intent) {
        try { const binding = await verify(ownedRecord, true, signal); ownedRecord.state = 'ready'; ownedRecord.error = null; save(ownedRecord); return binding }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
        // The durable publish intent means extraction already finished. Verify
        // the exact staged executable set before completing an interrupted rename.
        await verify(ownedRecord, false, signal)
        await fs.rename(await checkedDirectory(ownedRecord), childPath(`${variant}-${RELEASE}`))
        const binding = await verify(ownedRecord, true, signal)
        ownedRecord.state = 'ready'; ownedRecord.error = null; save(ownedRecord)
        return binding
      }
      ownedRecord.state = 'preparing'; ownedRecord.error = null; save(ownedRecord)
      const directory = await checkedDirectory(ownedRecord)
      const disk = await fs.statfs(root)
      if (disk.bavail * disk.bsize < 3 * 1024 ** 3) throw Error('MODEL_DISK_SPACE_INSUFFICIENT')
      let prior = 0
      for (const file of SOURCES[variant]) {
        await transferModelFile({ file, stage: directory, fetch: d.fetch, signal,
          open: (offset, signal) => open(file.name, offset, signal), progress: bytes => {
            ownedRecord.completedBytes = prior + bytes; d.changed()
          } })
        prior += file.bytes; save(ownedRecord)
      }
      // ZIPs have been fully verified again. Reset only this stage's derivative
      // trees, preserving downloaded ZIPs and refusing symlinks/reparse targets.
      const resetOwnedTree = async (name: string) => {
        const target = path.resolve(directory, name)
        if (path.dirname(target) !== directory || !/^(native|payload-[01])$/.test(name)) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
        let count = 0
        const inspect = async (value: string) => {
          const stat = await fs.lstat(value)
          if (++count > 1200) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
          if (stat.isSymbolicLink()) {
            // Mac release aliases are allowed only inside an owned extraction
            // derivative; cleanup unlinks them without following their target.
            const link=await fs.readlink(value),resolved=await fs.realpath(value),relative=path.relative(target,resolved)
            if(!variant.startsWith('macos-')||!name.startsWith('payload-')||! /^[A-Za-z0-9._-]+$/.test(link)||relative.startsWith('..')||path.isAbsolute(relative)||!(await fs.stat(resolved)).isFile())throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
            return
          }
          if (!stat.isDirectory() && !stat.isFile()) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
          if (stat.isDirectory()) for (const entry of await fs.readdir(value)) await inspect(path.join(value, entry))
        }
        try { await inspect(target) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error }
        signal.throwIfAborted()
        await checkedDirectory(ownedRecord)
        await fs.rm(target, { recursive: true })
      }
      await resetOwnedTree('native')
      for (let index = 0; index < SOURCES[variant].length; index++) await resetOwnedTree(`payload-${index}`)
      const native = path.join(directory, 'native')
      await fs.mkdir(native, { mode: 0o700 })
      const nativeStat = await fs.lstat(native)
      if (!nativeStat.isDirectory() || nativeStat.isSymbolicLink()) throw Error('NATIVE_RUNTIME_STORAGE_INVALID')
      for (let index = 0; index < SOURCES[variant].length; index++) {
        signal.throwIfAborted()
        const file = SOURCES[variant][index], extracted = path.join(directory, `payload-${index}`)
        // Every extraction starts from a new owned derivative directory.
        try { await fs.lstat(extracted); throw Error('NATIVE_RUNTIME_EXTRACTION_INTERRUPTED') }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
        await fs.mkdir(extracted, { mode: 0o700 })
        let entries = 0, expanded = 0
        const aliases = new Map<string,string>()
        const names = new Set<string>()
        if (file.name.endsWith('.tar.gz')) {
          let invalidArchive = false
          await tar.t({file:path.join(directory,file.name),onReadEntry(entry) {
            const name=entry.path.replace(/^\.\//,'').replace(/\/$/,'')
            if (++entries>500 || !name || name.length>240 || name.includes('\\') || name.startsWith('/') ||
                name.split('/').some(part=>! /^[A-Za-z0-9._-]+$/.test(part)||part==='.'||part==='..') ||
                !['File','Directory','SymbolicLink'].includes(entry.type) || names.has(name)) invalidArchive = true
            if(entry.type==='SymbolicLink' && (!/^[A-Za-z0-9._-]+$/.test(entry.linkpath??'')||entry.linkpath==='.'||entry.linkpath==='..')) invalidArchive = true
            if(entry.type==='SymbolicLink' && entry.linkpath)aliases.set(name,path.posix.join(path.posix.dirname(name),entry.linkpath))
            names.add(name);expanded+=entry.size
            if(!Number.isSafeInteger(expanded)||expanded>256*1024**2||entry.size>128*1024**2) invalidArchive = true
          }})
          if (invalidArchive) throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
          signal.throwIfAborted()
          // Never materialize links from the archive; flatten validated aliases below.
          await tar.x({file:path.join(directory,file.name),cwd:extracted,strict:true,preservePaths:false,filter:(_name,entry)=>!('type' in entry)||entry.type!=='SymbolicLink'})
        } else {
        await extractZip(path.join(directory, file.name), { dir: extracted, onEntry(entry) {
          signal.throwIfAborted()
          const name = entry.fileName, parts = name.replace(/\/$/, '').split('/')
          const kind = (entry.externalFileAttributes >>> 16) & 0xf000
          if (++entries > 500 || !name || name.length > 240 || name.includes('\\') || name.startsWith('/') ||
            parts.some(part => !/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..' ||
              /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part) || /[. ]$/.test(part)) ||
            names.has(name.toLowerCase()) || (kind && kind !== 0x8000 && kind !== 0x4000) || (entry.generalPurposeBitFlag & 1))
            throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
          names.add(name.toLowerCase()); expanded += entry.uncompressedSize
          if (!Number.isSafeInteger(expanded) || expanded > 3 * 1024 ** 3 || entry.uncompressedSize > 1024 ** 3)
            throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
        } })
        }
        const collect = async (folder: string) => {
          for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
            signal.throwIfAborted()
            const source = path.join(folder, entry.name)
            if (entry.isSymbolicLink()) {
              const resolved=await fs.realpath(source),relative=path.relative(extracted,resolved),stat=await fs.stat(resolved)
              if(!variant.startsWith('macos-')||relative.startsWith('..')||path.isAbsolute(relative)||!stat.isFile()||!allowedNative(entry.name,variant))throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
              await fs.copyFile(resolved,path.join(native,entry.name),fs.constants.COPYFILE_EXCL)
              continue
            }
            if (entry.isDirectory()) await collect(source)
            else if (entry.isFile() && allowedNative(entry.name,variant)) {
              const target = path.join(native, entry.name)
              try { await fs.link(source, target) }
              catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; throw Error('NATIVE_RUNTIME_ARCHIVE_COLLISION') }
            }
          }
        }
        await collect(extracted)
        for(const [alias,target] of aliases) {
          signal.throwIfAborted()
          const base=path.posix.basename(alias)
          if(!allowedNative(base,variant))throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
          let resolved=target;const seen=new Set<string>([alias])
          while(aliases.has(resolved)) {
            if(seen.has(resolved)||seen.size>16)throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
            seen.add(resolved);resolved=aliases.get(resolved)!
          }
          const source=path.resolve(extracted,resolved),relative=path.relative(extracted,source),stat=await fs.lstat(source)
          if(relative.startsWith('..')||path.isAbsolute(relative)||!stat.isFile()||stat.isSymbolicLink())throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
          await fs.copyFile(source,path.join(native,base),fs.constants.COPYFILE_EXCL)
        }
      }
      await fs.writeFile(path.join(native, 'DAM-RUNTIME-NOTICE.txt'), `llama.cpp ${RELEASE} (${COMMIT}), MIT. https://github.com/ggml-org/llama.cpp/blob/${COMMIT}/LICENSE\n${variant !== 'cuda-13.4' ? '' : 'NVIDIA CUDA redistributable DLLs have separate NVIDIA EULA terms: https://docs.nvidia.com/cuda/eula/index.html\n'}Public release digests are not a DAM publisher signature.\n`, { flag: 'wx', mode: 0o600 })
      await fs.writeFile(path.join(native, 'LLAMA-LICENSE.txt'), LLAMA_MIT_NOTICE, { flag: 'wx', mode: 0o600 })
      const files: VisionModelFile[] = []
      for (const name of (await fs.readdir(native)).sort()) {
        const source = path.join(native, name), stat = await fs.lstat(source)
        if (!stat.isFile() || stat.isSymbolicLink()) throw Error('NATIVE_RUNTIME_ARCHIVE_UNSAFE')
        const handle = await fs.open(source, 'r'), hash = createHash('sha256')
        try { for await (const chunk of handle.createReadStream({ autoClose: false })) { signal.throwIfAborted(); hash.update(chunk) } }
        finally { await handle.close() }
        files.push({ name, bytes: stat.size, sha256: hash.digest('hex') })
      }
      if(variant.startsWith('macos-'))await fs.chmod(path.join(native,'llama-server'),0o700)
      ownedRecord.files = files
      ownedRecord.fingerprint = createHash('sha256').update(JSON.stringify({ release: RELEASE, commit: COMMIT, variant,
        platform: target(record.variant), sources: SOURCES[variant], files })).digest('hex')
      ownedRecord.intent = true; save(ownedRecord)
      await verify(ownedRecord, false, signal)
      const published = childPath(`${variant}-${RELEASE}`)
      try { await fs.lstat(published); throw Error('NATIVE_RUNTIME_ARCHIVE_COLLISION') }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      signal.throwIfAborted(); await fs.rename(directory, published)
      const binding = await verify(ownedRecord, true, signal)
      ownedRecord.state = 'ready'; ownedRecord.error = null; save(ownedRecord)
      return binding
    } catch (error) {
      ownedRecord.state = signal.aborted ? 'interrupted' : 'failed'
      ownedRecord.error = error instanceof Error && /^(MODEL|NATIVE|LOCAL)_[A-Z_]+$/.test(error.message) ? error.message : 'NATIVE_RUNTIME_PREPARATION_FAILED'
      save(ownedRecord); throw Error(ownedRecord.error)
    }
  }
  return {
    status() { return { release: RELEASE, state: active ? 'preparing' : last?.state ?? 'unconfigured',
      variant: last?.variant ?? null, completedBytes: last?.completedBytes ?? 0,
      totalBytes: last ? SOURCES[last.variant].reduce((sum, file) => sum + file.bytes, 0) : 0,
      error: last?.error ?? null, installed: (VARIANTS).filter(variant => read(variant)?.state === 'ready') } },
    prepare(variant: Variant, signal: AbortSignal) {
      if (active) throw Error('LOCAL_RUNTIME_BUSY')
      controller = new AbortController()
      const done = acquire(variant, AbortSignal.any([signal, controller.signal])).finally(() => { active = undefined; controller = undefined })
      active = done; return done
    },
    async drain() { controller?.abort(); await active?.catch(() => {}) },
  }
}
export type ManagedGgufPackages = ReturnType<typeof createManagedGgufPackages>
