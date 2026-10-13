import React, { useEffect, useRef, useState } from 'react'
import { Search, Shuffle, Tags, Folder, SlidersHorizontal, MoreHorizontal, X, Plus, Moon, Palette, RotateCcw } from 'lucide-react'

type MenuItem = { id:string; label:string; Icon:React.ComponentType<any> }
export function BottomDock({assetActions=true,query,setQuery,tags,chosen,toggleTag,quick,toggleQuick,shuffle,category,setCategory,menuAction,menuItems,searchRef,unclassifiedUnavailable,searchUnavailable,searchControl,searchStatus,searchMethodLabel}:{
  assetActions?:boolean; query:string; setQuery:(v:string)=>void; tags:string[]; chosen:string[]; toggleTag:(v:string)=>void;
  quick:string[]; toggleQuick:(v:string)=>void; shuffle:()=>void; category:string; setCategory:(v:string)=>void;
  menuAction:(v:string)=>void; menuItems?:MenuItem[]; searchRef?:React.Ref<HTMLInputElement>;
  unclassifiedUnavailable?:string; searchUnavailable?:string; searchControl?:React.ReactNode; searchStatus?:React.ReactNode; searchMethodLabel?:string
}) {
  const [filterOpen,setFilterOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false)
  const [ghosts,setGhosts]=useState<{id:number;tag:string;x:number;y:number}[]>([])
  const timers=useRef<ReturnType<typeof setTimeout>[]>([]),root=useRef<HTMLDivElement>(null),lastTrigger=useRef<HTMLElement|null>(null)
  const close = (restore=false) => {setFilterOpen(false);setMenuOpen(false);setSearchOpen(false);if(restore)lastTrigger.current?.focus()}
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[])
  useEffect(()=>{
    const out=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close()}
    document.addEventListener('pointerdown',out)
    return()=>document.removeEventListener('pointerdown',out)
  },[])
  useEffect(()=>{
    if(filterOpen||menuOpen||searchOpen)root.current?.querySelector<HTMLElement>('[data-dock-popup]:not([hidden]) :is(button:not(:disabled),input:not(:disabled),select:not(:disabled))')?.focus()
  },[filterOpen,menuOpen,searchOpen])
  useEffect(()=>{
    if(!filterOpen&&!menuOpen&&!searchOpen)return
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close(true)}}
    document.addEventListener('keydown',escape)
    return()=>document.removeEventListener('keydown',escape)
  },[filterOpen,menuOpen,searchOpen])
  useEffect(()=>{
    const element=root.current,main=element?.closest<HTMLElement>('.main-view')
    if(!element||!main)return
    const observer=new ResizeObserver(()=>main.style.setProperty('--search-reserve',`${element.getBoundingClientRect().height+28}px`))
    observer.observe(element)
    return()=>{observer.disconnect();main.style.removeProperty('--search-reserve')}
  },[])
  const open=(kind:'filter'|'menu'|'search',event:React.MouseEvent<HTMLButtonElement>)=>{
    lastTrigger.current=event.currentTarget
    setFilterOpen(kind==='filter'?!filterOpen:false);setMenuOpen(kind==='menu'?!menuOpen:false);setSearchOpen(kind==='search'?!searchOpen:false)
  }
  const remove=(e:React.MouseEvent<HTMLButtonElement>,tag:string)=>{
    const r=e.currentTarget.getBoundingClientRect();toggleTag(tag)
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return
    const id=Date.now()+Math.random();setGhosts(v=>[...v,{id,tag,x:r.left+r.width/2,y:r.top+r.height/2}]);timers.current.push(setTimeout(()=>setGhosts(v=>v.filter(x=>x.id!==id)),450))
  }
  const actions=menuItems||[{id:'clear',label:'清除所有筛选',Icon:RotateCcw},{id:'new-set',label:'将所选素材加入工作集',Icon:Plus},{id:'palettes',label:'打开色板文件夹',Icon:Palette},{id:'tags',label:'标签管理',Icon:Tags},{id:'theme',label:'切换明暗外观',Icon:Moon}]
  return <div ref={root} className="bottom-dock" onKeyDown={e=>{
    if(e.key==='Escape'&&(filterOpen||menuOpen||searchOpen)){e.preventDefault();e.stopPropagation();close(true)}
    if(menuOpen&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&(e.target as HTMLElement).closest('[role=menu]')){
      e.preventDefault();const buttons=Array.from(root.current?.querySelectorAll<HTMLElement>('[role=menuitem]')||[]);const i=buttons.indexOf(document.activeElement as HTMLElement)
      const index=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length;buttons[index]?.focus()
    }
  }}>
    {searchStatus&&<div className="dock-feedback">{searchStatus}</div>}
    <div className="dock-tag-row"><button disabled={!assetActions} title={assetActions?'按标签筛选素材':'进入素材文件夹后筛选标签'} className={`glass ${filterOpen?'active':''}`} onClick={e=>open('filter',e)} aria-expanded={filterOpen}><SlidersHorizontal/>标签筛选</button>
      {chosen.map(t=><button className="tag-chip glass" key={t} onClick={e=>remove(e,t)} aria-label={`取消筛选 tag:${t}`}><span>{t}</span><X size={13}/></button>)}{!chosen.length&&<span className="dock-hint">以颜色、内容或灵感寻找</span>}
    </div>
    <div className="dock-search-row glass"><label className="dock-search"><Search size={20}/><input type="text" ref={searchRef} disabled={Boolean(searchUnavailable)} title={searchUnavailable} aria-label="搜索素材" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索你的素材…"/>{query&&<button className="icon" aria-label="清除搜索" onClick={()=>setQuery('')}><X size={15}/></button>}</label>
      <div className="dock-actions">
        {searchControl&&<button className="search-method" aria-label="查找方式与检索筛选" aria-expanded={searchOpen} aria-controls="retrieval-popover" onClick={e=>open('search',e)}><SlidersHorizontal/>{searchMethodLabel||'查找方式'}</button>}
        <button disabled={!assetActions} aria-label="随机打乱" title="随机打乱" onClick={shuffle}><Shuffle/></button>
        <button disabled={!assetActions} aria-label="未标签" title="未标签" aria-pressed={quick.includes('untagged')} className={quick.includes('untagged')?'active':''} onClick={()=>toggleQuick('untagged')}><Tags/></button>
        <button disabled={!assetActions||Boolean(unclassifiedUnavailable)} aria-label="未分类" title={unclassifiedUnavailable||'未分类'} aria-pressed={quick.includes('unclassified')} className={quick.includes('unclassified')?'active':''} onClick={()=>toggleQuick('unclassified')}><Folder/></button>
        <button className="dock-more" aria-expanded={menuOpen} aria-label="更多功能菜单" onClick={e=>open('menu',e)}><MoreHorizontal/>菜单</button>
      </div>
    </div>
    {filterOpen&&<section data-dock-popup className="dock-popover glass" role="dialog" aria-label="标签筛选"><h3>以标签组合查找 <small>同时匹配所选标签</small></h3><div className="tags">{tags.map(t=><button key={t} aria-pressed={chosen.includes(t)} className={chosen.includes(t)?'active':''} onClick={()=>toggleTag(t)}>{t}{chosen.includes(t)&&<X size={12}/>}</button>)}</div><button className="wide" onClick={()=>close(true)}>完成</button></section>}
    {searchControl&&<section id="retrieval-popover" data-dock-popup hidden={!searchOpen} className="dock-popover retrieval-popover glass" role="dialog" aria-label="检索与索引维护">
      <header><h3>查找方式与筛选</h3><button className="icon" aria-label="收起检索设置" onClick={()=>close(true)}><X size={16}/></button></header>{searchControl}
    </section>}
    {menuOpen&&<section data-dock-popup className="dock-popover dock-menu glass" aria-label="素材操作" role="dialog" data-testid="library-actions-popover"><h3>显示格式</h3><div className="tags">{['全部素材','图片','视频','文字','字体','文档'].map(t=><button key={t} disabled={!assetActions} className={category===t?'active':''} aria-pressed={category===t} onClick={()=>setCategory(t)}>{t}</button>)}</div><nav role="menu" aria-label="素材操作">{actions.map(({id,label,Icon})=><button role="menuitem" className="menu-row" key={id} onClick={()=>{menuAction(id);close(true)}}><Icon size={15}/>{label}</button>)}</nav></section>}
    <div className="tag-particles" aria-hidden="true">{ghosts.map(g=><div key={g.id} style={{left:g.x,top:g.y}}><span>{g.tag}</span>{Array.from({length:12},(_,i)=><i key={i} style={{'--dx':`${Math.cos(i*2.4)*(25+i*3)}px`,'--dy':`${Math.sin(i*2.4)*(20+i*3)}px`} as React.CSSProperties}/>)}</div>)}</div>
  </div>
}
