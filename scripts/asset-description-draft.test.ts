import assert from 'node:assert/strict'
import { normalizeDescriptionDraft, completeDescriptionDraft } from '../src/shared/workflows/asset-description-draft.workflow'

assert.deepEqual(normalizeDescriptionDraft({ value: 'old committed', baseCaption: 'old committed' }, 'new committed'), { value: 'new committed', baseCaption: 'new committed' })
assert.deepEqual(normalizeDescriptionDraft({ value: 'unsaved edit', baseCaption: 'old committed' }, 'new committed'), { value: 'unsaved edit', baseCaption: 'old committed' })
assert.deepEqual(completeDescriptionDraft({ value: 'typed after submission', baseCaption: 'original' }, 'submitted text', 'original'), { value: 'typed after submission', baseCaption: 'submitted text' })
assert.deepEqual(completeDescriptionDraft({ value: 'newer saved', baseCaption: 'newer saved' }, 'older submitted', 'original'), { value: 'newer saved', baseCaption: 'newer saved' })
assert.deepEqual(completeDescriptionDraft({ value: 'submitted text', baseCaption: 'original' }, 'submitted text', 'original'), { value: 'submitted text', baseCaption: 'submitted text' })
console.log('Description drafts preserve newer typing, newer commits and external metadata refresh')
