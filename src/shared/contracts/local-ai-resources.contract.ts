export interface AiDeviceResourceSample {
  id: string
  name: string
  topology: 'dedicated' | 'shared' | 'unknown'
  state: 'known' | 'stale' | 'unknown'
  totalBytes: number | null
  freeBytes: number | null
  sampledAt: number | null
  source: 'nvidia-smi' | 'unsupported'
  driver?: string
  computeCapability?: string
}
export interface ModelResourceCost { ramBytes: number; gpuBytes: Record<string, number> }
export type GgufLoadMode = 'cpu' | 'gpu' | 'hybrid'
export type ModelRecommendationPreference = 'balanced' | 'efficient' | 'quality'
export interface GgufLoadPlan {
  driverVersion?:string|null
  computeCapability?:string|null
  mode: GgufLoadMode
  deviceId: string | null
  deviceIndex: number | null
  gpuLayers: number
  projectorOnGpu: boolean
  context: number
  batch: number
  microBatch: number
  kvType: 'f16'
  kvOnGpu: boolean
  cost: ModelResourceCost
  components: { cpuWeights: number; gpuWeights: number; kv: number; workspace: number;
    mapping: number; transfer: number; loading: number; cache: number }
  estimateSource: string
  identity: string
}
export interface GgufModelRecommendation {
  bundleId: string
  model: string
  sourceKind: 'official' | 'community'
  recommended: boolean
  plans: Array<{ plan: GgufLoadPlan; fits: boolean; reason: string }>
}
