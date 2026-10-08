import { createHash } from 'node:crypto'
import type { HuggingFaceModelBundle } from '../../shared/contracts/managed-model-library.contract'
import type { AiDeviceResourceSample, GgufLoadPlan, GgufLoadMode, GgufModelRecommendation,
  ModelRecommendationPreference } from '../../shared/contracts/local-ai-resources.contract'
import type { VisualAdmission } from '../visual-ai/visual-admission'
const MiB = 1024 ** 2
export const isGgufDevice = (device: AiDeviceResourceSample) => device.topology === 'dedicated' && /^\d{1,2}:GPU-/.test(device.id) || device.topology === 'shared' && device.source === 'macos-system' && device.id === '0:METAL'
export const ggufDeviceReady = (device?: AiDeviceResourceSample) => Boolean(device && isGgufDevice(device) && device.state === 'known' && (device.topology === 'shared' || device.driver && Number(device.driver.split('.')[0]) >= 615 && device.computeCapability))
const LAYERS: Record<string, number> = { '2B': 28, '4B': 36, '8B': 32 }

/** Conservative initial envelopes, separately labelled from runtime observations.
 * Input/output/context semantics are identical in CPU/GPU/hybrid plans. */
export function createGgufLoadPlan(bundle: HuggingFaceModelBundle, mode: GgufLoadMode,
  device?: AiDeviceResourceSample): GgufLoadPlan {
  const layers = LAYERS[bundle.size]
  if (!layers || bundle.variant !== 'Instruct') throw Error('LOCAL_MODEL_UNSUPPORTED')
  if (mode !== 'cpu' && (!device || !isGgufDevice(device))) throw Error('AI_DEVICE_UNKNOWN')
  const languageBytes = bundle.files.filter(file => !file.name.split('/').at(-1)!.startsWith('mmproj-')).reduce((sum, file) => sum + file.bytes, 0)
  const projectorBytes = bundle.bytes - languageBytes
  const gpuLayers = mode === 'cpu' ? 0 : mode === 'gpu' ? layers + 1 : Math.floor(layers / 2)
  const fraction = mode === 'gpu' ? 1 : gpuLayers / (layers + 1)
  const projectorOnGpu = mode === 'gpu', kvOnGpu = mode === 'gpu'
  // Eight GQA heads x head dimension 128 x f16 K/V x all layers x context.
  // This upper bound is explicit until a model's measured plan supersedes it.
  const kv = layers * 2 * 8 * 128 * 4096 * 2
  // CPU graph/dequantization scratch grows with the loaded checkpoint. A fixed
  // 1 GiB allowance undershot the real 8B Q4 / Q8 CPU working set. Keep this
  // initial estimate distinct from observations; exceeding it still stops load.
  const workspace = mode === 'cpu' ? Math.max(1024 * MiB, Math.ceil(languageBytes / 2 + projectorBytes)) : 1024 * MiB
  const components = { cpuWeights: Math.ceil(languageBytes * (1 - fraction)) + (projectorOnGpu ? 0 : projectorBytes),
    gpuWeights: Math.ceil(languageBytes * fraction) + (projectorOnGpu ? projectorBytes : 0),
    kv, workspace, mapping: 128 * MiB, transfer: 256 * MiB,
    // GPU upload can temporarily fault the offloaded mmap weight pages into the
    // host working set. Their file bytes remain in the loading envelope.
    loading: 512 * MiB + Math.ceil(languageBytes * fraction) + (projectorOnGpu ? projectorBytes : 0), cache: 0 }
  const ramBytes = components.cpuWeights + components.mapping + components.transfer + components.loading +
    (kvOnGpu ? 0 : kv) + (mode === 'cpu' ? components.workspace : 256 * MiB)
  const unified = mode !== 'cpu' && device!.topology === 'shared'
  const unifiedRamBytes = languageBytes + projectorBytes + kv + workspace + components.mapping + components.transfer + 512 * MiB
  const gpuBytes = unified ? {} : mode === 'cpu' ? {} : { [device!.id]: components.gpuWeights + (kvOnGpu ? kv : 0) + components.workspace + 256 * MiB }
  const semantics = { ...(mode === 'cpu' ? {} : { deviceBackend: unified ? 'metal' as const : 'cuda' as const }), bundleId: bundle.id, mode, deviceId: mode === 'cpu' ? null : device!.id,
    driverVersion:mode==='cpu'?null:device!.driver??null,computeCapability:mode==='cpu'?null:device!.computeCapability??null,
    deviceIndex: mode === 'cpu' ? null : Number(device!.id.split(':')[0]), gpuLayers, projectorOnGpu, kvOnGpu,
    context: 4096, batch: 512, microBatch: 128, kvType: 'f16' as const }
  return { ...semantics, cost: { ramBytes: unified ? unifiedRamBytes : ramBytes, gpuBytes }, components,
    estimateSource: 'dam-qwen3vl-envelope-v2; estimates, no runtime qualification',
    identity: createHash('sha256').update(JSON.stringify(semantics)).digest('hex') }
}

