import path from 'node:path'
import { createHash } from 'node:crypto'
import type { SupportedCaptureFormat } from './capture-intake.types'

export const MANAGED_ORIGINAL_BUCKET = 'bucket-0001'

export function createManagedOriginalName(
  receivedFileName: string,
  format: SupportedCaptureFormat,
  originalStorageObjectIdentity: string
): string {
  const sourceStem = path.parse(receivedFileName).name
  const readableStem = sourceStem
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '_')
    .replace(/\s+/gu, ' ')
    .replace(/[. ]+$/gu, '')
    .trim()
    .slice(0, 80) || 'asset'
  const extension = format === 'jpeg' ? 'jpg' : format
  return `${readableStem}-${createBase32Disambiguator(originalStorageObjectIdentity)}.${extension}`
}

export function createBase32Disambiguator(identity: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  const digest = createHash('sha256').update(identity).digest()
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of digest) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5 && output.length < 12) {
      output += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
    if (output.length === 12) break
  }
  return output
}
