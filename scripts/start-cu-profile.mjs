import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {spawn} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-rux-cu-')))
for(const name of ['profile','evidence','entry','empty-library','invalid-library','generated'])await fs.mkdir(path.join(root,name))
await fs.writeFile(path.join(root,'invalid-library','sentinel.txt'),'Owned invalid library fixture; do not modify.')
const source=path.join(root,'generated','blue-design.png')
await sharp({create:{width:320,height:240,channels:3,background:'#7799bb'}}).png().toFile(source)
await fs.writeFile(path.join(root,'entry','package.json'),JSON.stringify({name:'dam-cu-isolated',type:'module',main:'main.mjs'}))
await fs.writeFile(path.join(root,'entry','main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
const config={rootDirectory:root,profileDirectory:path.join(root,'profile'),libraryDirectory:path.join(root,'empty-library'),evidenceDirectory:path.join(root,'evidence'),sourceSelections:[[source]],interactiveDialogs:true}
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
// Use the already-installed vendor runtime. Verify the visible test title and About
// profile before any CU action; another personal Electron instance must not be used.
const appPath=path.resolve('node_modules/electron/dist/Electron.app'),appId='com.github.Electron'
const child=spawn(path.join(appPath,'Contents/MacOS/Electron'),[path.join(root,'entry'),'--dam-active-library-synthetic-e2e',`--user-data-dir=${config.profileDirectory}`],{env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)},stdio:'ignore',detached:true})
child.unref()
const receipt={root,pid:child.pid,appPath,appId,profile:'synthetic-interactive; no real data or credentials',start:'normal homepage, no route injection',entry:path.resolve('out/main/index.js')}
await fs.writeFile('/tmp/dam-rux-cu-profile.json',JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify(receipt))
