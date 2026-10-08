import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { lockWorkspaceInput } from '../../workspace-input-lock'

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  return <button type={type} className={`ui-button ui-button-${variant} ${className}`} {...props} />
}

export function StatusBadge({ tone = 'neutral', children }: {
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'accent'
  children: React.ReactNode
}) {
  return <span className="ui-status" data-tone={tone}>{children}</span>
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return <header className="ui-page-header">
    <div className="min-w-0">
      {eyebrow && <div className="ui-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {description && <p className="ui-page-description">{description}</p>}
    </div>
    {actions && <div className="ui-actions">{actions}</div>}
  </header>
}

export function EmptyState({ icon, title, description, actions }: {
  icon?: React.ReactNode
  title: string
  description: React.ReactNode
  actions?: React.ReactNode
}) {
  return <div className="ui-empty-state">
    {icon && <div className="ui-empty-icon" aria-hidden="true">{icon}</div>}
    <h2>{title}</h2>
    <p>{description}</p>
    {actions && <div className="ui-actions">{actions}</div>}
  </div>
}

export function Notice({ tone = 'neutral', children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'neutral' | 'positive' | 'warning' | 'danger'
}) {
  return <div className={`ui-notice ${className}`} data-tone={tone} role={tone === 'danger' ? 'alert' : 'status'} {...props}>{children}</div>
}

/** Modal focus ownership also blocks pointer and keyboard access to the background. */
export function useModalFocus(root: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const siblings = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && !node.contains(root.current))
    const release = lockWorkspaceInput(siblings)
    root.current?.focus()
    return () => {
      release()
      const target = previous?.isConnected && previous !== document.body && previous !== document.documentElement && !previous.matches(':disabled') ? previous : (document.querySelector<HTMLElement>('input[aria-label="搜索素材"]') ?? document.querySelector<HTMLElement>('button[data-testid="library-add-assets"]:not(:disabled), button[data-testid="library-create"]:not(:disabled)'))
      target?.focus()
    }
  }, [])
}

export function trapModalTab(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'Tab') return
  const root = event.currentTarget
  const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'))
  const first = controls[0], last = controls[controls.length - 1]
  if (!first) { event.preventDefault(); return }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) { event.preventDefault(); first.focus() }
}

/** A temporary task surface: focus stays in the sheet until confirm or cancel. */
export function ReviewSheet({ label, busy = false, onCancel, children, surfaceClassName = '', transitionSurface = false }: {
  label: string
  surfaceClassName?:string
  transitionSurface?:boolean
  busy?: boolean
  onCancel(): void
  children: React.ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  useModalFocus(root)
  return createPortal(<div className={`ui-sheet-backdrop ${surfaceClassName}`} data-workspace-transition-surface={transitionSurface || undefined}>
    <div ref={root} role="dialog" aria-modal="true" aria-label={label} aria-busy={busy} tabIndex={-1} className="ui-sheet" onKeyDown={event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (!busy) onCancel()
      }
      trapModalTab(event)
    }}>
      {children}
      {busy && <div className="ui-meta px-6 pb-5" role="status">正在完成操作…</div>}
    </div>
  </div>, document.body)
}
