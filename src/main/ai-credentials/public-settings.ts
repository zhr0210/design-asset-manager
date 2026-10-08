import {supportsPiAuthentication} from '../../shared/constants/pi-provider-presets'
import {backendExecutionBinding} from '../ai-gateway/backend-binding'
import {requireReasoningConfiguration} from '../../shared/workflows/ai-reasoning.workflow'
import type {AppSettings} from '../../shared/types/settings.types'
import type {AiBackendConfig} from '../../shared/types/ai-backend.types'
import {isDeepStrictEqual} from 'node:util'
const fields=['id','name','type','enabled','baseUrl','defaultModel','reasoning','timeoutMs','capabilities','priority','notes','modelValidation','processingLocation','transport','providerKind','authMode','credentialRef','credentialRevision','runtimeFingerprint'] as const
export function publicBackend(backend:AiBackendConfig):AiBackendConfig{return structuredClone(Object.fromEntries(fields.filter(k=>backend[k]!==undefined).map(k=>[k,backend[k]]))) as AiBackendConfig}
export function publicSettings(settings:AppSettings):AppSettings{return{...settings,aiBackends:settings.aiBackends?.map(publicBackend)}}
/** Saving unrelated UI fields must not erase an un-migrated credential or overwrite secure metadata. */
export function mergePublicBackends(current:AiBackendConfig[],next:AiBackendConfig[]):AiBackendConfig[]{
 for(const b of current.filter(b=>b.runtimeFingerprint))if(!isDeepStrictEqual(publicBackend(b),next.find(candidate=>candidate.id===b.id)))throw Error('AI_MANAGED_MODEL_READ_ONLY')
 for(const b of next)if(b.runtimeFingerprint&&!current.some(previous=>previous.id===b.id&&previous.runtimeFingerprint===b.runtimeFingerprint))throw Error('AI_MANAGED_MODEL_READ_ONLY')
 return next.map(b=>{
  requireReasoningConfiguration(b)
  if(b.transport==='pi'&&b.authMode!==undefined&&!supportsPiAuthentication(b.providerKind??'openai-compatible',b.authMode))throw Error('AI_AUTH_UNSUPPORTED')
  if(b.apiKey&&b.apiKey!=='local')throw Error('AI_USE_CREDENTIAL_WRITE')
  const previous=current.find(p=>p.id===b.id)
  const secure=previous?{credentialRevision:previous.credentialRevision,credentialRef:previous.credentialRef}:{}
  const projected=publicBackend(b);delete projected.modelValidation;if(previous?.modelValidation&&backendExecutionBinding(previous,previous.modelValidation.model)===backendExecutionBinding({...projected,...secure},previous.modelValidation.model))projected.modelValidation=previous.modelValidation
  return{...projected,...secure,...(previous?.apiKey?{apiKey:previous.apiKey}:{})}
 })
}
