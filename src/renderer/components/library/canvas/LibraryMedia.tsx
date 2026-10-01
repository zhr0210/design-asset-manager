import React,{useState}from'react'
import type{Asset}from'../../../stores/asset.store'
/** Formal surfaces never accept filesystem paths, remote URLs or prototype media. */
export function controlledPreview(asset:Asset):string {const src=asset.fileUrl||asset.thumbnailPath||'';return src.startsWith('dam-preview://')?src:''}
export function LibraryMedia({asset,className,onLoad}:{asset:Asset;className?:string;onLoad?:(image:HTMLImageElement)=>void}){
 const [failed,setFailed]=useState('');const src=controlledPreview(asset)
 if(!src||failed===src)return <div className="lc-media-missing" role="status">预览暂不可用<span>请刷新或重新打开素材库</span></div>
 return <img className={className} src={src} alt={asset.title} draggable={false} onError={()=>setFailed(src)} onLoad={e=>onLoad?.(e.currentTarget)}/>
}
