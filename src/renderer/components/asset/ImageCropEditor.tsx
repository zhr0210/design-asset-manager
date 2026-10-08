import React, { useRef } from 'react'
import type { ImageCropRect } from '../../../shared/contracts/image-tools.contract'

const MIN_SIZE = 0.001
export default function ImageCropEditor({ rect, image, width, height, disabled, onChange }: {
  rect: ImageCropRect; image: string; width: number; height: number; disabled: boolean; onChange(rect: ImageCropRect): void
}) {
  const drag = useRef<{ x: number; y: number; pointer: number } | null>(null)
  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1), y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1) }
  }
  const update = (field: keyof ImageCropRect, percent: number) => {
    if (!Number.isFinite(percent)) return
    const next = { ...rect }
    const value = percent / 100
    if (field === 'left') next.left = clamp(value, 0, 1 - rect.width)
    if (field === 'top') next.top = clamp(value, 0, 1 - rect.height)
    if (field === 'width') next.width = clamp(value, MIN_SIZE, 1 - rect.left)
    if (field === 'height') next.height = clamp(value, MIN_SIZE, 1 - rect.top)
    onChange(next)
  }
  return <div className="image-crop-editor">
    <p>拖拽重新框选，或用百分比精调。画面聚焦后可用方向键移动区域。</p>
    <div className="image-crop-surface" role="group" aria-label="自由裁剪画面" aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
      style={{ width: `min(100%, ${Math.round(230 * width / height)}px)` }}
      onPointerDown={event => {
        if (disabled || event.button !== 0) return
        event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { ...point(event), pointer: event.pointerId }
      }}
      onPointerMove={event => {
        const start = drag.current
        if (disabled || !start || start.pointer !== event.pointerId) return
        const end = point(event)
        if (Math.abs(end.x - start.x) < MIN_SIZE || Math.abs(end.y - start.y) < MIN_SIZE) return
        onChange({ left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) })
      }}
      onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
      onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
      onKeyDown={event => {
        if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
        event.preventDefault(); event.stopPropagation()
        const step = event.shiftKey ? 0.1 : 0.01
        onChange({ ...rect, left: clamp(rect.left + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), 0, 1 - rect.width), top: clamp(rect.top + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0), 0, 1 - rect.height) })
      }}>
      <img src={image} alt="自由裁剪参考画面" draggable={false} />
      <div className="image-crop-rect" style={{ left: `${rect.left * 100}%`, top: `${rect.top * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}><span /></div>
    </div>
    <fieldset disabled={disabled} className="image-crop-values">{([['left', '左侧'], ['top', '顶部'], ['width', '宽度'], ['height', '高度']] as const).map(([field, label]) => <label key={field}>{label} %<input type="number" aria-label={`裁剪${label}百分比`} min={field === 'width' || field === 'height' ? 0.1 : 0} max={100} step={0.1} value={Number((rect[field] * 100).toFixed(1))} onChange={event => update(field, event.target.valueAsNumber)} /></label>)}</fieldset>
    <button type="button" disabled={disabled} onClick={() => onChange({ left: 0, top: 0, width: 1, height: 1 })}>选择整张画面</button>
  </div>
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }
