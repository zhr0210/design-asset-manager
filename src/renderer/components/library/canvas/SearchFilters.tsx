import React,{useState} from 'react'
import type {AssetSearchField,AssetColorCoverage} from '../../../../shared/contracts/asset-search.contract'
import type {SearchOptions} from './useHostAssetSearch'

const fields:{id:AssetSearchField;name:string}[]=[{id:'name',name:'标题与文件名'},{id:'tags',name:'确认标签与别名'},
 {id:'ai-tags',name:'AI 建议标签'},{id:'description',name:'当前描述'},{id:'ocr',name:'OCR 文字'},{id:'prompt',name:'反推提示词'}]
export default function SearchFilters(p:{options:SearchOptions;setOptions(v:SearchOptions):void;colors:AssetColorCoverage|null}){
 const [hex,setHex]=useState(p.options.color?.hex??'#2288CC'),[percentage,setPercentage]=useState(String(p.options.color?.minimumPercentage??25))
 const [tolerance,setTolerance]=useState(String(p.options.color?.tolerance??30)),[error,setError]=useState('')
 const apply=()=>{const value=Number(percentage)
   if(!/^#[a-f0-9]{6}$/i.test(hex)||!Number.isFinite(value)||value<1||value>100){setError('请输入 #RRGGBB 颜色和 1–100 的占比。');return}
   setError('');p.setOptions({...p.options,color:{hex:hex.toUpperCase(),minimumPercentage:value,tolerance:Number(tolerance)}})
 }
 return <div className="search-filters">
  <label>文字来源<select aria-label="文字搜索来源" value={p.options.fields?.[0]??'all'} onChange={e=>p.setOptions({...p.options,fields:e.target.value==='all'?undefined:[e.target.value as AssetSearchField]})}>
   <option value="all">全部文字来源</option>{fields.map(field=><option key={field.id} value={field.id}>{field.name}</option>)}
  </select></label>
  <details open={p.options.color?true:undefined}><summary>颜色占比{p.options.color?` · ${p.options.color.hex} ≥${p.options.color.minimumPercentage}%`:''}</summary>
   <div className="search-color-fields"><label>颜色<input aria-label="查找颜色代码" value={hex} maxLength={7} placeholder="#2288CC" onChange={e=>setHex(e.target.value)}/></label>
    <label>至少占比 %<input aria-label="颜色最低占比" type="number" min="1" max="100" step="1" value={percentage} onChange={e=>setPercentage(e.target.value)}/></label>
    <label>近色范围<select aria-label="颜色近色范围" value={tolerance} onChange={e=>setTolerance(e.target.value)}><option value="15">较严格</option><option value="30">适中</option><option value="45">较宽</option></select></label>
    <button onClick={apply}>应用颜色筛选</button>{p.options.color&&<button onClick={()=>{setError('');p.setOptions({...p.options,color:undefined})}}>移除颜色筛选</button>}
   </div>
   <p>按受控预览的可见像素测量；透明部分不计，半透明按可见程度计入。颜色占比是抽样估计，近色按明度和色差匹配。</p>
   {p.colors&&<p>颜色测量 {p.colors.measured}/{p.colors.total}{p.colors.unavailable?` · ${p.colors.unavailable} 份暂不可测`:''}；未测或不可测素材不会当作匹配。</p>}
   {error&&<p role="alert">{error}</p>}
  </details>
  {p.options.fields&&p.options.mode!=='lexical'&&<small>文字来源约束文字命中；画面含义使用图片向量。颜色、标签与文件夹条件同时生效。</small>}
 </div>
}
