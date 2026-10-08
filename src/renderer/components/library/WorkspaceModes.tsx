import React, { useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Grid2X2, PictureInPicture2, ScanLine } from 'lucide-react'

export type LibraryViewMode = 'library' | 'focus' | 'card'
const modes = [
  { id: 'library', label: '资料库', Icon: Grid2X2 },
  { id: 'focus', label: '专注查看', Icon: ScanLine },
  { id: 'card', label: '悬浮卡片', Icon: PictureInPicture2 }
] as const

/** Display state is local to this Library session; changing authority cancels a transition. */
export function WorkspaceModeSurface({ requested, authorityKey, children }: {
  requested: LibraryViewMode; authorityKey: string; children(mode: LibraryViewMode): React.ReactNode
}) {
  const reduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(requested)
  const shown = useRef(requested)
  const lastAuthority = useRef(authorityKey)
  const [phase, setPhase] = useState<'idle' | 'frosting' | 'title' | 'revealing'>('idle')
  useEffect(() => {
    if (lastAuthority.current !== authorityKey) {
      lastAuthority.current = authorityKey; shown.current = requested; setDisplayed(requested); setPhase('idle'); return
    }
    if (shown.current === requested) { setPhase('idle'); return }
    setPhase('frosting')
    const timers = [setTimeout(() => { shown.current = requested; setDisplayed(requested); setPhase('revealing') }, reduced ? 45 : 460), setTimeout(() => setPhase('idle'), reduced ? 120 : 960)]
    if (!reduced) timers.push(setTimeout(() => setPhase('title'), 190))
    return () => timers.forEach(clearTimeout)
  }, [requested, authorityKey, reduced])
  const mode = modes.find(item => item.id === requested)!
  return <div className="asset-mode-surface" data-view-mode={displayed} data-mode-phase={phase} data-reduced-motion={Boolean(reduced)}>
    <div className={`asset-mode-canvas ${phase === 'frosting' || phase === 'title' ? 'is-frosted' : ''}`} {...(phase !== 'idle' ? { inert: '' } : {})} aria-hidden={phase !== 'idle' || undefined}>
      {children(displayed)}
    </div>
    {phase !== 'idle' && !reduced && <div className={`asset-mode-veil ${phase}`} aria-hidden="true"><motion.div key={requested} initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }} animate={{ opacity: phase === 'title' ? 1 : 0, y: 0, filter: phase === 'title' ? 'blur(0px)' : 'blur(6px)' }} transition={{ duration: .2 }}><mode.Icon size={29} strokeWidth={1.4} /><strong>{mode.label}</strong></motion.div></div>}
    <span className="sr-only" role="status">{phase === 'idle' ? `当前模式：${modes.find(item => item.id === displayed)!.label}` : '正在切换查看模式'}</span>
  </div>
}

export function WorkspaceModeDock({ value, onChange }: { value: LibraryViewMode; onChange(mode: LibraryViewMode): void }) {
  const reduced = useReducedMotion()
  const id = useId()
  return <nav className="asset-mode-dock" aria-label="工作区模式" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = modes.findIndex(mode => mode.id === value)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + 3) % 3
    onChange(modes[next].id)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
  }}>{modes.map(({ id: key, label, Icon }) => <button key={key} type="button" aria-pressed={key === value} tabIndex={key === value ? 0 : -1} onClick={() => onChange(key)}>
    {key === value && <motion.span className="asset-mode-glass" layoutId={`mode-glass-${id}`} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 30 }}><i /></motion.span>}
    <Icon size={18} strokeWidth={1.6} /><span>{label}</span>
  </button>)}</nav>
}
