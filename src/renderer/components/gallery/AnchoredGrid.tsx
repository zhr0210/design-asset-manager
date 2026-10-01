import React,{useLayoutEffect,useRef,useState}from'react'

export interface GridAnchor {id:string;x:number;top:number;width:number;height:number;columns:number}
export function captureGridAnchor(id:string):GridAnchor|null{const e=document.querySelector<HTMLElement>(`[data-grid-asset="${id}"]`);const grid=e?.parentElement;if(!e||!grid)return null;const r=e.getBoundingClientRect(),g=grid.getBoundingClientRect();grid.dispatchEvent(new Event('dam-grid-capture'));return{id,x:r.left-g.left,top:r.top,width:r.width,height:r.height,columns:Math.max(1,Math.round((grid.clientWidth+20)/(r.width+20)))}}
export function AnchoredGrid<T extends {id:string}>({items,tileSize,anchor,render}:{items:T[];tileSize:number;anchor:GridAnchor|null;render:(asset:T)=>React.ReactNode}){
 const ref=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(0);const rects=useRef(new Map<string,DOMRect>());const animations=useRef<Animation[]>([]);const settled=useRef('');const previousAnchor=useRef<GridAnchor|null>(null)
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const capture=()=>{rects.current=new Map(Array.from(el.querySelectorAll<HTMLElement>('[data-grid-asset]')).map(e=>[e.dataset.gridAsset!,e.getBoundingClientRect()]));animations.current.forEach(a=>a.cancel());animations.current=[]};el.addEventListener('dam-grid-capture',capture);const ob=new ResizeObserver(entries=>setWidth(Math.round(entries[0].contentRect.width)));ob.observe(el);setWidth(el.clientWidth);return()=>{ob.disconnect();el.removeEventListener('dam-grid-capture',capture)}},[])
 const gap=20,available=Math.max(1,width),normalCols=Math.max(1,Math.floor((available+gap)/(tileSize+gap))),normalWidth=(available-gap*(normalCols-1))/normalCols
 const valid=anchor&&items.some(a=>a.id===anchor.id)?anchor:null
 const columnCount=valid?Math.max(normalCols,valid.columns||normalCols):normalCols
 const itemWidth=(available-gap*(columnCount-1))/columnCount
 const columns=Array.from({length:columnCount},(_,i)=>i*(itemWidth+gap)),offset=0
 const cardHeight=itemWidth*560/480+66,rowHeight=cardHeight+26
 const positions=items.map((a,i)=>({id:a.id,x:columns[i%columnCount],y:Math.floor(i/columnCount)*rowHeight}))
 const contentHeight=Math.max(0,Math.ceil((items.length+offset)/columns.length)*rowHeight);const scroller=ref.current?.closest('.library-content');const selectedPosition=valid?positions.find(p=>p.id===valid.id):null;const height=selectedPosition&&scroller?Math.max(contentHeight,selectedPosition.y+scroller.clientHeight-(valid!.top-scroller.getBoundingClientRect().top)):contentHeight
 const signature=`${width}:${tileSize}:${valid?.id||''}:${items.map(a=>a.id).join(',')}`
 useLayoutEffect(()=>{const el=ref.current;if(!el||!width)return;animations.current.forEach(a=>a.cancel());animations.current=[];const scroll=el.closest('.library-content') as HTMLElement|null;const scrollAnchor=valid||previousAnchor.current;const selected=scrollAnchor?el.querySelector<HTMLElement>(`[data-grid-asset="${scrollAnchor.id}"]`):null
  if(selected&&scroll&&settled.current!==signature){scroll.scrollTop+=selected.getBoundingClientRect().top-(valid?.top??rects.current.get(scrollAnchor!.id)?.top??selected.getBoundingClientRect().top);settled.current=signature}
  const next=new Map<string,DOMRect>();el.querySelectorAll<HTMLElement>('[data-grid-asset]').forEach(e=>next.set(e.dataset.gridAsset!,e.getBoundingClientRect()))
  animations.current.forEach(a=>a.cancel());animations.current=[]
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches){el.querySelectorAll<HTMLElement>('[data-grid-asset]').forEach(e=>{const before=rects.current.get(e.dataset.gridAsset!),after=next.get(e.dataset.gridAsset!)!;if(!before)return;const isAnchor=scrollAnchor?.id===e.dataset.gridAsset;const dx=before.left-after.left,dy=isAnchor?0:before.top-after.top;if(Math.abs(dx)+Math.abs(dy)<1&&Math.abs(before.width-after.width)<1)return;animations.current.push(e.animate([{transform:`translate(${dx}px,${dy}px) scale(${before.width/after.width})`},{transform:'none'}],{duration:200,easing:'cubic-bezier(.2,.75,.25,1)'}))})}
  rects.current=next;previousAnchor.current=valid
 },[signature])
 useLayoutEffect(()=>()=>animations.current.forEach(a=>a.cancel()),[])
 return <div className="asset-grid anchored-grid" ref={ref} style={{height}}>{items.map((a,i)=><div key={a.id} data-grid-asset={a.id} data-grid-anchor={valid?.id===a.id?'true':undefined} className="grid-slot" style={{left:positions[i].x,top:positions[i].y,width:itemWidth}}>{render(a)}</div>)}</div>
}
