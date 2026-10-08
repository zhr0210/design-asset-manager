const locks = new Map<HTMLElement, { prior: boolean; owners: Set<object> }>()

/** Modal and Host freezes share ownership, so either may finish first. */
export function lockWorkspaceInput(nodes: HTMLElement[]): () => void {
  const owner = {}
  for (const node of nodes) {
    const state = locks.get(node) ?? { prior: node.inert, owners: new Set<object>() }
    state.owners.add(owner); locks.set(node, state); node.inert = true
  }
  return () => {
    for (const node of nodes) {
      const state = locks.get(node)
      if (!state || !state.owners.delete(owner)) continue
      if (!state.owners.size) { node.inert = state.prior; locks.delete(node) }
    }
  }
}

let releaseFreeze: (() => void) | undefined
export function freezeWorkspaceInput(frozen: boolean): void {
  if (!frozen) { releaseFreeze?.(); releaseFreeze = undefined; return }
  if (releaseFreeze) return
  const releases = new Map<HTMLElement, () => void>()
  const include = () => {
    for (const node of Array.from(document.body.children)) {
      if (!(node instanceof HTMLElement) || node.hasAttribute('data-workspace-transition-surface') || releases.has(node)) continue
      releases.set(node, lockWorkspaceInput([node]))
    }
  }
  include()
  const observer = new MutationObserver(include)
  observer.observe(document.body, { childList: true })
  releaseFreeze = () => { observer.disconnect(); for (const release of releases.values()) release() }
}
