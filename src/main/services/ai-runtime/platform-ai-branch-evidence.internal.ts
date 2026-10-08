import type { AiRuntimeOnnxModelLoadProbeResponse, AiRuntimePythonExecutionProbeResponseBase } from '../../../shared/contracts/ai-runtime.contract'
import type { AiRuntimeState } from '../../../shared/types/ai-runtime.types'
import type { LlamaInstallStatus, LlamaServerTestResult } from '../../../shared/types/llama-runtime.types'
import type { WorkerModelStatusSnapshot } from '../../../shared/types/model-artifact-readiness.types'
import type { OcrRealEvidenceProbeResponse } from '../../../shared/types/ocr-real-evidence.types'
import type { PlatformAiBranch, PlatformAiRuntimeLaneId } from '../../../shared/types/platform-ai-branch-status.types'
import type { PlatformName } from '../../../shared/types/platform.types'
import {
  createLlamaMultimodalProbeArtifactReadiness, createLlamaRuntimeStatusArtifactReadiness,
  createOcrRealEvidenceArtifactReadiness, createOnnxModelLoadProbeArtifactReadiness,
  createWorkerModelStatusArtifactReadiness
} from './model-artifact-readiness.mapper'
import { createPlatformAiBranchStatus } from './platform-ai-branch-status.projector'

export interface PythonExecutionEvidence {
  lane: Extract<PlatformAiRuntimeLaneId, 'python_mps' | 'python_cuda'>
  probe: AiRuntimePythonExecutionProbeResponseBase
}

type BranchEvidence =
  | ({ kind: 'python' } & PythonExecutionEvidence)
  | { kind: 'onnx'; requestedFamily: AiRuntimeOnnxModelLoadProbeResponse['modelFamily']; probe: AiRuntimeOnnxModelLoadProbeResponse }
  | { kind: 'ocr'; probe: OcrRealEvidenceProbeResponse }
  | { kind: 'llama'; probe: LlamaServerTestResult }

interface BranchStatusSources {
  currentPlatform: PlatformName
  getWorkerModelStatus(): Promise<WorkerModelStatusSnapshot | null>
  getLlamaStatus(): LlamaInstallStatus | null
  listRuntimes(): AiRuntimeState[]
}

const EVIDENCE_TTL_MS = 5 * 60 * 1000

/** Main-private retained implementation. Does not construct or start any Runtime. */
export function createPlatformAiBranchEvidence(now: () => number = () => Date.now()) {
  const python = new Map<PythonExecutionEvidence['lane'], AiRuntimePythonExecutionProbeResponseBase>()
  const onnx: Partial<Record<AiRuntimeOnnxModelLoadProbeResponse['modelFamily'], AiRuntimeOnnxModelLoadProbeResponse>> = {}
  let ocr: OcrRealEvidenceProbeResponse | null = null
  let llama: LlamaServerTestResult | null = null

  const record = (evidence: BranchEvidence): void => {
    switch (evidence.kind) {
      case 'python': python.set(evidence.lane, evidence.probe); break
      case 'onnx': onnx[evidence.requestedFamily] = evidence.probe; break
      case 'ocr': ocr = evidence.probe; break
      case 'llama': llama = evidence.probe; break
    }
  }

  const freshSingle = <T extends { checkedAt: string }>(probe: T | null, observedAt = now()): T | null => {
    if (!probe) return null
    const checkedAt = Date.parse(probe.checkedAt)
    return !Number.isFinite(checkedAt) || observedAt - checkedAt > EVIDENCE_TTL_MS ? null : probe
  }
  const freshOnnx = () => Object.values(onnx).filter(probe => {
    const checkedAt = Date.parse(probe.checkedAt)
    return Number.isFinite(checkedAt) && now() - checkedAt <= EVIDENCE_TTL_MS
  })
  const freshPython = (observedAt = now()): PythonExecutionEvidence[] => Array.from(python.entries()).flatMap(([lane, probe]) => {
    const checkedAt = Date.parse(probe.checkedAt)
    return !Number.isFinite(checkedAt) || observedAt - checkedAt > EVIDENCE_TTL_MS ? [] : [{ lane, probe }]
  })

  const collectModelReadiness = async (sources: BranchStatusSources) => {
    // Only a Worker Promise rejection degrades to no evidence; sync throws propagate.
    const workerStatus = await sources.getWorkerModelStatus().catch(() => null)
    const llamaStatus = sources.getLlamaStatus()
    return [
      ...createWorkerModelStatusArtifactReadiness(workerStatus),
      ...createLlamaRuntimeStatusArtifactReadiness(llamaStatus),
      ...createLlamaMultimodalProbeArtifactReadiness(freshSingle(llama)),
      ...createOcrRealEvidenceArtifactReadiness(freshSingle(ocr)),
      ...freshOnnx().flatMap(createOnnxModelLoadProbeArtifactReadiness)
    ]
  }
  const readStatus = async (platformBranch: PlatformAiBranch, sources: BranchStatusSources) => {
    // Preserve the original second await checkpoint before Runtime/Python reads.
    const modelReadiness = await collectModelReadiness(sources)
    return createPlatformAiBranchStatus({
      platformBranch, currentPlatform: sources.currentPlatform,
      runtimes: sources.listRuntimes(), modelReadiness, pythonExecutionEvidence: freshPython()
    })
  }

  return { record, readStatus }
}

// Both retained IPC adapters share one lifetime. The production disabled composition
// imports neither adapter nor this instance.
export const platformAiBranchEvidence = createPlatformAiBranchEvidence()
