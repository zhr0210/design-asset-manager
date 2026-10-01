import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { PresencePanel } from '../ui/WorkspaceMotion'
import { NavLink } from 'react-router-dom'
import { Grid2X2, Moon, Sun, X } from 'lucide-react'
import { useUIStore } from '../../stores/ui.store'
import { getAppMenuNavigationItems } from '../../../shared/workflows/app-navigation.workflow'

export default function GlobalNavigationMenu() {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useUIStore()
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); triggerRef.current?.focus() }
    }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', escape) }
  }, [open, setMenuOpen])
  return <div ref={rootRef} className="absolute right-5 top-3 z-[100]">
    <button ref={triggerRef} type="button" className="ui-button ui-button-ghost h-9 w-9 p-0" title="更多功能" aria-label="打开导航菜单" aria-expanded={open} aria-controls="workspace-tools" onClick={() => setMenuOpen(!open)}>
      {open ? <X aria-hidden="true" /> : <Grid2X2 aria-hidden="true" />}
    </button>
    <AnimatePresence>{open && <PresencePanel key="tools" id="workspace-tools" data-testid="global-navigation-menu-popover" className="ui-card absolute right-0 top-12 w-[280px] p-2" style={{ boxShadow: 'var(--glass-shadow)', background: 'var(--glass-dense)', backdropFilter: 'var(--glass-blur)', borderRadius: 22 }}>
      <div className="ui-eyebrow px-3 pb-2 pt-2">更多功能</div>
      <nav className="grid grid-cols-2 gap-1" aria-label="应用功能">
        {getAppMenuNavigationItems().map(item => <NavLink key={item.id} to={item.path} state={{ overlayOrigin: 'menu' }} onClick={() => setMenuOpen(false)} className={({isActive}) => 'ui-button justify-start border-transparent text-left ' + (isActive ? 'ui-button-primary' : 'ui-button-ghost')}>
          {item.sidebarLabel}
        </NavLink>)}
      </nav>
      <hr className="ui-divider my-2" />
      <button type="button" onClick={toggleTheme} className="ui-button ui-button-ghost w-full justify-start">{theme === 'light' ? <Moon /> : <Sun />}{theme === 'light' ? '切换深色模式' : '切换浅色模式'}</button>
    </PresencePanel>}</AnimatePresence>
  </div>
}
