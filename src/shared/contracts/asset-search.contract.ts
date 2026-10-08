import type { ActiveLibraryAssetProjection } from './active-library.contract'
import type { AssetDiscoveryExplanation } from '../workflows/asset-discovery.workflow'
export interface AssetColorFilter {hex:string;minimumPercentage:number;tolerance:number}
export interface AssetColorCoverage {measured:number;unavailable:number;total:number;recipe:string}
export const ASSET_SEARCH_FIELDS=['name','tags','ai-tags','description','ocr','prompt'] as const
export type AssetSearchField=typeof ASSET_SEARCH_FIELDS[number]
export interface AssetSearchRequest {
  libraryIdentity: string; generation: string; query: string; tagScope: 'confirmed-only' | 'includes-pending';
  sourceSiteId?: string; folderId?:string; tagQueries?: readonly string[]; color?:AssetColorFilter;fields?:readonly AssetSearchField[]; limit: number; cursor?: string;
}
export interface AssetSearchIndexStatus {
  state: 'ready' | 'building' | 'recovering' | 'unavailable'; indexGeneration: string;
  indexed: number; pending: number; total: number; watermark: number; error: string | null;
}
export interface AssetSearchPage {
  matches: Array<{ asset: ActiveLibraryAssetProjection; explanation: AssetDiscoveryExplanation | null }>;
  total: number; nextCursor: string | null; index: AssetSearchIndexStatus;
  colors?:AssetColorCoverage;
}
export function validateAssetSearchRequest(value: unknown): AssetSearchRequest {
  const v = value as AssetSearchRequest
  const id = (s: unknown) => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(s)
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k =>
    !['libraryIdentity','generation','query','tagScope','sourceSiteId','folderId','tagQueries','color','fields','limit','cursor'].includes(k)) ||
    !id(v.libraryIdentity) || !id(v.generation) || typeof v.query !== 'string' || v.query.length > 1024 ||
    !['confirmed-only','includes-pending'].includes(v.tagScope) || !Number.isInteger(v.limit) || v.limit < 1 || v.limit > 100 ||
    v.sourceSiteId !== undefined && (!id(v.sourceSiteId)) || v.folderId!==undefined&&!id(v.folderId) || v.cursor !== undefined && (!id(v.cursor)) ||
    v.tagQueries !== undefined && (!Array.isArray(v.tagQueries) || v.tagQueries.length > 30 ||
      v.tagQueries.some(q => typeof q !== 'string' || q.length > 256))) throw Error('ASSET_SEARCH_INPUT_INVALID')
  if(v.color!==undefined){const c=v.color
    if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).sort().join(',')!=='hex,minimumPercentage,tolerance'||
      typeof c.hex!=='string'||!/^#[A-Fa-f0-9]{6}$/.test(c.hex)||!Number.isFinite(c.minimumPercentage)||c.minimumPercentage<1||c.minimumPercentage>100||
      !Number.isFinite(c.tolerance)||c.tolerance<0||c.tolerance>100)throw Error('ASSET_SEARCH_INPUT_INVALID')
  }
  if(v.fields!==undefined&&(!Array.isArray(v.fields)||v.fields.length<1||v.fields.length>ASSET_SEARCH_FIELDS.length||
    new Set(v.fields).size!==v.fields.length||v.fields.some(field=>!ASSET_SEARCH_FIELDS.includes(field))))throw Error('ASSET_SEARCH_INPUT_INVALID')
  return v
}
