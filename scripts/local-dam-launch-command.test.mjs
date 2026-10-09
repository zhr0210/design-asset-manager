import assert from 'node:assert/strict'
import {localDamLaunchCommand} from './local-dam-launch-command.mjs'
const binary='/fixture/DAM work/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',root='/fixture/DAM work'
const args=['.','--dam-browser','--dam-profile=/fixture/公开 profile']
assert.deepEqual(localDamLaunchCommand({platform:'darwin',synthetic:false,electronBinary:binary,root,args}),{executable:'/usr/bin/open',args:['-W','-n','-a','/fixture/DAM work/node_modules/electron/dist/Electron.app','--args',root,...args.slice(1)]})
for(const entry of [{platform:'win32',synthetic:false},{platform:'darwin',synthetic:true}])assert.deepEqual(localDamLaunchCommand({...entry,electronBinary:binary,root,args}),{executable:binary,args})
assert.throws(()=>localDamLaunchCommand({platform:'darwin',synthetic:false,electronBinary:'/bad/binary',root,args}),/TARGET_INVALID/)
console.log('Mac ordinary entry uses exact bundle LaunchServices, absolute root, wait/new and unchanged profile/browser args; Windows and isolated fixtures retain direct launch.')
