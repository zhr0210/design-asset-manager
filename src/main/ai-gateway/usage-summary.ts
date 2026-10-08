import type {AiExecutionUsage} from '../../shared/contracts/visual-ai.contract'
/** Pi catalog prices are estimates; compatible endpoints and subscription billing remain unpriced. */
export function piUsageSummary(usage:any,priced:boolean):AiExecutionUsage{
 const tokens=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:null
 const reported=(tokens(usage?.input)??0)>0||(tokens(usage?.output)??0)>0
 const cost=usage?.cost?.total
 return{inputTokens:reported?tokens(usage?.input):null,outputTokens:reported?tokens(usage?.output):null,costEstimateUsd:reported&&priced&&typeof cost==='number'&&Number.isFinite(cost)&&cost>=0?cost:null,source:priced?'pi-catalog-estimate':'unpriced'}
}

export function validateUsageSummary(value:unknown):AiExecutionUsage|undefined{if(!value||typeof value!=='object')return undefined;const v=value as any;if(!['pi-catalog-estimate','unpriced'].includes(v.source)||![v.inputTokens,v.outputTokens].every(n=>n===null||Number.isSafeInteger(n)&&n>=0&&n<=100000000)||!(v.costEstimateUsd===null||typeof v.costEstimateUsd==='number'&&Number.isFinite(v.costEstimateUsd)&&v.costEstimateUsd>=0&&v.costEstimateUsd<=1000000))return undefined;return{inputTokens:v.inputTokens,outputTokens:v.outputTokens,costEstimateUsd:v.costEstimateUsd,source:v.source}}
