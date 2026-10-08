import assert from 'node:assert/strict'
import {createCommandReceiptAuthority} from '../src/main/local-host/command-receipts'
let generation='one',now=1000
const authority=createCommandReceiptAuthority({generation:()=>generation,now:()=>now,maxEntries:4,ttlMs:100})
const plan=await authority.execute('alice',[],async()=>({receipt:'plan:one'}),'library:create:prepare')
await assert.rejects(authority.execute('bob',[plan.receipt],async()=>true,'library:create:confirm'),/RECEIPT/)
await assert.rejects(authority.execute('alice',[plan.receipt],async()=>true,'image-tools:save'),/RECEIPT/)
await assert.rejects(authority.execute('alice',['unknown'],async()=>true,'library:create:confirm'),/RECEIPT/)
assert.equal(await authority.execute('alice',[plan.receipt],async()=>true,'library:create:confirm'),true)
for (const owner of ['alice','bob']) assert.equal(await authority.execute(owner,[{clientReceipt:'new-idempotency-key'}],async()=>true,'connected-library:queue-metadata'),true,'client-generated idempotency keys are not authority grants')
now=1101
await assert.rejects(authority.execute('alice',[plan.receipt],async()=>true,'library:create:confirm'),/RECEIPT/)
await authority.execute('alice',[],async()=>({receipt:'plan:new'}),'library:create:prepare')
generation='two'
await assert.rejects(authority.execute('alice',['plan:new'],async()=>true,'library:create:confirm'),/RECEIPT/)
console.log('PASS receipts reject unknown, foreign, expired and wrong-purpose grants; shared projections do not steal authority')
