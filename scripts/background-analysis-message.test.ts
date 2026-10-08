import assert from 'node:assert/strict'
import {test} from 'node:test'
import {backgroundMessage} from '../src/main/background-analysis/background-analysis-controller'
import {registerBackgroundAnalysisIpc} from '../src/main/ipc/background-analysis.ipc'

await test('backup qualification refusal describes uncommitted policy and usable basic library',()=>{
 const message=backgroundMessage(Error('TAG_INTENT_BACKUP_UNSUPPORTED'))
 assert.match(message,/尚未通过安全备份验证/)
 assert.match(message,/计划未保存、资料库未升级/)
 assert.match(message,/现有素材与手工编辑仍可使用/)
 assert.doesNotMatch(message,/重试|TAG_INTENT/)
 if(process.platform==='win32')assert.match(message,/Windows/)
})
await test('formal background IPC preserves capability refusal without exposing internal errors',async()=>{
 const handlers=new Map<string,Function>()
 const controller={confirm:async()=>{throw Error('TAG_INTENT_BACKUP_UNSUPPORTED')}} as any
 registerBackgroundAnalysisIpc({controller,isMain:()=>true,handle:(name,handler)=>{handlers.set(name,handler)}})
 const result=await handlers.get('background-analysis:confirm')!({client:{kind:'desktop'}},'synthetic-receipt')
 assert.equal(result.ok,false)
 assert.equal(result.error,backgroundMessage(Error('TAG_INTENT_BACKUP_UNSUPPORTED')))
 assert.doesNotMatch(backgroundMessage(Error('synthetic-private-path-and-detail')),/private-path|detail/)
 assert.match(backgroundMessage(Error('TAG_INTENT_ACK_UNCERTAIN')),/可能已保存/)
 assert.match(backgroundMessage(Error('TAG_INTENT_SETTINGS_RESTORE_FAILED')),/已停止写入/)
})
