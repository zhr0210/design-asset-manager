import assert from 'node:assert/strict'
import { syncProjectedAiTagSuggestion } from '../src/main/services/ai-client/ai-tag-suggestion-sync.sink'
import type { AiTagSuggestionProjection } from '../src/main/services/ai-client/ai-result-sync.projector'

function createFakeDb(existingSuggestion = false) {
  const inserted: unknown[][] = []
  return {
    inserted,
    db: {
      prepare(sql: string) {
        if (/SELECT 1 FROM tag_suggestions/.test(sql)) {
          return { get: () => existingSuggestion ? { found: 1 } : undefined }
        }
        if (/INSERT INTO tag_suggestions/.test(sql)) {
          return { run: (...args: unknown[]) => inserted.push(args) }
        }
        return { get: () => undefined, run: () => undefined }
      }
    }
  }
}

const suggestion: AiTagSuggestionProjection = {
  tagName: 'poster',
  tagType: 'layout',
  source: 'ai_clip_design',
  confidence: 0.82,
  modelName: 'CLIP Classifier',
  rawPayload: JSON.stringify({ name: 'poster', type: 'layout', confidence: 0.82 })
}

const firstDb = createFakeDb(false)
const createdTags: Array<{ name: string; type?: string; color?: string }> = []
const assetTags: Array<{ assetId: string; tagId: string; options: any }> = []

syncProjectedAiTagSuggestion({
  db: firstDb.db,
  tagService: {
    listTags: () => [],
    createTag: (input) => {
      createdTags.push(input)
      return { id: 'tag-layout-poster' } as any
    }
  },
  assetTagService: {
    addTagToAsset: (assetId, tagId, options) => {
      assetTags.push({ assetId, tagId, options })
      return {} as any
    }
  },
  assetId: 'asset-1',
  suggestion,
  now: '2026-06-04T00:00:00.000Z'
})

assert.equal(firstDb.inserted.length, 1)
assert.equal(firstDb.inserted[0][1], 'asset-1')
assert.equal(firstDb.inserted[0][2], 'poster')
assert.equal(firstDb.inserted[0][4], 'ai_clip_design')
assert.equal(firstDb.inserted[0][6], 'CLIP Classifier')
assert.deepEqual(createdTags, [{
  name: 'poster',
  type: 'layout',
  color: 'bg-purple-50 text-purple-700 border border-purple-200'
}])
assert.deepEqual(assetTags, [{
  assetId: 'asset-1',
  tagId: 'tag-layout-poster',
  options: {
    source: 'ai_clip_design',
    confidence: 0.82,
    status: 'pending',
    modelName: 'CLIP Classifier',
    createdBy: 'ai'
  }
}])

const existingDb = createFakeDb(true)
const reusedAssetTags: Array<{ assetId: string; tagId: string; options: any }> = []
syncProjectedAiTagSuggestion({
  db: existingDb.db,
  tagService: {
    listTags: () => [{ id: 'existing-tag' }] as any,
    createTag: () => {
      throw new Error('createTag should not be called when a tag exists')
    }
  },
  assetTagService: {
    addTagToAsset: (assetId, tagId, options) => {
      reusedAssetTags.push({ assetId, tagId, options })
      return {} as any
    }
  },
  assetId: 'asset-2',
  suggestion,
  now: '2026-06-04T00:00:00.000Z'
})

assert.equal(existingDb.inserted.length, 0)
assert.equal(reusedAssetTags[0].tagId, 'existing-tag')
assert.doesNotMatch(JSON.stringify(firstDb.inserted), /file_path|base64|Downloads|Users/)

console.log('ai-tag-suggestion-sync-sink passed')
