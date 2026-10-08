import type {VisionInvocation,VisionProvider} from './openai-vision.provider'
/** Main-private evidence of a failed response from an owned local execution.
 * A plain network/provider string is not eligible for automatic recovery. */
export class ConfirmedLocalOomError extends Error {
  recoveryCode?:string
  constructor(readonly failure:{id:string;backendId:string;model:string;executionId:string;fingerprint:string}){super('LOCAL_OOM')}
}
export interface LocalRecoveryScope {operationId?:string;mayRecover?():Promise<boolean>}
export interface LocalRecoveryOutcome {
  state:'not-retried'|'recovery-incomplete'|'retry-response-received'|'retry-failed'
  physicalCalls:number
  errorCode?:string
}
const code=(error:unknown)=>error instanceof Error&&/^[A-Z][A-Z_0-9]+$/.test(error.message)?error.message:'LOCAL_RECOVERY_FAILED'
/** One logical recipe's physical budget includes both OOM and format retries.
 * Recovery never edits the reviewed image, prompt, tokens, model or deadline. */
export function createInferenceCallBudget(scope:LocalRecoveryScope={},result?:(payload:unknown|undefined)=>void) {
  let used=0,recovered=false
  return {
    get used(){return used},get remaining(){return 2-used},
    async invoke(input:VisionInvocation,provider:VisionProvider):Promise<unknown>{
      if(used>=2)throw Error('AI_CALL_LIMIT')
      input.signal.throwIfAborted();used++
      try{const payload=await provider.invokeOnce({...input,operationId:scope.operationId});result?.(payload);return payload}
      catch(error){result?.(undefined);if(input.signal.aborted){if(error instanceof ConfirmedLocalOomError)throw error;input.signal.throwIfAborted()}
        if(!(error instanceof ConfirmedLocalOomError)||used>=2||recovered||!scope.mayRecover||!provider.recoverLocal)throw error
        const finish=(state:LocalRecoveryOutcome['state'],errorCode?:string)=>{
          // Diagnostics must never turn a completed physical call into a retry.
          try{provider.finishLocalRecovery?.(error,{state,physicalCalls:used,errorCode})}catch{}
        }
        let permitted=false
        try{permitted=await scope.mayRecover()}catch(e){error.recoveryCode=code(e);finish('not-retried',error.recoveryCode);throw error}
        if(!permitted||input.signal.aborted){finish('not-retried',input.signal.aborted?'LOCAL_RECOVERY_CANCELLED':'LOCAL_RECOVERY_HOST_NOT_CONFIRMED');throw error}
        recovered=true
        let ready=false
        try{ready=await provider.recoverLocal(error,{...input,operationId:scope.operationId})}catch(e){
          error.recoveryCode=code(e);finish('recovery-incomplete',error.recoveryCode);throw error}
        if(input.signal.aborted||!ready){finish('not-retried',input.signal.aborted?'LOCAL_RECOVERY_CANCELLED':'LOCAL_NO_VALIDATED_LOWER_PLAN');throw error}
        used++
        try{const payload=await provider.invokeOnce({...input,operationId:scope.operationId});result?.(payload);finish('retry-response-received');return payload}
        catch(e){result?.(undefined);finish('retry-failed',code(e));throw e}
      }
    },
  }
}
