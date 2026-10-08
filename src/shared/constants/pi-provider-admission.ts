import policy from '../../../pi-runtime/provider-policy.json'
import type {AiBackendConfig} from '../types/ai-backend.types'
import type {PiProviderKind,PiAuthMode} from '../contracts/ai-connection.contract'
export type PiProviderAction='models'|'infer'|'login'
export interface PiProviderAdmission {allowed:boolean;code:string;message:string}
export function piProviderAdmission(provider:PiProviderKind,mode:PiAuthMode,action:PiProviderAction):PiProviderAdmission{
 if(action==='models')return{allowed:true,code:'STATIC_OR_EXPLICIT_CATALOG',message:'目录不代表真实服务资格。'}
 if(!(policy.sdkAuthModes as Record<string,string[]>)[provider]?.includes(mode)||action==='login'&&mode!=='oauth')return{allowed:false,code:'AI_AUTH_UNSUPPORTED',message:'此 Provider 不支持所选认证方式或登录动作。'}
 const blocks=policy.blocked as Record<string,{code:string;message:string}>
 const block=blocks[provider+':'+mode]??blocks[provider+':'+action]
 return block?{allowed:false,...block}:{allowed:true,code:'ISOLATED_CONTRACT_PATH',message:provider==='openai'&&mode==='oauth'?'受保护的 ChatGPT 登录入口已接线；由你在系统浏览器授权，实际账号与额度尚未验收。':'本路径有隔离契约验收；真实服务仍需单独验证。'}
}
export function backendInferenceAdmission(b:AiBackendConfig):PiProviderAdmission{return b.authMode==='oauth'&&b.transport!=='pi'?{allowed:false,code:'AI_LEGACY_OAUTH_UNSUPPORTED',message:'已有 HTTP 接口不能使用订阅凭据；不会自动切换接口。'}:b.transport==='pi'?piProviderAdmission(b.providerKind??'openai-compatible',b.authMode??'none','infer'):{allowed:true,code:'LEGACY',message:''}}
export function requireBackendInference(b:AiBackendConfig):void{const admission=backendInferenceAdmission(b);if(!admission.allowed)throw Error(admission.code)}

export function knownPiAdmissionCode(code:unknown):code is string{return typeof code==='string'&&(code==='AI_AUTH_UNSUPPORTED'||Object.values(policy.blocked).some(b=>b.code===code))}
