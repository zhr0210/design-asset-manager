import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { buildContextPack, loadRepositoryContext } from './agent-context-router.mjs'
import { loadDevelopmentFeedback, selectDevelopmentFeedback } from './development-feedback.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const context = loadRepositoryContext(ROOT)
const knownRoutes = Object.keys(context.catalog.routes)

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dam-feedback-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'docs/agents'), { recursive: true })
  fs.writeFileSync(path.join(root, 'LESSONS.md'), '# Lessons\n')
  fs.writeFileSync(path.join(root, 'docs/agents/DEVELOPMENT-PROBLEMS.md'), '# Problems\n')
  return root
}

function problem(id, route, status = 'needs-reproduction', check = '复现用户步骤并核对当前候选。') {
  return `### ${id} — 用户路径失败\n- Routes: ${route}\n- Group: integration\n- Status: ${status}\n- Check: ${check}\n`
}

function routeFixture(t) {
  const root = fixture(t)
  // The real router estimates full source files; keep its actual inputs, while
  // isolating only the feedback records that this test edits.
  for (const item of context.catalog.routes['asset-discovery'].read_first) {
    const target = path.join(root, item.path)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(ROOT, item.path), target)
  }
  return {
    root,
    read: () => buildContextPack({ ...context, root, explicitRoute: 'asset-discovery',
      snapshot: { head: 'isolated-feedback-test', dirty: true } })
  }
}

test('selected routes keep related open problems, common lessons and one cross-module record', () => {
  const entries = loadDevelopmentFeedback(ROOT, knownRoutes)
  const search = selectDevelopmentFeedback(entries, ['asset-discovery', 'asset-workspace'])
  assert.deepEqual(search.problems.map(entry => entry.id), ['DAM-P001', 'DAM-P003'])
  assert.equal(search.lessons.filter(entry => entry.id === 'DAM-L005').length, 1)
  assert.ok(search.lessons.some(entry => entry.group === 'common'))
  assert.ok(!search.problems.some(entry => entry.id === 'DAM-P002'))
  const packaging = selectDevelopmentFeedback(entries, ['release-packaging'])
  assert.deepEqual(packaging.problems, [])
  assert.deepEqual(packaging.lessons.map(entry => entry.id), ['DAM-L001'])
})

test('a local update changes the next read and a resolved problem leaves the active set', t => {
  const root = fixture(t)
  const file = path.join(root, 'docs/agents/DEVELOPMENT-PROBLEMS.md')
  fs.writeFileSync(file, problem('DAM-P001', 'asset-discovery'))
  let result = selectDevelopmentFeedback(loadDevelopmentFeedback(root, knownRoutes), ['asset-discovery'])
  assert.equal(result.problems[0].status, 'needs-reproduction')
  const updated = '确认失败根因，复验查询与旧响应保护。'
  fs.writeFileSync(file, problem('DAM-P001', 'asset-discovery', 'in-progress', updated))
  result = selectDevelopmentFeedback(loadDevelopmentFeedback(root, knownRoutes), ['asset-discovery'])
  assert.equal(result.problems[0].check, updated)
  fs.writeFileSync(file, problem('DAM-P001', 'asset-discovery', 'resolved', updated))
  assert.deepEqual(selectDevelopmentFeedback(loadDevelopmentFeedback(root, knownRoutes), ['asset-discovery']).problems, [])
})

test('missing or malformed records stay observable rather than meaning no problems', t => {
  const root = fixture(t)
  const file = path.join(root, 'docs/agents/DEVELOPMENT-PROBLEMS.md')
  for (const [body, error] of [
    [problem('DAM-P001', 'missing-route'), /FEEDBACK_ROUTES_INVALID/],
    [problem('DAM-P001', '*'), /FEEDBACK_ROUTES_INVALID/],
    [problem('DAM-P001', 'asset-discovery', 'passed'), /FEEDBACK_ENTRY_INVALID/],
    [problem('DAM-P001', 'asset-discovery').replace('- Check:', '- Wrong:'), /FEEDBACK_ENTRY_INVALID/],
    [problem('DAM-P001', 'asset-discovery') + problem('DAM-P001', 'asset-discovery'), /FEEDBACK_ID_INVALID/],
    [problem('DAM-P001', 'asset-discovery') + '- Status: resolved\n', /FEEDBACK_FIELD_DUPLICATE/]
  ]) {
    fs.writeFileSync(file, body)
    assert.throws(() => loadDevelopmentFeedback(root, knownRoutes), error)
  }
  fs.unlinkSync(file)
  assert.throws(() => loadDevelopmentFeedback(root, knownRoutes), /ENOENT/)
})

