import React from 'react'
import {Folder,Sparkles,Palette} from 'lucide-react'
export function FolderCard({name,count,covers,colors,ai,onOpen}:{name:string;count:number;covers?:string[];colors?:string[];ai?:boolean;onOpen:()=>void}){
 return <button className={`visual-folder ${colors?'color-folder':''}`} onClick={onOpen} aria-label={`打开文件夹 ${name}`}><div className="folder-object"><div className="folder-back"/>{covers?.slice(0,3).map((src,i)=><img key={src+i} className={`folder-peek peek-${i}`} src={src} alt=""/>)}{colors?.slice(0,4).map((c,i)=><span key={c+i} className={`folder-color peek-${i}`} style={{background:c}}/>)}<div className="folder-front glass"><span>{colors?<Palette size={20}/>:ai?<Sparkles size={20}/>:<Folder size={20}/>}</span></div></div><strong>{name}</strong><small>{count} {colors?'种颜色':'份内容'}{ai?' · AI 动态分类':''}</small></button>
}
