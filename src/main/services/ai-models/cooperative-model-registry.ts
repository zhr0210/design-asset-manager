import path from 'path'
import { app } from 'electron'
import type { CooperativeModel } from '../../../shared/types/cooperative-model.types'
import { SettingsService } from '../settings.service'

export const COOPERATIVE_MODELS: CooperativeModel[] = [
  {
    id: 'ram-plus',
    provider: 'xinyu1205',
    repoId: 'xinyu1205/recognize-anything-plus-model',
    displayName: 'RAM++ 通用图像标签',
    modelFamily: 'ram',
    category: 'pth',
    description: '通用图像识别与多标签推理。主体、场景、构图和语义标签的主力模型，建议大多数素材开启。',
    fileSizeEstimate: '~1.4 GB'
  },
  {
    id: 'florence-2-large',
    provider: 'microsoft',
    repoId: 'microsoft/Florence-2-large',
    displayName: 'Florence-2 Large 画面描述',
    modelFamily: 'florence2',
    category: 'transformers',
    description: '图文详细描述、OCR 提取与版面文字分析。设计图、海报、UI 截图场景的主力模型。',
    fileSizeEstimate: '~1.5 GB'
  },
  {
    id: 'clip-vit-b-32',
    provider: 'laion',
    repoId: 'laion/CLIP-ViT-B-32-laion2B-s34B-b79K',
    displayName: 'CLIP ViT-B/32 设计分类器',
    modelFamily: 'clip',
    category: 'transformers',
    description: '零样本设计语义分类与自定义设计词典匹配。风格、排版、视觉构图相似性分类。',
    fileSizeEstimate: '~600 MB'
  },
  {
    id: 'wd-vit-tagger-v3',
    provider: 'SmilingWolf',
    repoId: 'SmilingWolf/wd-vit-tagger-v3',
    displayName: 'WD Tagger v3 动漫标签',
    modelFamily: 'wd_tagger',
    category: 'onnx-csv',
    description: '二次元 / 动漫 / 角色特征提取。仅对动漫和插画素材触发，基于 ONNX Runtime 推理。',
    fileSizeEstimate: '~800 MB'
  }
]

export function getCooperativeModelRootDir(): string {
  // Cooperative models are system-level and always stored in app userData.
  // Do NOT use user-configurable modelRootDir — that is for user-facing GGUF models.
  const appData = app.getPath('userData')
  return path.join(appData, 'AIModels', 'cooperative')
}

export function getCooperativeModelLocalPath(model: CooperativeModel): string {
  return path.join(getCooperativeModelRootDir(), model.provider, model.id)
}
