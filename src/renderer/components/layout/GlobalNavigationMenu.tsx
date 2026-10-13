import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { getAppMenuNavigationItems } from '../../../shared/workflows/app-navigation.workflow'
export default function GlobalNavigationMenu() {
  const trigger = useRef<HTMLButtonElement>(null), root = useRef<HTMLDivElement>(null), popup = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const [position,setPosition] = useState({left:78,bottom:60})
  const close = (restore = false) => { setOpen(false); if (restore) trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    const rect=trigger.current?.getBoundingClientRect()
    if(rect)setPosition({left:Math.max(8,Math.min(rect.right+8,window.innerWidth-308)),bottom:Math.max(8,window.innerHeight-rect.bottom)})
    popup.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)&&!popup.current?.contains(event.target as Node)) close() }
    const reposition=()=>close(true)
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close(true)}}
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown',escape)
    window.addEventListener('resize',reposition)
    return () => { document.removeEventListener('pointerdown', outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',reposition) }
  }, [open])
  return <div ref={root} className="rail-global-menu" onKeyDown={event=>{
    if (!open) return
    if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
    if (!['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return
    event.preventDefault()
    const items = Array.from(popup.current?.querySelectorAll<HTMLElement>('[role=menuitem]')??[])
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next = event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowUp'?-1:1)+items.length)%items.length
    items[next]?.focus()
  }}>
    <button ref={trigger} type="button" title="更多功能" aria-label="打开导航菜单" aria-haspopup="menu" aria-expanded={open} aria-controls="workspace-tools" onClick={()=>setOpen(!open)}><MoreHorizontal /><span className="rail-tooltip">更多功能</span></button>
    {open&&createPortal(<nav ref={popup} id="workspace-tools" style={position} className="rail-global-popover" role="menu" aria-label="应用功能" data-testid="global-navigation-menu-popover">
      {getAppMenuNavigationItems().map(item=><NavLink key={item.id} role="menuitem" to={item.path} onClick={()=>close()}>{item.sidebarLabel}</NavLink>)}
      <hr className="ui-divider" />
      <button type="button" role="menuitem" onClick={()=>{close(true);window.dispatchEvent(new Event('workspace-recovery-open'))}}>本机恢复草稿</button>
      <button type="button" role="menuitem" onClick={()=>{close(true);window.dispatchEvent(new Event('workspace-quit'))}}>退出整个 DAM</button>
    </nav>,document.body)}
  </div>
}
