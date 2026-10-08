import React, { useId } from 'react'
import { motion, useIsPresent, useReducedMotion, type HTMLMotionProps } from 'motion/react'

export const workspaceEase = [0.22, 1, 0.36, 1] as const

/** Only transforms small control surfaces; exiting content cannot accept input. */
export function PresencePanel({ kind = 'popover', children, style, ...props }: HTMLMotionProps<'div'> & {
  kind?: 'popover' | 'inspector' | 'dock' | 'disclosure'
}) {
  const reduced = useReducedMotion()
  const present = useIsPresent()
  const offset = kind === 'inspector' ? { x: 18 } : { y: kind === 'dock' ? 12 : -6 }
  const hidden = kind === 'disclosure' ? { opacity: 0, height: 0 } : reduced ? { opacity: 0 } : { opacity: 0, ...offset }
  return <motion.div {...props} {...(!present ? { inert: '' } : {})}
    aria-hidden={!present || props['aria-hidden']}
    initial={hidden} animate={kind === 'disclosure' ? { opacity: 1, height: 'auto' } : { opacity: 1, x: 0, y: 0 }} exit={hidden}
    transition={{ duration: reduced ? 0 : present ? 0.24 : 0.14, ease: workspaceEase }}
    style={{ ...(kind === 'disclosure' ? { overflow: 'hidden' } : {}), ...style, pointerEvents: present ? style?.pointerEvents : 'none' }}>
    {children}
  </motion.div>
}

/** Exactly one route is mounted; native browser geometry is never animated. */
export function WorkspaceEntrance({ children, route }: { children: React.ReactNode; route: string }) {
  const reduced = useReducedMotion()
  return <motion.div key={route} className="workspace-route-surface" data-workspace-route={route}
    initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: reduced ? 0 : 0.22, ease: workspaceEase }}>
    {children}
  </motion.div>
}

export function SegmentedControl<T extends string>({ label, value, onChange, items, className = '' }: {
  className?: string; label: string; value: T; onChange(value: T): void
  items: readonly { value: T; label: string }[]
}) {
  const id = useId()
  const reduced = useReducedMotion()
  return <div className={`ui-segments ${className}`} role="group" aria-label={label} onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = items.findIndex(item => item.value === value)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    onChange(items[next].value)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
  }}>
    {items.map(item => <button type="button" key={item.value} aria-pressed={value === item.value}
      tabIndex={value === item.value ? 0 : -1} onClick={() => onChange(item.value)}>
      {value === item.value && <motion.span className="ui-segment-highlight" layoutId={`segment-${id}`}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }} />}
      <span className="ui-segment-label">{item.label}</span>
    </button>)}
  </div>
}
