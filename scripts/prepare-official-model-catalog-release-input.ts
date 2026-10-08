import fs from 'node:fs/promises'
import path from 'node:path'

import { prepareOfficialModelCatalogReleaseInput } from
  '../src/main/model-library-workspace/official-model-catalog-release-preparation'

const MAX_TRUST_ROOT_BYTES = 64 * 1024
const MAX_CATALOG_BUNDLE_BYTES = 8 * 1024 * 1024
const RESERVED_RELEASE_INPUT_FILE_NAME =
  'official-model-catalog.release-input.json'

type PreparationFailureReason =
  | 'ARGUMENT_INVALID'
  | 'TRUST_ROOT_INPUT_INVALID'
  | 'CATALOG_BUNDLE_INPUT_INVALID'
  | 'OUTPUT_PARENT_UNSAFE'
  | 'OUTPUT_RESERVED'
  | 'OUTPUT_EXISTS'
  | 'OUTPUT_WRITE_FAILED'
  | 'RELEASE_INPUT_INVALID'
  | 'CATALOG_ROOT_UNRECOGNIZED'
  | 'CATALOG_SIGNATURE_INVALID'
  | 'CATALOG_SCHEMA_REJECTED'
  | 'CATALOG_POLICY_REJECTED'
  | 'CATALOG_RELEASE_PIN_REJECTED'
  | 'RELEASE_INPUT_MISSING'

class PreparationFailure extends Error {
  constructor(readonly reason: PreparationFailureReason) {
    super(reason)
  }
}

process.exitCode = await prepareReleaseInputCommand()

async function prepareReleaseInputCommand(): Promise<number> {
  try {
    const options = parseArgs(process.argv.slice(2))
    const pinnedTrustRoot = await readBoundedJson(
      options['trust-root'],
      MAX_TRUST_ROOT_BYTES,
      'TRUST_ROOT_INPUT_INVALID'
    )
    const bundledCatalog = await readBoundedJson(
      options.bundle,
      MAX_CATALOG_BUNDLE_BYTES,
      'CATALOG_BUNDLE_INPUT_INVALID'
    )
    const prepared = prepareOfficialModelCatalogReleaseInput({
      pinnedTrustRoot,
      bundledCatalog
    })
    if (prepared.state === 'blocked') {
      throw new PreparationFailure(prepared.reason)
    }
    await writeNewCandidate(options.output, prepared.candidate)
    console.log(JSON.stringify({
      schemaVersion: 1,
      source: 'official-model-catalog-release-preparation',
      state: 'ready',
      catalogId: prepared.summary.catalogId,
      sequence: prepared.summary.sequence,
      familyCount: prepared.summary.familyCount,
      checkpointCount: prepared.summary.checkpointCount,
      variantCount: prepared.summary.variantCount,
      candidateWritten: true
    }))
    return 0
  } catch (error) {
    const reason = error instanceof PreparationFailure
      ? error.reason
      : 'RELEASE_INPUT_INVALID'
    console.log(JSON.stringify({
      schemaVersion: 1,
      source: 'official-model-catalog-release-preparation',
      state: 'blocked',
      reason,
      candidateWritten: false
    }))
    return 1
  }
}

function parseArgs(args: string[]): Record<
  'trust-root' | 'bundle' | 'output',
  string
> {
  const allowed = new Set(['trust-root', 'bundle', 'output'])
  const parsed: Record<string, string> = {}
  for (const argument of args) {
    const match = /^--([^=]+)=(.+)$/.exec(argument)
    if (!match || !allowed.has(match[1]) || match[1] in parsed) {
      throw new PreparationFailure('ARGUMENT_INVALID')
    }
    parsed[match[1]] = match[2]
  }
  if (
    Object.keys(parsed).length !== 3 ||
    !parsed['trust-root'] ||
    !parsed.bundle ||
    !parsed.output
  ) throw new PreparationFailure('ARGUMENT_INVALID')
  return parsed as Record<'trust-root' | 'bundle' | 'output', string>
}

async function readBoundedJson(
  file: string,
  maximumBytes: number,
  reason: Extract<
    PreparationFailureReason,
    'TRUST_ROOT_INPUT_INVALID' | 'CATALOG_BUNDLE_INPUT_INVALID'
  >
): Promise<unknown> {
  let handle: fs.FileHandle | undefined
  try {
    const target = path.resolve(file)
    const before = await fs.lstat(target, { bigint: true })
    if (
      !before.isFile() ||
      before.isSymbolicLink() ||
      before.size <= 0n ||
      before.size > BigInt(maximumBytes)
    ) throw new PreparationFailure(reason)
    handle = await fs.open(target, 'r')
    const opened = await handle.stat({ bigint: true })
    if (!sameFile(before, opened)) throw new PreparationFailure(reason)
    const text = await handle.readFile('utf8')
    const after = await handle.stat({ bigint: true })
    if (
      !sameFile(opened, after) ||
      Buffer.byteLength(text, 'utf8') !== Number(after.size)
    ) throw new PreparationFailure(reason)
    return JSON.parse(text) as unknown
  } catch (error) {
    if (error instanceof PreparationFailure) throw error
    throw new PreparationFailure(reason)
  } finally {
    try { await handle?.close() } catch { /* Input is read-only and revoked. */ }
  }
}

