import type {AssetColorFilter} from '../../shared/contracts/asset-search.contract'
import type {AssetDiscoveryEvidence} from '../../shared/workflows/asset-discovery.workflow'
import type {PreviewColorHistogram} from '../library-lifecycle/measure-preview-colors'

// CIE 1976 Delta E in D65 Lab, after standard sRGB linearisation.
function lab(rgb:readonly number[]):number[]{
 const [r,g,b]=rgb.map(n=>{const s=n/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4})
 const f=(v:number)=>v>216/24389?Math.cbrt(v):(24389/27*v+16)/116
 const x=f((0.4124564*r+0.3575761*g+0.1804375*b)/0.95047)
 const y=f(0.2126729*r+0.7151522*g+0.072175*b)
 const z=f((0.0193339*r+0.119192*g+0.9503041*b)/1.08883)
 return[116*y-16,500*(x-y),200*(y-z)]
}
export function matchPreviewColor(histogram:PreviewColorHistogram,filter:AssetColorFilter):AssetDiscoveryEvidence|null{
 if(histogram.visibleWeight<=0)return null
 const target=lab([1,3,5].map(start=>parseInt(filter.hex.slice(start,start+2),16)))
 const weight=histogram.bins.reduce((sum,bin)=>{const value=lab(bin.rgb)
   return sum+(Math.hypot(...value.map((n,i)=>n-target[i]))<=filter.tolerance+1e-8?bin.weight:0)},0)
 const percentage=weight/histogram.visibleWeight*100
 if(percentage+1e-8<filter.minimumPercentage)return null
 return{kind:'color',match:'measured',label:`预览颜色 ${filter.hex.toUpperCase()} · ${percentage.toFixed(2)}% · 近色 ΔE≤${filter.tolerance}`}
}
