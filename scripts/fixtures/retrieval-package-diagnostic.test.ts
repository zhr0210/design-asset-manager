import Database from 'better-sqlite3'
import path from 'node:path'
import {validateModelArtifactPackage} from '../../src/main/model-library/model-artifact-format-validation.internal'
const profile='.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04'
const database=new Database(profile+'/app-state/app-state.sqlite',{readonly:true,fileMustExist:true})
try{
  const task=database.prepare("SELECT json_extract(record,'$.directory') AS directory,json_extract(record,'$.release.files') AS files FROM retrieval_transfers ORDER BY rowid DESC LIMIT 1").get() as {directory:string;files:string}
  console.log({directory:task.directory})
  for(const file of JSON.parse(task.files))if(file.name!=='tokenizer.json'){
    const valid=await validateModelArtifactPackage({files:[{relativePath:file.name,role:'retrieval',format:file.name.endsWith('.safetensors')?'safetensors':file.name.endsWith('.model')?'sentencepiece':'json',sizeBytes:file.bytes,readableFile:path.join(profile,'retrieval-models',task.directory,file.name),sentencePieceEntryLimit:256000}]})
    console.log({file:file.name,valid})
  }
}finally{database.close()}