test('the real context route consumes feedback and keeps it inside its token budget', () => {
  const pack = buildContextPack({ ...context, root: ROOT, explicitRoute: 'asset-discovery',
    snapshot: { head: 'fixed-test', dirty: true } })
  assert.equal(pack.ok, true, JSON.stringify(pack.error))
  assert.ok(pack.feedback.problems.some(entry => entry.id === 'DAM-P001'))
  assert.ok(pack.feedback.lessons.some(entry => entry.id === 'DAM-L005' && entry.check.includes('测试替身')))
  assert.equal(pack.feedback.writeBack.problems, 'docs/agents/DEVELOPMENT-PROBLEMS.md')
  assert.ok(pack.budget.estimatedTokens <= pack.budget.maxEstimatedTokens)
  assert.ok(pack.budget.estimatedMetadataTokens <= pack.budget.maxMetadataTokens)
  assert.ok(pack.validations.every(command => !command.includes('DAM-')))
})

test('growing feedback defers whole records without closing the source route', t => {
  const { root, read } = routeFixture(t)
  const longCheck = '核对实际候选的调用链和用户结果，保留失败与恢复证据。'.repeat(16)
  let problems = '', lessons = ''
  for (let i = 1; i <= 12; i++) {
    const suffix = String(i).padStart(3, '0')
    problems += problem(`DAM-P${suffix}`, 'asset-discovery', 'open', longCheck)
    lessons += problem(`DAM-L${suffix}`, 'asset-discovery', 'active', longCheck)
  }
  fs.writeFileSync(path.join(root, 'docs/agents/DEVELOPMENT-PROBLEMS.md'), problems)
  fs.writeFileSync(path.join(root, 'LESSONS.md'), lessons)
  const pack = read()
  assert.equal(pack.ok, true, JSON.stringify(pack.error))
  const kept = [...pack.feedback.problems, ...pack.feedback.lessons]
  assert.ok(kept.length > 0, 'a useful feedback check remains visible')
  assert.equal(kept.length + pack.feedback.deferred, 24, 'every deferred record stays accounted for')
  assert.ok(pack.feedback.problems.length > 0 && pack.feedback.lessons.length > 0)
  assert.ok(kept.every(entry => entry.check === longCheck), 'checks are never cut mid-rule')
  assert.ok(pack.budget.estimatedMetadataTokens <= pack.budget.maxMetadataTokens)
  assert.ok(pack.budget.estimatedTokens <= pack.budget.maxEstimatedTokens)
  assert.equal(pack.budget.truncated, true)
  assert.ok(pack.warnings.some(warning => warning.includes('Feedback limit deferred')))
  assert.ok(pack.firstRead.some(item => item.required), 'mandatory source context is retained')
})

test('a completed feedback cycle changes the next real route without modifying product state', t => {
  const { root, read } = routeFixture(t)
  const file = path.join(root, 'docs/agents/DEVELOPMENT-PROBLEMS.md')
  fs.writeFileSync(file, problem('DAM-P001', 'asset-discovery'))
  assert.equal(read().feedback.problems[0].status, 'needs-reproduction')
  const check = '读取共享Client真实契约并核对键盘消费者，不把夹具失败当产品资格。'
  fs.writeFileSync(file, problem('DAM-P001', 'asset-discovery', 'in-progress', check))
  assert.equal(read().feedback.problems[0].check, check)
  fs.writeFileSync(file, problem('DAM-P001', 'asset-discovery', 'resolved', check))
  fs.writeFileSync(path.join(root, 'LESSONS.md'), problem('DAM-L001', 'asset-discovery', 'active', check))
  const next = read()
  assert.deepEqual(next.feedback.problems, [])
  assert.equal(next.feedback.lessons[0].check, check)
  assert.equal(next.feedback.writeBack.evidence, 'Current checkpoint')
  assert.ok(fs.readFileSync(file, 'utf8').includes('DAM-P001'), 'resolved evidence remains recorded')
})

