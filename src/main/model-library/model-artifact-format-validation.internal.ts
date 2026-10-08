import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs/promises'

export interface ModelArtifactPackageValidationFile {
  readonly relativePath: string
  readonly role: string
  readonly format: string
  readonly sizeBytes: number
  readonly readableFile: string
  /** Large tokenizer vocabularies have more nodes than small configuration files. */
  readonly jsonNodeLimit?: number
  readonly sentencePieceEntryLimit?: number
  readonly ggufExpectedArchitecture?: 'qwen3vl' | 'clip'
}

export interface ModelArtifactPackageValidationInput {
  readonly files: readonly ModelArtifactPackageValidationFile[]
}

interface OnnxExternalTensorReference {
  readonly location: string
  readonly offset: number
  readonly length: number
}

interface OnnxTensorValidation {
  readonly name: string
  readonly externalReference?: OnnxExternalTensorReference
}

interface OnnxValidation {
  readonly externalReferences: readonly OnnxExternalTensorReference[]
}

const MAX_STRUCTURED_FILE_BYTES = 16 * 1024 * 1024
const MAX_SAFETENSORS_HEADER_BYTES = 16 * 1024 * 1024
const MAX_CONTAINER_ENTRIES = 100_000
const MAX_CONTAINER_DEPTH = 64
const MAX_NAME_BYTES = 4_096
const MAX_GGUF_METADATA = 1_024
const MAX_GGUF_TENSORS = 4_096
const MAX_GGUF_DIMENSIONS = 8
const MAX_GGUF_ALIGNMENT = 4_096
const MAX_GGUF_ARRAY_ENTRIES = 300_000 // Qwen tokenizer vocab is larger than 100k.
const MAX_GGUF_HEADER_BYTES = 32 * 1024 * 1024

const SAFE_TENSOR_DTYPES = new Map<string, number>([
  ['BOOL', 1], ['U8', 1], ['I8', 1], ['F8_E4M3', 1], ['F8_E5M2', 1],
  ['I16', 2], ['U16', 2], ['F16', 2], ['BF16', 2],
  ['I32', 4], ['U32', 4], ['F32', 4],
  ['I64', 8], ['U64', 8], ['F64', 8]
])

const GGML_TYPES = new Map<number, { readonly blockElements: number; readonly blockBytes: number }>([
  [0, { blockElements: 1, blockBytes: 4 }],
  [1, { blockElements: 1, blockBytes: 2 }],
  [2, { blockElements: 32, blockBytes: 18 }],
  [3, { blockElements: 32, blockBytes: 20 }],
  [6, { blockElements: 32, blockBytes: 22 }],
  [7, { blockElements: 32, blockBytes: 24 }],
  [8, { blockElements: 32, blockBytes: 34 }],
  [9, { blockElements: 32, blockBytes: 40 }],
  [10, { blockElements: 256, blockBytes: 84 }],
  [11, { blockElements: 256, blockBytes: 110 }],
  [12, { blockElements: 256, blockBytes: 144 }],
  [13, { blockElements: 256, blockBytes: 176 }],
  [14, { blockElements: 256, blockBytes: 210 }],
  [15, { blockElements: 256, blockBytes: 292 }],
  [16, { blockElements: 256, blockBytes: 66 }],
  [17, { blockElements: 256, blockBytes: 74 }],
  [18, { blockElements: 256, blockBytes: 98 }],
  [19, { blockElements: 256, blockBytes: 50 }],
  [20, { blockElements: 32, blockBytes: 18 }],
  [21, { blockElements: 256, blockBytes: 110 }],
  [22, { blockElements: 256, blockBytes: 82 }],
  [23, { blockElements: 256, blockBytes: 136 }],
  [24, { blockElements: 1, blockBytes: 1 }],
  [25, { blockElements: 1, blockBytes: 2 }],
  [26, { blockElements: 1, blockBytes: 4 }],
  [27, { blockElements: 1, blockBytes: 8 }],
  [28, { blockElements: 1, blockBytes: 8 }],
  [29, { blockElements: 256, blockBytes: 56 }],
  [30, { blockElements: 1, blockBytes: 2 }]
])

const ONNX_TENSOR_ELEMENT_BYTES = new Map<number, number>([
  [1, 4], [2, 1], [3, 1], [4, 2], [5, 2], [6, 4], [7, 8], [9, 1],
  [10, 2], [11, 8], [12, 4], [13, 8], [16, 2]
])

