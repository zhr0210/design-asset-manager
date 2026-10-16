#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_OUTPUT_BYTES = 12000
const CLASSES = new Set(['Core', 'Supporting', 'Spec-candidate', 'Historical'])
const STATUSES = new Set(['accepted', 'proposed', 'deprecated', 'superseded', 'not-declared'])
const idPattern = /^[a-z][a-z0-9-]{0,59}$/

// Metadata is navigation, never execution permission or a delivery verdict.
export function validateAdrCatalog(catalog, root) {
  const errors = []
  if (catalog?.schema_version !== 1 || !Array.isArray(catalog.entries) || !Array.isArray(catalog.topics) || !Array.isArray(catalog.taskTypes)) return ['ADR_INDEX_SHAPE_INVALID']
  const bounded = value => typeof value === 'string' && value.length > 0 && value.length <= 240
  const topics = new Set(), kinds = new Set(), ids = new Set()
  for (const [list, seen] of [[catalog.topics, topics], [catalog.taskTypes, kinds]]) {
    for (const item of list) {
      if (!idPattern.test(item.id) || seen.has(item.id) || !bounded(item.label)) errors.push('ADR_INDEX_GROUP_INVALID')
      seen.add(item.id)
    }
  }
  if (!kinds.has('general')) errors.push('ADR_INDEX_GENERAL_MISSING')
  if (catalog.entries.length > 5000) errors.push('ADR_INDEX_TOO_LARGE')
  for (const entry of catalog.entries) {
    if (!/^\d{4}$/.test(entry.id) || ids.has(entry.id) || !bounded(entry.title) ||
        !new RegExp(`^docs/adr/${entry.id}-[a-z0-9-]+\\.md$`).test(entry.path) ||
        !CLASSES.has(entry.classification) || !STATUSES.has(entry.status) ||
        !Array.isArray(entry.topics) || entry.topics.length === 0 || entry.topics.some(t => !topics.has(t)) ||
        !Array.isArray(entry.facets) || entry.facets.some(f => !idPattern.test(f)) ||
        !Array.isArray(entry.references) || entry.references.some(id => !/^\d{4}$/.test(id)) ||
        entry.keywords !== undefined && (!Array.isArray(entry.keywords) || entry.keywords.length > 60 || entry.keywords.some(k => !bounded(k))) ||
        entry.detail !== null && !/^docs\/product\/specs\/[a-z0-9-]+\.md#adr-\d{4}$/.test(entry.detail)) errors.push(`ADR_INDEX_ENTRY_INVALID: ${entry.id}`)
    ids.add(entry.id)
    if (root && (!fs.existsSync(path.join(root, entry.path)) || !fs.lstatSync(path.join(root, entry.path)).isFile() || fs.lstatSync(path.join(root, entry.path)).isSymbolicLink() || !fs.realpathSync(path.join(root, entry.path)).startsWith(`${fs.realpathSync(root)}${path.sep}`))) errors.push(`ADR_INDEX_PATH_INVALID: ${entry.id}`)
  }
  for (const entry of catalog.entries) {
    if (entry.references.some(id => !ids.has(id))) errors.push(`ADR_INDEX_REFERENCE_INVALID: ${entry.id}`)
  }
  for (const topic of catalog.topics) {
    if (!Array.isArray(topic.keywords) || topic.keywords.some(k => !bounded(k)) ||
        topic.reference !== `docs/adr/indexes/topics/${topic.id}.md`) errors.push('ADR_INDEX_TOPIC_INVALID')
    if (root && !fs.existsSync(path.join(root, topic.reference))) errors.push(`ADR_INDEX_TOPIC_PATH_INVALID: ${topic.id}`)
  }
  for (const kind of catalog.taskTypes) {
    if (!Array.isArray(kind.facets) || kind.facets.some(f => !idPattern.test(f)) || !bounded(kind.focus)) errors.push('ADR_INDEX_TASK_TYPE_INVALID')
  }
  return errors
}

export function loadAdrCatalog(root = ROOT) {
  const file = path.join(root, '.codeindex/adr-index.json'), stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw Error('ADR_INDEX_FILE_INVALID')
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'))
  const errors = validateAdrCatalog(catalog, root)
  if (errors.length) throw Error(errors.slice(0, 5).join('; '))
  return catalog
}

function contains(text, term) {
  const word = term.toLowerCase()
  if (/^[a-z0-9 ]+$/.test(word)) return (` ${text.replace(/[^a-z0-9]+/g, ' ')} `).includes(` ${word} `)
  return text.includes(word)
}

export function routeAdrMetadata(catalog, {kind = 'general', topic, task = '', limit = 3, includeHistory = false} = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 8) throw Error('ADR_LIMIT_INVALID: use 1–8')
  if (typeof task !== 'string' || task.length > 2000 || typeof kind !== 'string' || kind.length > 80) throw Error('ADR_QUERY_INVALID')
  const knownTopic = topic && catalog.topics.find(t => t.id === topic)
  if (topic && !knownTopic) throw Error('ADR_TOPIC_UNKNOWN: use --list-topics')
  const profile = catalog.taskTypes.find(t => t.id === kind) ?? catalog.taskTypes.find(t => t.id === 'general')
  const query = task.toLowerCase()
  const inferred = knownTopic ? [knownTopic] : catalog.topics.filter(t => t.keywords.some(word => contains(query, word)))
  const queryTokens = [...new Set(query.match(/[a-z0-9]{3,}|[\u4e00-\u9fff]{2,}/g) ?? [])]
  const scopedTopics = new Set(inferred.map(t => t.id))
  const matches = []
  for (const entry of catalog.entries) {
    if (!includeHistory && (entry.classification === 'Historical' || ['superseded', 'deprecated'].includes(entry.status))) continue
    const matchedTopics = entry.topics.filter(t => scopedTopics.has(t))
    const titleTerms = queryTokens.filter(word => contains(entry.title.toLowerCase(), word))
    const conceptTerms = (entry.keywords ?? []).filter(word => contains(query, word))
    const exactId = new RegExp(`(?:^|\\D)${entry.id}(?:\\D|$)`).test(query)
    // A task type never makes an unrelated decision relevant or hides an in-scope one.
    if (knownTopic ? matchedTopics.length === 0 : matchedTopics.length === 0 && titleTerms.length === 0 && conceptTerms.length === 0 && !exactId) continue
    const focusFacets = entry.facets.filter(f => profile.facets.includes(f))
    const score = matchedTopics.length * 20 + titleTerms.length * 8 + conceptTerms.length * 12 + focusFacets.length + (exactId ? 100 : 0)
    matches.push({entry, score, matchedTopics, titleTerms, focusFacets})
  }
  matches.sort((a,b) => b.score-a.score || a.entry.id.localeCompare(b.entry.id))
  const kept = matches.slice(0,limit)
  const project = item => ({id:item.entry.id,title:item.entry.title,path:item.entry.path,
    classification:item.entry.classification,status:item.entry.status,
    ...(item.entry.detail ? {detail:item.entry.detail} : {}),
    matchedTopics:item.matchedTopics,focusFacets:item.focusFacets,
    referencesToCheck:item.entry.references.slice(0,3),
    ...(item.entry.references.length>3 ? {moreReferences:item.entry.references.length-3} : {})})
  const envelope = () => ({ok:true, scope:matches.length ? 'scoped' : task.trim() || topic ? 'no-match-refine-scope' : 'needs-scope',
    taskType:{requested:kind,resolved:profile.id,focus:profile.focus},topic:topic??null,
    candidates:kept.map(project), totalMatches:matches.length,deferred:matches.length-kept.length,
    topicIndexes:inferred.slice(0,6).map(t => t.reference),
    limits:{maxCandidates:limit,maxOutputBytes:MAX_OUTPUT_BYTES},
    note:'Metadata only; read selected ADRs/details next. Type is a reading focus, not an applicability filter. No match is not proof that no decision applies.'})
  let result = envelope()
  while (Buffer.byteLength(JSON.stringify(result,null,2))>MAX_OUTPUT_BYTES && kept.length>1) {kept.pop();result=envelope()}
  if (Buffer.byteLength(JSON.stringify(result,null,2))>MAX_OUTPUT_BYTES) throw Error('ADR_OUTPUT_BUDGET_EXCEEDED')
  return result
}

