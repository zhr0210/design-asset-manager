import sharp from 'sharp'
import type {MeasuredPreviewColors} from '../../shared/contracts/library-organization.contract'
/** Bounded sRGB preview measurement; alpha-weighted 4-bit histogram, nearest-color assignment. */
export async function measurePreviewColors(bytes:Uint8Array):Promise<MeasuredPreviewColors>{
 const {data,info}=await sharp(Buffer.from(bytes),{limitInputPixels:40_000_000}).rotate().resize(128,128,{fit:'inside',withoutEnlargement:true}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const bins=new Map<number,{weight:number;r:number;g:number;b:number}>();let total=0
 for(let i=0;i<data.length;i+=4){const w=data[i+3]/255;if(!w)continue;const key=((data[i]>>4)<<8)|((data[i+1]>>4)<<4)|(data[i+2]>>4);const bin=bins.get(key)||{weight:0,r:0,g:0,b:0};bin.weight+=w;bin.r+=data[i]*w;bin.g+=data[i+1]*w;bin.b+=data[i+2]*w;bins.set(key,bin);total+=w}
 const seeds=[...bins.entries()].sort((a,b)=>b[1].weight-a[1].weight||a[0]-b[0]).slice(0,5).map(([,b])=>({r:Math.round(b.r/b.weight),g:Math.round(b.g/b.weight),b:Math.round(b.b/b.weight),weight:0}))
 for(const bin of bins.values()){const r=bin.r/bin.weight,g=bin.g/bin.weight,b=bin.b/bin.weight;let best=0,d=Infinity;seeds.forEach((c,i)=>{const distance=(c.r-r)**2+(c.g-g)**2+(c.b-b)**2;if(distance<d){d=distance;best=i}});seeds[best].weight+=bin.weight}
 const sorted=seeds.sort((a,b)=>b.weight-a.weight),raw=sorted.map(c=>total?c.weight/total*10000:0),units=raw.map(Math.floor);let rest=10000-units.reduce((a,b)=>a+b,0)
 raw.map((n,i)=>({i,f:n-units[i]})).sort((a,b)=>b.f-a.f||a.i-b.i).forEach(({i})=>{if(rest>0){units[i]++;rest--}})
 return{source:'controlled-preview',recipe:'srgb-128-alpha-histogram4-nearest5-v1',sampleWidth:info.width,sampleHeight:info.height,colors:sorted.map((c,i)=>({hex:'#'+[c.r,c.g,c.b].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase(),percentage:units[i]/100}))}
}
