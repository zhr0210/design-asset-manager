import {supportsPiAuthentication} from '../../shared/constants/pi-provider-presets'
import {backendExecutionBinding} from '../ai-gateway/backend-binding'
import type {AppSettings} from '../../shared/types/settings.types'
import type {AiBackendConfig} from '../../shared/types/ai-backend.types'
const fields=['id','name','type','enabled','baseUrl','defaultModel','timeoutMs','capabilities','priority','notes','modelValidation','processingLocation','transport','providerKind','authMode','credentialRef','credentialRevision'] as const
export function publicBackend(backend:AiBackendConfig):AiBackendConfig{return structuredClone(Object.fromEntries(fields.filter(k=>backend[k]!==undefined).map(k=>[k,backend[k]]))) as AiBackendConfig}
export function publicSettings(settings:AppSettings):AppSettings{return{...settings,aiBackends:settings.aiBackends?.map(publicBackend)}}
/** Saving unrelated UI fields must not erase an un-migrated credential or overwrite secure metadata. */
export function mergePublicBackends(current:AiBackendConfig[],next:AiBackendConfig[]):AiBackendConfig[]{
 return next.map(b=>{
  if(b.transport==='pi'&&b.authMode!==undefined&&!supportsPiAuthentication(b.providerKind??'openai-compatible',b.authMode))throw Error('AI_AUTH_UNSUPPORTED')
  if(b.apiKey&&b.apiKey!=='local')throw Error('AI_USE_CREDENTIAL_WRITE')
  const previous=current.find(p=>p.id===b.id)
  const secure=previous?{credentialRevision:previous.credentialRevision,credentialRef:previous.credentialRef}:{}
  const projected=publicBackend(b);delete projected.modelValidation;if(previous?.modelValidation&&backendExecutionBinding(previous,previous.modelValidation.model)===backendExecutionBinding({...projected,...secure},previous.modelValidation.model))projected.modelValidation=previous.modelValidation
  return{...projected,...secure,...(previous?.apiKey?{apiKey:previous.apiKey}:{})}
 })
}