/** @internal Bounded, non-executing validation for one exact admitted package. */
export async function validateModelArtifactPackage(
  input: ModelArtifactPackageValidationInput
): Promise<boolean> {
  try {
    if (!Array.isArray(input.files) || input.files.length === 0) return false
    const byRelativePath = new Map<string, ModelArtifactPackageValidationFile>()
    const externalReferences = new Map<string, OnnxExternalTensorReference[]>()
    for (const file of input.files) {
      if (
        !Number.isSafeInteger(file.sizeBytes) ||
        file.sizeBytes <= 0 ||
        byRelativePath.has(file.relativePath)
      ) return false
      if (!await isExactRegularFileNoFollow(file.readableFile, file.sizeBytes)) return false
      byRelativePath.set(file.relativePath, file)
    }

    for (const file of input.files) {
      if (file.format === 'binary') continue
      if (file.format === 'onnx') {
        const validation = validateOnnx(
          await readBoundedFile(file.readableFile, file.sizeBytes),
          file.relativePath
        )
        if (!validation) return false
        for (const reference of validation.externalReferences) {
          const current = externalReferences.get(reference.location) ?? []
          current.push(reference)
          externalReferences.set(reference.location, current)
        }
        continue
      }
      if (!await validateSingleFile(file)) return false
    }

    for (const file of input.files) {
      if (file.format !== 'binary') continue
      if (file.role !== 'onnx-external-data') return false
      const references = externalReferences.get(file.relativePath)
      if (!references || !referencesExactlyCoverFile(references, file.sizeBytes)) return false
      externalReferences.delete(file.relativePath)
    }
    return externalReferences.size === 0
  } catch {
    return false
  }
}

async function validateSingleFile(file: ModelArtifactPackageValidationFile): Promise<boolean> {
  switch (file.format) {
    case 'safetensors': return validateSafeTensors(file.readableFile, file.sizeBytes)
    case 'gguf': return validateGguf(file.readableFile, file.sizeBytes, file.ggufExpectedArchitecture)
    case 'json': return validateJson(await readBoundedFile(file.readableFile, file.sizeBytes), file.jsonNodeLimit)
    case 'text': return validateText(await readBoundedFile(file.readableFile, file.sizeBytes))
    case 'sentencepiece': return validateSentencePiece(
      await readBoundedFile(file.readableFile, file.sizeBytes),file.sentencePieceEntryLimit
    )
    default: return false
  }
}

function referencesExactlyCoverFile(
  references: readonly OnnxExternalTensorReference[],
  sizeBytes: number
): boolean {
  const ordered = [...references].sort((left, right) => left.offset - right.offset)
  let cursor = 0
  for (const reference of ordered) {
    if (reference.length <= 0 || reference.offset !== cursor) return false
    cursor = safeAdd(cursor, reference.length)
  }
  return cursor === sizeBytes
}

async function readBoundedFile(stagedFile: string, sizeBytes: number): Promise<Buffer> {
  if (sizeBytes > MAX_STRUCTURED_FILE_BYTES) throw new Error('Structured fixture exceeds bound.')
  const handle = await openExactRegularFileNoFollow(stagedFile, sizeBytes)
  try {
    const bytes = Buffer.alloc(sizeBytes)
    if (!await readExactly(handle, bytes, 0)) {
      throw new Error('Staged file changed during validation.')
    }
    return bytes
  } finally {
    await handle.close()
  }
}

