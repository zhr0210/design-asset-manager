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

export async function ensureDirectoryInsideExistingManagedRoot(
  root: string,
  target: string
): Promise<void> {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)
  assertInsideManagedRoot(resolvedRoot, resolvedTarget)
  await assertRealDirectory(resolvedRoot)
  const realRoot = await fs.realpath(resolvedRoot)

  let current = resolvedRoot
  const segments = path.relative(resolvedRoot, resolvedTarget)
    .split(path.sep)
    .filter(Boolean)
  for (const segment of segments) {
    current = path.join(current, segment)
    try {
      await assertRealDirectory(current)
    } catch (error) {
      if (!isMissingPathError(error)) throw error
      try {
        await fs.mkdir(current)
      } catch (mkdirError) {
        if (!isAlreadyExistsError(mkdirError)) throw mkdirError
      }
      await assertRealDirectory(current)
    }
  }

  const realTarget = await fs.realpath(resolvedTarget)
  assertInsideManagedRoot(realRoot, realTarget)
}

/** Validate an already-created directory role without creating or repairing it. */
export async function assertExistingDirectoryInsideManagedRoot(
  root: string,
  target: string
): Promise<void> {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)
  assertInsideManagedRoot(resolvedRoot, resolvedTarget)
  await assertRealDirectory(resolvedRoot)
  const realRoot = await fs.realpath(resolvedRoot)
  let current = resolvedRoot
  for (const segment of path.relative(resolvedRoot, resolvedTarget).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    await assertRealDirectory(current)
  }
  const realTarget = await fs.realpath(resolvedTarget)
  assertInsideManagedRoot(realRoot, realTarget)
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

async function assertRealDirectory(target: string): Promise<void> {
  const stat = await fs.lstat(target)
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('Managed path contains a symbolic link or non-directory component.')
  }
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function isAlreadyExistsError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST'
}
