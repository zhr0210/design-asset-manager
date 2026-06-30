export type OcrDependencyRiskLevel = 'low' | 'medium' | 'high'
export type OcrDependencyProvider = 'easyocr' | 'rapidocr' | 'paddleocr' | 'mock'
export type OcrDependencyRuntimeProfile = 'local-ocr' | 'external-ocr' | 'mock-only'

export interface OcrDependencyRisk {
  id: string
  level: OcrDependencyRiskLevel
  description: string
  evidence: string
  phase: string
}

export interface OcrDependencyPlan {
  provider: OcrDependencyProvider
  runtimeProfile: OcrDependencyRuntimeProfile
  autoInstall: false
  doctorCheckRequired: true
  installerDeferred: true
  risks: OcrDependencyRisk[]
  blockingIssues: string[]
}

interface OcrDependencyProviderGovernancePolicy {
  runtimeProfile: OcrDependencyRuntimeProfile
  blockingIssues: readonly string[]
}

const OCR_INSTALLER_DEFERRED_BLOCKING_ISSUE = 'OCR installer is deferred; dependency installation must remain manual and explicit.'

const OCR_DEPENDENCY_PROVIDER_GOVERNANCE_POLICIES: Record<OcrDependencyProvider, OcrDependencyProviderGovernancePolicy> = {
  easyocr: {
    runtimeProfile: 'local-ocr',
    blockingIssues: [OCR_INSTALLER_DEFERRED_BLOCKING_ISSUE]
  },
  rapidocr: {
    runtimeProfile: 'local-ocr',
    blockingIssues: [OCR_INSTALLER_DEFERRED_BLOCKING_ISSUE]
  },
  paddleocr: {
    runtimeProfile: 'local-ocr',
    blockingIssues: [OCR_INSTALLER_DEFERRED_BLOCKING_ISSUE]
  },
  mock: {
    runtimeProfile: 'mock-only',
    blockingIssues: []
  }
}

const OCR_DEPENDENCY_RISK_REGISTRY: readonly OcrDependencyRisk[] = [
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
]

export function createOcrDependencyGovernancePlan(provider: OcrDependencyProvider): OcrDependencyPlan {
  const policy = OCR_DEPENDENCY_PROVIDER_GOVERNANCE_POLICIES[provider]

  return {
    provider,
    runtimeProfile: policy.runtimeProfile,
    autoInstall: false,
    doctorCheckRequired: true,
    installerDeferred: true,
    risks: OCR_DEPENDENCY_RISK_REGISTRY.map((risk) => ({ ...risk })),
    blockingIssues: [...policy.blockingIssues]
  }
}

export function createOcrDoctorCheckPlan(provider: OcrDependencyProvider): {
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
