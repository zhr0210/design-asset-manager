import React from 'react'
import {ArrowLeft,ArrowRight,ImagePlus} from 'lucide-react'
export function FloatingNavigation({back,forward,canBack,canForward,add,children}:{back:()=>void;forward:()=>void;canBack:boolean;canForward:boolean;add?:()=>void;children?:React.ReactNode}) {
 return <header className="floating-navigation" aria-label="素材导航"><div className="floating-history"><button className="glass" title="后退" aria-label="后退" disabled={!canBack} onClick={back}><ArrowLeft/></button><button className="glass" title="前进" aria-label="前进" disabled={!canForward} onClick={forward}><ArrowRight/></button></div><div className="floating-actions">{children}{add&&<button className="glass" title="添加图片" aria-label="添加图片" onClick={add}><ImagePlus/></button>}</div></header>
}
