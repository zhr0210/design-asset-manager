import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import type { OpenDialogOptions, OpenDialogReturnValue } from 'electron'
import type { FilePickerEntry, FilePickerSnapshot } from '../../shared/contracts/file-selection.contract'

interface Selection {
  id: string; owner: string; options: OpenDialogOptions; generation: string
  paths: Map<string, string>; directory: string; roots: FilePickerEntry[]
  resolve(result: OpenDialogReturnValue): void; timer: ReturnType<typeof setTimeout>
}

export function createFileSelection(input: {
  syntheticRoot?: string
  generation(): string
  notify(owner: string): void
}) {
  const sessions = new Map<string, Selection>()
  const owned = new Map<string, string>()
  const check = async (candidate: string): Promise<string> => {
    if (typeof candidate !== 'string' || !path.isAbsolute(candidate)) throw Error('请选择绝对目录路径。')
    let root: string | undefined
    if (input.syntheticRoot) {
      root = await fs.realpath(input.syntheticRoot)
      const suppliedRelative = path.relative(root, path.resolve(candidate))
      if (suppliedRelative.startsWith('..') || path.isAbsolute(suppliedRelative)) throw Error('测试模式只能选择合成测试目录。')
      let current = root
      for (const part of suppliedRelative.split(path.sep).filter(Boolean)) {
        current = path.join(current, part)
        if ((await fs.lstat(current)).isSymbolicLink()) throw Error('测试模式不允许使用链接目录或文件。')
      }
    }
    const real = await fs.realpath(candidate)
    if (root) {
      const relative = path.relative(root, real)
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('测试模式只能选择合成测试目录。')
    }
    return real
  }
  const addPath = (session: Selection, file: string) => {
    for (const [id, previous] of session.paths) if (file === previous) return id
    const id = `selection-entry:${randomUUID()}`
    session.paths.set(id, file)
    return id
  }
  const get = (owner: string, id: string) => {
    const session = sessions.get(id)
    if (!session || session.owner !== owner || session.generation !== input.generation()) throw Error('选择已失效，请重新打开选择器。')
    return session
  }
  const finish = (session: Selection, result: OpenDialogReturnValue) => {
    sessions.delete(session.id); owned.delete(session.owner); clearTimeout(session.timer)
    session.resolve(result)
    input.notify(session.owner)
  }
  const snapshot = async (session: Selection): Promise<FilePickerSnapshot> => {
    const directory = await check(session.directory)
    const files = await fs.readdir(directory, { withFileTypes: true })
    const extensions = new Set(session.options.filters?.flatMap(filter => filter.extensions.map(extension => extension.toLowerCase())) ?? [])
    const matching = files.filter(file => !file.isSymbolicLink() && (file.isDirectory() || (file.isFile() && (extensions.size === 0 || extensions.has('*') || extensions.has(path.extname(file.name).slice(1).toLowerCase())))))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
    const entries = matching.slice(0, 2000).map(file => ({ id: addPath(session, path.join(directory, file.name)), name: file.name, kind: file.isDirectory() ? 'directory' as const : 'file' as const }))
    const parent = path.dirname(directory)
    const canParent = parent !== directory && (!input.syntheticRoot || directory !== await fs.realpath(input.syntheticRoot))
    return { id: session.id, title: session.options.title ?? '选择本机文件', mode: session.options.properties?.includes('openDirectory') ? 'directory' : 'files', multiple: session.options.properties?.includes('multiSelections') ?? false,
      directory, directoryId: addPath(session, directory), parentId: canParent ? addPath(session, parent) : null, roots: session.roots, entries, truncated: matching.length > entries.length }
  }
  return Object.freeze({
    async select(owner: string, options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
      if (owned.has(owner)) throw Error('请先完成或取消当前文件选择。')
      const rootPaths: string[] = input.syntheticRoot ? [await check(input.syntheticRoot)] : process.platform === 'win32'
        ? (await Promise.all('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(async drive => { const candidate = `${drive}:\\`; try { await fs.access(candidate); return candidate } catch { return null } }))).filter((value): value is string => value !== null)
        : [os.homedir(), '/']
      if (!rootPaths.length) throw Error('没有可访问的本机目录。')
      let directory = rootPaths[0]
      if (options.defaultPath) { try { const candidate = await check(options.defaultPath); if ((await fs.stat(candidate)).isDirectory()) directory = candidate } catch { /* Keep the allowed initial root. */ } }
      return new Promise(resolve => {
        const session: Selection = { id: `file-selection:${randomUUID()}`, owner, options, generation: input.generation(), paths: new Map(), directory, roots: [], resolve,
          timer: setTimeout(() => finish(session, { canceled: true, filePaths: [] }), 10 * 60_000) }
        session.roots = rootPaths.map(root => ({ id: addPath(session, root), name: input.syntheticRoot ? '合成测试目录' : root, kind: 'directory' }))
        sessions.set(session.id, session); owned.set(owner, session.id)
        input.notify(owner)
      })
    },
    async pending(owner: string) { const id = owned.get(owner); return id ? snapshot(get(owner, id)) : null },
    async browse(owner: string, request: { session: string; entry?: string; path?: string }) {
      if (!request || typeof request.session !== 'string' || Object.keys(request).some(key => !['session', 'entry', 'path'].includes(key)) || (request.entry === undefined) === (request.path === undefined)) throw Error('请选择一个目录。')
      const session = get(owner, request.session)
      const target = request.entry !== undefined ? session.paths.get(request.entry) : request.path
      if (!target) throw Error('目录不可用。')
      const real = await check(target)
      if (!(await fs.stat(real)).isDirectory()) throw Error('该位置不是文件夹。')
      session.directory = real
      return snapshot(session)
    },
    async createDirectory(owner: string, request: { session: string; name: string }) {
      if (!request || Object.keys(request).sort().join() !== 'name,session' || typeof request.name !== 'string' || !request.name.trim() || request.name.length > 128 || /[<>:"/\\|?*\x00-\x1f]/.test(request.name) || /[. ]$/.test(request.name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(request.name)) throw Error('请输入有效的新文件夹名称。')
      const session = get(owner, request.session)
      const directory = await check(session.directory)
      await fs.mkdir(path.join(directory, request.name), { recursive: false })
      return snapshot(session)
    },
    async confirm(owner: string, request: { session: string; entries: string[] }) {
      if (!request || Object.keys(request).sort().join() !== 'entries,session' || !Array.isArray(request.entries) || !request.entries.length || request.entries.length > 500 || new Set(request.entries).size !== request.entries.length) throw Error('请选择文件或文件夹。')
      const session = get(owner, request.session)
      if (!session.options.properties?.includes('multiSelections') && request.entries.length !== 1) throw Error('本次只能选择一个位置。')
      const paths: string[] = []
      for (const entry of request.entries) {
        const candidate = session.paths.get(entry)
        if (!candidate) throw Error('所选位置已失效。')
        const real = await check(candidate)
        const stat = await fs.stat(real)
        if (session.options.properties?.includes('openDirectory') ? !stat.isDirectory() : !stat.isFile()) throw Error('所选类型不符合本次用途。')
        paths.push(real)
      }
      get(owner, request.session)
      finish(session, { canceled: false, filePaths: paths })
      return { success: true }
    },
    cancel(owner: string, id: string) { finish(get(owner, id), { canceled: true, filePaths: [] }); return { success: true } },
    revoke(owner: string) { for (const session of [...sessions.values()]) if (session.owner === owner) finish(session, { canceled: true, filePaths: [] }) },
    cancelAll() { for (const session of [...sessions.values()]) finish(session, { canceled: true, filePaths: [] }) }
  })
}
