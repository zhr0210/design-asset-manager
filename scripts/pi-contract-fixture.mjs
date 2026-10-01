import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {spawn} from 'node:child_process'
/** Only owned test bootstraps replace network. Production Worker never installs this mock. */
export async function createPiContractFixture(directory,{mode='valid',provider='openai',allowCodex=false}={}){
 const worker=pathToFileURL(path.resolve('pi-runtime/worker.mjs')).href,bootstrap=path.join(directory,'network-fixture.mjs')
 const source=`import{startPiWorker}from${JSON.stringify(worker)};
 const mode=${JSON.stringify(mode)},provider=${JSON.stringify(provider)},allowCodex=${JSON.stringify(allowCodex)};let calls=0;
 const notify=event=>process.stdout.write(JSON.stringify({type:'interaction',event:{type:'contract-network',...event}})+'\\n');
 const text=JSON.stringify({caption:'SDK原生隔离描述',ocrText:'',prompt:'Generated SDK reference',tags:['蓝色']});
 const json=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
 globalThis.fetch=async(resource,options={})=>{
  const url=new URL(typeof resource==='string'||resource instanceof URL?resource:resource.url),method=options.method??(resource instanceof Request?resource.method:'GET'),body=options.body??(resource instanceof Request?await resource.clone().text():undefined);calls++;notify({calls,method,path:url.pathname});
  if(allowCodex){
   if(url.origin!=='https://auth.openai.com'||method!=='POST')throw Error('CONTRACT_DESTINATION_REJECTED');
   if(url.pathname==='/api/accounts/deviceauth/usercode')return json({device_auth_id:'synthetic-device',user_code:'SYNTHETIC',interval:0});
   if(url.pathname==='/api/accounts/deviceauth/token')return json({authorization_code:'synthetic-code',code_verifier:'synthetic-verifier'});
   if(url.pathname==='/oauth/token')return json({access_token:'e30.'+Buffer.from(JSON.stringify({'https://api.openai.com/auth':{chatgpt_account_id:'synthetic-account'}})).toString('base64url')+'.synthetic',refresh_token:'synthetic-refresh',expires_in:3600});
   throw Error('CONTRACT_DESTINATION_REJECTED');
  }
  const expected=provider==='anthropic'?'https://api.anthropic.com/v1/messages':'https://api.openai.com/v1/responses';
  if(url.origin+url.pathname!==expected||!['','?beta=true'].includes(url.search)||method!=='POST'||options.redirect!=='error')throw Error('CONTRACT_TRANSPORT_REJECTED');
  if(mode==='hang')return await new Promise((_,reject)=>{if(options.signal.aborted)reject(Error('cancel'));else options.signal.addEventListener('abort',()=>reject(Error('cancel')),{once:true})});
  if(mode==='429')return new Response('synthetic response never logged',{status:429});
  if(mode==='redirect')return new Response('',{status:302,headers:{location:'https://unapproved.invalid/'}});
  if(mode==='oversize')return new Response('x'.repeat(520000),{headers:{'content-type':'text/event-stream'}});
  const payload=JSON.parse(body),images=provider==='anthropic'?payload.messages.flatMap(m=>m.content).filter(p=>p.type==='image'):payload.input.flatMap(m=>m.content??[]).filter(p=>p.type==='input_image');if(images.length!==1)throw Error('CONTRACT_IMAGE_MISSING');
  const events=provider==='anthropic'?[
   {type:'message_start',message:{id:'synthetic',role:'assistant',model:JSON.parse(body).model,content:[],usage:{input_tokens:1,output_tokens:0}}},
   {type:'content_block_start',index:0,content_block:{type:'text',text:''}},
   {type:'content_block_delta',index:0,delta:{type:'text_delta',text}},
   {type:'content_block_stop',index:0},{type:'message_delta',delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:2}},{type:'message_stop'}
   ]:[{type:'response.output_item.added',output_index:0,item:{type:'message',id:'synthetic-message',role:'assistant',content:[]}},{type:'response.output_text.delta',output_index:0,content_index:0,delta:text},{type:'response.output_item.done',output_index:0,item:{type:'message',id:'synthetic-message',role:'assistant',content:[{type:'output_text',text,annotations:[]}]}},{type:'response.completed',response:{id:'synthetic',model:JSON.parse(body).model,status:'completed',output:[{type:'message',id:'synthetic-message',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]}],usage:{input_tokens:1,output_tokens:2,total_tokens:3}}}];
  return new Response(events.map(e=>'event: '+e.type+'\\ndata: '+JSON.stringify(e)+'\\n\\n').join(''),{headers:{'content-type':'text/event-stream'}});
 };
 await startPiWorker({authorizeContract:(c,kind)=>allowCodex&&c.providerKind==='openai-codex'&&kind==='login'});
 `
 await fs.writeFile(bootstrap,source)
 return{bootstrap,spawnOverride:(node,_args,options)=>spawn(node,[bootstrap],options)}
}
