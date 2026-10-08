// Read-only source handoff checks. No network, install, models, credentials or library reads.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const option=process.argv.find(arg=>arg.startsWith('--root='))
const root=option?path.resolve(option.slice(7)):path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const required=['package.json','package-lock.json','electron.vite.config.ts','AGENTS.md','DESIGN.md','TASK.md','src/main/index.ts','src/preload/index.ts','src/renderer/App.tsx','src/shared/contracts/ai-connection.contract.ts','pi-runtime/package-lock.json','pi-runtime/worker.mjs','pi-runtime/auth-protocol.json','scripts/prepare-pi-runtime.mjs','scripts/seal-pi-runtime.mjs','docs/REHOST.md','src/renderer/routes/work-mode-prototype/motion-study.mp4']
const present=relative=>fs.existsSync(path.join(root,relative))
const missing=required.filter(relative=>!present(relative))
const dependenciesPresent=present('node_modules/electron/package.json')&&present('node_modules/better-sqlite3/package.json')
const piPreparedFilesPresent=present('pi-runtime/runtime-artifact.json')&&present('pi-runtime/node_modules/@earendil-works/pi-ai/package.json')
const result={status:missing.length?'SOURCE_INCOMPLETE':dependenciesPresent&&piPreparedFilesPresent?'SOURCE_PRESENT_ENVIRONMENT_NEEDS_EXECUTION_VALIDATION':'SOURCE_PRESENT_ENVIRONMENT_INCOMPLETE',host:{platform:process.platform,arch:process.arch,node:process.version},source:{requiredCount:required.length,missing},dependenciesPresent,piPreparedFilesPresent,pinnedPi:{version:'0.99.1',node:'24.21.0'},executionVerified:false,privateDataInspected:false,networkRequests:0,notes:['Presence is not integrity, installation or model-path verification.','Restore dependencies using lockfiles on this host; run Electron ABI tests with repository launcher.','Pi preparation downloads only after explicit approval; models and account login are separate.','Current synthetic history does not replace native Computer Use or real authentication.']}
console.log(JSON.stringify(result,null,2))
process.exitCode=missing.length?1:0
