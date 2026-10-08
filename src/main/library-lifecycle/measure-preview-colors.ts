import sharp from 'sharp'
import type {MeasuredPreviewColors} from '../../shared/contracts/library-organization.contract'
export const PREVIEW_HISTOGRAM_RECIPE='srgb-128-alpha-histogram4-v1'
export interface PreviewColorHistogram {
 source:'controlled-preview';recipe:string;sampleWidth:number;sampleHeight:number;visibleWeight:number;
 bins:{rgb:[number,number,number];weight:number}[]
}
/** Shared bounded sRGB sampling. Transparent pixels contribute no weight;
 * partial alpha contributes proportionally to the visible-area denominator. */
export async function measurePreviewHistogram(bytes:Uint8Array):Promise<PreviewColorHistogram>{
 const {data,info}=await sharp(Buffer.from(bytes),{limitInputPixels:40_000_000}).rotate().resize(128,128,{fit:'inside',withoutEnlargement:true}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const bins=new Map<number,{weight:number;r:number;g:number;b:number}>();let total=0
 for(let i=0;i<data.length;i+=4){const w=data[i+3]/255;if(!w)continue;const key=((data[i]>>4)<<8)|((data[i+1]>>4)<<4)|(data[i+2]>>4);const bin=bins.get(key)||{weight:0,r:0,g:0,b:0};bin.weight+=w;bin.r+=data[i]*w;bin.g+=data[i+1]*w;bin.b+=data[i+2]*w;bins.set(key,bin);total+=w}
 return{source:'controlled-preview',recipe:PREVIEW_HISTOGRAM_RECIPE,sampleWidth:info.width,sampleHeight:info.height,visibleWeight:total,
   bins:[...bins.entries()].sort((a,b)=>b[1].weight-a[1].weight||a[0]-b[0]).map(([,bin])=>({rgb:[bin.r/bin.weight,bin.g/bin.weight,bin.b/bin.weight],weight:bin.weight}))}
}
/** Existing five-swatch palette remains a presentation of the same histogram.
 * Search uses all bins, so a minor colour is not reassigned to a large swatch. */
export async function measurePreviewColors(bytes:Uint8Array):Promise<MeasuredPreviewColors>{
 const histogram=await measurePreviewHistogram(bytes),total=histogram.visibleWeight
 const seeds=histogram.bins.slice(0,5).map(bin=>({r:Math.round(bin.rgb[0]),g:Math.round(bin.rgb[1]),b:Math.round(bin.rgb[2]),weight:0}))
 for(const bin of histogram.bins){const [r,g,b]=bin.rgb;let best=0,d=Infinity;seeds.forEach((c,i)=>{const distance=(c.r-r)**2+(c.g-g)**2+(c.b-b)**2;if(distance<d){d=distance;best=i}});seeds[best].weight+=bin.weight}
 const sorted=seeds.sort((a,b)=>b.weight-a.weight),raw=sorted.map(c=>total?c.weight/total*10000:0),units=raw.map(Math.floor);let rest=10000-units.reduce((a,b)=>a+b,0)
 raw.map((n,i)=>({i,f:n-units[i]})).sort((a,b)=>b.f-a.f||a.i-b.i).forEach(({i})=>{if(rest>0){units[i]++;rest--}})
 return{source:'controlled-preview',recipe:'srgb-128-alpha-histogram4-nearest5-v1',sampleWidth:histogram.sampleWidth,sampleHeight:histogram.sampleHeight,colors:sorted.map((c,i)=>({hex:'#'+[c.r,c.g,c.b].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase(),percentage:units[i]/100}))}
}
