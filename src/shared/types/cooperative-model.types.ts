export type CooperativeModelCategory =
  | 'transformers'
  | 'onnx-csv'
  | 'pth'

export interface CooperativeModel {
  id: string
  provider: string
  repoId: string
  displayName: string
  modelFamily: 'ram' | 'florence2' | 'clip' | 'wd_tagger'
  category: CooperativeModelCategory
  description: string
  fileSizeEstimate: string
  localPath?: string
  isDownloaded?: boolean
  downloadProgress?: number
  downloadStatus?: string
}

export interface CooperativeModelListResult {
  success: boolean
  models: CooperativeModel[]
}

export interface CooperativeModelActionResult {
  success: boolean
  error?: string
}
