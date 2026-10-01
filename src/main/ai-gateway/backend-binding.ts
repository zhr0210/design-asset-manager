import {createHash} from 'node:crypto'
import type {AiBackendConfig} from '../../shared/types/ai-backend.types'
/** Legacy byte identity retained; new connections also freeze transport and credential identity. */
export function backendExecutionBinding(b:AiBackendConfig,model:string){return createHash('sha256').update(JSON.stringify({baseUrl:b.baseUrl,type:b.type,model,vision:b.capabilities.vision,...(b.transport||b.credentialRef?{transport:b.transport??'legacy',processingLocation:b.processingLocation??null,providerKind:b.providerKind??'openai-compatible',authMode:b.authMode??'none',credentialRef:b.credentialRef??b.id,credentialRevision:b.credentialRevision??0}:{})})).digest('hex')}

export function backendLocation(b:AiBackendConfig):'local'|'external'{return b.processingLocation!=='external-service'&&['localhost','127.0.0.1','[::1]'].includes(new URL(b.baseUrl).hostname)?'local':'external'}
