export interface AiMemoryEstimate {
  minFreeVramGB: number;
  recommendedFreeVramGB: number;
}

export interface AiWorkerContext {
  pythonPath: string;
  options?: {
    maxNewTokens?: number;
    maxImageSize?: number;
    temperature?: number;
    topP?: number;
    timeoutMs?: number;
    [key: string]: any;
  };
}

export interface AiProvider<Input, Output> {
  id: string;
  taskType: string;
  isAvailable(): Promise<boolean>;
  estimateMemory?(input: Input): Promise<AiMemoryEstimate>;
  execute(input: Input, context: AiWorkerContext): Promise<Output>;
}
