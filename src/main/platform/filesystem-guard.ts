import fs from 'fs/promises'
import path from 'path'
import { isInsideDirectory } from './path-normalizer'

export function assertInsideManagedRoot(root: string, target: string): void {
  if (!isInsideDirectory(root, target)) {
    throw new Error(`Path is outside managed root.`)
  }
}

export async function isWritableDirectory(dirPath: string): Promise<boolean> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
    await fs.access(dirPath, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function safeRemoveInsideRoot(root: string, target: string): Promise<void> {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)

  if (resolvedTarget === resolvedRoot) {
    throw new Error(`Refusing to remove managed root itself.`)
  }
  assertInsideManagedRoot(resolvedRoot, resolvedTarget)
  await fs.rm(resolvedTarget, { recursive: true, force: true })
}
