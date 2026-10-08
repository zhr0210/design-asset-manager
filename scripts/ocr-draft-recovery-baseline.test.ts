import assert from 'node:assert/strict'
import type { OcrSnapshot } from '../src/shared/contracts/asset-ocr.contract'
const writes: any[] = []
;(globalThis as any).window = { dispatchEvent() {}, sessionStorage: { getItem: () => null, setItem() {} } }
const { installWorkspaceClient } = await import('../src/renderer/workspace-client')
installWorkspaceClient({ transitions: { ready: async () => {} }, drafts: { put: async (input: any) => { writes.push(input); return input }, remove: async () => {} } } as any)
const { flushWorkspaceDrafts } = await import('../src/renderer/workspace-drafts')
const { ocrDraftKey, restoreOcrDraft, holdOcrDraft, adoptOcrDraftBaseline, getOcrDraft, updateOcrDraftMismatch } = await import('../src/renderer/components/library/canvas/ocr-drafts')
const key = ocrDraftKey({ libraryIdentity: 'synthetic', generation: 'current', assetId: 'one' })
const snapshot = { sessionToken: 'session', revision: 4, requiresUpgrade: false, editedText: null, evidence: { id: 'new-evidence' } } as OcrSnapshot
restoreOcrDraft(key, snapshot, '恢复输入', { revision: 2, evidenceId: 'old-evidence' })
await flushWorkspaceDrafts()
assert.deepEqual(writes.at(-1).base, { revision: 2, evidenceId: 'old-evidence' }, 'reading current evidence cannot change recovered baseline')
assert.equal(getOcrDraft(key)?.mismatch, true, 'reopening the panel must retain mismatch')
holdOcrDraft(key, snapshot, '继续输入')
await flushWorkspaceDrafts()
assert.equal(writes.at(-1).base.evidenceId, 'old-evidence', 'typing must preserve original evidence identity')
updateOcrDraftMismatch(key, { ...snapshot, evidence: null })
assert.equal(getOcrDraft(key)?.mismatch, true)
adoptOcrDraftBaseline(key, snapshot, '继续输入')
await flushWorkspaceDrafts()
assert.deepEqual(writes.at(-1).base, { revision: 4, evidenceId: 'new-evidence' })
assert.equal(getOcrDraft(key)?.mismatch, false, 'only explicit adoption changes baseline')
console.log('PASS OCR recovery keeps original baseline until explicit adoption')
