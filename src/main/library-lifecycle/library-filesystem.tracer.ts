import type { BigIntStats } from 'node:fs'
import { lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import { createLibraryStartTracer } from './library-start.tracer'
import { readExactPlainDataRecord } from './plain-data-record.internal'

export interface LibraryFilesystemQualificationAdapter {
  inspect(input: Readonly<{
    platform: NodeJS.Platform
    scopeIdentity: string
  }>): unknown | Promise<unknown>
}

export interface LibraryFilesystemTracerInput {
  libraryRootDirectory: string
  libraryControlDirectory: string
  managedOriginalsDirectory: string
  qualification: LibraryFilesystemQualificationAdapter
}

/** Main-only read tracer; not exported from the Library Lifecycle barrel. */
export function createLibraryFilesystemTracer(input: LibraryFilesystemTracerInput) {
  return createLibraryStartTracer({ observe: () => inspectFilesystem(input) })
}

const invalidFilesystem = Symbol('invalid-library-filesystem')
const PORTABLE_ROLE_BUDGET = 200
const WINDOWS_ABSOLUTE_BUDGET = 240

interface NodeIdentity {
  dev: bigint
  ino: bigint
  mode: bigint
  birthtimeNs: bigint
}

interface RoleObservation {
  lexical: string
  real: string
  node: NodeIdentity
}

export interface LibraryFilesystemObservation {
  root: RoleObservation
  control: RoleObservation
  managed: RoleObservation
}

async function inspectFilesystem(
  input: LibraryFilesystemTracerInput
): Promise<Readonly<{ kind: string }>> {
  let first: LibraryFilesystemObservation
  try {
    first = await observeLibraryFilesystemRoles(input)
  } catch (error) {
    return { kind: error === invalidFilesystem ? 'filesystem-invalid' : 'unavailable' }
  }

  const scopeIdentity = libraryFilesystemScopeIdentity(first)
  let qualification: unknown
  try {
    qualification = await input.qualification.inspect({
      platform: process.platform,
      scopeIdentity
    })
  } catch {
    qualification = { kind: 'not-assessed' }
  }

  let second: LibraryFilesystemObservation
  try {
    second = await observeLibraryFilesystemRoles(input)
  } catch {
    return { kind: 'filesystem-invalid' }
  }
  if (!sameLibraryFilesystemObservation(first, second)) return { kind: 'filesystem-invalid' }

  return classifyLibraryFilesystemQualification(first, qualification, scopeIdentity)
}

/** Main-internal role evidence shared by the composed inspection Tracer. */
export async function observeLibraryControlBoundary(
  rootDirectory: string,
  controlDirectory: string
): Promise<Pick<LibraryFilesystemObservation, 'root' | 'control'>> {
  const root = resolveAbsolute(rootDirectory)
  const control = resolveAbsolute(controlDirectory)
  if (!root || !control || !isStrictInside(root, control)) throw invalidFilesystem
  const rootObservation = await observeRole(root, root)
  const controlObservation = await observeRole(root, control)
  if (!isStrictInside(rootObservation.real, controlObservation.real) ||
    controlObservation.node.dev !== rootObservation.node.dev ||
    samePhysicalNode(rootObservation.node, controlObservation.node)) throw invalidFilesystem
  return { root: rootObservation, control: controlObservation }
}

export async function observeLibraryFilesystemRoles(
  input: Pick<LibraryFilesystemTracerInput,
    'libraryRootDirectory' | 'libraryControlDirectory' | 'managedOriginalsDirectory'>
): Promise<LibraryFilesystemObservation> {
  const root = resolveAbsolute(input.libraryRootDirectory)
  const control = resolveAbsolute(input.libraryControlDirectory)
  const managed = resolveAbsolute(input.managedOriginalsDirectory)
  if (!root || !control || !managed || !isStrictInside(root, control) ||
    !isStrictInside(root, managed) || pathsOverlap(control, managed)) throw invalidFilesystem

  const { root: rootObservation, control: controlObservation } =
    await observeLibraryControlBoundary(root, control)
  const managedObservation = await observeRole(root, managed)
  if (!isStrictInside(rootObservation.real, controlObservation.real) ||
    !isStrictInside(rootObservation.real, managedObservation.real) ||
    pathsOverlap(controlObservation.real, managedObservation.real) ||
    portablePathsOverlap(controlObservation.real, managedObservation.real) ||
    samePhysicalNode(rootObservation.node, controlObservation.node) ||
    samePhysicalNode(rootObservation.node, managedObservation.node) ||
    controlObservation.node.dev !== rootObservation.node.dev ||
    managedObservation.node.dev !== rootObservation.node.dev ||
    samePhysicalNode(controlObservation.node, managedObservation.node)) throw invalidFilesystem
  return { root: rootObservation, control: controlObservation, managed: managedObservation }
}

function resolveAbsolute(value: unknown): string | undefined {
  if (typeof value !== 'string' || !path.isAbsolute(value)) return undefined
  return path.resolve(value)
}

async function observeRole(root: string, target: string): Promise<RoleObservation> {
  let current = root
  const rootStat = await assertOrdinaryDirectory(current)
  for (const segment of path.relative(root, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    const component = await assertOrdinaryDirectory(current)
    if (component.dev !== rootStat.dev) throw invalidFilesystem
  }
  const before = target === root ? rootStat : await assertOrdinaryDirectory(target)
  const real = await realpath(target)
  const after = await assertOrdinaryDirectory(target)
  if (!sameNode(toNode(before), toNode(after))) throw invalidFilesystem
  return { lexical: target, real: path.resolve(real), node: toNode(after) }
}

async function assertOrdinaryDirectory(target: string): Promise<BigIntStats> {
  const stat = await lstat(target, { bigint: true })
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw invalidFilesystem
  return stat
}

function toNode(stat: BigIntStats): NodeIdentity {
  return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    birthtimeNs: stat.birthtimeNs
  }
}

function sameNode(left: NodeIdentity, right: NodeIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino &&
    left.mode === right.mode && left.birthtimeNs === right.birthtimeNs
}

function samePhysicalNode(left: NodeIdentity, right: NodeIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino
}

export function sameLibraryFilesystemObservation(
  left: LibraryFilesystemObservation,
  right: LibraryFilesystemObservation
): boolean {
  return (['root', 'control', 'managed'] as const).every((role) =>
    left[role].lexical === right[role].lexical &&
    left[role].real === right[role].real && sameNode(left[role].node, right[role].node))
}

function isStrictInside(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target))
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function pathsOverlap(left: string, right: string): boolean {
  const resolvedLeft = path.resolve(left)
  const resolvedRight = path.resolve(right)
  return resolvedLeft === resolvedRight || isStrictInside(resolvedLeft, resolvedRight) ||
    isStrictInside(resolvedRight, resolvedLeft)
}