async function validateSafeTensors(stagedFile: string, sizeBytes: number): Promise<boolean> {
  if (sizeBytes < 13) return false
  const handle = await openExactRegularFileNoFollow(stagedFile, sizeBytes)
  try {
    const prefix = Buffer.alloc(8)
    if (!await readExactly(handle, prefix, 0)) return false
    const headerLengthValue = prefix.readBigUInt64LE(0)
    if (
      headerLengthValue === 0n ||
      headerLengthValue > BigInt(MAX_SAFETENSORS_HEADER_BYTES) ||
      headerLengthValue > BigInt(sizeBytes - 8)
    ) return false
    const headerLength = Number(headerLengthValue)
    const headerBytes = Buffer.alloc(headerLength)
    if (!await readExactly(handle, headerBytes, 8)) return false
    const parsed = parseStrictJson(headerBytes)
    if (!isPlainRecord(parsed)) return false

    const dataLength = sizeBytes - 8 - headerLength
    const ranges: Array<{ start: number; end: number }> = []
    let tensorCount = 0
    for (const [name, descriptor] of Object.entries(parsed)) {
      if (name === '__metadata__') {
        if (!isPlainRecord(descriptor)) return false
        if (Object.values(descriptor).some((value) => typeof value !== 'string')) return false
        continue
      }
      if (utf8Length(name) === 0 || utf8Length(name) > MAX_NAME_BYTES || !isPlainRecord(descriptor)) {
        return false
      }
      if (!hasExactKeys(descriptor, ['data_offsets', 'dtype', 'shape'])) return false
      if (typeof descriptor.dtype !== 'string') return false
      const dtypeBytes = SAFE_TENSOR_DTYPES.get(descriptor.dtype)
      const shape = descriptor.shape
      const offsets = descriptor.data_offsets
      if (!dtypeBytes || !Array.isArray(shape) || !Array.isArray(offsets)) return false
      if (shape.length > 16 || offsets.length !== 2) return false
      let elementCount = 1
      for (const dimension of shape) {
        if (!Number.isSafeInteger(dimension) || (dimension as number) < 0) return false
        elementCount = safeMultiply(elementCount, dimension as number)
      }
      const [start, end] = offsets
      if (
        !Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        (start as number) < 0 || (end as number) < (start as number) ||
        (end as number) > dataLength ||
        safeMultiply(elementCount, dtypeBytes) !== (end as number) - (start as number)
      ) return false
      ranges.push({ start: start as number, end: end as number })
      tensorCount += 1
      if (tensorCount > MAX_CONTAINER_ENTRIES) return false
    }
    if (tensorCount === 0) return false
    ranges.sort((left, right) => left.start - right.start)
    let cursor = 0
    for (const range of ranges) {
      if (range.start !== cursor) return false
      cursor = range.end
    }
    return cursor === dataLength
  } finally {
    await handle.close()
  }
}

async function validateGguf(stagedFile: string, sizeBytes: number, expectedArchitecture?: string): Promise<boolean> {
  if (sizeBytes < 32) return false
  const structuralLength = Math.min(sizeBytes, MAX_GGUF_HEADER_BYTES)
  const handle = await openExactRegularFileNoFollow(stagedFile, sizeBytes)
  try {
    const structuralBytes = Buffer.alloc(structuralLength)
    if (!await readExactly(handle, structuralBytes, 0)) return false
    const reader = new BinaryReader(structuralBytes)
    if (!reader.bytes(4).equals(Buffer.from('GGUF', 'ascii'))) return false
    if (reader.u32() !== 3) return false
    const tensorCount = toBoundedNumber(reader.u64(), 1, MAX_GGUF_TENSORS)
    const metadataCount = toBoundedNumber(reader.u64(), 0, MAX_GGUF_METADATA)
    if (tensorCount === null || metadataCount === null) return false

    let alignment = 32
    const metadataKeys = new Set<string>()
    let architecture: unknown
    for (let index = 0; index < metadataCount; index += 1) {
      const key = reader.ggufString(MAX_NAME_BYTES)
      if (!isSafeContainerName(key) || metadataKeys.has(key)) return false
      metadataKeys.add(key)
      const valueType = reader.u32()
      const value = readGgufValue(reader, valueType, 0)
      if (key === 'general.architecture') architecture = value
      if (key === 'general.alignment') {
        if (valueType !== 4 || typeof value !== 'number') return false
        alignment = value
      }
    }
    if (expectedArchitecture && architecture !== expectedArchitecture) return false
    if (!isPowerOfTwo(alignment) || alignment > MAX_GGUF_ALIGNMENT) return false

    const tensors: Array<{ offset: number; byteLength: number }> = []
    const tensorNames = new Set<string>()
    for (let index = 0; index < tensorCount; index += 1) {
      const name = reader.ggufString(MAX_NAME_BYTES)
      if (!isSafeContainerName(name) || tensorNames.has(name)) return false
      tensorNames.add(name)
      const dimensionCount = reader.u32()
      if (dimensionCount < 1 || dimensionCount > MAX_GGUF_DIMENSIONS) return false
      let elementCount = 1
      for (let dimension = 0; dimension < dimensionCount; dimension += 1) {
        const extent = toBoundedNumber(reader.u64(), 1, Number.MAX_SAFE_INTEGER)
        if (extent === null) return false
        elementCount = safeMultiply(elementCount, extent)
      }
      const type = GGML_TYPES.get(reader.u32())
      if (!type || elementCount % type.blockElements !== 0) return false
      const offset = toBoundedNumber(reader.u64(), 0, Number.MAX_SAFE_INTEGER)
      if (offset === null || offset % alignment !== 0) return false
      tensors.push({
        offset,
        byteLength: safeMultiply(elementCount / type.blockElements, type.blockBytes)
      })
    }

    const dataStart = align(reader.position, alignment)
    if (dataStart > sizeBytes) return false
    tensors.sort((left, right) => left.offset - right.offset)
    let relativeCursor = 0
    for (const tensor of tensors) {
      const expectedOffset = align(relativeCursor, alignment)
      if (tensor.offset !== expectedOffset) return false
      relativeCursor = safeAdd(tensor.offset, tensor.byteLength)
    }
    return safeAdd(dataStart, relativeCursor) === sizeBytes
  } finally {
    await handle.close()
  }
}

