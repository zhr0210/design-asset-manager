import type {
  BasicCapability,
  BackgroundScope,
} from "./background-analysis.contract";
import type { AiReasoningLevel } from "../workflows/ai-reasoning.workflow";
import type { AiExecutionUsage } from "./visual-ai.contract";
export interface CaptionOutput {
  caption: string;
  usage?: AiExecutionUsage;
  physicalCalls?: 1 | 2;
}
export interface BasicScope extends BackgroundScope {
  assetId: string;
}
export interface BasicRequest extends BasicScope {
  sessionToken: string;
  requestId: string;
  capability: "caption" | "ocr";
  assetRevision: string;
  previewGeneration: string;
  backendId: string;
  model: string;
  bindingSha256: string;
  recipe: string;
  location: "local" | "external";
  reasoning?: AiReasoningLevel;
}
/** Main-private execution capability; never returned by workspace commands. */
export interface BasicClaim extends BasicRequest {
  attemptToken: string;
  attemptId: string;
  requestGeneration: number;
  inputSha256: string;
}
export interface CaptionEvidence extends CaptionOutput {
  id: string;
  requestId: string;
  assetId: string;
  caption: string;
  model: string;
  backendId: string;
  recipe: string;
  location: "local" | "external";
  reasoning?: AiReasoningLevel;
  createdAt: string;
  historicalOnly: boolean;
}
export interface BasicPrepare extends BackgroundScope {
  assetIds: string[];
  capabilities: BasicCapability[];
  backendId?: string;
  model?: string;
}
export interface BasicReview {
  receipt: string;
  assets: Array<{ id: string; title: string }>;
  capabilities: BasicCapability[];
  notice: string;
  requiresUpgrade: boolean;
  expiresAt: string;
}
export interface BasicJob extends BackgroundScope {
  id: string;
  state:
    | "queued"
    | "running"
    | "completed"
    | "partial"
    | "failed"
    | "cancelled";
  items: Array<{
    assetId: string;
    capability: BasicCapability;
    state:
      | "queued"
      | "running"
      | "succeeded"
      | "failed"
      | "cancelled"
      | "unknown";
    error?: string;
  }>;
}
export interface BasicAttempt {
  requestId: string;
  attemptId: string | null;
  capability: "caption" | "ocr";
  state: string;
  model: string;
  location: "local" | "external";
  updatedAt: string;
  sourceMatches: boolean;
  hasReceipt: boolean;
  disposition: "abandoned" | null;
}
export interface BasicAttempts {
  sessionToken: string;
  items: BasicAttempt[];
}
export interface BasicRecovery extends BasicScope {
  sessionToken: string;
  requestId: string;
  attemptId: string | null;
  action: "reconcile" | "keep" | "abandon";
}
export type BasicResponse<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
export interface BasicAnalysisApi {
  prepare(input: BasicPrepare): Promise<BasicResponse<BasicReview>>;
  run(receipt: string): Promise<BasicResponse<BasicJob>>;
  discard(receipt: string): Promise<BasicResponse<void>>;
  inspect(id: string): Promise<BasicResponse<BasicJob>>;
  cancel(id: string): Promise<BasicResponse<BasicJob>>;
  captions(scope: BasicScope): Promise<BasicResponse<CaptionEvidence[]>>;
  attempts(scope: BasicScope): Promise<BasicResponse<BasicAttempts>>;
  recover(input: BasicRecovery): Promise<BasicResponse<BasicAttempts>>;
}
