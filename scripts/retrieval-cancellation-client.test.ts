import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createWorkspaceClient} from '../src/shared/client/workspace-client'
import type {AssetSemanticSearchRequest} from '../src/shared/contracts/retrieval-workspace.contract'

test('a query cancellation sends only the frozen library scope and query identity',async()=>{
 const calls:Array<{channel:string;args:unknown[]}>=[]
 const client=createWorkspaceClient({invoke:async(channel:string,...args:unknown[])=>{calls.push({channel,args});return undefined},on(){},removeListener(){}})
 const query:AssetSemanticSearchRequest={libraryIdentity:'public-library',generation:'generation',queryId:'12345678-1234-1234-1234-123456789012',
  query:'a cup of coffee on a wooden table',mode:'semantic',tagScope:'includes-pending',limit:80,folderId:'selected-folder'}
 await client.retrieval.cancel(query,query.queryId!)
 assert.deepEqual(calls,[{channel:'asset-retrieval:cancel-query',args:[{libraryIdentity:query.libraryIdentity,generation:query.generation,id:query.queryId}]}],
  'The production Host rejects extra query fields in its narrow cancellation action; typed structural subtypes must not leak onto the wire')
})
