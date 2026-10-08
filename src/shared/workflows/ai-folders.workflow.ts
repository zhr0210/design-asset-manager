import type {VisualAiSummary} from '../contracts/visual-ai.contract'
import type {TagCurrentSummary} from '../contracts/tag-execution.contract'
export interface CurrentTagAsset {visualAi?:VisualAiSummary;tagAnalysis?:TagCurrentSummary|null}
/** null is a v10 empty current, undefined is a legacy profile. Never revive historical tags. */
export function currentTagSuggestions(asset:CurrentTagAsset){return asset.tagAnalysis===undefined?asset.visualAi??null:asset.tagAnalysis}
export interface AiFolder {id:string;name:string;assetIds:string[]}
const normalized=(value:string)=>value.normalize('NFKC').trim().toLowerCase()
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
