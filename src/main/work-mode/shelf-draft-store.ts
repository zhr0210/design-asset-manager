import fs from 'node:fs'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import {validateWorkValue,workId,type WorkSetValue} from '../../shared/contracts/work-set.contract'
type Held={libraryIdentity:string;id:string;revision:number;value:WorkSetValue}
/** Host-owned recovery journal; never touches Library Originals or schema. */
export function createShelfDraftStore(directory:string) {
 fs.mkdirSync(directory,{recursive:true});if(fs.lstatSync(directory).isSymbolicLink())throw Error('SHELF_DRAFT_DIRECTORY_INVALID')
 const file=path.join(directory,'drafts.v1.json'),records=new Map<string,Held>(),key=(library:string,id:string)=>JSON.stringify([library,id])
 if(fs.existsSync(file)){
  if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>2*1024*1024)throw Error('SHELF_DRAFT_FILE_INVALID')
  const stored=JSON.parse(fs.readFileSync(file,'utf8'));if(stored.version!==1||!Array.isArray(stored.records)||stored.records.length>64)throw Error('SHELF_DRAFT_FILE_INVALID')
  for(const r of stored.records){const value=validateWorkValue(r.value);workId(r.libraryIdentity);workId(r.id);if(!Number.isSafeInteger(r.revision)||r.revision<1)throw Error('SHELF_DRAFT_FILE_INVALID');records.set(key(r.libraryIdentity,r.id),{...r,value})}
 }
 const persist=()=>{const text=JSON.stringify({version:1,records:[...records.values()]});if(Buffer.byteLength(text)>2*1024*1024)throw Error('SHELF_DRAFT_FULL');const temporary=path.join(directory,`${randomUUID()}.pending`);try{fs.writeFileSync(temporary,text,{flag:'wx',mode:0o600});fs.renameSync(temporary,file)}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary)}}
 return{
  read:(libraryIdentity:string,id:string)=>{const record=records.get(key(libraryIdentity,id));return record?structuredClone(record):undefined},
  put:(record:Held)=>{const id=key(workId(record.libraryIdentity),workId(record.id)),previous=records.get(id);records.set(id,{...record,value:validateWorkValue(record.value)});try{persist()}catch(e){if(previous)records.set(id,previous);else records.delete(id);throw e}},
  clear:(libraryIdentity:string,id:string,value:WorkSetValue)=>{const k=key(libraryIdentity,id),held=records.get(k);if(!held||JSON.stringify(held.value)!==JSON.stringify(value))return;records.delete(k);try{persist()}catch(e){records.set(k,held);throw e}}
 }
}
