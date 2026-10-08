import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {windowsBackupBuildClosure} from './windows-backup-build-closure.mjs'
const files={};const generated='src/shared/build-identity.generated.ts'
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const name=path.join(dir,entry.name).split(path.sep).join('/');if(entry.isSymbolicLink())throw Error('BUILD_SOURCE_SYMLINK');if(entry.isDirectory())await walk(name);else if(entry.isFile()&&name!==generated&&/\.(ts|tsx|css|js|mjs|cjs|json|cpp|c|cs|py)$/.test(name))files[name]=createHash('sha256').update(await fs.readFile(name)).digest('hex')}}
await walk('src')
for(const name of ['manifest.json','index.html','js/plugin.cjs','js/pairing.cjs','README.md'])files['eagle-companion/'+name]=createHash('sha256').update(await fs.readFile('eagle-companion/'+name)).digest('hex')
files['scripts/build-eagle-companion.mjs']=createHash('sha256').update(await fs.readFile('scripts/build-eagle-companion.mjs')).digest('hex')
for(const name of ['build/installer.nsh','scripts/run-electron-builder.mjs','scripts/electron-builder-runner-options.mjs','scripts/native-package-inputs.mjs'])files[name]=createHash('sha256').update(await fs.readFile(name)).digest('hex')
await walk('ai-service/tools')
for(const name of ['package.json','package-lock.json','electron.vite.config.ts','scripts/build-identity.mjs','pi-runtime/worker.mjs','pi-runtime/provider-policy.json','pi-runtime/auth-interaction.mjs','pi-runtime/openai-chatgpt-auth.mjs','pi-runtime/model-reasoning.mjs','pi-runtime/release.json'])files[name]=createHash('sha256').update(await fs.readFile(name)).digest('hex')
files['scripts/windows-backup-build-closure.mjs']=createHash('sha256').update(await fs.readFile('scripts/windows-backup-build-closure.mjs')).digest('hex')
if(process.platform==='win32')Object.assign(files,(await windowsBackupBuildClosure()).files)
const sourceDigest=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b))))).digest('hex')
const identity={buildId:'dam-'+sourceDigest.slice(0,16),sourceDigest,builtAt:new Date().toISOString(),digestAlgorithm:'sha256(sorted-source-file-sha256-json)',sourceCount:Object.keys(files).length}
await fs.writeFile(generated,'/** Generated at build time; excludes itself from the source digest. */\nexport const DAM_BUILD_IDENTITY = '+JSON.stringify(identity,null,2)+' as const\n')
process.stdout.write(JSON.stringify({buildId:identity.buildId,sourceCount:identity.sourceCount})+'\n')