function reviewedLesson(root, events, extra = '') {
  fs.writeFileSync(path.join(root, 'docs/agents/evidence.md'), '# Evidence\n\n<a id="case"></a>\nCase.\n')
  fs.writeFileSync(path.join(root, 'LESSONS.md'),
    problem('DAM-L001', 'asset-discovery', 'active') + `- Events: ${JSON.stringify(events)}\n${extra}`)
  return loadDevelopmentFeedback(root, knownRoutes)[0].promotion
}

const event = (id, reviewed) => ({ id, reviewed, evidence: 'docs/agents/evidence.md#case' })

test('only independent incidents on three Shanghai review dates become a rule candidate', t => {
  const root = fixture(t)
  const one = event('incident-a', '2026-10-01')
  let promotion = reviewedLesson(root, [one, one, one])
  assert.equal(promotion.events, 1)
  assert.equal(promotion.distinctDates, 1)
  assert.equal(promotion.state, 'observing')
  promotion = reviewedLesson(root, [one, event('incident-b', '2026-10-01'), event('incident-c', '2026-10-02')])
  assert.equal(promotion.state, 'observing')
  promotion = reviewedLesson(root, [one, event('incident-b', '2026-10-02'), event('incident-c', '2026-10-04T16:30:00Z')])
  assert.equal(promotion.state, 'candidate')
  assert.equal(promotion.distinctDates, 3)
  assert.equal(selectDevelopmentFeedback(loadDevelopmentFeedback(root, knownRoutes), ['asset-discovery']).lessons[0].promotion.state, 'candidate')
})

test('severe incidents are immediate, while promoted and deferred evidence stays recorded', t => {
  const root = fixture(t), events = [event('data-loss', '2026-10-15')]
  assert.equal(reviewedLesson(root, events, '- Severity: critical\n').state, 'candidate')
  let promotion = reviewedLesson(root, events, '- Severity: critical\n- Deferral: Scope needs a specific counterexample; review on the next relevant task.\n')
  assert.equal(promotion.state, 'deferred')
  assert.equal(promotion.events, 1)
  assert.ok(promotion.reason.includes('next relevant task'))
  promotion = reviewedLesson(root, events, '- Severity: critical\n- Promoted: docs/agents/evidence.md#case\n')
  assert.equal(promotion.state, 'promoted')
  assert.equal(promotion.rule, 'docs/agents/evidence.md#case')
  assert.equal(promotion.distinctDates, 1)
})

test('same-day UTC boundaries do not manufacture separate Shanghai review dates', t => {
  const root = fixture(t)
  const promotion = reviewedLesson(root, [event('a', '2026-10-14T17:00:00Z'), event('b', '2026-10-15T08:00:00+08:00')])
  assert.equal(promotion.distinctDates, 1)
  assert.equal(promotion.state, 'observing')
})

test('invalid recurrence metadata is observable and cannot inflate or erase evidence', t => {
  const root = fixture(t)
  assert.throws(() => reviewedLesson(root, [event('a', '2026-02-30')]), /REVIEW_DATE_INVALID/)
  assert.throws(() => reviewedLesson(root, [event('a', '2026-10-15T01:00:00')]), /REVIEW_DATE_INVALID/)
  assert.throws(() => reviewedLesson(root, [event('a', '2026-10-14'), event('a', '2026-10-15')]), /EVENT_CONFLICT/)
  assert.throws(() => reviewedLesson(root, [], '- Severity: critical\n'), /CRITICAL_WITHOUT_EVIDENCE/)
  assert.throws(() => reviewedLesson(root, [], '- Deferral: ignore\n'), /DEFERRAL_INVALID/)
  assert.throws(() => reviewedLesson(root, [], '- Promoted: ../../private.md\n'), /REVIEW_REFERENCE_INVALID/)
  assert.throws(() => reviewedLesson(root, [], '- Promoted: docs/agents/evidence.md#not-a-rule\n'), /REVIEW_ANCHOR_INVALID/)
  assert.throws(() => reviewedLesson(root, [], '- Events: []\n'), /FIELD_DUPLICATE/)
})
