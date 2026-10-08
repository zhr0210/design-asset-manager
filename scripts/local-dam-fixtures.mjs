import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

/** Owned by the synthetic launcher; never connects to another service. */
export async function startLocalDamFixtures(root, options = {}) {
  if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535)) throw Error('Invalid fixture port')
  const directory=path.join(root,'fixtures')
  await fs.mkdir(path.join(directory,'ocr'),{recursive:true})
  const image=await sharp({create:{width:360,height:240,channels:3,background:'#d69a6b'}}).png().toBuffer()
  const stats={inference:0,downloads:0,catalog:0}
  const record=()=>fs.writeFile(path.join(directory,'status.json'),JSON.stringify(stats))
  const server=http.createServer(async(req,res)=>{
    try {
      if(req.method==='GET'&&req.url==='/v1/models'){stats.catalog++;await record();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data:[{id:'fixture',object:'model',owned_by:'synthetic-test'}]}));return}
      if(req.method==='GET'&&['/download/test-image.png','/download/slow-image.png'].includes(req.url)){
        stats.downloads++;await record();res.writeHead(200,{'Content-Type':'image/png','Content-Length':image.length,ETag:'"synthetic-image-v1"'})
        if(req.url.endsWith('/slow-image.png')){let offset=0;const timer=setInterval(()=>{if(res.destroyed){clearInterval(timer);return}const end=Math.min(offset+Math.ceil(image.length/24),image.length);res.write(image.subarray(offset,end));offset=end;if(offset===image.length){clearInterval(timer);res.end()}},250);res.on('close',()=>clearInterval(timer))}else res.end(image)
        return
      }
      if(req.method==='POST'&&req.url==='/v1/chat/completions'){
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>9*1024*1024)throw Error('TOO_LARGE');chunks.push(chunk)}
        const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(body.model!=='fixture')throw Error('UNKNOWN_MODEL')
        stats.inference++;await record()
        const text=JSON.stringify(body.messages),validation=text.includes('双色验证')
        let tags=['合成标签']
        if(validation){const content=body.messages.flatMap(message=>Array.isArray(message.content)?message.content:[]),input=content.find(item=>item.image_url?.url)?.image_url.url;if(!input?.startsWith('data:image/'))throw Error('IMAGE_REQUIRED');const {data,info}=await sharp(Buffer.from(input.split(',')[1],'base64')).removeAlpha().raw().toBuffer({resolveWithObject:true});tags=[0,Math.floor(info.width/2)].map(x=>{const rgb=[...data.subarray(x*info.channels,x*info.channels+3)];return ['红色','绿色','蓝色'][rgb.indexOf(Math.max(...rgb))]})}
        const output=JSON.stringify({caption:validation?'双色验证':'合成服务描述（无真实模型推理）',ocrText:'',prompt:'Synthetic geometric design for workflow verification',tags})
        res.writeHead(200,{'Content-Type':'text/event-stream'})
        for(const entry of [{id:'fixture',choices:[{index:0,delta:{role:'assistant',content:output},finish_reason:null}]},{id:'fixture',choices:[{index:0,delta:{},finish_reason:'stop'}]}])res.write('data: '+JSON.stringify(entry)+'\n\n')
        res.end('data: [DONE]\n\n');return
      }
      res.writeHead(404);res.end()
    }catch{if(!res.headersSent)res.writeHead(400);res.end()}
  })
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(options.port ?? 0,'127.0.0.1',resolve)})
  const origin=`http://127.0.0.1:${server.address().port}`
  await fs.writeFile(path.join(directory,'registry.json'),JSON.stringify({schema:1,origin,ocr:true}))
  await record()
  return {origin,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}}
}