function main(argv) {
  try {
    const options={}, args=[...argv]
    const command=args.shift()??'route'
    if (!['route','check','--list-types','--list-topics'].includes(command)) throw Error('ADR_COMMAND_INVALID')
    while(args.length) {
      const arg=args.shift()
      if(arg==='--json')options.json=true
      else if(arg==='--include-history')options.includeHistory=true
      else if(['--kind','--topic','--task','--limit'].includes(arg)) {
        const value=args.shift();if(value===undefined || value.startsWith('--'))throw Error('ADR_ARGUMENT_MISSING')
        if(arg==='--limit' && !/^[1-8]$/.test(value))throw Error('ADR_LIMIT_INVALID: use 1–8')
        options[arg.slice(2)]=arg==='--limit'?Number(value):value
      } else throw Error('ADR_ARGUMENT_UNKNOWN')
    }
    const catalog=loadAdrCatalog()
    let result
    if(command==='check') result={ok:true,decisions:catalog.entries.length,topics:catalog.topics.length,taskTypes:catalog.taskTypes.length}
    else if(command==='--list-types')result=catalog.taskTypes.map(({id,label,focus})=>({id,label,focus}))
    else if(command==='--list-topics')result=catalog.topics.map(({id,label})=>({id,label}))
    else result=routeAdrMetadata(catalog,options)
    // One bounded JSON envelope; never print the entire catalog or original bodies.
    console.log(JSON.stringify(result,null,options.json?2:0));return 0
  } catch(error) {console.error(JSON.stringify({ok:false,error:error.message}));return 1}
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=main(process.argv.slice(2))
