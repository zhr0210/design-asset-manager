import type { HuggingFaceDiscoveryEntry, ManagedVisionModelId } from '../../shared/contracts/managed-model-library.contract'
import { VISION_MODEL_PROFILES } from '../model-library/vision-model-artifact'
import { validateUpstreamReleasePolicy,
  type PublicModelFetch, type UpstreamModelRelease } from './huggingface-model-source'
import { assembleGgufBundles } from './huggingface-gguf-bundles'
import { chinaMirrorCatalog } from './china-model-mirror'

/** Product scope, not a third-party executable registry. Main alone chooses repositories.
 * Upstream metadata is data; a listed file or repository never grants runtime qualification. */
export const HF_MODEL_SCOPE = [
  ...(['2B', '4B', '8B', '32B', '30B-A3B', '235B-A22B'] as const).flatMap(size =>
    (['Instruct', 'Thinking'] as const).flatMap(variant => (['', '-FP8', '-GGUF'] as const).map(format => ({
      // Keep the six original discovery identities for cached catalogues and installed records.
      id: `qwen3-vl-${size.toLowerCase()}-${variant === 'Instruct' && format === '-GGUF' ? 'gguf' : variant.toLowerCase() + format.toLowerCase()}`,
      model: `Qwen3-VL ${size} ${variant}${format ? ' · ' + format.slice(1) : ''}`,
      family: '视觉理解' + (format ? ' · ' + format.slice(1) : ''),
      repository: `Qwen/Qwen3-VL-${size}-${variant}${format}`,
      supported: variant === 'Instruct' && !format && (size === '2B' || size === '4B'),
    })))),
  ...(['2B', '4B', '8B', '32B', '30B-A3B', '235B-A22B'] as const).flatMap(size =>
    (['Instruct', 'Thinking'] as const).map(variant => ({
      id: `unsloth-qwen3-vl-${size.toLowerCase()}-${variant.toLowerCase()}-gguf`,
      model: `Qwen3-VL ${size} ${variant} · Unsloth GGUF`, family: '视觉理解 · 社区量化',
      repository: `unsloth/Qwen3-VL-${size}-${variant}-GGUF`, supported: false,
    }))),
  ...(['Embedding', 'Reranker'] as const).flatMap(kind => (['2B', '8B'] as const).map(size => ({
    id: `qwen3-vl-${kind.toLowerCase()}-${size.toLowerCase()}`, model: `Qwen3-VL ${kind} ${size}`,
    family: '图文检索', repository: `Qwen/Qwen3-VL-${kind}-${size}`, supported: false,
  }))),
  { id: 'siglip2-base', model: 'SigLIP2 Base · 多语言图文检索', family: '图文检索', repository: 'google/siglip2-base-patch16-224', supported: false },
  { id: 'ram-plus', model: 'RAM++', family: '图像标签', repository: 'xinyu1205/recognize-anything-plus-model', supported: false },
  { id: 'florence-2-large', model: 'Florence-2 Large', family: '描述 / OCR', repository: 'microsoft/Florence-2-large', supported: false },
  { id: 'clip-vit-b-32', model: 'CLIP ViT-B/32', family: '图文向量 / 分类', repository: 'laion/CLIP-ViT-B-32-laion2B-s34B-b79K', supported: false },
  { id: 'wd-vit-tagger-v3', model: 'WD Tagger v3', family: '插画标签', repository: 'SmilingWolf/wd-vit-tagger-v3', supported: false },
] as const

const safeName = (name: unknown): name is string => typeof name === 'string' && name.length <= 240 &&
  name.split('/').every(part => /^[A-Za-z0-9._-]+$/.test(part) && part !== '.' && part !== '..')
export async function discoverHuggingFaceModels(fetch: PublicModelFetch, signal: AbortSignal,
  progress: (entry: HuggingFaceDiscoveryEntry, release?: UpstreamModelRelease) => void) {
  let index = 0
  await Promise.all([0,1].map(async()=>{
    while(index<HF_MODEL_SCOPE.length){
      signal.throwIfAborted()
      const scope=HF_MODEL_SCOPE[index++],checkedAt=new Date().toISOString()
      const entry:HuggingFaceDiscoveryEntry={id:scope.id,model:scope.model,family:scope.family,repository:scope.repository,
        sourceKind:scope.repository.startsWith('unsloth/')?'community':'official',catalogProvider:'modelscope-cn',
        revision:null,license:null,bytes:null,files:[],bundles:[],checkedAt,support:'catalog-only',state:'unavailable',error:null,
        supportNotice:'境内镜像目录候选；尚未支持此运行组合。'}
      let release:UpstreamModelRelease|undefined
      try{
        const requestSignal=AbortSignal.any([signal,AbortSignal.timeout(30000)])
        const catalog=await chinaMirrorCatalog(scope.repository,fetch,requestSignal)
        entry.revision=catalog.revision;entry.license=catalog.license
        entry.files=catalog.files.filter(file=>safeName(file.name)&&
          /\.(safetensors|gguf|onnx|bin|pth|pt|json|txt|csv|model|jinja|tiktoken)$/i.test(file.name)&&file.bytes<=200*1024**3)
          .map(({name,bytes,sha256,downloadUrl})=>({name,bytes,sha256,downloadUrl})).sort((a,b)=>a.name.localeCompare(b.name))
        entry.bytes=entry.files.reduce((sum,file)=>sum+file.bytes,0)
        entry.bundles=assembleGgufBundles(entry);entry.state='available'
        if(scope.supported){
          const id=scope.id as ManagedVisionModelId
          release={id,name:VISION_MODEL_PROFILES[id].name,repository:scope.repository,catalogProvider:'modelscope-cn',
            revision:catalog.revision,license:catalog.license??'',loadRamBytes:VISION_MODEL_PROFILES[id].loadRamBytes,
            files:entry.files.filter(file=>/^[A-Za-z0-9._-]+$/.test(file.name)&&/\.(safetensors|json|txt|model|jinja)$/.test(file.name))
              .map(file=>({name:file.name,bytes:file.bytes,sha256:file.sha256!}))}
          validateUpstreamReleasePolicy(release)
          entry.support='managed-vision';entry.supportNotice='ModelScope 境内来源；支持托管 CPU float32，仍需真实验证。'
        }
        if(entry.bundles.some(bundle=>bundle.support==='managed-gguf')){
          entry.support='managed-vision';entry.supportNotice='ModelScope 境内来源；Windows x64 GGUF 路径已接通，具体组合和加载方式仍需真实图像验证。'
        }
      }catch(error){
        signal.throwIfAborted();release=undefined
        const code=error instanceof Error?error.message:''
        entry.error=/^MODEL_[A-Z_]+$/.test(code)?code:'MODEL_MIRROR_UNAVAILABLE'
        if(entry.state==='available')entry.supportNotice='境内文件链接可查看，但安装清单核验未通过；不能安装或激活。'
      }
      progress(entry,release)
    }
  }))
}
