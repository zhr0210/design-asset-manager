/** Host-owned organization: references to assets and explicit color collections, never physical moves. */
export type FolderKind='assets'|'palette'
export interface LibraryFolder {id:string;name:string;kind:FolderKind;parentId:string|null;assetIds:string[];colors:{hex:string;sourceAssetId:string|null}[]}
export interface OrganizationScope {libraryIdentity:string;generation:string}
export interface OrganizationSnapshot {folders:LibraryFolder[];revision:number;sessionToken:string;requiresUpgrade:boolean}
export type OrganizationCommand=
 |{kind:'create';name:string;folderKind:FolderKind;parentId:string|null;assetIds?:string[];color?:{hex:string;sourceAssetId:string|null}}
 |{kind:'update';folderId:string;name:string;parentId:string|null}
 |{kind:'rename';folderId:string;name:string}
 |{kind:'move';folderId:string;parentId:string|null}
 |{kind:'delete';folderId:string}
 |{kind:'add-assets'|'remove-assets';folderId:string;assetIds:string[]}
 |{kind:'add-color';folderId:string;hex:string;sourceAssetId:string|null}
 |{kind:'remove-color';folderId:string;hex:string}
export interface OrganizationWrite extends OrganizationScope {sessionToken:string;expectedRevision:number;allowUpgrade:boolean;command:OrganizationCommand}
export const ORGANIZATION_READ='library-organization:read'
export const ORGANIZATION_WRITE='library-organization:write'
const fail=():never=>{throw Error('INVALID_ORGANIZATION_REQUEST')}
function object(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))return fail();return v as Record<string,unknown>}
function id(v:unknown):string{if(typeof v!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(v))return fail();return v}
function parent(v:unknown){return v===null?null:id(v)}
function name(v:unknown){if(typeof v!=='string'||!v.trim()||v.trim().length>80||/[\x00-\x1f]/.test(v))return fail();return v.trim()}
function hex(v:unknown){if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))return fail();return v.toUpperCase()}
function ids(v:unknown){if(!Array.isArray(v)||!v.length||v.length>500)return fail();return [...new Set(v.map(id))]}
export function validateOrganizationCommand(v:unknown):OrganizationCommand {
 const r=object(v,['kind','folderId','name','folderKind','parentId','assetIds','color','hex','sourceAssetId'])
 switch(r.kind){
 case 'create':{object(v,['kind','name','folderKind','parentId','assetIds','color']);if(!['assets','palette'].includes(String(r.folderKind)))return fail();const color=r.color===undefined?undefined:object(r.color,['hex','sourceAssetId']);if(r.folderKind==='assets'&&color||r.folderKind==='palette'&&r.assetIds)return fail();return {kind:'create',name:name(r.name),folderKind:r.folderKind as FolderKind,parentId:parent(r.parentId),...(r.assetIds===undefined?{}:{assetIds:ids(r.assetIds)}),...(color?{color:{hex:hex(color.hex),sourceAssetId:parent(color.sourceAssetId)}}:{})}}
 case 'update':object(v,['kind','folderId','name','parentId']);return {kind:'update',folderId:id(r.folderId),name:name(r.name),parentId:parent(r.parentId)}
 case 'rename':object(v,['kind','folderId','name']);return {kind:'rename',folderId:id(r.folderId),name:name(r.name)}
 case 'move':object(v,['kind','folderId','parentId']);return {kind:'move',folderId:id(r.folderId),parentId:parent(r.parentId)}
 case 'delete':object(v,['kind','folderId']);return {kind:'delete',folderId:id(r.folderId)}
 case 'add-assets':case 'remove-assets':object(v,['kind','folderId','assetIds']);return {kind:r.kind,folderId:id(r.folderId),assetIds:ids(r.assetIds)}
 case 'add-color':object(v,['kind','folderId','hex','sourceAssetId']);return {kind:'add-color',folderId:id(r.folderId),hex:hex(r.hex),sourceAssetId:parent(r.sourceAssetId)}
 case 'remove-color':object(v,['kind','folderId','hex']);return {kind:'remove-color',folderId:id(r.folderId),hex:hex(r.hex)}
 default:return fail()
 }
}
export function validateOrganizationScope(v:unknown):OrganizationScope{const r=object(v,['libraryIdentity','generation']);return{libraryIdentity:id(r.libraryIdentity),generation:id(r.generation)}}
export function validateOrganizationWrite(v:unknown):OrganizationWrite{const r=object(v,['libraryIdentity','generation','sessionToken','expectedRevision','allowUpgrade','command']);if(!Number.isSafeInteger(r.expectedRevision)||Number(r.expectedRevision)<0||typeof r.allowUpgrade!=='boolean')return fail();return{libraryIdentity:id(r.libraryIdentity),generation:id(r.generation),sessionToken:id(r.sessionToken),expectedRevision:Number(r.expectedRevision),allowUpgrade:r.allowUpgrade,command:validateOrganizationCommand(r.command)}}

export interface MeasuredPreviewColors {source:'controlled-preview';recipe:string;sampleWidth:number;sampleHeight:number;colors:{hex:string;percentage:number}[]}
export const ORGANIZATION_COLORS='library-organization:preview-colors'
export function validateColorRequest(v:unknown){const r=object(v,['libraryIdentity','generation','assetId']);return{...validateOrganizationScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),assetId:id(r.assetId)}}
