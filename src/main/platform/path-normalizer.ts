import os from 'os'
import path from 'path'

const WINDOWS_ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

export function normalizePath(input: string): string {
  if (!input) return ''
  return path.normalize(input)
}

export function sanitizeFilename(input: string): string {
  const sanitized = input
    .normalize('NFC')
    .replace(WINDOWS_ILLEGAL_FILENAME_CHARS, '_')
    .replace(/[. ]+$/g, '')
    .trim()

  if (!sanitized) return 'untitled'
  if (WINDOWS_RESERVED_NAMES.test(sanitized)) return `_${sanitized}`
  return sanitized
}

export function toPortablePath(input: string): string {
  if (!input) return ''
  const resolved = path.resolve(input)
  const home = path.resolve(os.homedir())
  const relativeToHome = path.relative(home, resolved)

  if (relativeToHome === '') return '~'
  if (relativeToHome && !relativeToHome.startsWith('..') && !path.isAbsolute(relativeToHome)) {
    return ['~', ...relativeToHome.split(path.sep)].join('/')
  }

  return resolved.split(path.sep).join('/')
}

export function fromPortablePath(input: string): string {
  if (!input) return ''
  if (input === '~') return os.homedir()
  if (input.startsWith('~/')) {
    return path.join(os.homedir(), ...input.slice(2).split('/'))
  }
  return path.normalize(input)
}

export function isInsideDirectory(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  return relative === '' || (Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative))
}

export function ensureSafeJoin(root: string, ...parts: string[]): string {
  const resolvedRoot = path.resolve(root)
  const target = path.resolve(resolvedRoot, ...parts)
  if (!isInsideDirectory(resolvedRoot, target)) {
    throw new Error(`Unsafe path join blocked: target is outside managed root.`)
  }
  return target
}