function readGgufValue(reader: BinaryReader, type: number, depth: number): unknown {
  if (depth > 1) throw new Error('Nested GGUF arrays are not admitted.')
  switch (type) {
    case 0: return reader.u8()
    case 1: return reader.i8()
    case 2: return reader.u16()
    case 3: return reader.i16()
    case 4: return reader.u32()
    case 5: return reader.i32()
    case 6: return reader.f32()
    case 7: {
      const value = reader.u8()
      if (value !== 0 && value !== 1) throw new Error('Invalid GGUF boolean.')
      return value === 1
    }
    case 8: return reader.ggufString(MAX_STRUCTURED_FILE_BYTES)
    case 9: {
      const elementType = reader.u32()
      if (elementType === 9) throw new Error('Nested GGUF arrays are not admitted.')
      const count = toBoundedNumber(reader.u64(), 0, MAX_GGUF_ARRAY_ENTRIES)
      if (count === null) throw new Error('GGUF array exceeds bound.')
      const values: unknown[] = []
      for (let index = 0; index < count; index += 1) {
        values.push(readGgufValue(reader, elementType, depth + 1))
      }
      return values
    }
    case 10: return reader.u64()
    case 11: return reader.i64()
    case 12: return reader.f64()
    default: throw new Error('Unsupported GGUF metadata type.')
  }
}

function validateOnnx(bytes: Buffer, relativePath: string): OnnxValidation | null {
  const model = new ProtobufReader(bytes)
  let irVersion: bigint | null = null
  let graph: Buffer | null = null
  let fieldCount = 0
  while (!model.done) {
    if (++fieldCount > MAX_CONTAINER_ENTRIES) return null
    const tag = model.tag()
    switch (tag.field) {
      case 1:
        if (tag.wire !== 0 || irVersion !== null) return null
        irVersion = model.varint()
        break
      case 2:
      case 3:
      case 4:
      case 6:
        if (tag.wire !== 2 || !isValidUtf8(model.lengthDelimited(MAX_NAME_BYTES))) return null
        break
      case 5:
        if (tag.wire !== 0) return null
        model.varint()
        break
      case 7:
        if (tag.wire !== 2 || graph !== null) return null
        graph = model.lengthDelimited(MAX_STRUCTURED_FILE_BYTES)
        break
      case 8:
        if (tag.wire !== 2 || !validateOnnxOperatorSet(model.lengthDelimited(MAX_NAME_BYTES))) {
          return null
        }
        break
      default:
        return null
    }
  }
  if (irVersion === null || irVersion < 1n || irVersion > 11n || graph === null) return null
  const externalReferences = validateOnnxGraph(graph, relativePath)
  return externalReferences === null ? null : { externalReferences }
}

function validateOnnxOperatorSet(bytes: Buffer): boolean {
  const reader = new ProtobufReader(bytes)
  let domainSeen = false
  let version: bigint | null = null
  while (!reader.done) {
    const tag = reader.tag()
    if (tag.field === 1 && tag.wire === 2 && !domainSeen) {
      domainSeen = true
      if (!isValidUtf8(reader.lengthDelimited(MAX_NAME_BYTES))) return false
    } else if (tag.field === 2 && tag.wire === 0 && version === null) {
      version = reader.varint()
    } else {
      return false
    }
  }
  return version !== null && version > 0n && version <= BigInt(Number.MAX_SAFE_INTEGER)
}

function validateOnnxGraph(
  bytes: Buffer,
  relativePath: string
): readonly OnnxExternalTensorReference[] | null {
  const graph = new ProtobufReader(bytes)
  const initializerNames = new Set<string>()
  const externalReferences: OnnxExternalTensorReference[] = []
  let initializerCount = 0
  let nameSeen = false
  while (!graph.done) {
    const tag = graph.tag()
    if (tag.field === 2 && tag.wire === 2 && !nameSeen) {
      nameSeen = true
      if (!isValidUtf8(graph.lengthDelimited(MAX_NAME_BYTES))) return null
    } else if (tag.field === 5 && tag.wire === 2) {
      const tensor = validateOnnxTensor(
        graph.lengthDelimited(MAX_STRUCTURED_FILE_BYTES),
        relativePath
      )
      if (tensor === null || initializerNames.has(tensor.name)) return null
      initializerNames.add(tensor.name)
      if (tensor.externalReference) externalReferences.push(tensor.externalReference)
      initializerCount += 1
      if (initializerCount > MAX_CONTAINER_ENTRIES) return null
    } else {
      // Nodes, sparse tensors, functions, value-info and unknown graph extensions
      // are intentionally outside this tracer's non-executing structural subset.
      return null
    }
  }
  return initializerCount > 0 ? externalReferences : null
}