async function writeNewCandidate(file: string, candidate: unknown): Promise<void> {
  const requested = path.resolve(file)
  if (path.basename(requested) === RESERVED_RELEASE_INPUT_FILE_NAME) {
    throw new PreparationFailure('OUTPUT_RESERVED')
  }
  const requestedParent = path.dirname(requested)
  let handle: fs.FileHandle | undefined
  let owned: { readonly device: bigint; readonly inode: bigint } | undefined
  let target = requested
  try {
    const requestedParentStat = await fs.lstat(requestedParent, {
      bigint: true
    })
    if (
      !requestedParentStat.isDirectory() ||
      requestedParentStat.isSymbolicLink()
    ) throw new PreparationFailure('OUTPUT_PARENT_UNSAFE')
    const realParent = await fs.realpath(requestedParent)
    const parentStat = await fs.lstat(realParent, { bigint: true })
    if (
      !parentStat.isDirectory() ||
      parentStat.isSymbolicLink() ||
      parentStat.dev !== requestedParentStat.dev ||
      parentStat.ino !== requestedParentStat.ino
    ) {
      throw new PreparationFailure('OUTPUT_PARENT_UNSAFE')
    }
    target = path.join(realParent, path.basename(requested))
    handle = await fs.open(target, 'wx', 0o600)
    const created = await handle.stat({ bigint: true })
    if (!created.isFile()) throw new PreparationFailure('OUTPUT_WRITE_FAILED')
    owned = { device: created.dev, inode: created.ino }
    if (!await outputBindingStillHeld(
      realParent,
      parentStat,
      target,
      owned
    )) throw new PreparationFailure('OUTPUT_PARENT_UNSAFE')
    await handle.writeFile(
      `${JSON.stringify(candidate, null, 2)}\n`,
      'utf8'
    )
    await handle.sync()
    const completed = await handle.stat({ bigint: true })
    if (
      completed.dev !== owned.device ||
      completed.ino !== owned.inode ||
      !await outputBindingStillHeld(
        realParent,
        parentStat,
        target,
        owned
      )
    ) throw new PreparationFailure('OUTPUT_WRITE_FAILED')
    await handle.close()
    handle = undefined
    owned = undefined
  } catch (error) {
    try { await handle?.close() } catch { /* Exact owned cleanup follows. */ }
    if (owned) await removeOwnedFile(target, owned)
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'EEXIST'
    ) throw new PreparationFailure('OUTPUT_EXISTS')
    if (error instanceof PreparationFailure) throw error
    throw new PreparationFailure('OUTPUT_PARENT_UNSAFE')
  }
}

async function outputBindingStillHeld(
  parent: string,
  expectedParent: {
    readonly dev: bigint
    readonly ino: bigint
    isDirectory(): boolean
    isSymbolicLink(): boolean
  },
  target: string,
  owned: { readonly device: bigint; readonly inode: bigint }
): Promise<boolean> {
  try {
    const currentParent = await fs.lstat(parent, { bigint: true })
    const currentTarget = await fs.lstat(target, { bigint: true })
    return currentParent.isDirectory() &&
      !currentParent.isSymbolicLink() &&
      currentParent.dev === expectedParent.dev &&
      currentParent.ino === expectedParent.ino &&
      currentTarget.isFile() &&
      !currentTarget.isSymbolicLink() &&
      currentTarget.dev === owned.device &&
      currentTarget.ino === owned.inode
  } catch {
    return false
  }
}

async function removeOwnedFile(
  file: string,
  owned: { readonly device: bigint; readonly inode: bigint }
): Promise<void> {
  try {
    const current = await fs.lstat(file, { bigint: true })
    if (
      current.isFile() &&
      !current.isSymbolicLink() &&
      current.dev === owned.device &&
      current.ino === owned.inode
    ) await fs.unlink(file)
  } catch {
    // Never remove a path whose exact task ownership is not proven.
  }
}

function sameFile(
  left: Awaited<ReturnType<fs.FileHandle['stat']>>,
  right: Awaited<ReturnType<fs.FileHandle['stat']>>
): boolean {
  return left.isFile() &&
    right.isFile() &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size
}
