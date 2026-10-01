/** Fixed, application-owned child program. Receives bounded bytes, never asset paths or credentials. */
export const VISUAL_CODEC_WORKER_SOURCE=String.raw`
const fs=require('node:fs'),sharp=require(process.argv[2]);
if(process.platform!=='darwin'||process.arch!=='arm64'||sharp.versions.sharp!=='0.34.5'||sharp.versions.vips!=='8.17.3'){fs.writeSync(3,JSON.stringify({error:'VISUAL_CODEC_UNQUALIFIED'}));process.exit(3)}
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
  const stats={sharp:sharp.versions.sharp,vips:sharp.versions.vips,pixels:m.width*m.height,additionalRss:Math.max(0,process.resourceUsage().maxRSS*1024-baseline)};
  source=undefined;
  fs.writeSync(3,JSON.stringify(stats));process.stdout.end(jpeg);
 }catch{process.exitCode=2}
});
`