function validateOnnxTensor(bytes: Buffer, relativePath: string): OnnxTensorValidation | null {
  const tensor = new ProtobufReader(bytes)
  const dimensions: number[] = []
  let dataType: number | null = null
  let name: string | null = null
  let rawData: Buffer | null = null
  let dataLocation: number | null = null
  const externalData = new Map<string, string>()
  while (!tensor.done) {
    const tag = tensor.tag()
    if (tag.field === 1 && tag.wire === 0) {
      const dimension = toBoundedNumber(tensor.varint(), 1, Number.MAX_SAFE_INTEGER)
      if (dimension === null || dimensions.length >= MAX_GGUF_DIMENSIONS) return null
      dimensions.push(dimension)
    } else if (tag.field === 1 && tag.wire === 2) {
      const packed = new ProtobufReader(tensor.lengthDelimited(MAX_NAME_BYTES))
      while (!packed.done) {
        const dimension = toBoundedNumber(packed.varint(), 1, Number.MAX_SAFE_INTEGER)
        if (dimension === null || dimensions.length >= MAX_GGUF_DIMENSIONS) return null
        dimensions.push(dimension)
      }
    } else if (tag.field === 2 && tag.wire === 0 && dataType === null) {
      dataType = toBoundedNumber(tensor.varint(), 1, 64)
      if (dataType === null) return null
    } else if (tag.field === 8 && tag.wire === 2 && name === null) {
      const nameBytes = tensor.lengthDelimited(MAX_NAME_BYTES)
      name = decodeUtf8(nameBytes)
      if (name === null || !isSafeContainerName(name)) return null
    } else if (tag.field === 9 && tag.wire === 2 && rawData === null) {
      rawData = tensor.lengthDelimited(MAX_STRUCTURED_FILE_BYTES)
    } else if (tag.field === 13 && tag.wire === 2) {
      const entry = readOnnxExternalDataEntry(tensor.lengthDelimited(MAX_NAME_BYTES))
      if (!entry || externalData.has(entry.key)) return null
      externalData.set(entry.key, entry.value)
    } else if (tag.field === 14 && tag.wire === 0 && dataLocation === null) {
      dataLocation = toBoundedNumber(tensor.varint(), 0, 1)
      if (dataLocation === null) return null
    } else {
      // Typed payloads, string tensors, segments and unknown TensorProto fields
      // remain outside this deliberately small non-executing subset.
      return null
    }
  }
  const elementBytes = dataType === null ? undefined : ONNX_TENSOR_ELEMENT_BYTES.get(dataType)
  if (!elementBytes || dimensions.length === 0 || name === null) return null
  let elements = 1
  for (const dimension of dimensions) elements = safeMultiply(elements, dimension)
  const expectedBytes = safeMultiply(elements, elementBytes)

  if (rawData !== null) {
    if (externalData.size !== 0 || (dataLocation !== null && dataLocation !== 0)) return null
    return rawData.byteLength === expectedBytes ? { name } : null
  }
  if (dataLocation !== 1 || externalData.size !== 3) return null
  const locationValue = externalData.get('location')
  const offsetValue = externalData.get('offset')
  const lengthValue = externalData.get('length')
  if (locationValue === undefined || offsetValue === undefined || lengthValue === undefined) {
    return null
  }
  const location = resolveOnnxExternalLocation(relativePath, locationValue)
  const offset = parseCanonicalSafeInteger(offsetValue)
  const length = parseCanonicalSafeInteger(lengthValue)
  if (!location || offset === null || length === null || length !== expectedBytes || length === 0) {
    return null
  }
  return { name, externalReference: { location, offset, length } }
}

function readOnnxExternalDataEntry(
  bytes: Buffer
): { readonly key: string; readonly value: string } | null {
  const entry = new ProtobufReader(bytes)
  let key: string | null = null
  let value: string | null = null
  while (!entry.done) {
    const tag = entry.tag()
    if (tag.field === 1 && tag.wire === 2 && key === null) {
      key = decodeUtf8(entry.lengthDelimited(MAX_NAME_BYTES))
    } else if (tag.field === 2 && tag.wire === 2 && value === null) {
      value = decodeUtf8(entry.lengthDelimited(MAX_NAME_BYTES))
    } else {
      return null
    }
  }
  return key !== null && value !== null ? { key, value } : null
}

