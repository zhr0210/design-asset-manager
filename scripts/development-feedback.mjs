import fs from 'node:fs'
import path from 'node:path'

const SOURCES = [
  { path: 'docs/agents/DEVELOPMENT-PROBLEMS.md', prefix: 'P', statuses: ['needs-reproduction', 'open', 'in-progress', 'blocked', 'resolved', 'not-planned'] },
  { path: 'LESSONS.md', prefix: 'L', statuses: ['active', 'superseded', 'archived'] }
]
const GROUPS = new Set(['common', 'frontend', 'host', 'integration'])
const FIELDS = new Set(['Routes', 'Group', 'Status', 'Check'])
const REVIEW_FIELDS = new Set(['Events', 'Severity', 'Promoted', 'Deferral'])

function reviewDate(value) {
  if (typeof value !== 'string') throw Error('FEEDBACK_REVIEW_DATE_INVALID')
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw Error('FEEDBACK_REVIEW_DATE_INVALID')
    return value
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))) throw Error('FEEDBACK_REVIEW_DATE_INVALID')
  // Validate the calendar part as well: Date.parse normalizes February 30.
  reviewDate(value.slice(0, 10))
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value))
  const get = kind => parts.find(part => part.type === kind).value
  return `${get('year')}-${get('month')}-${get('day')}`
}

function reviewReference(root, value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 320 || /[\s?\\]/.test(value)) {
    throw Error('FEEDBACK_REVIEW_REFERENCE_INVALID')
  }
  const [file, anchor, ...extra] = value.split('#')
  if (extra.length || anchor === '' || path.posix.normalize(file) !== file || file.startsWith('/') ||
      file.split('/').includes('..') ||
      !(/^(?:docs\/.*\.md|src\/.*\/README\.md|scripts\/[^\s]+\.test\.(?:[cm]?js|tsx?|py)|DESIGN\.md)$/.test(file))) {
    throw Error('FEEDBACK_REVIEW_REFERENCE_INVALID')
  }
  const absolute = path.join(root, file)
  if (!fs.lstatSync(absolute).isFile() || fs.lstatSync(absolute).isSymbolicLink() ||
      !fs.realpathSync(absolute).startsWith(`${fs.realpathSync(root)}${path.sep}`)) throw Error('FEEDBACK_REVIEW_REFERENCE_INVALID')
  if (anchor) {
    if (fs.statSync(absolute).size > 2 * 1024 * 1024) throw Error('FEEDBACK_REVIEW_REFERENCE_INVALID')
    const source = fs.readFileSync(absolute, 'utf8')
    const explicit = [...source.matchAll(/<a\s+id=["']([^"']+)["']/g)].map(match => match[1])
    const headings = [...source.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match =>
      match[1].toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/ /g, '-'))
    if (!explicit.includes(anchor) && !headings.includes(anchor) && !source.includes(anchor) && !file.endsWith('.md')) {
      throw Error('FEEDBACK_REVIEW_ANCHOR_INVALID')
    }
    if (file.endsWith('.md') && !explicit.includes(anchor) && !headings.includes(anchor)) throw Error('FEEDBACK_REVIEW_ANCHOR_INVALID')
  }
  return value
}

function lessonPromotion(root, entry) {
  const fields = entry.review
  if (Object.keys(fields).length === 0) return undefined
  if (!entry.id.startsWith('DAM-L')) throw Error(`FEEDBACK_REVIEW_NOT_LESSON: ${entry.id}`)
  const severity = fields.Severity ?? 'ordinary'
  if (!['ordinary', 'critical'].includes(severity)) throw Error('FEEDBACK_SEVERITY_INVALID')
  let events
  try { events = JSON.parse(fields.Events ?? '[]') } catch { throw Error('FEEDBACK_EVENTS_INVALID') }
  if (!Array.isArray(events) || events.length > 100) throw Error('FEEDBACK_EVENTS_INVALID')
  const ids = new Map()
  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event) ||
        Object.keys(event).sort().join(',') !== 'evidence,id,reviewed' ||
        typeof event.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(event.id)) throw Error('FEEDBACK_EVENTS_INVALID')
    const normalized = { date: reviewDate(event.reviewed), evidence: reviewReference(root, event.evidence) }
    if (ids.has(event.id) && JSON.stringify(ids.get(event.id)) !== JSON.stringify(normalized)) throw Error('FEEDBACK_EVENT_CONFLICT')
    ids.set(event.id, normalized)
  }
  if (severity === 'critical' && ids.size === 0) throw Error('FEEDBACK_CRITICAL_WITHOUT_EVIDENCE')
  const distinctDates = new Set([...ids.values()].map(event => event.date)).size
  const candidate = severity === 'critical' || distinctDates >= 3
  if (fields.Promoted && fields.Deferral) throw Error('FEEDBACK_PROMOTION_CONFLICT')
  if (fields.Deferral && (!candidate || fields.Deferral.length > 500)) throw Error('FEEDBACK_DEFERRAL_INVALID')
  return {
    state: fields.Promoted ? 'promoted' : fields.Deferral ? 'deferred' : candidate ? 'candidate' : 'observing',
    distinctDates, events: ids.size, severity,
    ...(fields.Promoted ? { rule: reviewReference(root, fields.Promoted) } : {}),
    ...(fields.Deferral ? { reason: fields.Deferral } : {})
  }
}