function portablePathsOverlap(left: string, right: string): boolean {
  return pathsOverlap(
    path.resolve(left).normalize('NFC').toLowerCase(),
    path.resolve(right).normalize('NFC').toLowerCase()
  )
}

export function libraryFilesystemScopeIdentity(observation: LibraryFilesystemObservation): string {
  return filesystemScopeIdentityFromNode(observation.root.node)
}

export function filesystemScopeIdentityFromNode(
  node: Readonly<{ dev: bigint; ino: bigint; birthtimeNs: bigint }>
): string {
  return `scope:${node.dev.toString(16)}:${node.ino.toString(16)}:${node.birthtimeNs.toString(16)}`
}

export interface LibraryFilesystemPathLimits {
  readonly maxComponentUtf8Bytes: number
  readonly maxCompletePathUtf16Units: number
}

export type LibraryFilesystemQualification =
  | Readonly<{ kind: 'qualified'; limits: LibraryFilesystemPathLimits }>
  | Readonly<{ kind: 'unsupported' | 'not-assessed' }>

export function classifyLibraryFilesystemQualification(
  observation: LibraryFilesystemObservation,
  value: unknown,
  scopeIdentity: string
): Readonly<{ kind: string }> {
  const qualification = readLibraryFilesystemQualification(value, scopeIdentity)
  if (qualification.kind !== 'qualified') return {
    kind: qualification.kind === 'unsupported'
      ? 'filesystem-unsupported' : 'filesystem-capability-not-assessed'
  }
  return {
    kind: libraryPathsHaveHeadroom(observation.root,
      [observation.control, observation.managed], qualification.limits)
      ? 'filesystem-observed' : 'filesystem-unsupported'
  }
}

