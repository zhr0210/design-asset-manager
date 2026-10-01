// Prototype-only mode choreography. Latest request wins; no queued page transitions.
import React, { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Grid2X2, ScanLine, PictureInPicture2 } from 'lucide-react'

export type WorkspaceMode = 'library' | 'focus' | 'card'
export const workspaceModes = [
  { id: 'library', name: '资料库', subtitle: '所有灵感，井然有序', icon: Grid2X2 },
  { id: 'focus', name: '专注查看', subtitle: '留心每一个细节', icon: ScanLine },
  { id: 'card', name: '悬浮卡片', subtitle: '让参考，留在手边', icon: PictureInPicture2 }
] as const

export function readWorkspaceMode(params: URLSearchParams): WorkspaceMode {
  const mode = params.get('mode')
  if (mode === 'card' || mode === 'focus' || mode === 'library') return mode
  // Older prototype links stay usable; B is folded into focused browsing.
  return ['B', 'C'].includes(params.get('variant') || '') ? 'focus' : 'library'
}

export function useModeTransition(requested: WorkspaceMode, previewReduced = false) {
  const systemReduced = useReducedMotion()
  const reduced = Boolean(systemReduced || previewReduced)
  const [displayed, setDisplayed] = useState(requested)
  const shown = useRef(requested)
  const [phase, setPhase] = useState<'idle' | 'frosting' | 'title' | 'revealing'>('idle')
  useEffect(() => {
    if (shown.current === requested) { setPhase('idle'); return }
    setPhase('frosting')
    const timers: ReturnType<typeof setTimeout>[] = []
    if (!reduced) timers.push(setTimeout(() => setPhase('title'), 190))
    timers.push(setTimeout(() => {
      shown.current = requested
      setDisplayed(requested)
      setPhase('revealing')
    }, reduced ? 55 : 460))
    timers.push(setTimeout(() => setPhase('idle'), reduced ? 130 : 960))
    return () => timers.forEach(clearTimeout)
  }, [requested, reduced])
  return { displayed, phase, reduced: Boolean(reduced), busy: phase !== 'idle' }
}

export function ModeVeil({ requested, phase, reduced }: {
  requested: WorkspaceMode
  phase: 'idle' | 'frosting' | 'title' | 'revealing'
  reduced: boolean
}) {
  const mode = workspaceModes.find(item => item.id === requested)!
  const Icon = mode.icon
  return <div className="rp-mode-veil" data-phase={phase} aria-hidden="true">
    {!reduced && phase !== 'idle' && <motion.div
      key={requested}
      className="rp-mode-title"
      initial={{ opacity: 0, y: 8, scale: .97, filter: 'blur(7px)' }}
      animate={phase === 'title'
        ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
        : { opacity: 0, y: phase === 'revealing' ? -7 : 8, scale: 1.025, filter: 'blur(7px)' }}
      transition={{ duration: phase === 'revealing' ? .23 : .2, ease: [.22, 1, .36, 1] }}
    ><div className="rp-mode-title-icon"><Icon size={28} strokeWidth={1.3} /></div><strong>{mode.name}</strong><span>{mode.subtitle}</span></motion.div>}
  </div>
}

export function ModeDock({ current, onChange, reduced }: { current: WorkspaceMode; onChange(mode: WorkspaceMode): void; reduced: boolean }) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  return <nav className="rp-mode-dock" aria-label="工作区模式" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = workspaceModes.findIndex(mode => mode.id === current)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
      : (index + (event.key === 'ArrowLeft' ? -1 : 1) + 3) % 3
    onChange(workspaceModes[next].id)
    buttons.current[next]?.focus()
  }}>
    <span className="rp-dock-reflection" aria-hidden="true" />
    {workspaceModes.map(({ id, name, icon: Icon }, index) => <motion.button
      key={id} ref={element => { buttons.current[index] = element }}
      type="button" aria-pressed={current === id} onClick={() => onChange(id)}
      whileTap={reduced ? undefined : { scale: .96 }}
    >
      {current === id && <motion.span className="rp-liquid-selection" layoutId="workspace-mode-glass"
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 30, mass: .85 }}>
        {!reduced && <motion.i key={id} initial={{ x: '-110%', opacity: 0 }} animate={{ x: '120%', opacity: [0, .7, 0] }} transition={{ duration: .7 }} />}
      </motion.span>}
      <Icon size={18} strokeWidth={1.6} /><span>{name}</span>
    </motion.button>)}
  </nav>
}
