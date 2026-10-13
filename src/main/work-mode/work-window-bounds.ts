import type {WorkWindowLayout} from '../../shared/contracts/work-set.contract'
export interface WorkArea{x:number;y:number;width:number;height:number}
const areaFor=(value:{x:number;y:number;width:number;height:number},areas:readonly WorkArea[])=>{
 const fallback=areas[0]||{x:0,y:0,width:1280,height:800}
 const overlap=(area:WorkArea)=>Math.max(0,Math.min(value.x+value.width,area.x+area.width)-Math.max(value.x,area.x))*Math.max(0,Math.min(value.y+value.height,area.y+area.height)-Math.max(value.y,area.y))
 return areas.reduce((best,next)=>overlap(next)>overlap(best)?next:best,fallback)
}
export function visibleWorkBounds(saved:WorkWindowLayout|null,areas:readonly WorkArea[],offset=0):WorkWindowLayout{
 const fallback=areas[0]||{x:0,y:0,width:1280,height:800},value=saved||{x:fallback.x+40+(offset%Math.max(1,Math.floor((fallback.width-40)/444)))*444,y:fallback.y+40+Math.floor(offset/Math.max(1,Math.floor((fallback.width-40)/444)))*36,width:420,height:640,pinned:true,open:true}
 const area=areaFor(value.dock?.style==='edge-slide'?{...value,x:value.dock.edge==='left'?value.x+value.width*.84:value.x,width:value.width*.16}:value,areas)
 if(value.dock?.style==='edge-slide')return{...value,x:Math.round(value.dock.edge==='left'?area.x-value.width*.84:area.x+area.width-value.width*.16),y:Math.round(Math.max(area.y,Math.min(value.y,area.y+area.height-value.height))),dock:{...value.dock,normalBounds:{...value.dock.normalBounds}}}
 if(value.dock)return{...value,width:72,height:160,x:value.dock.edge==='left'?area.x:area.x+area.width-72,y:Math.round(Math.max(area.y,Math.min(value.y,area.y+area.height-160))),dock:{...value.dock,normalBounds:{...value.dock.normalBounds}}}
 const minimum=value.presentation==='compact'?{width:220,height:240}:{width:290,height:310}
 const width=Math.min(Math.max(minimum.width,value.width),Math.max(minimum.width,area.width)),height=Math.min(Math.max(minimum.height,value.height),Math.max(minimum.height,area.height))
 return{...value,width,height,x:Math.round(Math.max(area.x,Math.min(value.x,area.x+area.width-width))),y:Math.round(Math.max(area.y,Math.min(value.y,area.y+area.height-height)))}
}
export function dockWorkBounds(value:WorkWindowLayout,edge:'left'|'right',areas:readonly WorkArea[],style?:'edge-slide'):WorkWindowLayout{
 const normalBounds=value.dock?value.dock.normalBounds:{x:value.x,y:value.y,width:value.width,height:value.height}
 if(style==='edge-slide')return visibleWorkBounds({...value,...normalBounds,presentation:'compact',dock:{edge,style,normalBounds:{...normalBounds}}},areas)
 return visibleWorkBounds({...value,width:72,height:160,dock:{edge,normalBounds:{...normalBounds}}},areas)
}
export function expandedWorkBounds(value:WorkWindowLayout,areas:readonly WorkArea[]):WorkWindowLayout{
 if(!value.dock)return visibleWorkBounds(value,areas)
 const {dock,...normal}=value
 const expanded=visibleWorkBounds({...normal,...dock.normalBounds},areas)
 if(dock.style==='edge-slide'){const area=areaFor(value,areas);expanded.x=Math.round(dock.edge==='left'?area.x+12:area.x+area.width-expanded.width-12)}
 return visibleWorkBounds(expanded,areas)
}
/** A clicked shelf leaves the magnet zone while retaining its last size/y. */
export function insetShelfBounds(value:WorkWindowLayout,areas:readonly WorkArea[]):WorkWindowLayout{
 const area=areaFor(value.dock?.style==='edge-slide'?{...value,x:value.dock.edge==='left'?value.x+value.width*.84:value.x,width:value.width*.16}:value,areas),safe=Math.min(32,Math.max(0,(area.width-value.width)/2))
 return {...value,x:Math.round(Math.max(area.x+safe,Math.min(value.x,area.x+area.width-value.width-safe)))}
}

/** Normalize only the B presentation; other platform adapters retain legacy layouts. */
export function nativeShelfLayout(saved:WorkWindowLayout,areas:readonly WorkArea[]):WorkWindowLayout {
 const compact=(value:WorkWindowLayout):WorkWindowLayout=>{
  const {dock,...base}=value
  const normal={...base,...(dock?.normalBounds??{}),width:220,height:240,presentation:'compact' as const}
  return dock?dockWorkBounds(normal,dock.edge,areas,'edge-slide'):visibleWorkBounds(normal,areas)
 }
 if(saved.presentation)return saved.presentation==='compact'?compact(saved):visibleWorkBounds(saved,areas)
 if(saved.dock){
  const {dock,...base}=saved,normal={...base,...dock.normalBounds}
  if(normal.width>=420)return visibleWorkBounds({...normal,presentation:'expanded'},areas)
  return compact({...saved,presentation:'compact'})
 }
 const legacyDefault=saved.width===420&&saved.height===640
 return legacyDefault||saved.width<420?compact(saved):visibleWorkBounds({...saved,presentation:'expanded'},areas)
}
