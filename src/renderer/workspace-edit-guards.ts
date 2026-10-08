import { useEffect } from 'react'

const editing = new Set<object>()
/** Short-lived forms must finish or cancel before a global transition. */
export function useTransientWorkspaceEdit(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return
    const token = {}; editing.add(token)
    return () => { editing.delete(token) }
  }, [dirty])
}
export function hasTransientWorkspaceEdits(): boolean { return editing.size > 0 }