// Markdown is the authority. Return bounded references and checks, never commands
// to execute; selecting a historical problem does not authorize working on it.
export function loadDevelopmentFeedback(root, knownRoutes) {
  const routes = new Set(knownRoutes)
  const ids = new Set()
  const entries = []
  for (const source of SOURCES) {
    const file = path.join(root, source.path)
    const stat = fs.lstatSync(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024) {
      throw Error(`FEEDBACK_SOURCE_INVALID: ${source.path}`)
    }
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    let entry = null
    const finish = () => {
      if (!entry) return
      const values = entry.fields
      if (FIELDS.size !== Object.keys(values).length ||
          !GROUPS.has(values.Group) || !source.statuses.includes(values.Status) ||
          !values.Check || values.Check.length > 500 || entry.title.length > 180) {
        throw Error(`FEEDBACK_ENTRY_INVALID: ${entry.id}`)
      }
      const selectedRoutes = values.Routes.split(',').map(value => value.trim())
      if (selectedRoutes.length === 0 || new Set(selectedRoutes).size !== selectedRoutes.length ||
          selectedRoutes.some(route => route !== '*' && !routes.has(route)) ||
          selectedRoutes.includes('*') && (selectedRoutes.length !== 1 || values.Group !== 'common')) {
        throw Error(`FEEDBACK_ROUTES_INVALID: ${entry.id}`)
      }
      const promotion = lessonPromotion(root, entry)
      entries.push({ id: entry.id, title: entry.title, group: values.Group,
        status: values.Status, routes: selectedRoutes, check: values.Check,
        source: source.path, anchor: entry.id.toLowerCase(), line: entry.line,
        ...(promotion ? { promotion } : {}) })
      entry = null
    }
    for (const [index, line] of lines.entries()) {
      const heading = /^### (DAM-([PL])\d{3}) — (.+)$/.exec(line)
      if (heading) {
        finish()
        if (heading[2] !== source.prefix || ids.has(heading[1])) {
          throw Error(`FEEDBACK_ID_INVALID: ${heading[1]}`)
        }
        ids.add(heading[1])
        entry = { id: heading[1], title: heading[3], line: index + 1, fields: {}, review: {} }
      } else if (/^#{1,3} /.test(line)) {
        if (/^### DAM-/.test(line)) throw Error(`FEEDBACK_HEADING_INVALID: ${source.path}:${index + 1}`)
        finish()
      } else if (entry) {
        const field = /^- (Routes|Group|Status|Check|Events|Severity|Promoted|Deferral): (.*)$/.exec(line)
        if (field) {
          const target = REVIEW_FIELDS.has(field[1]) ? entry.review : entry.fields
          if (Object.hasOwn(target, field[1])) throw Error(`FEEDBACK_FIELD_DUPLICATE: ${entry.id}`)
          target[field[1]] = field[2].trim()
        }
      }
    }
    finish()
  }
  return entries
}

export function selectDevelopmentFeedback(entries, routeIds) {
  const selected = new Set(routeIds)
  const relevant = entries.filter(entry => entry.routes.includes('*') || entry.routes.some(route => selected.has(route)))
  const active = relevant.filter(entry => !['resolved', 'not-planned', 'superseded', 'archived'].includes(entry.status))
    .sort((a, b) => Number(b.promotion?.state === 'candidate') - Number(a.promotion?.state === 'candidate'))
  const project = entry => {
    const { routes, title, ...item } = entry
    return { ...item, matchedRoutes: routes.filter(route => route === '*' || selected.has(route)) }
  }
  return {
    problems: active.filter(entry => entry.id.startsWith('DAM-P')).slice(0, 8).map(project),
    lessons: active.filter(entry => entry.id.startsWith('DAM-L')).slice(0, 8).map(project),
    deferred: active.filter(entry => entry.id.startsWith('DAM-P')).slice(8).length +
      active.filter(entry => entry.id.startsWith('DAM-L')).slice(8).length,
    writeBack: {
      problems: 'docs/agents/DEVELOPMENT-PROBLEMS.md',
      lessons: 'LESSONS.md',
      currentTask: 'TASK.md',
      responsibilities: 'docs/tasks/TASK-REGISTRY.md',
      capabilityEvidence: 'docs/handoff/CURRENT-STATE.md',
      evidence: 'Current checkpoint',
      contracts: 'Module README/spec; DESIGN.md'
    },
    scope: 'Checks, not task authorization.'
  }
}

// Keep at least one record of each selected kind, and prefer keeping common
// guidance. Full checks remain in Markdown; never truncate their meaning.
export function deferDevelopmentFeedback(feedback) {
  const candidates = ['problems', 'lessons']
    .filter(kind => feedback[kind].length > 1)
    .sort((a, b) => {
      const lastA = feedback[a].at(-1), lastB = feedback[b].at(-1)
      return Number(lastA.group === 'common') - Number(lastB.group === 'common') ||
        feedback[b].length - feedback[a].length
    })
  if (candidates.length === 0) return false
  feedback[candidates[0]].pop()
  feedback.deferred++
  return true
}
