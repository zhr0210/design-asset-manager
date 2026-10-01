import type { AssetDescriptionDraft } from '../contracts/asset-card.contract'

/** Clean drafts follow committed metadata; a dirty draft keeps its original comparison base. */
export function normalizeDescriptionDraft(draft: AssetDescriptionDraft | undefined, caption: string): AssetDescriptionDraft {
  return draft && draft.value !== draft.baseCaption ? draft : { value: caption, baseCaption: caption }
}

/** An older save may advance the base, but never replace text entered after submission. */
export function completeDescriptionDraft(current: AssetDescriptionDraft | undefined, saved: string, expected: string): AssetDescriptionDraft {
  if (!current) return { value: saved, baseCaption: saved }
  if (current.baseCaption !== expected) return current
  return { value: current.value, baseCaption: saved }
}
