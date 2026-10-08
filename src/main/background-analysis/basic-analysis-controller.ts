import { randomUUID } from "node:crypto";
import type { ActiveLibraryHost } from "../../shared/contracts/active-library.contract";
import type {
  BasicPrepare,
  BasicReview,
  BasicJob,
  BasicRequest,
  BasicClaim,
  BasicRecovery,
} from "../../shared/contracts/basic-analysis.contract";
import {
  BASIC_CAPABILITIES,
  type BasicCapability,
  type BackgroundScope,
  type BackgroundExecutionRule,
  type BackgroundExecutionClaim,
} from "../../shared/contracts/background-analysis.contract";
import type { AppSettings } from "../../shared/types/settings.types";
import {
  backendExecutionBinding,
  backendLocation,
} from "../ai-gateway/backend-binding";
import { requireBackendInference } from "../../shared/constants/pi-provider-admission";
import {
  requireReasoningConfiguration,
  reasoningNotice,
} from "../../shared/workflows/ai-reasoning.workflow";
import { runCaption } from "../visual-ai/caption-recipe";
import {ConfirmedLocalOomError} from '../visual-ai/local-oom-recovery'
import {measureAiStage,type AiStageSink} from '../local-ai-resources/ai-diagnostics'
import {
  VISUAL_ADMISSION_PROFILE,
  type VisualAdmission,
  type AiWorkPriority,
} from "../visual-ai/visual-admission";
import type { VisionProvider } from "../visual-ai/openai-vision.provider";
import type { createTagExecutionController } from "../independent-tags/tag-execution-controller";
import { OCR_HOST_RESERVE_BYTES, type createOcrController } from "../ocr/ocr-controller";
import type { OcrRuntime } from "../ocr/ocr-runtime";

