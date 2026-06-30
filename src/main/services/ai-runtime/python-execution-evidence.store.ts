import type {
  AiRuntimePythonExecutionProbeResponseBase
} from '../../../shared/contracts/ai-runtime.contract'
import type { PlatformAiRuntimeLaneId } from '../../../shared/types/platform-ai-branch-status.types'

export interface PythonExecutionEvidence {
  lane: Extract<PlatformAiRuntimeLaneId, 'python_mps' | 'python_cuda'>
  probe: AiRuntimePythonExecutionProbeResponseBase
}

const PYTHON_EXECUTION_EVIDENCE_TTL_MS = 5 * 60 * 1000
const latestPythonExecutionEvidence = new Map<PythonExecutionEvidence['lane'], AiRuntimePythonExecutionProbeResponseBase>()

export function recordPythonExecutionEvidence(evidence: PythonExecutionEvidence): void {
  latestPythonExecutionEvidence.set(evidence.lane, evidence.probe)
}

export function getFreshPythonExecutionEvidence(now = Date.now()): PythonExecutionEvidence[] {
  return Array.from(latestPythonExecutionEvidence.entries()).flatMap(([lane, probe]) => {
    const checkedAt = Date.parse(probe.checkedAt)
    if (!Number.isFinite(checkedAt) || now - checkedAt > PYTHON_EXECUTION_EVIDENCE_TTL_MS) return []
    return [{ lane, probe }]
  })
}
