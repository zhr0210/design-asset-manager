/** Pi 0.99.1 catalog defaults, not account-derived OAuth endpoints. */
export const PI_PROVIDER_ENDPOINTS=Object.freeze({'openai-compatible':'http://127.0.0.1:8080/v1',openai:'https://api.openai.com/v1',anthropic:'https://api.anthropic.com',google:'https://generativelanguage.googleapis.com/v1beta','openai-codex':'https://chatgpt.com/backend-api','github-copilot':'https://api.individual.githubcopilot.com'})

import type {PiProviderKind,PiAuthMode} from '../contracts/ai-connection.contract'
/** Supported stored credential kinds from the fixed Pi provider factories. */
export const PI_PROVIDER_AUTH_MODES:Readonly<Record<PiProviderKind,readonly PiAuthMode[]>>=Object.freeze({'openai-compatible':['none','api-key'],openai:['api-key','oauth'],anthropic:['api-key','oauth'],google:['api-key'],'openai-codex':['oauth'],'github-copilot':['api-key','oauth']})
export function supportsPiAuthentication(provider:PiProviderKind,mode:PiAuthMode):boolean{return PI_PROVIDER_AUTH_MODES[provider]?.includes(mode)??false}

/** Product choices are distinct from upstream SDK support. Existing records remain readable. */
export function supportsPiProductAuthentication(provider:PiProviderKind,mode:PiAuthMode):boolean{return supportsPiAuthentication(provider,mode)&&!(provider==='anthropic'&&mode==='oauth')}
