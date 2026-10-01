import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  projectAssetDiscovery
} from '../src/shared/workflows/asset-discovery.workflow'

const filenameMatch = projectAssetDiscovery({
  assets: [
    {
      id: 'asset-filename',
      title: 'Campaign reference',
      fileName: 'summer-launch-poster.psd',
      tags: [],
      aiCaption: '',
      aiOcrText: '',
      sourceSiteId: 'local'
    }
  ],
  query: 'launch poster'
})

assert.equal(filenameMatch.mode, 'lexical-only')
assert.deepEqual(filenameMatch.matches.map((match) => match.asset.id), ['asset-filename'])
assert.equal(filenameMatch.matches[0]?.explanation?.evidence[0]?.kind, 'filename')

const browseProjection = projectAssetDiscovery({
  assets: [
    { id: 'other-source', sourceSiteId: 'web' },
    { id: 'first-local', sourceSiteId: 'local' },
    { id: 'second-local', sourceSiteId: 'local' }
  ],
  query: '   ',
  sourceSiteId: 'local'
})

assert.equal(browseProjection.state, 'all-assets')
assert.deepEqual(browseProjection.matches.map((match) => match.asset.id), [
  'first-local',
  'second-local'
])
assert.ok(browseProjection.matches.every((match) => match.explanation === null))

const fieldPriorityProjection = projectAssetDiscovery({
  assets: [
    { id: 'ocr', aiOcrText: 'brand' },
    { id: 'description', aiCaption: 'brand' },
    { id: 'tag', tags: ['brand'] },
    { id: 'filename', fileName: 'brand' },
    { id: 'title', title: 'brand' }
  ],
  query: 'brand',
  tagScope: 'confirmed-only'
})

assert.deepEqual(fieldPriorityProjection.matches.map((match) => match.asset.id), [
  'title',
  'filename',
  'tag',
  'description',
  'ocr'
])
assert.deepEqual(
  fieldPriorityProjection.matches.map((match) => match.explanation?.evidence[0]?.kind),
  ['title', 'filename', 'tag', 'description', 'ocr']
)
assert.ok(fieldPriorityProjection.matches.every((match) => !('score' in match)))

const longOcrPrefix = 'A'.repeat(140)
const boundedExplanationProjection = projectAssetDiscovery({
  assets: [{
    id: 'long-ocr',
    aiOcrText: `${longOcrPrefix} SUMMER SALE ${'B'.repeat(140)}`
  }],
  query: 'summer sale'
})
const boundedOcrLabel =
  boundedExplanationProjection.matches[0]?.explanation?.evidence[0]?.label ?? ''

assert.ok(boundedOcrLabel.includes('SUMMER SALE'))
assert.ok(boundedOcrLabel.length <= 96)
assert.ok(!boundedOcrLabel.includes(longOcrPrefix))

const crossFieldProjection = projectAssetDiscovery({
  assets: [{
    id: 'cross-field',
    title: 'Brand system',
    tags: ['Poster']
  }],
  query: 'brand，poster'
})

assert.deepEqual(crossFieldProjection.matches.map((match) => match.asset.id), ['cross-field'])
assert.deepEqual(
  crossFieldProjection.matches[0]?.explanation?.evidence.map((evidence) => evidence.kind),
  ['title', 'tag']
)

const mixedTagProjection = projectAssetDiscovery({
  assets: [{
    id: 'mixed-tag',
    title: 'Poster',
    fileName: 'poster.psd',
    tags: ['poster'],
    aiCaption: 'poster layout',
    aiOcrText: 'poster'
  }],
  query: 'poster',
  tagScope: 'includes-pending'
})
const mixedTagEvidence = mixedTagProjection.matches[0]?.explanation?.evidence ?? []

assert.ok(mixedTagEvidence.length <= 3)
assert.ok(
  mixedTagEvidence
    .filter((evidence) => evidence.kind === 'tag')
    .every((evidence) => evidence.label.startsWith('标签：'))
)
assert.ok(mixedTagEvidence.every((evidence) => !evidence.label.includes('%')))

