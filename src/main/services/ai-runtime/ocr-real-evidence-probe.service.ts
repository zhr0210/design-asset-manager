import { spawn } from 'child_process'
import type { OcrRealEvidenceProbeResponse } from '../../../shared/types/ocr-real-evidence.types'

interface ProbeCommandResult {
  exitCode: number | null
  stdout: string
}

export type OcrRealEvidenceCommandRunner = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }
) => Promise<ProbeCommandResult>

export interface OcrRealEvidenceProbeServiceOptions {
  runCommand?: OcrRealEvidenceCommandRunner
  resolveRuntime: () => {
    pythonExecutable: string
    scriptPath: string
    workingDirectory: string
  }
}

const OCR_REAL_EVIDENCE_TIMEOUT_MS = 60_000

export class OcrRealEvidenceProbeService {
  private readonly runCommand: OcrRealEvidenceCommandRunner

  constructor(private readonly options: OcrRealEvidenceProbeServiceOptions) {
    this.runCommand = options.runCommand ?? runProbeCommand
  }

  async probe(): Promise<OcrRealEvidenceProbeResponse> {
    const runtime = this.options.resolveRuntime()
    const result = await this.runCommand(
      runtime.pythonExecutable,
      [runtime.scriptPath, '--provider', 'auto'],
      {
        cwd: runtime.workingDirectory,
        timeoutMs: OCR_REAL_EVIDENCE_TIMEOUT_MS,
        env: {
          ...process.env,
          HF_HUB_OFFLINE: '1',
          TRANSFORMERS_OFFLINE: '1',
          DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS: '1'
        }
      }
    )

    if (result.exitCode !== 0) {
      return failedProbe('OCR_PROBE_PROCESS_FAILED')
    }

    try {
      const parsed = JSON.parse(result.stdout) as OcrRealEvidenceProbeResponse
      if (
        parsed.operation !== 'generated_image_text_detection'
        || parsed.generatedFixture !== true
        || parsed.downloadsAllowed !== false
      ) {
        return failedProbe('OCR_PROBE_RESPONSE_INVALID')
      }
      return parsed
    } catch {
      return failedProbe('OCR_PROBE_RESPONSE_INVALID')
    }
  }
}

function runProbeCommand(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }
): Promise<ProbeCommandResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let settled = false
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false
    })
    const finish = (result: ProbeCommandResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish({ exitCode: null, stdout: '' })
    }, options.timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.on('error', () => finish({ exitCode: null, stdout: '' }))
    child.on('close', (exitCode) => finish({ exitCode, stdout }))
  })
}

function failedProbe(errorCode: string): OcrRealEvidenceProbeResponse {
  return {
    success: false,
    status: 'inference_failed',
    provider: null,
    operation: 'generated_image_text_detection',
    generatedFixture: true,
    downloadsAllowed: false,
    boxCount: 0,
    resultFinite: false,
    errorCode,
    attempts: [],
    checkedAt: new Date().toISOString(),
    durationMs: 0
  }
}
