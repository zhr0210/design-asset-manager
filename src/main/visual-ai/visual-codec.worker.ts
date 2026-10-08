import {isVisualCodecRuntimeQualified,WINDOWS_CODEC_ARTIFACTS} from './visual-codec-qualification.internal'
/** Fixed, application-owned child program. Receives bounded bytes, never asset paths or credentials. */
export const VISUAL_CODEC_WORKER_SOURCE=String.raw`
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require(process.argv[2]);
const qualifies=${isVisualCodecRuntimeQualified.toString()};
function refuse(){fs.writeSync(3,JSON.stringify({error:'VISUAL_CODEC_UNQUALIFIED'}));process.exit(3)}
if(!qualifies({platform:process.platform,arch:process.arch,node:process.versions.node,electron:process.versions.electron,modules:process.versions.modules,sharp:sharp.versions.sharp,vips:sharp.versions.vips}))refuse();
if(process.platform==='win32'){
 const ownRequire=require('node:module').createRequire(process.argv[2]),dir=path.dirname(ownRequire.resolve('@img/sharp-win32-x64/sharp.node'));
 for(const [name,expected] of Object.entries(${JSON.stringify(WINDOWS_CODEC_ARTIFACTS)})){const file=path.join(dir,name),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)refuse()}
}
sharp.cache(false);
const size=Number(process.argv[1]),limit=32*1024*1024,maximum=4*1024*1024;
if(!Number.isSafeInteger(size)||size<1||size>limit)process.exit(2);
const baseline=process.memoryUsage().rss;let source=Buffer.allocUnsafe(size),offset=0;
process.stdin.on('data',chunk=>{if(offset+chunk.length>size)process.exit(2);chunk.copy(source,offset);offset+=chunk.length});
process.stdin.on('end',async()=>{
 try{
  if(offset!==size)throw Error();
  const m=await sharp(source,{limitInputPixels:50000000,animated:false}).metadata();
  if(!['png','jpeg','webp'].includes(m.format)||m.depth!=='uchar'||(m.pages||1)!==1||m.channels>4||!m.width||!m.height||m.width*m.height>50000000)throw Error();
  const jpeg=await sharp(source,{limitInputPixels:50000000,animated:false}).rotate().resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85}).toBuffer();
  if(jpeg.length>maximum)throw Error();
  const stats={sharp:sharp.versions.sharp,vips:sharp.versions.vips,pixels:m.width*m.height,baseline,additionalRss:process.platform==='win32'?null:Math.max(0,process.resourceUsage().maxRSS*1024-baseline)};
  source=undefined;
  fs.writeSync(3,JSON.stringify(stats)+'\n');process.stdout.end(jpeg);
  // Windows maxRSS is unavailable. Keep the owned process alive until the parent
  // has sampled the real OS peak and its helper overhead; no zero fallback.
  if(process.platform==='win32'){const ack=Buffer.alloc(1);if(fs.readSync(4,ack,0,1,null)!==1||ack[0]!==1)process.exitCode=2}
 }catch{process.exitCode=2}
});
`
