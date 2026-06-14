import { resolveAiServicePath } from '../ai-service-paths'
import { resolvePythonExecutable } from '../ai-python-runtime.service'
import { OcrRealEvidenceProbeService } from './ocr-real-evidence-probe.service'

export function createOcrRealEvidenceProbeService(): OcrRealEvidenceProbeService {
  return new OcrRealEvidenceProbeService({
    resolveRuntime: () => ({
      pythonExecutable: resolvePythonExecutable(),
      scriptPath: resolveAiServicePath(['tools', 'probe_ocr_real_evidence.py']),
      workingDirectory: resolveAiServicePath([])
    })
  })
}