function resolveOnnxExternalLocation(
  onnxRelativePath: string,
  location: string
): string | null {
  if (
    location.length === 0 ||
    location.length > 512 ||
    location.startsWith('/') ||
    location.includes('\\') ||
    location.includes(':') ||
    location.normalize('NFC') !== location ||
    /[\u0000-\u001f\u007f]/.test(location)
  ) return null
  const locationSegments = location.split('/')
  if (
    locationSegments.length === 0 ||
    locationSegments.some((segment) =>
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(segment) ||
      isWindowsReservedSegment(segment)
    )
  ) return null
  const onnxSegments = onnxRelativePath.split('/')
  const resolved = [...onnxSegments.slice(0, -1), ...locationSegments]
  return resolved.length <= 16 ? resolved.join('/') : null
}

function isWindowsReservedSegment(segment: string): boolean {
  const basename = segment.split('.', 1)[0].toUpperCase()
  return /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(basename)
}

function parseCanonicalSafeInteger(value: string): number | null {
  if (!/^(?:0|[1-9][0-9]{0,15})$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function validateJson(bytes: Buffer, nodeLimit = MAX_CONTAINER_ENTRIES): boolean {
  try {
    if (!Number.isSafeInteger(nodeLimit) || nodeLimit < 1 || nodeLimit > 1_000_000) return false
    parseStrictJson(bytes, nodeLimit)
    return true
  } catch {
    return false
  }
}

function validateText(bytes: Buffer): boolean {
  const text = decodeUtf8(bytes)
  if (text === null || text.length === 0 || text.includes('\0')) return false
  let lineLength = 0
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    if (code === 10 || code === 13) {
      lineLength = 0
      continue
    }
    if (code === 9) continue
    if (code < 32 || code === 127) return false
    lineLength += 1
    if (lineLength > 1_048_576) return false
  }
  return true
}

function validateSentencePiece(bytes: Buffer,entryLimit=MAX_CONTAINER_ENTRIES): boolean {
  if(!Number.isSafeInteger(entryLimit)||entryLimit<1||entryLimit>300000)return false
  const model = new ProtobufReader(bytes)
  let pieces = 0
  while (!model.done) {
    const tag = model.tag()
    if (tag.field === 1 && tag.wire === 2) {
      if (!validateSentencePieceEntry(model.lengthDelimited(MAX_NAME_BYTES))) return false
      pieces += 1
      if (pieces > entryLimit) return false
    } else if (tag.field >= 2 && tag.field <= 5 && tag.wire === 2) {
      // Trainer/normalizer/self-test specs remain opaque declarative protobuf
      // envelopes here, but their framing and aggregate file size are bounded.
      model.lengthDelimited(MAX_STRUCTURED_FILE_BYTES)
    } else {
      return false
    }
  }
  return pieces > 0
}

function validateSentencePieceEntry(bytes: Buffer): boolean {
  const piece = new ProtobufReader(bytes)
  let valueSeen = false
  let scoreSeen = false
  let typeSeen = false
  while (!piece.done) {
    const tag = piece.tag()
    if (tag.field === 1 && tag.wire === 2 && !valueSeen) {
      const value = decodeUtf8(piece.lengthDelimited(MAX_NAME_BYTES),true)
      if (value === null || value.length === 0 || value.includes('\0')) return false
      valueSeen = true
    } else if (tag.field === 2 && tag.wire === 5 && !scoreSeen) {
      if (!Number.isFinite(piece.float32())) return false
      scoreSeen = true
    } else if (tag.field === 3 && tag.wire === 0 && !typeSeen) {
      const type = piece.varint()
      if (type < 1n || type > 6n) return false
      typeSeen = true
    } else {
      return false
    }
  }
  // SentencePiece ModelProto is proto2: omitted score=0 and type=NORMAL are
  // declarative defaults, not missing structure. Duplicates/unknowns still fail.
  return valueSeen
}

class BinaryReader {
  private offset = 0

  constructor(private readonly buffer: Buffer) {}

  get position(): number { return this.offset }

  bytes(length: number): Buffer {
    this.require(length)
    const value = this.buffer.subarray(this.offset, this.offset + length)
    this.offset += length
    return value
  }

  u8(): number { this.require(1); return this.buffer.readUInt8(this.offset++) }
  i8(): number { this.require(1); return this.buffer.readInt8(this.offset++) }
  u16(): number { this.require(2); const value = this.buffer.readUInt16LE(this.offset); this.offset += 2; return value }
  i16(): number { this.require(2); const value = this.buffer.readInt16LE(this.offset); this.offset += 2; return value }
  u32(): number { this.require(4); const value = this.buffer.readUInt32LE(this.offset); this.offset += 4; return value }
  i32(): number { this.require(4); const value = this.buffer.readInt32LE(this.offset); this.offset += 4; return value }
  u64(): bigint { this.require(8); const value = this.buffer.readBigUInt64LE(this.offset); this.offset += 8; return value }
  i64(): bigint { this.require(8); const value = this.buffer.readBigInt64LE(this.offset); this.offset += 8; return value }
  f32(): number { this.require(4); const value = this.buffer.readFloatLE(this.offset); this.offset += 4; if (!Number.isFinite(value)) throw new Error('Non-finite float.'); return value }
  f64(): number { this.require(8); const value = this.buffer.readDoubleLE(this.offset); this.offset += 8; if (!Number.isFinite(value)) throw new Error('Non-finite float.'); return value }

  ggufString(maxBytes: number): string {
    const length = toBoundedNumber(this.u64(), 0, maxBytes)
    if (length === null) throw new Error('GGUF string exceeds bound.')
    const decoded = decodeUtf8(this.bytes(length))
    if (decoded === null) throw new Error('Invalid UTF-8.')
    return decoded
  }

  private require(length: number): void {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.buffer.length) {
      throw new Error('Truncated binary container.')
    }
  }
}

