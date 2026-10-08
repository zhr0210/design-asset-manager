export interface AiPythonRuntimeHostContext {
  platform: NodeJS.Platform
  environment: Record<string, string | undefined>
}

export interface AiPythonRuntimeHostContextInput {
  platform?: NodeJS.Platform
  environment?: NodeJS.ProcessEnv
}

export function createAiPythonRuntimeHostContext(
  input: AiPythonRuntimeHostContextInput = {}
): AiPythonRuntimeHostContext {
  return {
    platform: input.platform ?? process.platform,
    environment: { ...(input.environment ?? process.env) }
  }
}
