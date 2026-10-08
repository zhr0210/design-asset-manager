import { createHash } from 'node:crypto'
import type { BigIntStats } from 'node:fs'
import { lstat, opendir, realpath } from 'node:fs/promises'
import path from 'node:path'

import type { LibraryCreationPlanningReason } from './library-creation-planner'
import type { LibraryCreationTargetPlatformAdapter } from
  './library-creation-target-platform.internal'
import { filesystemScopeIdentityFromNode } from './library-filesystem.tracer'

export interface LibraryCreationTargetObservation {
  readonly kind: 'eligible'
  readonly targetState: 'missing' | 'empty'
  readonly scopeIdentity: string
  readonly accessScopeIdentity: string
  readonly targetGeneration: string
  readonly lexicalRoot: string
  readonly canonicalRoot: string
}

type TargetObservation = LibraryCreationTargetObservation |
  Readonly<{ kind: 'blocked'; reason: LibraryCreationPlanningReason }>

class TargetObservationFailure extends Error {
  constructor(readonly reason: LibraryCreationPlanningReason) {
    super('The selected creation target could not be safely observed.')
  }
}

/** Reads only the selected namespace/empty target; never opens file contents. */
export async function observeLibraryCreationTarget(
  targetDirectory: string,
  targetPlatform: LibraryCreationTargetPlatformAdapter
): Promise<TargetObservation> {
  try {
    if (!path.isAbsolute(targetDirectory)) throw new TargetObservationFailure('invalid-target')
    const lexicalRoot = path.resolve(targetDirectory)
    const parent = path.dirname(lexicalRoot)
    const name = path.basename(lexicalRoot)
    if (parent === lexicalRoot || targetPlatform.targetNameIsSupported(name) !== true) {
      throw new TargetObservationFailure('invalid-target')
    }
    const parentChainBefore = await observeOrdinaryAncestorChain(parent)
    const parentBefore = parentChainBefore.node
    const canonicalParent = await realpath(parent)
    const targetBefore = await optionalStat(lexicalRoot)
    let canonicalRoot = path.join(canonicalParent, name)
    if (targetBefore) {
      assertOrdinaryDirectory(targetBefore)
      if (targetBefore.dev !== parentBefore.dev ||
        (targetBefore.ino === parentBefore.ino && targetBefore.dev === parentBefore.dev)) {
        throw new TargetObservationFailure('target-unsafe')
      }
      canonicalRoot = await realpath(lexicalRoot)
      if (path.dirname(canonicalRoot) !== canonicalParent) {
        throw new TargetObservationFailure('target-unsafe')
      }
      const directory = await opendir(canonicalRoot)
      try {
        if (await directory.read()) throw new TargetObservationFailure('target-not-empty')
      } finally {
        await directory.close()
      }
    }
    const targetState = targetBefore ? 'empty' : 'missing'
    await assertPlanningAccess(targetPlatform, targetBefore ? lexicalRoot : parent,
      targetState, targetBefore ?? parentBefore)

    const matchingNames = await matchingNamespaceEntries(canonicalParent, name)
    if ((!targetBefore && matchingNames.length > 0) || matchingNames.length > 1) {
      throw new TargetObservationFailure('target-collision')
    }
    if (targetBefore) {
      if (matchingNames.length !== 1) throw new TargetObservationFailure('target-changed')
      const matched = await lstat(path.join(canonicalParent, matchingNames[0]), { bigint: true })
      if (matched.dev !== targetBefore.dev || matched.ino !== targetBefore.ino) {
        throw new TargetObservationFailure('target-collision')
      }
    }
    const parentChainAfter = await observeOrdinaryAncestorChain(parent)
    const parentAfter = parentChainAfter.node
    const targetAfter = await optionalStat(lexicalRoot)
    if (parentChainBefore.generation !== parentChainAfter.generation ||
      nodeStamp(parentBefore) !== nodeStamp(parentAfter) ||
      nodeStamp(targetBefore) !== nodeStamp(targetAfter) ||
      await realpath(parent) !== canonicalParent ||
      (targetBefore && await realpath(lexicalRoot) !== canonicalRoot)) {
      throw new TargetObservationFailure('target-changed')
    }
    await assertPlanningAccess(targetPlatform, targetAfter ? lexicalRoot : parent,
      targetState, targetAfter ?? parentAfter)
    return Object.freeze({
      kind: 'eligible', targetState,
      lexicalRoot, canonicalRoot,
      scopeIdentity: filesystemScopeIdentityFromNode(parentAfter),
      accessScopeIdentity: accessScopeIdentityFromNode(targetState, targetAfter ?? parentAfter),
      targetGeneration: `target:${createHash('sha256')
        .update(JSON.stringify([canonicalRoot, parentChainAfter.generation, nodeStamp(targetAfter)]))
        .digest('hex')}`
    })
  } catch (error) {
    return { kind: 'blocked', reason: error instanceof TargetObservationFailure
      ? error.reason : 'target-unavailable' }
  }
}

interface AncestorChainObservation {
  readonly node: BigIntStats
  readonly generation: string
}

async function observeOrdinaryAncestorChain(target: string): Promise<AncestorChainObservation> {
  const absolute = path.resolve(target)
  const root = path.parse(absolute).root
  let current = root
  const stamps: string[] = []
  let node = await lstat(current, { bigint: true })
  assertOrdinaryDirectory(node)
  stamps.push(ancestorNodeStamp(node))
  for (const segment of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    node = await lstat(current, { bigint: true })
    assertOrdinaryDirectory(node)
    stamps.push(ancestorNodeStamp(node))
  }
  return Object.freeze({ node, generation: stamps.join('|') })
}

async function assertPlanningAccess(
  targetPlatform: LibraryCreationTargetPlatformAdapter,
  directory: string,
  targetState: LibraryCreationTargetObservation['targetState'],
  stat: BigIntStats
): Promise<void> {
  if (await targetPlatform.inspectAccess(Object.freeze({
    directory, targetState, nodeMode: stat.mode
  })) !== 'read-write') {
    throw new TargetObservationFailure('target-unavailable')
  }
}

function ancestorNodeStamp(stat: BigIntStats): string {
  return [stat.dev, stat.ino, stat.mode, stat.birthtimeNs].map(String).join(':')
}

function accessScopeIdentityFromNode(
  targetState: LibraryCreationTargetObservation['targetState'], stat: BigIntStats
): string {
  return `access:${targetState}:${createHash('sha256').update(nodeStamp(stat) ?? '').digest('hex')}`
}

async function matchingNamespaceEntries(parent: string, targetName: string): Promise<string[]> {
  const matches: string[] = []
  const folded = targetName.normalize('NFC').toLowerCase()
  const directory = await opendir(parent)
  let count = 0
  try {
    for (;;) {
      const entry = await directory.read()
      if (!entry) return matches
      if (++count > 4096) throw new TargetObservationFailure('namespace-not-assessed')
      if (entry.name.normalize('NFC').toLowerCase() === folded) matches.push(entry.name)
    }
  } finally {
    await directory.close()
  }
}

async function optionalStat(target: string): Promise<BigIntStats | undefined> {
  try {
    return await lstat(target, { bigint: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  }
}

function assertOrdinaryDirectory(stat: BigIntStats): void {
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new TargetObservationFailure('target-unsafe')
}

function nodeStamp(stat: BigIntStats | undefined): string | null {
  return stat ? [stat.dev, stat.ino, stat.mode, stat.birthtimeNs, stat.mtimeNs, stat.ctimeNs, stat.size]
    .map(String).join(':') : null
}
