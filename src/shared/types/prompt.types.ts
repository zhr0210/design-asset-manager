export interface PromptReverseResultData {
  englishPrompt: string;
  chineseDescription: string;
  shortCaption: string;
  styleTags: string[];
  subjectTags: string[];
  compositionTags: string[];
  colorTags: string[];
  usageTags: string[];
  negativePromptSuggestion: string;
  rawResponse?: string;
  modelId?: string;
  backendId?: string;
  backendType?: string;
}

export interface PromptReverseResult {
  success: boolean;
  provider: string;
  modelId: string;
  device: string;
  durationMs: number;
  data: PromptReverseResultData | null;
  error: {
    code: string;
    message: string;
    detail?: string;
    statusCode?: number;
    stderr?: string;
    exitCode?: number;
  } | null;
  cleared?: boolean;
}

// New unified Phase 3 types for prompt reverse panel & workers
export type PromptReverseStatus =
  | 'not_started'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'synced';

export type PromptReverseResultNew = {
  englishPrompt?: string;
  chineseDescription?: string;
  shortCaption?: string;
  styleTags?: string[];
  subjectTags?: string[];
  compositionTags?: string[];
  colorTags?: string[];
  usageTags?: string[];
  negativePromptSuggestion?: string;
  rawResponse?: string;
  modelId?: string;
  promptTemplateId?: string;
  promptTemplateVersion?: string;
};

export type PromptReverseError = {
  code: string;
  message: string;
  stderr?: string;
  detail?: string;
};