class ProtobufReader {
  private offset = 0

  constructor(private readonly buffer: Buffer) {}

  get done(): boolean { return this.offset === this.buffer.length }

  tag(): { readonly field: number; readonly wire: number } {
    const value = this.varint()
    const field = Number(value >> 3n)
    const wire = Number(value & 7n)
    if (!Number.isSafeInteger(field) || field < 1 || ![0, 1, 2, 5].includes(wire)) {
      throw new Error('Invalid protobuf tag.')
    }
    return { field, wire }
  }

  varint(): bigint {
    const start = this.offset
    let value = 0n
    for (let shift = 0n; shift < 70n; shift += 7n) {
      if (this.offset >= this.buffer.length) throw new Error('Truncated protobuf varint.')
      const byte = this.buffer[this.offset++]
      value |= BigInt(byte & 0x7f) << shift
      if ((byte & 0x80) === 0) {
        if (this.offset - start > 1 && byte === 0) throw new Error('Non-canonical protobuf varint.')
        if (this.offset - start === 10 && byte > 1) throw new Error('Protobuf varint overflow.')
        return value
      }
    }
    throw new Error('Protobuf varint exceeds uint64.')
  }

  lengthDelimited(maxLength: number): Buffer {
    const length = toBoundedNumber(this.varint(), 0, maxLength)
    if (length === null || this.offset + length > this.buffer.length) {
      throw new Error('Invalid protobuf length-delimited value.')
    }
    const value = this.buffer.subarray(this.offset, this.offset + length)
    this.offset += length
    return value
  }

  float32(): number {
    if (this.offset + 4 > this.buffer.length) throw new Error('Truncated protobuf fixed32.')
    const value = this.buffer.readFloatLE(this.offset)
    this.offset += 4
    return value
  }
}

class StrictJsonParser {
  private index = 0
  private nodes = 0

  constructor(private readonly source: string, private readonly nodeLimit = MAX_CONTAINER_ENTRIES) {}

  parse(): unknown {
    this.whitespace()
    const value = this.value(0)
    this.whitespace()
    if (this.index !== this.source.length) throw new Error('Trailing JSON content.')
    return value
  }

  private value(depth: number): unknown {
    if (depth > MAX_CONTAINER_DEPTH || ++this.nodes > this.nodeLimit) {
      throw new Error('JSON structural bound exceeded.')
    }
    const character = this.source[this.index]
    if (character === '{') return this.object(depth + 1)
    if (character === '[') return this.array(depth + 1)
    if (character === '"') return this.string()
    if (character === 't' && this.literal('true')) return true
    if (character === 'f' && this.literal('false')) return false
    if (character === 'n' && this.literal('null')) return null
    return this.number()
  }

  private object(depth: number): Record<string, unknown> {
    this.index += 1
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>
    const keys = new Set<string>()
    this.whitespace()
    if (this.source[this.index] === '}') { this.index += 1; return output }
    while (true) {
      if (this.source[this.index] !== '"') throw new Error('Expected JSON object key.')
      const key = this.string()
      if (keys.has(key)) throw new Error('Duplicate JSON object key.')
      keys.add(key)
      this.whitespace()
      if (this.source[this.index++] !== ':') throw new Error('Expected JSON colon.')
      this.whitespace()
      output[key] = this.value(depth)
      this.whitespace()
      const separator = this.source[this.index++]
      if (separator === '}') return output
      if (separator !== ',') throw new Error('Expected JSON object separator.')
      this.whitespace()
    }
  }

