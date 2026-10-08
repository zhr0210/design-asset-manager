import assert from 'node:assert/strict'
import {createAssetCardController} from '../src/main/asset-card/asset-card-controller'
const scope={libraryIdentity:'library:test',generation:'generation:one',assetId:'asset:one'}
const changes:string[]=[]
const card=createAssetCardController({host:{inspect:()=>({state:'ready',identity:scope.libraryIdentity,generation:scope.generation}),readAssetContext:async()=>({schemaVersion:4,assets:[{id:'asset:one',aiCaption:'saved'} as any]}),updateAssetCaption:async()=>{}},createWindow:()=>({publish(){},show(){},setPinned(){},close(){},isTrusted:()=>true}),returnToWorkspace:(_scope,_configure,_prompt,_description,owner)=>changes.push(owner),onChanged:(_event,owner)=>changes.push(owner)})
await card.syncDraft({...scope,descriptionDraft:{value:'Alice draft',baseCaption:'saved'}},'client:alice')
await card.syncDraft({...scope,descriptionDraft:{value:'Bob draft',baseCaption:'saved'}},'client:bob')
await card.open(scope,'client:alice')
assert.equal(card.inspect()!.descriptionDraft.value,'Alice draft')
await card.syncDraft({...scope,descriptionDraft:{value:'Bob newer draft',baseCaption:'saved'}},'client:bob')
assert.equal(card.inspect()!.descriptionDraft.value,'Alice draft')
await card.act({token:card.inspect()!.token,kind:'return'})
assert.deepEqual(changes,['client:alice'])
await card.open(scope,'client:bob')
assert.equal(card.inspect()!.descriptionDraft.value,'Bob newer draft')
console.log('PASS native card handoff keeps each workspace draft and targets the initiating owner')
