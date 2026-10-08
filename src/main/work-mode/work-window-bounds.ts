import type {WorkWindowLayout} from '../../shared/contracts/work-set.contract'
export interface WorkArea{x:number;y:number;width:number;height:number}
export function visibleWorkBounds(saved:WorkWindowLayout|null,areas:readonly WorkArea[],offset=0):WorkWindowLayout{
 const fallback=areas[0]||{x:0,y:0,width:1280,height:800},value=saved||{x:fallback.x+40+(offset%Math.max(1,Math.floor((fallback.width-40)/444)))*444,y:fallback.y+40+Math.floor(offset/Math.max(1,Math.floor((fallback.width-40)/444)))*36,width:420,height:640,pinned:true,open:true}
 const overlap=(area:WorkArea)=>Math.max(0,Math.min(value.x+value.width,area.x+area.width)-Math.max(value.x,area.x))*Math.max(0,Math.min(value.y+value.height,area.y+area.height)-Math.max(value.y,area.y))
 const area=areas.reduce((best,next)=>overlap(next)>overlap(best)?next:best,fallback)
 const width=Math.min(Math.max(290,value.width),Math.max(290,area.width)),height=Math.min(Math.max(310,value.height),Math.max(310,area.height))
 return{...value,width,height,x:Math.round(Math.max(area.x,Math.min(value.x,area.x+area.width-width))),y:Math.round(Math.max(area.y,Math.min(value.y,area.y+area.height-height)))}
}
