// Run only in an authorized DAM repo using its bundled Node and stdin:
// pi-runtime/runtime/darwin-arm64/node --input-type=module < /path/to/reproduce-denial.mjs
// No vendor request or real credential. This probes backend behavior, NOT Computer Use.
import {createChatGptAuth} from './pi-runtime/openai-chatgpt-auth.mjs';
import http from 'node:http';
const controller=new AbortController();let networkCalls=0,settled=false,callbackStatus=null,callbackDone;
const callbackFinished=new Promise(r=>{callbackDone=r});
const auth=createChatGptAuth({networkFactory:()=>({json:async()=>{networkCalls++;throw Error('SYNTHETIC_NETWORK_FORBIDDEN')}})});
const work=auth.login({signal:controller.signal,notify:event=>{
 if(event.type!=='auth_url')return;
 const authorization=new URL(event.url),callback=new URL(authorization.searchParams.get('redirect_uri'));
 if(callback.hostname!=='127.0.0.1')throw Error('NOT_OWNED_LOOPBACK');
 callback.search=new URLSearchParams({error:'access_denied',state:authorization.searchParams.get('state')}).toString();
 const request=http.get(callback,response=>{callbackStatus=response.statusCode;response.resume();response.on('end',callbackDone)});
 request.on('error',callbackDone);
},prompt:p=>new Promise((_,reject)=>{p.signal.addEventListener('abort',()=>reject(Error('SYNTHETIC_CANCEL')),{once:true})})},{getDeviceId:()=> '00000000-0000-4000-8000-000000000001'}).then(()=>{settled=true;return 'resolved'},()=>{settled=true;return 'rejected'});
const safety=setTimeout(()=>controller.abort(),2000);
try{
 await callbackFinished;await new Promise(r=>setTimeout(r,120));
 console.log(JSON.stringify({test:'state-valid-denial-callback',runtime:process.versions.node,callbackStatus,settledAfterCallback120ms:settled,vendorNetworkCalls:networkCalls,realAccountsUsed:false,credentialsRead:false}));
}finally{controller.abort();await work;clearTimeout(safety);console.log(JSON.stringify({ownedAttemptAbortedAndClosed:true,vendorNetworkCalls:networkCalls}));}
