export type OcrDependencyRiskLevel = 'low' | 'medium' | 'high'

export interface OcrDependencyRisk {
  id: string
  level: OcrDependencyRiskLevel
  description: string
  evidence: string
  phase: string
}

export interface OcrDependencyPlan {
  provider: 'easyocr' | 'rapidocr' | 'mock'
  runtimeProfile: 'local-ocr' | 'external-ocr' | 'mock-only'
  autoInstall: false
  doctorCheckRequired: true
  installerDeferred: true
  risks: OcrDependencyRisk[]
  blockingIssues: string[]
}

export function createOcrDependencyGovernancePlan(provider: 'easyocr' | 'rapidocr' | 'mock'): OcrDependencyPlan {
  return {
    provider,
    runtimeProfile: provider === 'mock' ? 'mock-only' : 'local-ocr',
    autoInstall: false,
    doctorCheckRequired: true,
    installerDeferred: true,
    risks: [
      {
        id: 'ocr-debug-log-managed-path',
        level: 'low',
        description: 'OCR dependency debug logs are routed through managed debug log paths with local home path redaction.',
        evidence: '<managed-debug-log>/ocr-dependency.log',
        phase: '12A'
      },
      {
        id: 'ocr-windows-python-search',
        level: 'high',
        description: 'OCR dependency service searches Windows-specific Python install locations.',
        evidence: '<windows-python-install-roots>',
        phase: '12A'
      },
      {
        id: 'ocr-pip-install-exposed',
        level: 'high',
        description: 'OCR install IPC can spawn pip install; installer work must remain deferred and explicit.',
        evidence: 'python -m pip install <ocr-packages>',
        phase: '12A'
      }
    ],
    blockingIssues: provider === 'mock' ? [] : ['OCR installer is deferred; dependency installation must remain manual and explicit.']
  }
}

export function createOcrDoctorCheckPlan(provider: 'easyocr' | 'rapidocr' | 'mock'): {
  id: string
  provider: string
  readonly: true
  autoFix: false
  autoInstall: false
} {
  return {
    id: 'ocr-dependency',
    provider,
    readonly: true,
    autoFix: false,
    autoInstall: false
  }
}
