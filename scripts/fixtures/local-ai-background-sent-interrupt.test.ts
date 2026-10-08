import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import Database from 'better-sqlite3'

// Explicit crash experiment on the public recoverable copy. The UI imports
// the new asset and the production dispatcher sends it. This only observes
// the persisted sent boundary and terminates the verified owned Host tree.
// It never sends a model/IPC request or reads keys, settings or command lines.
const hostPid=Number(process.env.DAM_PUBLIC_BACKGROUND_HOST_PID),port=Number(process.env.DAM_PUBLIC_BACKGROUND_HOST_PORT)
assert.ok(Number.isSafeInteger(hostPid)&&hostPid>0&&Number.isSafeInteger(port)&&port>0&&port<=65535)
const root=path.resolve('.scratch/local-ai-implementation-20261006/background-ca8819d6-7793-4549-8e43-bc50eac77293')
const verifyHost=()=>{
  const actual=execFileSync('powershell.exe',['-NoProfile','-Command',`(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction Stop).OwningProcess`],{encoding:'utf8',windowsHide:true}).trim()
  assert.equal(Number(actual),hostPid,'Only the observed ordinary DAM Host may be interrupted')
}
verifyHost()
const db=new Database(path.join(root,'library/.dam/library.sqlite'),{readonly:true,fileMustExist:true})
const statement=db.prepare(`SELECT a.title,i.capability,x.state,x.attempt_id,x.request_id,x.updated_at
  FROM background_analysis_executions x JOIN background_analysis_intents i ON i.id=x.intent_id JOIN assets a ON a.id=i.asset_id
  WHERE a.title='T14-page' AND i.capability='caption' AND x.state='sent' LIMIT 1`)
try{
  const end=Date.now()+240000
  for(;;){
    const sent=statement.get()
    if(sent){
      await fs.writeFile(path.join(root,'sent-before-interruption.json'),JSON.stringify({sent,hostPid,port,at:new Date().toISOString()},null,2))
      // The host was bound before this unique UI task. Avoid a slow OS port
      // enumeration here that could let a short GPU inference commit first.
      process.kill(hostPid,0)
      execFileSync('taskkill.exe',['/PID',String(hostPid),'/T','/F'],{stdio:'ignore',windowsHide:true})
      console.log(JSON.stringify({event:'owned-production-host-tree-interrupted',sent,hostPid,port}))
      break
    }
    if(Date.now()>=end)throw Error('NO_PRODUCTION_SENT_BOUNDARY_OBSERVED')
    await new Promise(resolve=>setTimeout(resolve,30))
  }
}finally{db.close()}
