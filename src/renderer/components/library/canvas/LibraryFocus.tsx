import React from 'react'
import type { Asset } from '../../../stores/asset.store'
import { useUIStore } from '../../../stores/ui.store'
import { FocusView, type NotebookAdapter } from '../../gallery/FocusView'
import { LibraryMedia, controlledPreview } from './LibraryMedia'
import type { GalleryAsset } from '../../gallery/types'
export function toGalleryAsset(asset: Asset): GalleryAsset {
  return {id:asset.id,title:asset.title,src:controlledPreview(asset),pixelLabel:'预览像素 1:1',kind:/^(mp4|webm|mov)$/i.test(asset.fileType)?'video':'image'}
}
export function LibraryFocus({asset,items,change,close,details,notebook}:{asset:Asset;items:Asset[];change:(id:string)=>void;close:()=>void;details:React.ReactNode;notebook:NotebookAdapter}) {
  const theme=useUIStore(s=>s.theme)
  return <div className={`gallery-design minimal-prototype formal-focus-surface ${theme==='dark'?'dark':''}`} data-testid="asset-quick-look" data-view-mode="focus" data-mode-phase="idle">
    <FocusView asset={toGalleryAsset(asset)} items={items.map(toGalleryAsset)} change={change} close={close} details={details} notebook={notebook} video={<LibraryMedia asset={asset}/>} media={onLoad=><LibraryMedia key={asset.id} asset={asset} onLoad={onLoad}/>}/>
  </div>
}