  private array(depth: number): unknown[] {
    this.index += 1
    const output: unknown[] = []
    this.whitespace()
    if (this.source[this.index] === ']') { this.index += 1; return output }
    while (true) {
      output.push(this.value(depth))
      this.whitespace()
      const separator = this.source[this.index++]
      if (separator === ']') return output
      if (separator !== ',') throw new Error('Expected JSON array separator.')
      this.whitespace()
    }
  }

  private string(): string {
    const start = this.index
    this.index += 1
    let escaped = false
    while (this.index < this.source.length) {
      const code = this.source.charCodeAt(this.index)
      if (!escaped && code === 34) {
        this.index += 1
        const decoded = JSON.parse(this.source.slice(start, this.index)) as unknown
        if (typeof decoded !== 'string' || hasUnpairedSurrogate(decoded)) {
          throw new Error('Invalid JSON string.')
        }
        return decoded
      }
      if (!escaped && code < 32) throw new Error('Control character in JSON string.')
      if (!escaped && code === 92) escaped = true
      else escaped = false
      this.index += 1
    }
    throw new Error('Unterminated JSON string.')
  }

  private number(): number {
    const match = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
    match.lastIndex = this.index
    const result = match.exec(this.source)
    if (!result) throw new Error('Invalid JSON value.')
    this.index = match.lastIndex
    const value = Number(result[0])
    if (!Number.isFinite(value)) throw new Error('Non-finite JSON number.')
    return value
  }

  private literal(value: string): boolean {
    if (!this.source.startsWith(value, this.index)) return false
    this.index += value.length
    return true
  }

  private whitespace(): void {
    while (this.index < this.source.length && /[\u0009\u000a\u000d\u0020]/.test(this.source[this.index])) {
      this.index += 1
    }
  }
}

function parseStrictJson(bytes: Buffer, nodeLimit = MAX_CONTAINER_ENTRIES): unknown {
  const decoded = decodeUtf8(bytes)
  if (decoded === null) throw new Error('Invalid UTF-8 JSON.')
  return new StrictJsonParser(decoded, nodeLimit).parse()
}

function decodeUtf8(bytes: Uint8Array,preserveBOM=false): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true,ignoreBOM:preserveBOM }).decode(bytes)
  } catch {
    return null
  }
}

function isValidUtf8(bytes: Uint8Array): boolean {
  return decodeUtf8(bytes) !== null
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next < 0xdc00 || next > 0xdfff) return true
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true
    }
  }
  return false
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function isSafeContainerName(value: string): boolean {
  return value.length > 0 && utf8Length(value) <= MAX_NAME_BYTES &&
    !value.includes('\0') && !hasUnpairedSurrogate(value)
}

function utf8Length(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

function toBoundedNumber(value: bigint, minimum: number, maximum: number): number | null {
  if (value < BigInt(minimum) || value > BigInt(maximum)) return null
  return Number(value)
}

function safeAdd(left: number, right: number): number {
  const value = left + right
  if (!Number.isSafeInteger(value)) throw new Error('Integer bound exceeded.')
  return value
}

function safeMultiply(left: number, right: number): number {
  const value = left * right
  if (!Number.isSafeInteger(value)) throw new Error('Integer bound exceeded.')
  return value
}

function align(value: number, alignment: number): number {
  return safeMultiply(Math.ceil(value / alignment), alignment)
}

function isPowerOfTwo(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && (value & (value - 1)) === 0
}

async function readExactly(
  handle: Awaited<ReturnType<typeof fs.open>>,
  target: Buffer,
  position: number
): Promise<boolean> {
  let consumed = 0
  while (consumed < target.byteLength) {
    const result = await handle.read(target, consumed, target.byteLength - consumed, position + consumed)
    if (result.bytesRead === 0) return false
    consumed += result.bytesRead
  }
  return true
}

async function isExactRegularFileNoFollow(file: string, sizeBytes: number): Promise<boolean> {
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined
  try {
    handle = await openExactRegularFileNoFollow(file, sizeBytes)
    return true
  } catch {
    return false
  } finally {
    await handle?.close()
  }
}

async function openExactRegularFileNoFollow(
  file: string,
  sizeBytes: number
): Promise<Awaited<ReturnType<typeof fs.open>>> {
  const handle = await fs.open(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size !== sizeBytes) {
      throw new Error('Artifact file identity changed during validation.')
    }
    return handle
  } catch (error) {
    await handle.close()
    throw error
  }
}
