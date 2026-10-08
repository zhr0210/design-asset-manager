import type {AssetSearchRequest,AssetSearchPage} from './asset-search.contract'
import {validateAssetSearchRequest} from './asset-search.contract'
export interface RetrievalLanguageEvidence {
  language:'zh'|'en'|'mixed'
  correct:number
  total:number
}
export interface RetrievalQualification {
  fingerprint:string
  spaceId:string
  dimension:768
  encoding:'float32-le'
  normalization:'l2'
  distance:'cosine'
  imageRecipe:'siglip2-rgb-224-v1'
  textRecipe:'siglip2-original-text-64-v1'
  languages:RetrievalLanguageEvidence[]
  validationRecipe?:'public-subjects-and-colour-report-v1'
  imageChecks?:{correct:number;total:number}
  additionalChecks?:RetrievalLanguageEvidence[]
  testedAt:string
  peakRamBytes:number
}
export interface RetrievalModelSummary {
  id:string
  name:string
  bytes:number
  source:'modelscope-cn'
  repository:string
  revision:string
  license:'apache-2.0'
  trusted:boolean
  qualified:boolean
  qualification:RetrievalQualification|null
  lastSourceCheck:number
}
export interface RetrievalTransferSummary {
  id:string
  state:'running'|'paused'|'interrupted'|'failed'|'complete'|'abandoned'
  completedBytes:number
  totalBytes:number
  error:string|null
  modelId:string|null
}
export interface RetrievalInstallReview {
  receipt:string
  name:string
  source:'modelscope-cn'
  repository:string
  revision:string
  license:'apache-2.0'
  bytes:number
  freeDiskBytes:number
  reserveRamBytes:number
}
export interface RetrievalWorkspaceStatus {
  models:RetrievalModelSummary[]
  tasks:RetrievalTransferSummary[]
  runtime:{state:'unconfigured'|'inactive'|'checking'|'loading'|'ready'|'stopping'|'unknown'|'failed';
    modelId:string|null;spaceId:string|null;error:string|null;peakRamBytes:number|null;loadMs:number|null;pythonSelected:boolean}
}
export interface RetrievalCoverage {
  state:'unprepared'|'ready'|'partial'|'building'|'recovering'
  spaceId:string|null
  selectedSpaceId:string|null
  indexed:number
  total:number
  indexGeneration:string
  error:string|null
  jobs:Array<{id:string;spaceId:string;state:'running'|'paused'|'interrupted'|'failed'|'complete';total:number;completed:number;failed:number;error:string|null}>
}
export interface RetrievalScope {libraryIdentity:string;generation:string}
export interface QueryFileReview {grant:string;name:string;bytes:number;expiresAt:number;inputSha256:string}
export interface RetrievalGenerationRequest extends RetrievalScope {selection:'whole-library'|'selected';assetIds?:readonly string[]}
export interface AssetSemanticSearchRequest extends AssetSearchRequest {
  mode:'semantic'|'hybrid'|'image'
  queryId?:string
  imageAssetId?:string
  externalGrant?:string
}
export interface AssetSemanticSearchPage extends AssetSearchPage {
  mode:'semantic'|'hybrid'|'image'|'lexical-only'
  coverage:RetrievalCoverage
  notice:string|null
}
const validId=(value:unknown)=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(value)
export function parseRetrievalGeneration(value:unknown):RetrievalGenerationRequest {
  const v=value as RetrievalGenerationRequest
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['libraryIdentity','generation','selection','assetIds'].includes(k))||
    !validId(v.libraryIdentity)||!validId(v.generation)||!['whole-library','selected'].includes(v.selection)||
    v.selection==='whole-library'&&v.assetIds!==undefined||v.selection==='selected'&&(!Array.isArray(v.assetIds)||v.assetIds.length<1||v.assetIds.length>5000||v.assetIds.some(id=>!validId(id))))throw Error('RETRIEVAL_SELECTION_INVALID')
  return v
}
export function parseAssetSemanticSearch(value:unknown):AssetSemanticSearchRequest {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('RETRIEVAL_QUERY_INVALID')
  const {mode,queryId,imageAssetId,externalGrant,...lexical}=value as AssetSemanticSearchRequest
  validateAssetSearchRequest(lexical)
  if(!['semantic','hybrid','image'].includes(mode)||queryId!==undefined&&!validId(queryId)||imageAssetId!==undefined&&!validId(imageAssetId)||
    externalGrant!==undefined&&(typeof externalGrant!=='string'||!/^query-file:[a-f0-9-]{36}$/.test(externalGrant))||
    mode==='image'&&Boolean(imageAssetId)===Boolean(externalGrant)||mode!=='image'&&(imageAssetId!==undefined||externalGrant!==undefined||!lexical.query.trim()))throw Error('RETRIEVAL_QUERY_INVALID')
  return value as AssetSemanticSearchRequest
}
export type RetrievalModelAction=
  |{kind:'review-install'|'select-runtime'|'release-idle'|'cancel-validation'}
  |{kind:'confirm-install';receipt:string}
  |{kind:'pause'|'resume'|'abandon';taskId:string}
  |{kind:'verify-use'|'revoke'|'restore';modelId:string}
export function parseRetrievalModelAction(value:unknown):RetrievalModelAction {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('RETRIEVAL_ACTION_INVALID')
  const v=value as Record<string,unknown>,keys=Object.keys(v).sort().join(',')
  if(['review-install','select-runtime','release-idle','cancel-validation'].includes(String(v.kind))&&keys==='kind')return v as RetrievalModelAction
  if(v.kind==='confirm-install'&&keys==='kind,receipt'&&typeof v.receipt==='string'&&/^retrieval-review:[a-f0-9-]{36}$/.test(v.receipt))return v as RetrievalModelAction
  if(['pause','resume','abandon'].includes(String(v.kind))&&keys==='kind,taskId'&&typeof v.taskId==='string'&&/^retrieval-transfer:[a-f0-9-]{36}$/.test(v.taskId))return v as RetrievalModelAction
  if(['verify-use','revoke','restore'].includes(String(v.kind))&&keys==='kind,modelId'&&typeof v.modelId==='string'&&/^retrieval-model:[a-f0-9-]{36}$/.test(v.modelId))return v as RetrievalModelAction
  throw Error('RETRIEVAL_ACTION_INVALID')
}
