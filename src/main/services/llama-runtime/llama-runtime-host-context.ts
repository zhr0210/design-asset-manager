import os from 'os'

export interface LlamaRuntimeHostContextInput {
  platform?: NodeJS.Platform | string
  arch?: string
  cpuThreads?: number
  totalMemoryGB?: number
  cpuModel?: string
}

export interface LlamaRuntimeHostContext {
  platform: NodeJS.Platform | string
  arch: string
  cpuThreads: number
  totalMemoryGB: number
  cpuModel: string
}

export function createLlamaRuntimeHostContext(input: LlamaRuntimeHostContextInput = {}): LlamaRuntimeHostContext {
  const cpus = os.cpus()
  return {
    platform: input.platform ?? process.platform,
    arch: input.arch ?? process.arch,
    cpuThreads: input.cpuThreads ?? cpus.length,
    totalMemoryGB: input.totalMemoryGB ?? Math.round(os.totalmem() / 1024 / 1024 / 1024),
    cpuModel: input.cpuModel ?? cpus[0]?.model ?? 'Unknown CPU'
  }
}
