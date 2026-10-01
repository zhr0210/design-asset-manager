export function normalizeAuthPrompt(p){
 if(!p||!['text','secret','manual_code','select'].includes(p.type)||typeof p.message!=='string'||!p.message.trim()||p.message.length>1000)throw Error('prompt')
 const result={type:p.type,message:p.message}
 if(p.type==='select'){
  if(!Array.isArray(p.options)||!p.options.length||p.options.length>8)throw Error('prompt')
  result.options=p.options.map(o=>{if(!o||typeof o.id!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(o.id)||typeof o.label!=='string'||!o.label.trim()||o.label.length>256)throw Error('prompt');return{id:o.id,label:o.label}})
  if(new Set(result.options.map(o=>o.id)).size!==result.options.length)throw Error('prompt')
 }
 return result
}
export function validAuthAnswer(prompt,answer){return typeof answer==='string'&&answer.length<=16000&&(prompt.type!=='select'||prompt.options.some(o=>o.id===answer))}
