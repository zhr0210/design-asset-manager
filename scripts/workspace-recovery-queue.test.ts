import assert from 'node:assert/strict'
let rejectOld!: (error: Error) => void
const writes: any[] = []
let resolveReady!: () => void, rejectReady!: (error: Error) => void
let rejectDiscarded!: (error:Error)=>void
const storage = new Map<string,string>()
;(globalThis as any).window = { dispatchEvent() {}, sessionStorage: {getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)} }
const {installWorkspaceClient} = await import('../src/renderer/workspace-client')
const writers: string[] = []
installWorkspaceClient({transitions:{ready:async (input:any)=>{writers.push(input.draftWriterId);await new Promise<void>((yes,no)=>{resolveReady=yes;rejectReady=no})}},drafts:{put:async (input:any)=>{writes.push(input);if(input.generation==='old')await new Promise((_yes,no)=>{rejectOld=no});if(input.value==='Discard while pending')await new Promise((_yes,no)=>{rejectDiscarded=no});return input},remove:async (input:any)=>{writes.push(input)}}} as any)
const drafts=await import('../src/renderer/workspace-drafts')
const old={libraryIdentity:'library:test',generation:'old',entityId:'asset:one',kind:'description' as const}
drafts.holdWorkspaceDraft(old,'旧库尚未送达的输入','base')
assert.deepEqual(drafts.currentWorkspaceDraft(old)?.base,'base')
const originalSequence=drafts.currentWorkspaceDraft(old)?.sequence
const preparing=drafts.prepareWorkspaceDraftWriter()
assert.equal(drafts.prepareWorkspaceDraftWriter(),preparing,'concurrent startup uses the same writer barrier')
const blockedFlush=drafts.flushWorkspaceDrafts()
await new Promise(resolve=>setImmediate(resolve))
assert.equal(writes.length,0,'no draft is sent before the Host has registered its writer')
rejectReady(Error('SYNTHETIC_READY_FAILED'))
await assert.rejects(preparing,/SYNTHETIC_READY_FAILED/)
await assert.rejects(blockedFlush,/草稿尚未暂存成功/)
assert.equal(drafts.currentWorkspaceDraft(old)?.sequence,originalSequence,'handshake failure preserves the original input order')
const oldFlush=drafts.flushWorkspaceDrafts()
await new Promise(resolve=>setImmediate(resolve))
assert.equal(writes.length,0,'the retry must also await a successful writer handshake')
resolveReady()
await new Promise(resolve=>setImmediate(resolve))
assert.equal(writes[0].sequence,originalSequence,'explicit retry sends the retained mutation, without renumbering it')
drafts.clearWorkspaceDraftView()
assert.equal(drafts.currentWorkspaceDraft(old),undefined,'revoked document state cannot be reopened as current')
drafts.holdWorkspaceDraft({...old,generation:'new'},'新库输入','new base')
rejectOld(Error('DRAFT_SCOPE_EXPIRED'))
await oldFlush
await drafts.flushWorkspaceDrafts()
assert.equal(drafts.currentWorkspaceDraft({...old,generation:'new'})?.value,'新库输入','acknowledged local input remains available when reopening')
assert.equal(writes.at(-1).value,'新库输入')
assert.equal(drafts.workspaceDraftSaveFailed(),false,'old failure must not block new generation')
assert.equal(drafts.archivedWorkspaceDrafts()[0].value,'旧库尚未送达的输入','unreceived old input must remain available for explicit recovery')
assert.match([...storage.values()].join(),/旧库尚未送达的输入/)
assert.equal(writers.length,2,'only the failed registration is retried; later flushes share the successful writer')
assert.equal(writers[0],writers[1],'a retry retains this document writer identity')
assert.equal(writes[0].writerId,writes.at(-1).writerId)
assert.ok(writes.at(-1).sequence>writes[0].sequence,'new user input receives a later sequence before sending')
const current={...old,generation:'new'}
drafts.removeWorkspaceDraft(current)
await drafts.flushWorkspaceDrafts()
assert.ok(writes.at(-1).sequence>writes.at(-2).sequence,'explicit removal fences all earlier queued input')
const discardScope={...current,entityId:'asset:discard'}
drafts.holdWorkspaceDraft(discardScope,'Discard while pending','saved')
const discardedInput=drafts.currentWorkspaceDraft(discardScope)!
const pendingDiscard=drafts.flushWorkspaceDrafts()
await new Promise(resolve=>setImmediate(resolve))
const record={...discardedInput,id:'draft:discard',revision:1,updatedAt:1,clientKind:'browser' as const,owned:true,activeElsewhere:false}
drafts.forgetDiscardedWorkspaceDraft(record,drafts.nextWorkspaceDraftOrder())
assert.equal(drafts.currentWorkspaceDraft(discardScope),undefined)
rejectDiscarded(Error('DRAFT_STALE_SEQUENCE'))
await pendingDiscard
assert.equal(drafts.workspaceDraftSaveFailed(),false,'a late rejection cannot restore an already discarded mutation')
assert.equal(drafts.archivedWorkspaceDrafts().some(item=>item.value==='Discard while pending'),false)
drafts.holdWorkspaceDraft(discardScope,'Discard while pending','saved')
const previousInput=drafts.currentWorkspaceDraft(discardScope)!
const previousFlush=drafts.flushWorkspaceDrafts()
await new Promise(resolve=>setImmediate(resolve))
const reviewedOrder=drafts.nextWorkspaceDraftOrder()
drafts.holdWorkspaceDraft(discardScope,'New input after discard action','saved')
drafts.forgetDiscardedWorkspaceDraft({...record,...previousInput},reviewedOrder)
assert.equal(drafts.currentWorkspaceDraft(discardScope)?.value,'New input after discard action','confirmation response cannot erase a later user action')
rejectDiscarded(Error('DRAFT_STALE_SEQUENCE'))
await previousFlush
await drafts.flushWorkspaceDrafts()
assert.equal(drafts.currentWorkspaceDraft(discardScope)?.value,'New input after discard action')
drafts.forgetDiscardedWorkspaceDraft({...record,owned:false},drafts.nextWorkspaceDraftOrder())
assert.equal(drafts.currentWorkspaceDraft(discardScope)?.value,'New input after discard action','discarding another editor\'s record never erases this editor')
console.log('PASS draft queue archives expired unsent input and keeps current generation independent')