export function recommendGgufBundles(bundles: HuggingFaceModelBundle[], admission: VisualAdmission,
  preference: ModelRecommendationPreference): GgufModelRecommendation[] {
  const devices = admission.resourceStatus().devices
  const candidates = bundles.filter(bundle => ['2B', '4B', '8B'].includes(bundle.size) && bundle.variant === 'Instruct')
    .map(bundle => {
      const plans = [createGgufLoadPlan(bundle, 'cpu'), ...devices.filter(isGgufDevice)
        .flatMap(device => [createGgufLoadPlan(bundle, 'gpu', device), createGgufLoadPlan(bundle, 'hybrid', device)])]
      const sourceKind = bundle.repository.startsWith('Qwen/') ? 'official' as const : 'community' as const
      return { bundleId: bundle.id, model: `Qwen3-VL ${bundle.size} · ${bundle.languageQuantization} / ${bundle.projectorQuantization}`,
        sourceKind, recommended: false, plans: plans.map(plan => {
          const device = devices.find(device => device.id === plan.deviceId)
          const driverReady=plan.mode==='cpu'||ggufDeviceReady(device)
          const fits = driverReady&&admission.canAdmitModel(plan.cost) && admission.canAdmitVision({ residentBytes: plan.cost.ramBytes }, false)
          const reason = plan.mode !== 'cpu' && (device?.state !== 'known'||!driverReady) ? '显存计量或驱动兼容性未知，不能批准 GPU 方案。' : !fits
            ? '当前余量不足以满足完整加载、计算和其他应用预留；执行前会重新核对。'
            : plan.mode === 'cpu' ? '预计 RAM 可容纳；CPU 较慢，安装后须实际验证。'
              : plan.mode === 'hybrid' ? '预计可混合加载；CPU 协同较慢，安装后须实际验证。' : '预计可完整 GPU 加载；安装后须实际验证。'
          return { plan, fits, reason }
        }), bundle }
    })
  const score = (candidate: typeof candidates[number]) => {
    const bundle = candidate.bundle, size = parseInt(bundle.size), quant = bundle.languageQuantization
    const quality = /BF16|F16|F32/.test(quant) ? 16 : Number(/(?:IQ|Q)(\d+)/.exec(quant)?.[1] ?? 0)
    const gpuFits = candidate.plans.some(value => value.fits && value.plan.mode === 'gpu')
    const fits = candidate.plans.some(value => value.fits)
    const preferred = preference === 'efficient' ? -bundle.bytes / MiB : preference === 'quality' ? size * 500 + quality * 50 :
      (size === 4 ? 500 : size === 2 ? 300 : 100) + (/^Q4_K_M$/.test(quant) ? 200 : /^Q8_0$/.test(quant) ? 100 : 0) - bundle.bytes / (64 * MiB)
    return (fits ? 100000 : 0) + (gpuFits ? 10000 : 0) + (candidate.sourceKind === 'official' ? 1000 : 0) + preferred
  }
  candidates.sort((left, right) => score(right) - score(left) || left.bundleId.localeCompare(right.bundleId))
  const recommended = candidates.find(candidate => candidate.plans.some(value => value.fits))
  if (recommended) recommended.recommended = true
  return candidates.map(({ bundle: _bundle, ...candidate }) => candidate)
}
