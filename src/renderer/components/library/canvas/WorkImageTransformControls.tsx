import React from 'react'
import type {WorkImageTransform} from '../../../../shared/contracts/work-media.contract'

export const DEFAULT_WORK_IMAGE_TRANSFORM:WorkImageTransform={format:'png',quality:85,stripMetadata:true}

export function WorkImageTransformControls({value,onChange,disabled}:{value:WorkImageTransform;onChange:(value:WorkImageTransform)=>void;disabled:boolean}){
 return <fieldset className="work-image-transform" disabled={disabled}>
  <legend>图像处理副本</legend>
  <label>输出格式<select aria-label="图像输出格式" value={value.format} onChange={event=>onChange({...value,format:event.target.value as WorkImageTransform['format']})}><option value="png">PNG · 无损</option><option value="jpeg">JPEG · 透明区域转白底</option><option value="webp">WebP</option></select></label>
  <label>压缩质量<input aria-label="图像压缩质量" type="number" min={1} max={100} step={1} disabled={disabled||value.format==='png'} value={value.quality} onChange={event=>onChange({...value,quality:event.target.valueAsNumber})}/></label>
  {value.format==='png'&&<small>PNG 为无损格式，不应用压缩质量参数。</small>}
  <label><input type="checkbox" aria-label="限制图像尺寸" checked={Boolean(value.resize)} onChange={event=>onChange({...value,resize:event.target.checked?{fit:'inside',width:1024,height:1024}:undefined})}/>限制尺寸</label>
  {value.resize&&<div><label>最大宽度<input aria-label="图像最大宽度" type="number" min={1} max={4096} step={1} value={value.resize.width} onChange={event=>onChange({...value,resize:{...value.resize!,width:event.target.valueAsNumber}})}/></label><label>最大高度<input aria-label="图像最大高度" type="number" min={1} max={4096} step={1} value={value.resize.height} onChange={event=>onChange({...value,resize:{...value.resize!,height:event.target.valueAsNumber}})}/></label><small>保持比例，自动校正方向，不放大原图。</small></div>}
  <label><input type="checkbox" aria-label="删除图像元数据" checked={value.stripMetadata} onChange={event=>onChange({...value,stripMetadata:event.target.checked})}/>删除元数据</label>
  {!value.stripMetadata&&<small>仅保留处理器支持的元数据，完成后显示实际保留类型。</small>}
 </fieldset>
}
