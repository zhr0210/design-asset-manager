// Actual shared Settings store with controlled asynchronous replies only.
// No renderer profile, Host, filesystem settings, network or model service access.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {installWorkspaceClient} from '../src/renderer/workspace-client'
import type {WorkspaceClient} from '../src/shared/client/workspace-client'
import type {AppSettings} from '../src/shared/types/settings.types'

type Deferred<T>={promise:Promise<T>;resolve(value:T):void;reject(error:Error):void}
const deferred=<T>():Deferred<T>=>{let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}}
const reads:Deferred<AppSettings>[]=[]
let pendingSave:Deferred<AppSettings>|undefined
let saved:AppSettings
let saveCalls=0
installWorkspaceClient({
 settingsLoad:()=>{const result=deferred<AppSettings>();reads.push(result);return result.promise},
 settingsSave:async patch=>{saveCalls++;return pendingSave?pendingSave.promise:(saved={...saved,...patch})}
} as WorkspaceClient)
const {useSettingsStore}=await import('../src/renderer/stores/settings.store')
const original=structuredClone(useSettingsStore.getState().settings)
const reset=()=>{reads.length=0;pendingSave=undefined;saveCalls=0;saved={...structuredClone(original),libraryPath:'Synthetic/Base'};useSettingsStore.setState({settings:saved})}
const microtasks=async()=>{for(let i=0;i<12;i++)await Promise.resolve()}

await test('later settings read wins when earlier reply arrives last',async()=>{
 reset();const first=useSettingsStore.getState().loadSettings(),second=useSettingsStore.getState().loadSettings()
 reads[1].resolve({...saved,libraryPath:'Synthetic/Newer'});await second
 reads[0].resolve({...saved,libraryPath:'Synthetic/Older'});await first
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Newer')
})

await test('read begun before a successful save cannot restore its old snapshot',async()=>{
 reset();const reading=useSettingsStore.getState().loadSettings(),before={...saved}
 await useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/Saved'})
 reads[0].resolve(before);await reading
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Saved')
})

await test('successful save invalidates a late read issued while that save was pending',async()=>{
 reset();pendingSave=deferred<AppSettings>();const saving=useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/Saved'})
 const reading=useSettingsStore.getState().loadSettings(),before={...saved}
 pendingSave.resolve({...saved,libraryPath:'Synthetic/Saved'});await saving
 reads[0].resolve(before);await reading
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Saved')
})

await test('an ordinary mount refresh waits for the required read before requesting a newer snapshot',async()=>{
 reset();const required=useSettingsStore.getState().loadSettings(true),newer=useSettingsStore.getState().loadSettings()
 assert.equal(reads.length,1,'ordinary refresh must not supersede the pending reconciliation read')
 reads[0].resolve({...saved,libraryPath:'Synthetic/Barrier'});await required;await microtasks()
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Barrier')
 assert.equal(reads.length,2,'ordinary refresh still fetches authority after the barrier')
 reads[1].resolve({...saved,libraryPath:'Synthetic/Newer'});await newer
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Newer')
})

await test('a failed required read still rejects even if a queued ordinary refresh later succeeds',async()=>{
 reset();const required=useSettingsStore.getState().loadSettings(true),newer=useSettingsStore.getState().loadSettings()
 const rejected=assert.rejects(required,/SYNTHETIC_BARRIER_FAILED/)
 assert.equal(reads.length,1)
 reads[0].reject(Error('SYNTHETIC_BARRIER_FAILED'));await rejected;await microtasks()
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Base')
 assert.equal(reads.length,2)
 reads[1].resolve({...saved,libraryPath:'Synthetic/Newer'});await newer
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Newer')
})

await test('an ordinary refresh waits through a newer required read and the older barrier rejects',async()=>{
 reset();const first=useSettingsStore.getState().loadSettings(true),ordinary=useSettingsStore.getState().loadSettings()
 const second=useSettingsStore.getState().loadSettings(true),rejected=assert.rejects(first,/SETTINGS_LOAD_SUPERSEDED/)
 reads[0].resolve({...saved,libraryPath:'Synthetic/OldBarrier'});await rejected;await microtasks()
 assert.equal(reads.length,2,'ordinary refresh must keep waiting for the current barrier')
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Base')
 reads[1].resolve({...saved,libraryPath:'Synthetic/CurrentBarrier'});await second;await microtasks()
 assert.equal(reads.length,3)
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/CurrentBarrier')
 reads[2].resolve({...saved,libraryPath:'Synthetic/Newer'});await ordinary
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Newer')
})

await test('a save still invalidates a pending required read without overwriting the committed settings',async()=>{
 reset();const required=useSettingsStore.getState().loadSettings(true),rejected=assert.rejects(required,/SETTINGS_LOAD_SUPERSEDED/)
 await useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/Saved'})
 reads[0].resolve({...saved,libraryPath:'Synthetic/OldBarrier'});await rejected
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Saved')
})

