/** Fixed, bounded profile for an owned synthetic fixture; not a product contract. */
import { createHash } from 'node:crypto'
import { PROFILE as WIRE_PROFILE } from './control-store-protocol-wire.tracer.mjs'

export { encodeFrame, createFrameDecoder } from './control-store-protocol-wire.tracer.mjs'

export const PROFILE = Object.freeze({ ...WIRE_PROFILE, receipts: 16, deadlineMs: 5000 })
export const CATALOG = Object.freeze({
  catalogRef: 'owned-store-v2',
  materialRef: 'owned-material-v2',
  profileId: 'owned-profile',
  clientId: 'owned-client',
  libraryIdentity: 'owned-library',
  generation: '1',
  assetId: 'owned-asset',
})
export const FEATURES = Object.freeze([
  'caption-cas', 'atomic-receipt', 'catalog-reference', 'revoke-fence',
])

export function exact(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  return keys.length === fields.length && keys.every(key => fields.includes(key)) &&
    fields.every(key => Object.hasOwn(value, key))
}

export function identifier(value, max = 128) {
  return typeof value === 'string' && value.length > 0 && value.length <= max &&
    /^[A-Za-z0-9._:-]+$/.test(value)
}

export function operationIdentifier(value) {
  return identifier(value, 200) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[A-Za-z0-9._:-]+$/.test(value)
}

function captionText(value) {
  return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= PROFILE.textBytes &&
    Buffer.from(value, 'utf8').toString('utf8') === value
}

/** Omitted baseline and the empty-string baseline remain different canonical payloads. */
export function canonicalPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const hasBaseline = Object.hasOwn(payload, 'expectedCaption')
  const fields = hasBaseline ? ['assetId', 'caption', 'expectedCaption'] : ['assetId', 'caption']
  if (!exact(payload, fields) || payload.assetId !== CATALOG.assetId ||
      !captionText(payload.caption) || (hasBaseline && !captionText(payload.expectedCaption))) return null
  return hasBaseline
    ? { assetId: payload.assetId, caption: payload.caption, expectedCaption: payload.expectedCaption }
    : { assetId: payload.assetId, caption: payload.caption }
}

export function payloadDigest(payload) {
  const canonical = canonicalPayload(payload)
  return canonical ? createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex') : null
}