const tagConstrainedProjection = projectAssetDiscovery({
  assets: [
    { id: 'tagged-blue', tags: ['Blue', 'Poster'] },
    { id: 'tagged-red', tags: ['Red'] },
    { id: 'untagged', tags: [] }
  ],
  tagQueries: ['tag:blue']
})
assert.deepEqual(tagConstrainedProjection.matches.map((match) => match.asset.id), ['tagged-blue'])
assert.deepEqual(projectAssetDiscovery({
  assets: [{ id: 'tagged', tags: ['Blue'] }, { id: 'untagged', tags: [] }],
  tagQueries: ['special:untagged']
}).matches.map((match) => match.asset.id), ['untagged'])
assert.equal(projectAssetDiscovery({
  assets: [{ id: 'tagged', tags: ['Blue'] }],
  tagQueries: ['special:ai_pending']
}).matches.length, 0)

const sharedIndexSource = await fs.readFile('src/shared/index.ts', 'utf8')
const librarySource = await fs.readFile('src/renderer/routes/Library.tsx', 'utf8')
const gridSource = await fs.readFile('src/renderer/components/library/AssetWaterfallGrid.tsx', 'utf8')
const toolbarSource = await fs.readFile('src/renderer/components/library/LibraryToolbar.tsx', 'utf8')
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.match(sharedIndexSource, /asset-discovery\.workflow/)
assert.match(librarySource, /projectAssetDiscovery/)
assert.doesNotMatch(librarySource, /assets\.filter\(\(asset\)/)
assert.match(gridSource, /AssetDiscoveryMatch/)
assert.match(gridSource, /match\.explanation/)
assert.match(toolbarSource, /本地关键词检索/)
assert.equal(
  packageJson.scripts?.['test-asset-discovery-workflow'],
  'node scripts/run-ts-test.mjs scripts/asset-discovery-workflow.test.ts'
)
assert.match(packageJson.scripts?.['ci:test-governance'] ?? '', /test-asset-discovery-workflow/)

console.log('asset-discovery-workflow passed')

// Alias matches explain their evidence without adding a second confirmed tag.
const aliasAsset = { id: 'alias-asset', title: 'Sample', tags: ['海蓝'], tagAliases: ['Blue Sea'] }
const aliasMatch = projectAssetDiscovery({ assets: [aliasAsset], query: 'blue sea' })
assert.equal(aliasMatch.matches.length, 1)
assert.ok(aliasMatch.matches[0].explanation?.evidence.some(e => e.label.includes('标签别名')))
assert.equal(projectAssetDiscovery({ assets: [aliasAsset], tagQueries: ['tag:BLUE SEA'] }).matches.length, 1)
assert.deepEqual(aliasMatch.matches[0].asset.tags, ['海蓝'])

const summary={evidenceId:'e1',model:'fixture',createdAt:'2026-09-20',caption:'AI mountain',prompt:'Rim lighting',ocrText:'',tags:['蓝色','ＢＬＵＥ'],pendingTags:['蓝色','ＢＬＵＥ']}
const enriched=[{id:'analyzed',tags:['确认'],aiCaption:'手工描述',visualAi:summary},{id:'manual',tags:['蓝色']}]
assert.deepEqual(projectAssetDiscovery({assets:enriched,query:'蓝色',tagScope:'includes-pending'}).matches.map(m=>m.asset.id),['manual','analyzed'])
assert.equal(projectAssetDiscovery({assets:enriched,query:'蓝色'}).matches.length,1)
assert.equal(projectAssetDiscovery({assets:enriched,query:'lighting'}).matches[0].explanation?.evidence[0].kind,'prompt')
assert.equal(projectAssetDiscovery({assets:enriched,query:'mountain'}).matches[0].explanation?.evidence[0].label,'AI 画面描述：AI mountain')
assert.equal(projectAssetDiscovery({assets:enriched,query:'!!!'}).matches.length,0)
assert.deepEqual(projectAssetDiscovery({assets:enriched,tagQueries:['tag:blue'],tagScope:'includes-pending'}).matches.map(m=>m.asset.id),['analyzed'])
const {projectAiFolders}=await import('../src/shared/workflows/ai-folders.workflow')
const folders=projectAiFolders(enriched)
assert.deepEqual(folders.find(f=>f.id==='ai:analyzed')?.assetIds,['analyzed'])
assert.deepEqual(folders.find(f=>f.id==='ai:tag:蓝色')?.assetIds,['analyzed'])
assert.deepEqual(projectAiFolders([{...enriched[0],visualAi:{...summary,pendingTags:[]}}]).find(f=>f.id==='ai:pending')?.assetIds,[])
assert.equal(projectAiFolders([]).length,2)
console.log('AI discovery: independent suggestions, evidence labels, prompt search and dynamic references passed')