await test('save failure retains a newer authoritative read instead of rolling it back',async()=>{
 reset();pendingSave=deferred<AppSettings>();const saving=useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/Unsaved'})
 const rejected=assert.rejects(saving,/SYNTHETIC_SAVE_FAILED/),reading=useSettingsStore.getState().loadSettings()
 reads[0].resolve({...saved,libraryPath:'Synthetic/Remote'});await reading
 pendingSave.reject(Error('SYNTHETIC_SAVE_FAILED'));await rejected
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Remote')
})

await test('failed save can still read back authority and required load failures still reject',async()=>{
 reset();pendingSave=deferred<AppSettings>();const saving=useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/Unsaved'})
 const rejected=assert.rejects(saving,/SYNTHETIC_SAVE_FAILED/);pendingSave.reject(Error('SYNTHETIC_SAVE_FAILED'));await rejected
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Base')
 pendingSave=undefined
 const reading=useSettingsStore.getState().loadSettings(true);reads[0].resolve({...saved,libraryPath:'Synthetic/Readback'});await reading
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Readback')
 const failed=useSettingsStore.getState().loadSettings(true),failure=assert.rejects(failed,/SYNTHETIC_READ_FAILED/)
 reads[1].reject(Error('SYNTHETIC_READ_FAILED'));await failure
 assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Readback')
})

await test('late save reply reads authority once instead of overwriting a newer synchronized field',async()=>{
 reset();pendingSave=deferred<AppSettings>();const saving=useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/Saved'})
 const current={...saved,libraryPath:'Synthetic/Saved',modelRootDir:'Synthetic/RemoteModels'},reading=useSettingsStore.getState().loadSettings()
 reads[0].resolve(current);await reading
 pendingSave.resolve({...saved,libraryPath:'Synthetic/Saved'});await microtasks()
 assert.equal(reads.length,2,'changed store requires one fresh authority read, not an old full save snapshot')
 reads[1].resolve(current);await saving
 assert.equal(useSettingsStore.getState().settings.modelRootDir,'Synthetic/RemoteModels');assert.equal(saveCalls,1)
})

await test('refresh failure after committed save neither rejects the save nor rolls back the newer snapshot',async()=>{
 reset();pendingSave=deferred<AppSettings>();const saving=useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/Saved'})
 const current={...saved,libraryPath:'Synthetic/Saved',modelRootDir:'Synthetic/RemoteModels'},reading=useSettingsStore.getState().loadSettings()
 reads[0].resolve(current);await reading
 pendingSave.resolve({...saved,libraryPath:'Synthetic/Saved'});await microtasks()
 assert.equal(reads.length,2);reads[1].reject(Error('SYNTHETIC_POST_COMMIT_REFRESH_FAILED'));await saving
 assert.equal(useSettingsStore.getState().settings.modelRootDir,'Synthetic/RemoteModels');assert.equal(useSettingsStore.getState().settings.libraryPath,'Synthetic/Saved')
 assert.equal(saveCalls,1);assert.equal(reads.length,2,'failed post-commit refresh must not retry')
})

await test('an older save reply leaves a newer optimistic save intact without resending or rereading',async()=>{
 reset();const firstReply=deferred<AppSettings>(),secondReply=deferred<AppSettings>();pendingSave=firstReply
 const first=useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/FirstSave'});pendingSave=secondReply
 const second=useSettingsStore.getState().updateSettings({modelRootDir:'Synthetic/NewOptimisticModels'})
 firstReply.resolve({...saved,libraryPath:'Synthetic/FirstSave'});await first
 assert.equal(useSettingsStore.getState().settings.modelRootDir,'Synthetic/NewOptimisticModels');assert.equal(reads.length,0)
 secondReply.resolve({...saved,libraryPath:'Synthetic/FirstSave',modelRootDir:'Synthetic/NewOptimisticModels'});await second
 assert.equal(useSettingsStore.getState().settings.modelRootDir,'Synthetic/NewOptimisticModels');assert.equal(saveCalls,2)
})

await test('a newer optimistic save invalidates the older save post-commit reread',async()=>{
 reset();const firstReply=deferred<AppSettings>(),secondReply=deferred<AppSettings>();pendingSave=firstReply
 const first=useSettingsStore.getState().updateSettings({libraryPath:'Synthetic/FirstSave'})
 const current={...saved,libraryPath:'Synthetic/FirstSave',modelRootDir:'Synthetic/RemoteModels'},reading=useSettingsStore.getState().loadSettings()
 reads[0].resolve(current);await reading
 firstReply.resolve({...saved,libraryPath:'Synthetic/FirstSave'});await microtasks();assert.equal(reads.length,2)
 pendingSave=secondReply;const second=useSettingsStore.getState().updateSettings({modelRootDir:'Synthetic/NewOptimisticModels'})
 reads[1].resolve(current);await first
 assert.equal(useSettingsStore.getState().settings.modelRootDir,'Synthetic/NewOptimisticModels')
 secondReply.resolve({...current,modelRootDir:'Synthetic/NewOptimisticModels'});await second
 assert.equal(useSettingsStore.getState().settings.modelRootDir,'Synthetic/NewOptimisticModels');assert.equal(saveCalls,2);assert.equal(reads.length,2)
})