type Task = {
  assetId: string;
  assetRevision: string;
  previewGeneration: string;
  capability: BasicCapability;
  requestId: string;
  rule: BackgroundExecutionRule;
  request?: BasicRequest;
};
type Plan = {
  owner: string;
  scope: BackgroundScope;
  sessionToken: string;
  schemaVersion: number;
  tasks: Task[];
  review: BasicReview;
};
export function createBasicAnalysisController(d: {
  host: ActiveLibraryHost;
  settings(): AppSettings;
  provider: VisionProvider;
  diagnostics?:AiStageSink;
  admission: VisualAdmission;
  tags: ReturnType<typeof createTagExecutionController>;
  ocr: ReturnType<typeof createOcrController>;
  ocrRuntime: OcrRuntime;
  resourceReadiness?(rule: BackgroundExecutionRule): { ready: boolean; reason: string } | undefined;
  upgrade(
    scope: BackgroundScope & {
      sessionToken: string;
      expectedSchemaVersion: number;
      allowUpgrade: boolean;
    },
    signal: AbortSignal,
  ): Promise<void>;
  changed(scope: BackgroundScope & { assetId: string }): void;
}) {
  const plans = new Map<string, Plan>(),
    owners = new Map<string, number>(),
    jobs = new Map<
      string,
      {
        owner: string;
        value: BasicJob;
        abort: AbortController;
        done: Promise<void>;
      }
    >();
  let suspended = false,
    epoch = 0;
  const requireScope = (s: BackgroundScope) => {
    const a = d.host.inspect();
    if (
      a.state !== "ready" ||
      a.identity !== s.libraryIdentity ||
      a.generation !== s.generation
    )
      throw Error("BASIC_SCOPE_EXPIRED");
  };
  const backend = (id: string) => {
    const b = d.settings().aiBackends?.find((b) => b.id === id);
    if (!b?.enabled || !b.capabilities.vision)
      throw Error("BASIC_MODEL_UNAVAILABLE");
    requireBackendInference(b);
    requireReasoningConfiguration(b);
    return structuredClone(b);
  };
  const api = {
    async resolveRule(
      capability: BasicCapability,
      backendId?: string,
      model?: string,
    ): Promise<BackgroundExecutionRule> {
      if (capability === "ocr") {
        const r = await d.ocrRuntime.current();
        if (
          !r?.qualification ||
          r.qualification.runtimeFingerprint !== r.fingerprint
        )
          throw Error("OCR_RUNTIME_UNAVAILABLE");
        return {
          capability,
          enabled: true,
          backendId: "local-ocr",
          model: r.label,
          bindingSha256: r.fingerprint,
          location: "local",
          recipe: "rapidocr-onnxruntime-1.4.4",
        };
      }
      const choice =
          d.settings().aiTaskModels?.[
            capability === "tags" ? "tags" : "analyze"
          ],
        id = backendId || choice?.backendId;
      if (!id) throw Error("BASIC_MODEL_UNAVAILABLE");
      const b = backend(id),
        name = (
          model ||
          (choice?.backendId === id && choice.model) ||
          b.defaultModel ||
          ""
        ).trim();
      if (!name || name.length > 256) throw Error("BASIC_MODEL_UNAVAILABLE");
      return {
        capability,
        enabled: true,
        backendId: id,
        model: name,
        bindingSha256: backendExecutionBinding(b, name),
        location: backendLocation(b),
        recipe: capability === "tags" ? "independent-tags-v1" : "caption-v1",
      };
    },
    async readiness(rule: BackgroundExecutionRule) {
      try {
        const current = await api.resolveRule(
          rule.capability,
          rule.backendId,
          rule.model,
        );
        if (
          current.bindingSha256 !== rule.bindingSha256 ||
          current.location !== rule.location ||
          current.recipe !== rule.recipe
        )
          return {
            ready: false,
            reason: "模型或配置已变化，请重新核对持续规则。",
          };
        if (rule.capability === "ocr" && d.ocr.backgroundAvailability().busy)
          return {
            ready: false,
            reason: "文字识别正在使用，等待当前工作结束。",
          };
        return resourceReadiness(rule);
      } catch {
        return {
          ready: false,
          reason:
            rule.capability === "ocr"
              ? "请验证本地 OCR 环境。"
              : "请启用并验证当前图像模型。",
        };
      }
    },
    async prepare(owner: string, input: BasicPrepare): Promise<BasicReview> {
      if (suspended) throw Error("BASIC_BUSY");
      if (
        !input ||
        Object.keys(input).some(
          (k) =>
            ![
              "libraryIdentity",
              "generation",
              "assetIds",
              "capabilities",
              "backendId",
              "model",
            ].includes(k),
        ) ||
        !Array.isArray(input.assetIds) ||
        !input.assetIds.length ||
        input.assetIds.length > 8 ||
        new Set(input.assetIds).size !== input.assetIds.length ||
        input.assetIds.some((id) => typeof id !== "string") ||
        !Array.isArray(input.capabilities) ||
        !input.capabilities.length ||
        new Set(input.capabilities).size !== input.capabilities.length ||
        input.capabilities.some((c) => !BASIC_CAPABILITIES.includes(c))
      )
        throw Error("BASIC_INPUT_INVALID");
      requireScope(input);
      const version = epoch,
        ownerVersion = owners.get(owner) ?? 0,
        context = await d.host.readAssetContext(input.assetIds),
        session = await d.host.readVisualSession(input),
        tasks: Task[] = [],
        notices: string[] = [];
      if(context.assets.some(asset=>asset.fileType==='mp4'))throw Error('视频不参与整图分析，请先明确选择参考帧。')
      for (const capability of input.capabilities) {
        const rule = await api.resolveRule(
          capability,
          input.backendId,
          input.model,
        );
        notices.push(
          `${capability === "tags" ? "标签" : capability === "caption" ? "短描述" : "OCR"}：${rule.model} · ${rule.location === "external" ? "外部服务" : "本机"}${capability !== "ocr" ? " · " + reasoningNotice(backend(rule.backendId).reasoning) : ""}`,
        );
        for (const id of input.assetIds) {
          const asset = context.assets.find((a) => a.id === id);
          if (!asset) throw Error("BASIC_SOURCE_CHANGED");
          tasks.push({
            assetId: id,
            assetRevision: asset.revision,
            previewGeneration: asset.thumbnailRef,
            capability,
            requestId: randomUUID(),
            rule,
          });
        }
      }
      requireScope(input);
      if (version !== epoch || ownerVersion !== (owners.get(owner) ?? 0))
        throw Error("BASIC_SCOPE_EXPIRED");
      for (const [id, p] of plans)
        if (p.owner === owner || Date.parse(p.review.expiresAt) < Date.now())
          plans.delete(id);
      if (plans.size >= 4) throw Error("BASIC_BUSY");
      const receipt = randomUUID(),
        review: BasicReview = {
          receipt,
          assets: context.assets.map((a) => ({ id: a.id, title: a.title })),
          capabilities: input.capabilities,
          requiresUpgrade: context.schemaVersion < 14,
          notice:
            notices.join("\n") +
            "\n只处理所选受控预览；三项分别执行，成功立即保存，失败不回滚其他结果。不会生成反推提示词。外部调用截断时最多重试一次，可能产生额外用量。" +
            (context.schemaVersion < 14
              ? "确认将备份并升级至 v14；旧版不能打开。"
              : "") +
            "人工描述、确认标签和 OCR 修订保持优先。",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        };
      plans.set(receipt, {
        owner,
        scope: {
          libraryIdentity: input.libraryIdentity,
          generation: input.generation,
        },
        sessionToken: session.sessionToken,
        schemaVersion: context.schemaVersion,
        tasks,
        review,
      });
      return review;
    },
    async run(owner: string, receipt: string) {
      const p = plans.get(receipt);
      if (
        suspended ||
        !p ||
        p.owner !== owner ||
        Date.parse(p.review.expiresAt) < Date.now()
      )
        throw Error("BASIC_SCOPE_EXPIRED");
      requireScope(p.scope);
      if (
        [...jobs.values()].filter((j) =>
          ["queued", "running"].includes(j.value.state),
        ).length >= 2
      )
        throw Error("BASIC_BUSY");
      plans.delete(receipt);
      const record = {
        owner,
        value: {
          ...p.scope,
          id: randomUUID(),
          state: "queued",
          items: p.tasks.map((t) => ({
            assetId: t.assetId,
            capability: t.capability,
            state: "queued",
          })),
        } as BasicJob,
        abort: new AbortController(),
        done: Promise.resolve(),
      };
      jobs.set(record.value.id, record);
      record.done = (async () => {
        try {
          await d.upgrade(
            {
              ...p.scope,
              sessionToken: p.sessionToken,
              expectedSchemaVersion: p.schemaVersion,
              allowUpgrade: true,
            },
            record.abort.signal,
          );
          // Register the complete reviewed batch before any slow inference; a failed newer request still fences older work.
          for (const task of p.tasks) {
            record.abort.signal.throwIfAborted();
            await register(task, p.scope, p.sessionToken);
          }
          record.value.state = "running";
          for (const [i, task] of p.tasks.entries()) {
            const item = record.value.items[i];
            if (record.abort.signal.aborted) {
              item.state = "cancelled";
              continue;
            }
            item.state = "running";
            try {
              await execute(task, p.scope, record.abort.signal, "foreground");
              item.state = "succeeded";
            } catch (e) {
              item.state = record.abort.signal.aborted
                ? "cancelled"
                : isUnknown(e)
                  ? "unknown"
                  : "failed";
              item.error = basicMessage(e);
            }
          }
        } catch (e) {
          for (const i of record.value.items)
            if (["queued", "running"].includes(i.state)) {
              i.state = record.abort.signal.aborted ? "cancelled" : "failed";
              i.error = basicMessage(e);
            }
        } finally {
          const count = record.value.items.filter(
            (i) => i.state === "succeeded",
          ).length;
          record.value.state =
            count === record.value.items.length
              ? "completed"
              : count
                ? "partial"
                : record.abort.signal.aborted
                  ? "cancelled"
                  : "failed";
          for (const [id, j] of jobs)
            if (
              j !== record &&
              !["queued", "running"].includes(j.value.state) &&
              jobs.size > 100
            )
              jobs.delete(id);
        }
      })();
      return structuredClone(record.value);
    },
    async runBackground(c: BackgroundExecutionClaim, signal: AbortSignal) {
      const scope: BackgroundScope = {
        libraryIdentity: c.libraryIdentity,
        generation: c.generation,
      };
      await requireRule(c.rule);
      if (!resourceReadiness(c.rule).ready) throw Error("BASIC_ADMISSION_WAIT");
      const task: Task = {
        assetId: c.assetId,
        assetRevision: c.assetRevision,
        previewGeneration: c.previewGeneration,
        capability: c.rule.capability,
        requestId: randomUUID(),
        rule: c.rule,
      };
      await register(task, scope, c.sessionToken);
      await d.host.attachBackgroundRequest(c, task.requestId);
      await execute(task, scope, signal, "background", c);
    },
    discard(owner: string, id: string) {
      const p = plans.get(id);
      if (p && p.owner !== owner) throw Error("BASIC_SCOPE_EXPIRED");
      plans.delete(id);
    },
    inspect(owner: string, id: string) {
      const j = job(owner, id);
      return structuredClone(j.value);
    },
    cancel(owner: string, id: string) {
      const j = job(owner, id);
      j.abort.abort();
      return structuredClone(j.value);
    },
    captions: async (scope: BackgroundScope & { assetId: string }) => {
      requireScope(scope);
      return d.host.readCaptions(scope);
    },
    attempts: async (scope: BackgroundScope & { assetId: string }) => {
      requireScope(scope);
      return d.host.readBasicAttempts(scope);
    },
    async recover(input: BasicRecovery) {
      if (
        !input ||
        Object.keys(input).some(
          (k) =>
            ![
              "libraryIdentity",
              "generation",
              "assetId",
              "sessionToken",
              "requestId",
              "attemptId",
              "action",
            ].includes(k),
        )
      )
        throw Error("BASIC_INPUT_INVALID");
      requireScope(input);
      const value = await d.host.recoverBasicAnalysis(input);
      try {
        d.changed(input);
      } catch {}
      return value;
    },
    cancelOwner(owner: string) {
      owners.set(owner, (owners.get(owner) ?? 0) + 1);
      for (const [id, p] of plans) if (p.owner === owner) plans.delete(id);
      for (const j of jobs.values()) if (j.owner === owner) j.abort.abort();
    },
    invalidate() {
      epoch++;
      plans.clear();
      for (const j of jobs.values()) j.abort.abort();
    },
    async suspendAndDrain() {
      suspended = true;
      api.invalidate();
      await Promise.all([...jobs.values()].map((j) => j.done));
    },
    resume() {
      suspended = false;
    },
  };
  function job(owner: string, id: string) {
    const j = jobs.get(id);
    if (!j || (j.owner !== owner && owner !== "main"))
      throw Error("BASIC_SCOPE_EXPIRED");
    requireScope(j.value);
    return j;
  }
  function resourceReadiness(rule: BackgroundExecutionRule) {
    const owned = d.resourceReadiness?.(rule);
    if (owned) return owned;
    const b = rule.capability === "ocr" ? undefined : backend(rule.backendId);
    const ready = rule.capability === "ocr"
      ? d.admission.canAdmitOcr(OCR_HOST_RESERVE_BYTES)
      : d.admission.canAdmitVision({
          workerBytes: b?.transport === "pi" ? VISUAL_ADMISSION_PROFILE.piWorkerBytes : 0,
          computeBytes: b?.runtimeFingerprint ? 1024 ** 3 : 0,
        });
    return { ready, reason: ready ? "已配置，按共享资源预算执行。" : "等待共享资源；准备与执行需满足完整预算。" };
  }
  async function register(
    t: Task,
    scope: BackgroundScope,
    sessionToken: string,
  ) {
    requireScope(scope);
    await requireRule(t.rule);
    const context = await d.host.readAssetContext([t.assetId]),
      asset = context.assets[0];
    if (
      !asset ||
      asset.revision !== t.assetRevision ||
      asset.thumbnailRef !== t.previewGeneration
    )
      throw Error("BASIC_SOURCE_CHANGED");
    if (t.capability === "tags")
      await d.host.saveTagIntent({
        ...scope,
        assetId: t.assetId,
        sessionToken,
        expectedSchemaVersion: context.schemaVersion,
        allowUpgrade: false,
        requestId: t.requestId,
        assetRevision: asset.revision,
        previewGeneration: asset.thumbnailRef,
        backendId: t.rule.backendId,
        model: t.rule.model,
        backendBindingSha256: t.rule.bindingSha256,
        recipeId: t.rule.recipe,
        recipeVersion: "1",
      });
    else {
      const b =
        t.capability === "caption" ? backend(t.rule.backendId) : undefined;
      t.request = {
        ...scope,
        assetId: t.assetId,
        sessionToken,
        requestId: t.requestId,
        capability: t.capability,
        assetRevision: asset.revision,
        previewGeneration: asset.thumbnailRef,
        backendId: t.rule.backendId,
        model: t.rule.model,
        bindingSha256: t.rule.bindingSha256,
        recipe: t.rule.recipe,
        location: t.rule.location,
        ...(b?.reasoning !== undefined ? { reasoning: b.reasoning } : {}),
      };
      await d.host.beginBasicRequest(t.request);
    }
  }
  async function execute(
    t: Task,
    scope: BackgroundScope,
    signal: AbortSignal,
    priority: AiWorkPriority,
    background?: BackgroundExecutionClaim,
  ) {
    signal.throwIfAborted();
    await requireRule(t.rule);
    if (t.capability === "tags") {
      const j = await d.tags.runAuthorized(
        "basic:" + t.requestId,
        { ...scope, assetId: t.assetId, requestId: t.requestId },
        signal,
        priority,
        background,
      );
      if (j.state !== "succeeded")
        throw Error(
          j.state === "outcome-unknown"
            ? "BASIC_OUTCOME_UNKNOWN"
            : j.errorCode || "BASIC_TAG_FAILED",
        );
      return;
    }
    if (t.capability === "ocr") {
      await d.ocr.runAuthorized(t.request!, signal, priority, background);
      return;
    }
    const request = t.request!,
      b = backend(t.rule.backendId),
      abort = new AbortController(),
      cancel = () => abort.abort();
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    const timer = setTimeout(
      cancel,
      Math.min(120000, Math.max(1000, b.timeoutMs || 120000)),
    );
    let material: ReturnType<VisualAdmission["open"]> | undefined;
    const cancelMaterial = () => material?.dispose();
    abort.signal.addEventListener("abort", cancelMaterial, { once: true });
    let claim: BasicClaim | undefined,
      sent = false,
      responded = false;
    try {
      const session = await d.host.readVisualSession(scope);
      abort.signal.throwIfAborted();
      material = d.admission.open(
        "caption:" + request.requestId,
        session,
        priority,
        {modelBinding:request.bindingSha256},
      );
      await measureAiStage(d.diagnostics,request.requestId,'prepare-and-wait',()=>material!.prepare(t.assetId, () =>
        d.host.readVisualPreview({ ...request }),{assetRevision:request.assetRevision,previewGeneration:request.previewGeneration},
      ));
      abort.signal.throwIfAborted();
      material.consume();
      await measureAiStage(d.diagnostics,request.requestId,'model-ready',async()=>{await d.provider.prepare?.(b.id, abort.signal)});
      claim = await d.host.claimBasicAnalysis({
        ...request,
        inputSha256: material.describe(t.assetId).sha256,
      });
      const caption = await material.withRequest(
        t.assetId,
        "tags-only",
        abort.signal,
        async (jpeg, permitSignal) => {
          await d.host.markBasicAnalysisSent(claim!, background);
          permitSignal.throwIfAborted();
          sent = true;
          return runCaption(
            { backend: b, model: t.rule.model, jpeg, signal: permitSignal,operationId:claim!.attemptId,
              mayRecover:async()=>{permitSignal.throwIfAborted();const attempts=await d.host.readBasicAttempts({...scope,assetId:t.assetId})
                const attempt=attempts.items.find(v=>v.requestId===claim!.requestId&&v.attemptId===claim!.attemptId)
                return attempts.sessionToken===claim!.sessionToken&&Boolean(attempt?.sourceMatches&&!attempt.hasReceipt&&attempt.state==='sent')} },
            d.provider,
          );
        },
        b.transport === "pi" ? VISUAL_ADMISSION_PROFILE.piWorkerBytes : 0,
        b.runtimeFingerprint ? 1024 ** 3 : 0,
      );
      responded = true;
      abort.signal.throwIfAborted();
      await measureAiStage(d.diagnostics,claim.attemptId,'validate-and-commit',()=>d.host.commitCaption(claim!, caption, abort.signal, background));
      try {
        d.changed({ ...scope, assetId: t.assetId });
      } catch {}
    } catch (e) {
      const unknown =
        sent &&
        !responded &&
        !(e instanceof ConfirmedLocalOomError) &&
        !(e instanceof Error && /^(CAPTION_OUTPUT_|AI_HTTP_)/.test(e.message));
      if (claim)
        try {
          await d.host.finishBasicAnalysis(
            claim,
            unknown ? "unknown" : signal.aborted ? "cancelled" : "failed",
          );
        } catch {}
      if (unknown) throw Error("BASIC_OUTCOME_UNKNOWN");
      throw e;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      abort.signal.removeEventListener("abort", cancelMaterial);
      material?.dispose();
    }
  }
  async function requireRule(rule: BackgroundExecutionRule) {
    const current = await api.resolveRule(
      rule.capability,
      rule.backendId,
      rule.model,
    );
    if (
      current.bindingSha256 !== rule.bindingSha256 ||
      current.location !== rule.location ||
      current.recipe !== rule.recipe
    )
      throw Error("BASIC_MODEL_CHANGED");
    if (rule.capability === "ocr" && d.ocr.backgroundAvailability().busy)
      throw Error("OCR_BUSY");
  }
  return api;
}
function isUnknown(e: unknown) {
  return e instanceof Error && /UNKNOWN|UNCONFIRMED/.test(e.message);
}
export function basicMessage(e: unknown) {
  const code = e instanceof Error ? e.message : "";
  if (isUnknown(e))
    return "执行或释放结果尚不确定，已保留记录；请在后台分析里核对，不会自动重发。";
  if (/MODEL|RUNTIME/.test(code))
    return "模型或配置不可用或已变化，请到 AI 与模型验证后重新确认。";
  if (/BUSY|ADMISSION/.test(code))
    return "正在等待共享资源或当前任务结束，请稍后重试。";
  if (/SCOPE|SOURCE/.test(code))
    return "资料库或素材版本已变化，本次结果未覆盖已有内容。";
  if (/OUTPUT/.test(code))
    return "模型未返回完整有效结果，其他成功能力已保存。";
  if (/BACKUP|RESTORE/.test(code))
    return "资料库备份或升级未完成，请检查库的恢复状态。";
  return "本项未完成，已保存结果保持；请核对当前任务和模型后重试。";
}
