import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createShelfDraftStore} from '../src/main/work-mode/shelf-draft-store'
import {createWorkspaceDrafts} from '../src/main/local-host/workspace-drafts'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-draft-retirement-'))
try{
 const shelf=path.join(root,'shelf');await fs.mkdir(shelf)
 const legacy={libraryIdentity:'lib',id:'work:one',revision:2,value:{name:'Retain name',assetIds:['asset:one'],columns:2,note:'retire note',colors:['#AABBCC']}}
 const other={...legacy,libraryIdentity:'other',id:'work:other'}
 const file=path.join(shelf,'drafts.v1.json');await fs.writeFile(file,JSON.stringify({version:1,records:[legacy,other]}))
 const store=createShelfDraftStore(shelf);assert.equal(store.read('lib','work:one')?.value.name,'Retain name');assert.equal('note' in store.read('lib','work:one')!.value,false);assert.equal(JSON.parse(await fs.readFile(file,'utf8')).records[0].value.note,'retire note','Reading alone must retain historical disk fields')
 store.retireWorkSetFields('lib');const after=JSON.parse(await fs.readFile(file,'utf8'));assert.equal('note' in after.records[0].value,false);assert.equal(after.records[1].value.note,'retire note');assert.equal(createShelfDraftStore(shelf).read('lib','work:one')?.revision,2)
 const backup=(await fs.readdir(shelf)).find(name=>name.startsWith('retired-work-set-drafts-'))!;assert.equal(JSON.parse(await fs.readFile(path.join(shelf,backup),'utf8')).records[0].value.note,'retire note')
 const workspace=path.join(root,'workspace');await fs.mkdir(workspace)
 const record={libraryIdentity:'lib',generation:'gen',kind:'work-set',entityId:'work:one',value:legacy.value,base:{revision:2,value:legacy.value},id:'draft:one',owner:'desktop',revision:1,updatedAt:1,clientKind:'desktop'},notebook={...record,id:'draft:book',kind:'notebook',entityId:'asset:one',value:{notes:['keep asset note']}}
 const journal=path.join(workspace,'workspace-drafts.v1.json');await fs.writeFile(journal,JSON.stringify({version:1,records:[record,notebook]}))
 const drafts=createWorkspaceDrafts({directory:workspace,current:()=>({identity:'lib',generation:'gen'})});assert.equal('note' in (await drafts.list('desktop'))[0].value!,false);await drafts.retireWorkSetFields('lib')
 const saved=JSON.parse(await fs.readFile(journal,'utf8'));assert.equal('note' in saved.records[0].value,false);assert.equal('colors' in saved.records[0].base.value,false);assert.deepEqual(saved.records[1].value,{notes:['keep asset note']})
 console.log('PASS recovery retirement: read-only projection leaves disk intact; explicit library-scoped cleanup backs up retired fields, retains names/members/bases/revisions, unrelated library and Asset Notebook remain unchanged.')
}finally{await fs.rm(root,{recursive:true,force:true})}
