import type {VisualAiSummary} from '../contracts/visual-ai.contract'
import type {TagCurrentSummary} from '../contracts/tag-execution.contract'
export interface CurrentTagAsset {visualAi?:VisualAiSummary;tagAnalysis?:TagCurrentSummary|null}
/** null is a v10 empty current, undefined is a legacy profile. Never revive historical tags. */
export function currentTagSuggestions(asset:CurrentTagAsset){return asset.tagAnalysis===undefined?asset.visualAi??null:asset.tagAnalysis}
export interface AiFolder {id:string;name:string;assetIds:string[]}
const normalized=(value:string)=>value.normalize('NFKC').trim().toLowerCase()
export function isAiFolderId(value:unknown):value is string {
 if(value==='ai:analyzed'||value==='ai:pending')return true
 if(typeof value!=='string'||!value.startsWith('ai:tag:'))return false
 const tag=value.slice(7)
 return tag.length>0&&tag.length<=256&&!/[\u0000-\u001f\u007f]/.test(tag)&&tag===normalized(tag)
}
/** The predicate uses current evidence/decisions, never archived suggestions. */
export function assetInAiFolder(asset:CurrentTagAsset,id:string|undefined):boolean {
 if(!id)return true
 const current=currentTagSuggestions(asset)
 if(!current)return false
 if(id==='ai:analyzed')return true
 if(id==='ai:pending')return current.pendingTags.length>0
 return isAiFolderId(id)&&current.tags.some(tag=>normalized(tag)===id.slice(7))
}
/** Derived references only. No copied membership or browser-persisted classification. */
export function projectAiFolders(assets:readonly ({id:string}&CurrentTagAsset)[]):AiFolder[] {
 const analyzed=assets.filter(a=>currentTagSuggestions(a))
 const labels=new Map<string,AiFolder>()
 for(const asset of analyzed) {const seen=new Set<string>();for(const label of currentTagSuggestions(asset)!.tags){
  const key=normalized(label);if(!key||seen.has(key))continue;seen.add(key)
  const folder=labels.get(key)??{id:`ai:tag:${key}`,name:label,assetIds:[]}
  folder.assetIds.push(asset.id)
  labels.set(key,folder)
 }}
 return [{id:'ai:analyzed',name:'全部已分析',assetIds:analyzed.map(a=>a.id)},
  {id:'ai:pending',name:'标签待确认',assetIds:analyzed.filter(a=>currentTagSuggestions(a)!.pendingTags.length).map(a=>a.id)},
  ...[...labels.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'))]
}
