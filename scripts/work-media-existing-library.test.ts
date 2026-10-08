import fs from 'node:fs/promises'
import path from 'node:path'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
const source=path.resolve('.scratch/c-search-20261007/library'),parent=path.resolve('.scratch/d-work-mode-20261008')
const library=await fs.mkdtemp(path.join(parent,'migration-repro-'))
await fs.cp(source,library,{recursive:true,errorOnExist:true,force:false})
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'cancelled'})}))
try{
 await host.open();const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!}
 await host.listAssets();process.stdout.write('existing: list read\n')
 const status=await host.workMediaStatus(scope)
 process.stdout.write('existing: media status '+status.schemaVersion+'\n')
 await host.enableWorkMedia({...scope,sessionToken:status.sessionToken,expectedSchemaVersion:status.schemaVersion,allowUpgrade:true})
 process.stdout.write('EXISTING_LIBRARY_MEDIA_UPGRADE_PASS\n')
}catch(error){process.stdout.write(JSON.stringify({name:(error as Error).name,message:(error as Error).message,code:(error as {code?:string}).code})+'\n');throw error}
finally{await host.close()}
