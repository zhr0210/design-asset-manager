import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {spawn} from 'node:child_process'
import {generateKeyPairSync} from 'node:crypto'
export async function createChatGptContractFixture(directory,{wrongIdentity=false,noScope=false}={}){
 const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'synthetic-key',alg:'RS256',use:'sig'},key=pair.privateKey.export({type:'pkcs8',format:'pem'}),bootstrap=path.join(directory,'chatgpt-fixture.mjs')
 await fs.writeFile(bootstrap,`import{startPiWorker}from${JSON.stringify(pathToFileURL(path.resolve('pi-runtime/worker.mjs')).href)};import{createControlledAuthNetwork}from${JSON.stringify(pathToFileURL(path.resolve('pi-runtime/openai-chatgpt-auth.mjs')).href)};import{sign}from'node:crypto';
 const jwk=${JSON.stringify(jwk)},key=${JSON.stringify(key)},wrong=${JSON.stringify(wrongIdentity)},noScope=${JSON.stringify(noScope)};let authorization,calls=0;const write=process.stdout.write.bind(process.stdout);
 process.stdout.write=(chunk,...args)=>{try{const m=JSON.parse(chunk);if(m.type==='interaction'&&m.event.type==='auth_url')authorization=new URL(m.event.url)}catch{}return write(chunk,...args)};
 const fetchMock=async(url,options)=>{calls++;write(JSON.stringify({type:'interaction',event:{type:'contract-network',calls,path:new URL(url).pathname,method:options.method??'GET'}})+'\\n');if(url.endsWith('jwks.json'))return new Response(JSON.stringify({keys:[jwk]}));
 const body=new URLSearchParams(options.body),clientId=body.get('client_id'),header=Buffer.from(JSON.stringify({alg:'RS256',kid:'synthetic-key'})).toString('base64url'),payload=Buffer.from(JSON.stringify({iss:'https://auth.openai.com',aud:clientId,sub:wrong?'wrong-account':'synthetic-account',iat:Date.now()/1000,exp:Date.now()/1000+3600,nonce:authorization.searchParams.get('nonce')})).toString('base64url'),idToken=header+'.'+payload+'.'+sign('sha256',Buffer.from(header+'.'+payload),key).toString('base64url');
 return new Response(JSON.stringify({token_type:'Bearer',access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600,id_token:idToken,scope:noScope?'openid':'openid resource.invoke chatgpt.tokens.use.direct'}))};
 await startPiWorker({authorizeContract:(c,kind)=>c.providerKind==='openai'&&c.authMode==='oauth',authNetworkFactory:options=>createControlledAuthNetwork({...options,fetch:fetchMock})});`,{mode:0o600})
 return{bootstrap,spawnOverride:(node,_args,options)=>spawn(node,[bootstrap],options)}
}
