import type {WorkWindowLayout} from '../../shared/contracts/work-set.contract'
export interface WorkArea{x:number;y:number;width:number;height:number}
const areaFor=(value:{x:number;y:number;width:number;height:number},areas:readonly WorkArea[])=>{
 const fallback=areas[0]||{x:0,y:0,width:1280,height:800}
 const overlap=(area:WorkArea)=>Math.max(0,Math.min(value.x+value.width,area.x+area.width)-Math.max(value.x,area.x))*Math.max(0,Math.min(value.y+value.height,area.y+area.height)-Math.max(value.y,area.y))
 return areas.reduce((best,next)=>overlap(next)>overlap(best)?next:best,fallback)
}
export function visibleWorkBounds(saved:WorkWindowLayout|null,areas:readonly WorkArea[],offset=0):WorkWindowLayout{
 const fallback=areas[0]||{x:0,y:0,width:1280,height:800},value=saved||{x:fallback.x+40+(offset%Math.max(1,Math.floor((fallback.width-40)/444)))*444,y:fallback.y+40+Math.floor(offset/Math.max(1,Math.floor((fallback.width-40)/444)))*36,width:420,height:640,pinned:true,open:true}
 const area=areaFor(value,areas)
 if(value.dock)return{...value,width:72,height:160,x:value.dock.edge==='left'?area.x:area.x+area.width-72,y:Math.round(Math.max(area.y,Math.min(value.y,area.y+area.height-160))),dock:{...value.dock,normalBounds:{...value.dock.normalBounds}}}
 const width=Math.min(Math.max(290,value.width),Math.max(290,area.width)),height=Math.min(Math.max(310,value.height),Math.max(310,area.height))
 return{...value,width,height,x:Math.round(Math.max(area.x,Math.min(value.x,area.x+area.width-width))),y:Math.round(Math.max(area.y,Math.min(value.y,area.y+area.height-height)))}
}
export function dockWorkBounds(value:WorkWindowLayout,edge:'left'|'right',areas:readonly WorkArea[]):WorkWindowLayout{
 const normalBounds=value.dock?value.dock.normalBounds:{x:value.x,y:value.y,width:value.width,height:value.height}
 return visibleWorkBounds({...value,width:72,height:160,dock:{edge,normalBounds:{...normalBounds}}},areas)
}
export function expandedWorkBounds(value:WorkWindowLayout,areas:readonly WorkArea[]):WorkWindowLayout{
 if(!value.dock)return visibleWorkBounds(value,areas)
 const {dock,...normal}=value
 return visibleWorkBounds({...normal,...dock.normalBounds},areas)
}
