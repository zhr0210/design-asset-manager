import {test} from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {createChatGptAuth} from '../pi-runtime/openai-chatgpt-auth.mjs'
const request=url=>new Promise((resolve,reject)=>{http.get(url,r=>{r.resume();r.on('end',()=>resolve(r.statusCode))}).on('error',reject)})
const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10))}throw Error('owned callback did not settle')}
function fixture(){let url,calls=0,settled=false,error;const abort=new AbortController();const auth=createChatGptAuth({networkFactory:()=>({json:async()=>{calls++;throw Error('SYNTHETIC_NETWORK_DISABLED')}})});const pending=auth.login({signal:abort.signal,notify:event=>{if(event.type==='auth_url')url=new URL(event.url)},prompt:p=>new Promise((_,reject)=>p.signal.addEventListener('abort',()=>reject(Error('synthetic manual cancelled')),{once:true}))},{getDeviceId:()=> '00000000-0000-4000-8000-000000000001'}).then(()=>{settled=true},e=>{settled=true;error=e.message});return{abort,pending,get url(){return url},get calls(){return calls},get settled(){return settled},get error(){return error}}}
await test('valid current-state denial ends real owned callback promptly, closes it and requests no vendor endpoint',async()=>{
 const f=fixture();try{await wait(()=>f.url);const callback=new URL(f.url.searchParams.get('redirect_uri'));callback.search=new URLSearchParams({error:'access_denied',state:f.url.searchParams.get('state')}).toString();assert.equal(await request(callback),200);await wait(()=>f.settled);assert.equal(f.error,'AI_AUTH_DECLINED');assert.equal(f.calls,0);await assert.rejects(request(callback))}finally{f.abort.abort();await f.pending}
})
await test('unrelated wrong-state denial does not kill current attempt; its later valid denial settles once',async()=>{
 const f=fixture();try{await wait(()=>f.url);const callback=new URL(f.url.searchParams.get('redirect_uri'));callback.search='error=access_denied&state=wrong';assert.equal(await request(callback),400);assert.equal(f.settled,false);assert.equal(f.calls,0);callback.search=new URLSearchParams({error:'access_denied',state:f.url.searchParams.get('state')}).toString();assert.equal(await request(callback),200);await f.pending;assert.equal(f.error,'AI_AUTH_DECLINED');assert.equal(f.calls,0)}finally{f.abort.abort();await f.pending}
})
