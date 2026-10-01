import type {AiLoginPrompt} from './ai-connection.contract'
export function parseAiLoginPrompt(input:unknown):AiLoginPrompt{
 const p=input as any
 if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(p.id)||!['text','secret','manual_code','select'].includes(p.type)||typeof p.message!=='string'||!p.message.trim()||p.message.length>1000)throw Error('AI_AUTH_PROMPT_INVALID')
 const base={id:p.id,message:p.message}
 if(p.type!=='select')return{...base,type:p.type}
 if(!Array.isArray(p.options)||!p.options.length||p.options.length>8)throw Error('AI_AUTH_PROMPT_INVALID')
 const options=p.options.map((o:any)=>{if(!o||typeof o.id!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(o.id)||typeof o.label!=='string'||!o.label.trim()||o.label.length>256)throw Error('AI_AUTH_PROMPT_INVALID');return{id:o.id,label:o.label}})
 if(new Set(options.map((o:{id:string})=>o.id)).size!==options.length)throw Error('AI_AUTH_PROMPT_INVALID')
 return{...base,type:'select',options}
}
export function validAiLoginAnswer(prompt:AiLoginPrompt,answer:unknown):answer is string{return typeof answer==='string'&&answer.length<=16000&&(prompt.type!=='select'||prompt.options.some(o=>o.id===answer))}
