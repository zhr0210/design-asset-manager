// Generated fixtures and isolated codec processes; no model, library or remote service.
import assert from 'node:assert/strict'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const mode=process.argv[2]
if(mode==='--codec-child'){
 const file=process.argv[3],expected=Number(process.argv[4]);sharp.cache(false)
 const baseline=process.memoryUsage().rss,source=await fs.readFile(file)
 assert.ok(source.length<=32*1024*1024)
 const m=await sharp(source,{limitInputPixels:50_000_000}).metadata();assert.equal(m.width*m.height,expected)
 const jpeg=await sharp(source,{limitInputPixels:50_000_000}).rotate().resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:85}).toBuffer()
 assert.ok(jpeg.length<=4*1024*1024)
 const peak=process.resourceUsage().maxRSS*1024
 console.log(JSON.stringify({sourceBytes:source.length,pixels:expected,rawRgbaBudget:expected*4,jpegBytes:jpeg.length,baselineRss:baseline,observedPeakRss:peak,observedAdditionalRss:Math.max(0,peak-baseline),inputSha256:createHash('sha256').update(source).digest('hex'),outputSha256:createHash('sha256').update(jpeg).digest('hex')}))
}else{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-visual-budget-')))
 const cases=[]
 try{
  const base=Buffer.alloc(1024*1024*4);let x=42
  for(let i=0;i<base.length;i+=4){x=(Math.imul(x,1664525)+1013904223)>>>0;base[i]=x&255;base[i+1]=(x>>>8)&255;base[i+2]=(x>>>16)&255;base[i+3]=i%20===0?100:255}
  for(const [name,w,h,format] of [['alpha-png',1024,1024,'png'],['maximum-pixels-png',8000,6250,'png'],['maximum-pixels-jpeg',8000,6250,'jpeg'],['alpha-webp',2048,2048,'webp']]){
   const file=path.join(root,`${name}.${format}`)
   await sharp(base,{raw:{width:1024,height:1024,channels:4}}).resize(w,h,{kernel:'nearest'}).toFormat(format).toFile(file)
   const run=spawnSync(process.execPath,[process.argv[1],'--codec-child',file,String(w*h)],{encoding:'utf8',timeout:60000})
   assert.equal(run.status,0,run.stderr);cases.push({name,...JSON.parse(run.stdout)})
  }
  const result={basis:'observed synthetic native peak, not a hard RSS bound',sharp:sharp.versions,platform:process.platform,arch:process.arch,cases,proposedCodecAllowanceBytes:256*1024*1024}
  assert.ok(cases.every(c=>c.observedAdditionalRss<=c.sourceBytes+c.rawRgbaBudget+result.proposedCodecAllowanceBytes))
  console.log(JSON.stringify(result,null,2))
 }finally{await fs.rm(root,{recursive:true,force:true})}
}