/** Pure qualification parsing shared by observation and creation planning. */
export function readLibraryFilesystemQualification(
  value: unknown,
  scopeIdentity: string
): LibraryFilesystemQualification {
  const simple = readExactPlainDataRecord(value, ['kind'])
  if (simple?.kind === 'unsupported') return { kind: 'unsupported' }
  if (simple?.kind === 'not-assessed') return { kind: 'not-assessed' }

  const profile = readExactPlainDataRecord(value, [
    'kind', 'scopeIdentity', 'maxComponentUtf8Bytes', 'maxCompletePathUtf16Units',
    'atomicReplace', 'durableCommit', 'mountBoundary'
  ])
  if (!profile || profile.kind !== 'qualified' || profile.scopeIdentity !== scopeIdentity ||
    !positiveInteger(profile.maxComponentUtf8Bytes, 4096) ||
    !positiveInteger(profile.maxCompletePathUtf16Units, 1_000_000) ||
    !capabilityState(profile.atomicReplace) || !capabilityState(profile.durableCommit) ||
    !capabilityState(profile.mountBoundary)) {
    return { kind: 'not-assessed' }
  }
  if (profile.atomicReplace === 'unsupported' || profile.durableCommit === 'unsupported' ||
    profile.mountBoundary === 'unsupported') {
    return { kind: 'unsupported' }
  }
  if (profile.atomicReplace === 'not-assessed' || profile.durableCommit === 'not-assessed' ||
    profile.mountBoundary === 'not-assessed') {
    return { kind: 'not-assessed' }
  }
  return Object.freeze({ kind: 'qualified', limits: Object.freeze({
    maxComponentUtf8Bytes: Number(profile.maxComponentUtf8Bytes),
    maxCompletePathUtf16Units: Number(profile.maxCompletePathUtf16Units)
  }) })
}

function positiveInteger(value: unknown, maximum: number): boolean {
  return Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= maximum
}

function capabilityState(value: unknown): boolean {
  return value === 'qualified' || value === 'unsupported' || value === 'not-assessed'
}

/** Measurement only: planned paths here are never claimed to physically exist. */
export function libraryPathsHaveHeadroom(
  root: Readonly<{ lexical: string; real: string }>,
  paths: ReadonlyArray<Readonly<{ lexical: string; real: string }>>,
  limits: LibraryFilesystemPathLimits
): boolean {
  const encoder = new TextEncoder()
  for (const role of paths) {
    const componentSets = [
      path.relative(root.lexical, role.lexical),
      path.relative(root.real, role.real)
    ].map((relative) => relative.split(path.sep).filter(Boolean)
      .map((part) => part.normalize('NFC')))
    if (componentSets.some((components) => {
      const portable = components.join('/')
      return encoder.encode(portable).byteLength > PORTABLE_ROLE_BUDGET ||
        portable.length > PORTABLE_ROLE_BUDGET ||
        components.some((part) => encoder.encode(part).byteLength > limits.maxComponentUtf8Bytes)
    }) ||
      role.real.normalize('NFC').length > limits.maxCompletePathUtf16Units ||
      (process.platform === 'win32' && role.real.normalize('NFC').length > WINDOWS_ABSOLUTE_BUDGET)) {
      return false
    }
  }
  return true
}
