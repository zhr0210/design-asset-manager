export type PromptReversePanelMode =
  | 'starting_runtime'
  | 'running_inference'
  | 'error'
  | 'result_ready'
  | 'ready_to_run'
  | 'needs_configuration'

export type PromptReversePanelTone = 'brand' | 'danger' | 'muted'

export interface PromptReverseErrorLike {
  code?: string | null
  message?: string | null
  stderr?: string | null
}

export interface PromptReversePanelInput {
  aiPromptStatus?: string | null
  hasPromptResult?: boolean | null
  selectedModelDownloaded?: boolean | null
  selectedModelName?: string | null
  startingRuntime?: boolean | null
  promptReverseLoading?: boolean | null
  serverError?: string | null
  promptReverseError?: PromptReverseErrorLike | null
}

export interface PromptReversePanelDisplay {
  mode: PromptReversePanelMode
  tone: PromptReversePanelTone
  title: string
  detail: string
  primaryActionLabel?: string
  showRetryAction: boolean
  showRunAction: boolean
  showConfigureAction: boolean
  errorLog?: string
}

export function projectPromptReversePanelState(input: PromptReversePanelInput): PromptReversePanelDisplay {
  const status = normalizePromptReverseStatus(input.aiPromptStatus)
  const modelName = normalizeModelName(input.selectedModelName)
  const error = projectPromptReverseError(input.serverError, input.promptReverseError)

  if (input.startingRuntime) {
    return {
      mode: 'starting_runtime',
      tone: 'brand',
      title: '正在启动并加载本地量化引擎...',
      detail: '首次加载或切换模型需要加载显存，请耐心等待 (约数秒)',
      showRetryAction: false,
      showRunAction: false,
      showConfigureAction: false
    }
  }

  if (input.promptReverseLoading || status === 'running') {
    return {
      mode: 'running_inference',
      tone: 'brand',
      title: '正在执行高级图像反推...',
      detail: '正在分析风格、主体与画面细节 (推理中)',
      showRetryAction: false,
      showRunAction: false,
      showConfigureAction: false
    }
  }

  if (error) {
    return {
      mode: 'error',
      tone: 'danger',
      title: '反推失败',
      detail: error.message,
      primaryActionLabel: '重试反推',
      showRetryAction: true,
      showRunAction: false,
      showConfigureAction: false,
      errorLog: error.stderr
    }
  }

  if (input.hasPromptResult) {
    return {
      mode: 'result_ready',
      tone: 'muted',
      title: '反推结果已生成',
      detail: modelName ? `模型: ${modelName}` : '模型: 未知',
      primaryActionLabel: '重新反推',
      showRetryAction: false,
      showRunAction: true,
      showConfigureAction: false
    }
  }

  if (input.selectedModelDownloaded) {
    return {
      mode: 'ready_to_run',
      tone: 'muted',
      title: '高级反推已就绪',
      detail: `当前高级反推激活模型为 ${modelName || '未知模型'}。`,
      primaryActionLabel: '开始图片反推',
      showRetryAction: false,
      showRunAction: true,
      showConfigureAction: false
    }
  }

  return {
    mode: 'needs_configuration',
    tone: 'muted',
    title: '高级反推模型未就绪',
    detail: `请先前往 AI 控制台配置或下载高级反推模型${modelName ? ` ${modelName}` : ''}。`,
    primaryActionLabel: '前往 AI 控制台配置',
    showRetryAction: false,
    showRunAction: false,
    showConfigureAction: true
  }
}

function normalizePromptReverseStatus(status?: string | null): string {
  return (status ?? 'not_started').trim().toLowerCase()
}

function normalizeModelName(modelName?: string | null): string {
  return (modelName ?? '').trim()
}

function projectPromptReverseError(
  serverError?: string | null,
  promptReverseError?: PromptReverseErrorLike | null
): { message: string; stderr?: string } | null {
  if (serverError) {
    return { message: serverError }
  }

  if (!promptReverseError) return null

  const code = (promptReverseError.code ?? '').trim()
  if (code === 'GPU_MEMORY_INSUFFICIENT' || code === 'CUDA_OUT_OF_MEMORY') {
    return {
      message: '显存不足！请关闭其他占用显卡的程序，或改用 Qwen3-VL-4B/2B 系列模型。',
      stderr: promptReverseError.stderr ?? undefined
    }
  }

  return {
    message: promptReverseError.message || '推理运行出错，请确认依赖包与模型文件完整。',
    stderr: promptReverseError.stderr ?? undefined
  }
}
