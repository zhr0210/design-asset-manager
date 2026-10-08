import type {PiProviderKind,PiAuthMode} from '../contracts/ai-connection.contract'
import type {AiReasoningLevel} from '../workflows/ai-reasoning.workflow'
export type AiBackendType =
  | 'native-python'
  | 'openai-compatible'
  | 'llama-openai'
  | 'lm-studio'
  | 'ollama'
  | 'custom';

export type AiBackendCapability = {
  chat: boolean;
  vision: boolean;
  embeddings: boolean;
  jsonOutput: boolean;
  modelList: boolean;
  modelManagement: boolean;
};

export type AiBackendConfig = {
  id: string;
  name: string;
  type: AiBackendType;
  enabled: boolean;
  baseUrl: string;
  /** Legacy Main-only value. Never returned in Renderer settings. */
  apiKey?: string;
  modelValidation?:{model:string;reasoning?:AiReasoningLevel;bindingSha256:string;vision:boolean;jsonOutput:boolean;testedAt:string;generatedInput:true}
  processingLocation?:'local-service'|'external-service';
  transport?: 'pi' | 'legacy';
  providerKind?:PiProviderKind;
  authMode?:PiAuthMode;
  credentialRef?:string;
  credentialRevision?:number;
  defaultModel?: string;
  /** Omitted preserves the SDK/model default; explicit levels are qualified per requested model. */
  reasoning?: AiReasoningLevel;
  timeoutMs: number;
  capabilities: AiBackendCapability;
  priority: number;
  /** Main-owned artifact/runtime binding for an imported managed model. */
  runtimeFingerprint?: string;
  notes?: string;
};

export type AiBackendError = {
  code: string;
  message: string;
  detail?: string;
  statusCode?: number;
  stderr?: string;
};

export type AiBackendHealthResult = {
  success: boolean;
  backendId: string;
  backendType: AiBackendType;
  latencyMs?: number;
  models?: string[];
  error?: AiBackendError;
};

export type AiModelListResult = {
  success: boolean;
  backendId: string;
  models: Array<{ id: string; name?: string; reasoningLevels?: AiReasoningLevel[] }>;
  rawResponse?: unknown;
  error?: AiBackendError;
};

export type OpenAIChatMessage =
  | {
      role: 'system' | 'user' | 'assistant';
      content: string;
    }
  | {
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
    };

export type OpenAIChatInput = {
  model?: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
};

export type OpenAIChatResult = {
  success: boolean;
  backendId: string;
  modelId?: string;
  content?: string;
  rawResponse?: unknown;
  error?: AiBackendError;
};

export type PromptReverseBackendMode =
  | 'native-qwen3vl'
  | 'openai-compatible'
  | 'llama-openai';

export type AiPromptReverseSettings = {
  backendMode: PromptReverseBackendMode;
  selectedNativeModelId?: string;
  selectedExternalBackendId?: string;
  selectedExternalModel?: string;
  maxNewTokens: number;
  maxImageSize: 768 | 1024 | 1280;
  temperature: number;
  topP: number;
};

export type ExternalPromptReverseInput = {
  assetId: string;
  filePath: string;
  modelId?: string;
  promptTemplateId?: string;
  promptTemplateText?: string;
  maxImageSize?: 768 | 1024 | 1280;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
};
