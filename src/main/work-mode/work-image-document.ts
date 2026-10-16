import sharp from 'sharp'
import {deflateSync} from 'node:zlib'

/** Bounded real image outputs; sources are supplied by the Host handoff job. */
export async function composeWorkImages(inputs:Uint8Array[],options:{kind:'pdf'|'stitch';direction:'vertical'|'horizontal';gap:number;scale?:'original'|'uniform'},check:()=>void):Promise<Uint8Array>{
 if(!inputs.length||inputs.length>64||!Number.isInteger(options.gap)||options.gap<0||options.gap>256)throw Error('图像组合参数无效。')
 const images: {bytes:Buffer;width:number;height:number}[]=[];let totalPixels=0
 for(const bytes of inputs){check();const metadata=await sharp(bytes,{limitInputPixels:16_000_000}).metadata();check();if(!metadata.width||!metadata.height)throw Error('图片尺寸不可用。');totalPixels+=metadata.width*metadata.height;if(totalPixels>16_000_000)throw Error('组合图片总输入超过16百万像素，请减少素材。');if((metadata.pages??1)>1)throw Error('组合仅支持单帧图片，请先导出明确帧。');const result=await sharp(bytes,{limitInputPixels:16_000_000}).rotate().flatten({background:'#ffffff'}).toColourspace('srgb').removeAlpha().toFormat(options.kind==='pdf'?'raw':'png').toBuffer({resolveWithObject:true});check();images.push({bytes:options.kind==='pdf'?deflateSync(result.data):result.data,width:result.info.width,height:result.info.height})}
 if(options.kind==='stitch'){
  const vertical=options.direction==='vertical',cross=Math.max(...images.map(i=>vertical?i.width:i.height)),dimensions=images.map(i=>options.scale!=='uniform'?{width:i.width,height:i.height}:{width:vertical?cross:Math.round(i.width*cross/i.height),height:vertical?Math.round(i.height*cross/i.width):cross})
  const width=vertical?cross:dimensions.reduce((sum,i)=>sum+i.width,0)+options.gap*(images.length-1),height=vertical?dimensions.reduce((sum,i)=>sum+i.height,0)+options.gap*(images.length-1):cross
  if(width*height>16_000_000||width>32768||height>32768)throw Error('拼接结果超过16百万像素或32768边长，请减少素材。')
  const composites:sharp.OverlayOptions[]=[];let offset=0
  for(const [index,image] of images.entries()){check();const d=dimensions[index],input=await sharp(image.bytes).resize(d.width,d.height).png().toBuffer();check();composites.push({input,left:vertical?Math.floor((width-d.width)/2):offset,top:vertical?offset:Math.floor((height-d.height)/2)});offset+=(vertical?d.height:d.width)+options.gap}
  const result=await sharp({create:{width,height,channels:3,background:'#ffffff'}}).composite(composites).png().toBuffer();check();return result
 }
 // Each page is exactly the oriented image size in points. RGB image streams
 // are embedded independently; no external fonts, files or execution payloads.
 const objects:Buffer[]=[]
 objects.push(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'))
 objects.push(Buffer.from(`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`))
 for(const [index,image] of images.entries()){
  const page=3+index*3,content=Buffer.from(`q ${image.width} 0 0 ${image.height} 0 0 cm /Im0 Do Q`)
  objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${image.width} ${image.height}] /Resources << /XObject << /Im0 ${page+1} 0 R >> >> /Contents ${page+2} 0 R >>`))
  objects.push(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.bytes.length} >>\nstream\n`),image.bytes,Buffer.from('\nendstream')]))
  objects.push(Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')]))
 }
 const parts=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','binary')],offsets=[0];let offset=parts[0].length
 for(const [index,value] of objects.entries()){offsets.push(offset);const part=Buffer.concat([Buffer.from(`${index+1} 0 obj\n`),value,Buffer.from('\nendobj\n')]);parts.push(part);offset+=part.length}
 parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>n.toString().padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`))
 check();return Buffer.concat(parts)
}
