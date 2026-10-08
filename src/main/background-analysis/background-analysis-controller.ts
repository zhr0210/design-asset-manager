import { randomUUID } from "node:crypto";
import { isWorkspaceOwner } from "../local-host/client-context";
import type { ActiveLibraryHost } from "../../shared/contracts/active-library.contract";
import { BASIC_CAPABILITIES } from "../../shared/contracts/background-analysis.contract";
import type {
  BackgroundScope,
  BackgroundConfig,
  BackgroundConfigCommit,
  BackgroundDecision,
  BackgroundView,
  BackgroundSnapshot,
} from "../../shared/contracts/background-analysis.contract";
import type { VisualAdmission } from "../visual-ai/visual-admission";
import {
  evaluateBackgroundReadiness,
  type BackgroundTelemetry,
} from "./background-resource-policy";
import type {
  BackgroundExecutionPrepare,
  BackgroundExecutionConfiguration,
  BackgroundExecutionRule,
  BackgroundRecoveryDecision,
} from "../../shared/contracts/background-analysis.contract";
import {
  basicMessage,
  type createBasicAnalysisController,
} from "./basic-analysis-controller";
export function createBackgroundAnalysisController(deps: {
  host: ActiveLibraryHost;
  admission: VisualAdmission;
  telemetry(): BackgroundTelemetry;
  visuals: { suspendAndDrain(): Promise<void>; resume(): void };
  holdOcr(): () => void;
  basic?: ReturnType<typeof createBasicAnalysisController>;
  flush?(scope: BackgroundScope): Promise<unknown>;
  now?: () => number;
}) {
  const plans = new Map<
      string,
      { owner: string; expires: number; input: BackgroundConfigCommit }
    >(),
    owners = new Map<string, number>(),
    active = new Map<string, { owner: string; abort: AbortController }>();
  let epoch = 0;
  const now = deps.now ?? (() => performance.now());
  const stamp = (owner: string) => ({
    epoch,
    ownerVersion: owners.get(owner) ?? 0,
  });
  const fence = async (
    owner: string,
    s: ReturnType<typeof stamp>,
    scope: BackgroundScope,
    session: string,
  ) => {
    const current = await deps.host.readVisualSession(scope);
    if (
      epoch !== s.epoch ||
      s.ownerVersion !== (owners.get(owner) ?? 0) ||
      current.sessionToken !== session
    )
      throw Error("BACKGROUND_SCOPE_EXPIRED");
  };
  const executionPlans = new Map<
    string,
    { owner: string; expires: number; input: BackgroundExecutionConfiguration }
  >();
  let suspended = false,
    scheduled: ReturnType<typeof setTimeout> | undefined,
    work: Promise<void> | undefined,
    workAbort: AbortController | undefined,
    round = 0;
  const project = async (
    owner: string,
    s: BackgroundSnapshot,
    scope: BackgroundScope,
  ): Promise<BackgroundView> => {
    const resource = evaluateBackgroundReadiness(
        deps.telemetry(),
        null,
        performance.now(),
      ),
      execution = await deps.host.readBackgroundExecution(scope),
      capabilityReadiness = [];
    for (const capability of BASIC_CAPABILITIES) {
      const rule = execution.policy.rules.find(
        (r) => r.capability === capability,
      );
      capabilityReadiness.push({
        capability,
        ...(rule?.enabled && deps.basic
          ? await deps.basic.readiness(rule)
          : { ready: false, reason: "尚未建立该能力的持续执行规则。" }),
      });
    }
    const status = deps.admission.resourceStatus();
    return {
      ...s,
      execution,
      capabilityReadiness,
      dispatchAvailable:
        !!deps.basic &&
        execution.policy.enabled &&
        capabilityReadiness.some((r) => r.ready),
      canConfigure: isWorkspaceOwner(owner),
      resourceReasons: [...(status.reason ? [status.reason] : [])],
      availableMemoryMiB: resource.availableMemoryMiB,
    };
  };
  const enqueue = (ms = 2000) => {
    clearTimeout(scheduled);
    if (!suspended && deps.basic) {
      scheduled = setTimeout(() => {
        scheduled = undefined;
        void tick();
      }, ms);
      scheduled.unref?.();
    }
  };
  const tick = () => {
    if (work) return work;
    if (suspended || !deps.basic) return Promise.resolve();
    const current = deps.host.inspect();
    if (current.state !== "ready" || !current.identity || !current.generation) {
      enqueue();
      return Promise.resolve();
    }
    const scope = {
        libraryIdentity: current.identity,
        generation: current.generation,
      },
      version = epoch,
      abort = new AbortController();
    workAbort = abort;
    work = (async () => {
      await deps.flush?.(scope);
      const session = await deps.host.readVisualSession(scope),
        snapshot = await deps.host.readBackgroundExecution(scope);
      if (version !== epoch || !snapshot.policy.enabled) return;
      if (deps.admission.resourceStatus().reason) return;
      for (let n = 0; n < 3; n++) {
        const cap = BASIC_CAPABILITIES[round++ % 3],
          rule = snapshot.policy.rules.find((r) => r.capability === cap);
        if (
          !rule?.enabled ||
          !(await deps.basic!.readiness(rule)).ready ||
          (rule.location === "external" &&
            snapshot.budgetUsed + 2 > snapshot.policy.dailyCallLimit)
        )
          continue;
        abort.signal.throwIfAborted();
        const claim = await deps.host.claimBackgroundExecution({
          ...scope,
          sessionToken: session.sessionToken,
          capability: cap,
        });
        if (!claim) continue;
        try {
          await deps.basic!.runBackground(claim, abort.signal);
        } catch (e) {
          try {
            await deps.host.finishBackgroundExecution(
              claim,
              e instanceof Error && /UNKNOWN|UNCONFIRMED/.test(e.message)
                ? "unknown"
                : abort.signal.aborted
                  ? "cancelled"
                  : e instanceof Error &&
                      /BUSY|ADMISSION|MEMORY_WAIT|COOLDOWN/.test(e.message)
                    ? "deferred"
                    : "failed",
            );
          } catch {}
        }
        break;
      }
    })()
      .catch(() => {})
      .finally(() => {
        work = undefined;
        if (workAbort === abort) workAbort = undefined;
        enqueue();
      });
    return work;
  };
  enqueue();
  return {
    async read(owner: string, scope: BackgroundScope) {
      const token = stamp(owner),
        s = await deps.host.readBackgroundAnalysis(scope);
      await fence(owner, token, scope, s.sessionToken);
      return project(owner, s, scope);
    },
    async prepareExecution(owner: string, input: BackgroundExecutionPrepare) {
      if (
        !isWorkspaceOwner(owner) ||
        !deps.basic ||
        !input ||
        Object.keys(input).some(
          (k) =>
            ![
              "libraryIdentity",
              "generation",
              "enabled",
              "capabilities",
              "backendId",
              "model",
              "dailyCallLimit",
              "expectedRevision",
            ].includes(k),
        ) ||
        typeof input.enabled !== "boolean" ||
        !Number.isSafeInteger(input.dailyCallLimit) ||
        input.dailyCallLimit < 1 ||
        input.dailyCallLimit > 1000 ||
        !input.capabilities ||
        Object.keys(input.capabilities).length !== 3 ||
        BASIC_CAPABILITIES.some(
          (c) => typeof input.capabilities[c] !== "boolean",
        )
      )
        throw Error("BACKGROUND_INPUT_INVALID");
      const token = stamp(owner),
        s = await deps.host.readBackgroundAnalysis(input),
        existing = await deps.host.readBackgroundExecution(input);
      if (existing.policy.revision !== input.expectedRevision)
        throw Error("BACKGROUND_CONFLICT");
      const rules: BackgroundExecutionRule[] = [],
        notices: string[] = [];
      for (const capability of BASIC_CAPABILITIES) {
        const enabled = input.capabilities[capability];
        if (enabled) {
          const rule = await deps.basic.resolveRule(
            capability,
            input.backendId,
            input.model,
          );
          rules.push(rule);
          notices.push(
            `${capability === "tags" ? "标签" : capability === "caption" ? "短描述" : "OCR"}：${rule.model} · ${rule.location === "external" ? "外部服务" : "本机"}`,
          );
        } else
          rules.push({
            capability,
            enabled: false,
            backendId: "",
            model: "",
            bindingSha256: "0".repeat(64),
            location: "local",
            recipe:
              capability === "tags"
                ? "independent-tags-v1"
                : capability === "caption"
                  ? "caption-v1"
                  : "rapidocr-onnxruntime-1.4.4",
          });
      }
      await fence(owner, token, input, s.sessionToken);
      const receipt = randomUUID();
      for (const [id, p] of executionPlans)
        if (p.owner === owner || p.expires < now()) executionPlans.delete(id);
      executionPlans.set(receipt, {
        owner,
        expires: now() + 300000,
        input: {
          libraryIdentity: input.libraryIdentity,
          generation: input.generation,
          sessionToken: s.sessionToken,
          expectedRevision: input.expectedRevision,
          expectedPlanRevision: s.policy.revision,
          allowUpgrade: true,
          policy: {
            enabled: input.enabled,
            dailyCallLimit: input.dailyCallLimit,
            rules,
          },
        },
      });
      return {
        receipt,
        requiresUpgrade: s.schemaVersion < 14,
        notice:
          (s.schemaVersion < 14 ? "将备份并升级至 v14；旧版不能打开。\n" : "") +
          (input.enabled
            ? "仅处理启用后新入库的适用素材以及此前明确保存的计划。规则在重开库后继续生效，每次执行仍复核新会话、模型与资源。不会整库回填或生成反推提示词。\n" +
              notices.join("\n") +
              `\n云端每天最多预留 ${input.dailyCallLimit} 次物理调用（每个逻辑请求保守预留2次）。可能产生账号用量或费用；取消无法保证远端未计算。`
            : "暂停新派发并取消当前自有执行；已保存结果与不确定记录保留。"),
      };
    },
    async confirmExecution(owner: string, receipt: string) {
      const p = executionPlans.get(receipt);
      if (!p || p.owner !== owner || p.expires < now() || active.size)
        throw Error("BACKGROUND_SCOPE_EXPIRED");
      const token = stamp(owner),
        id = randomUUID(),
        abort = new AbortController();
      active.set(id, { owner, abort });
      executionPlans.delete(receipt);
      workAbort?.abort();
      let release: (() => void) | undefined,
        ocrRelease: (() => void) | undefined;
      try {
        await work;
        abort.signal.throwIfAborted();
        await fence(owner, token, p.input, p.input.sessionToken);
        const s = await deps.host.readBackgroundAnalysis(p.input);
        if (s.schemaVersion < 14) {
          ocrRelease = deps.holdOcr();
          release = deps.admission.hold();
          await deps.visuals.suspendAndDrain();
        }
        abort.signal.throwIfAborted();
        await deps.host.configureBackgroundExecution(p.input, abort.signal);
        await fence(owner, token, p.input, p.input.sessionToken);
        enqueue(0);
        return project(
          owner,
          await deps.host.readBackgroundAnalysis(p.input),
          p.input,
        );
      } finally {
        try {
          if (release && deps.host.inspect().state === "ready") {
            const current = await deps.host.readVisualSession(p.input);
            if (current.sessionToken === p.input.sessionToken)
              deps.visuals.resume();
          }
        } finally {
          ocrRelease?.();
          release?.();
          active.delete(id);
        }
      }
    },
    async recover(owner: string, input: BackgroundRecoveryDecision) {
      if (
        !isWorkspaceOwner(owner) ||
        !input ||
        Object.keys(input).some(
          (k) =>
            ![
              "libraryIdentity",
              "generation",
              "assetId",
              "sessionToken",
              "intentId",
              "attemptId",
              "action",
            ].includes(k),
        )
      )
        throw Error("BACKGROUND_INPUT_INVALID");
      await deps.host.recoverBackgroundExecution(input);
      enqueue(0);
      return project(
        owner,
        await deps.host.readBackgroundAnalysis(input),
        input,
      );
    },
    async prepare(owner: string, input: BackgroundConfig) {
      if (
        !isWorkspaceOwner(owner) ||
        !input ||
        Object.keys(input).some(
          (k) =>
            ![
              "libraryIdentity",
              "generation",
              "enabled",
              "capabilities",
              "expectedRevision",
            ].includes(k),
        )
      )
        throw Error("BACKGROUND_INPUT_INVALID");
      if (
        typeof input.enabled !== "boolean" ||
        !Number.isSafeInteger(input.expectedRevision) ||
        input.expectedRevision < 0 ||
        input.expectedRevision >= Number.MAX_SAFE_INTEGER ||
        !input.capabilities ||
        Object.keys(input.capabilities).length !== 3 ||
        BASIC_CAPABILITIES.some(
          (c) => typeof input.capabilities[c] !== "boolean",
        )
      )
        throw Error("BACKGROUND_INPUT_INVALID");
      const token = stamp(owner),
        s = await deps.host.readBackgroundAnalysis(input);
      await fence(owner, token, input, s.sessionToken);
      if (input.expectedRevision !== s.policy.revision)
        throw Error("BACKGROUND_CONFLICT");
      for (const [id, p] of plans)
        if (p.owner === owner || p.expires < now()) plans.delete(id);
      if (plans.size >= 4) throw Error("BACKGROUND_BUSY");
      const receipt = randomUUID();
      plans.set(receipt, {
        owner,
        expires: now() + 300000,
        input: {
          ...structuredClone(input),
          sessionToken: s.sessionToken,
          expectedSchemaVersion: s.schemaVersion,
          allowUpgrade: true,
        },
      });
      return {
        receipt,
        requiresUpgrade: s.schemaVersion < 12,
        notice:
          (s.schemaVersion < 12
            ? "将备份数据库、暂停当前视觉任务并启用 v12；旧版本不能打开。OCR 忙时需先完成该任务。 "
            : "") +
          "只为启用后新入库素材保存标签、描述、OCR 计划，不回填历史库、不启动模型或发送素材；该设置本身不执行模型；后台 OCR 另需本次开库许可与资源资格。",
      };
    },
    async confirm(owner: string, receipt: string) {
      const p = plans.get(receipt);
      if (!p || p.owner !== owner || p.expires < now() || active.size)
        throw Error("BACKGROUND_SCOPE_EXPIRED");
      const token = stamp(owner),
        abort = new AbortController();
      active.set(receipt, { owner, abort });
      plans.delete(receipt);
      let release: (() => void) | undefined,
        ocrRelease: (() => void) | undefined;
      try {
        if (p.input.expectedSchemaVersion < 12) {
          ocrRelease = deps.holdOcr();
          release = deps.admission.hold();
          await deps.visuals.suspendAndDrain();
        }
        abort.signal.throwIfAborted();
        const s = await deps.host.configureBackgroundAnalysis(
          p.input,
          abort.signal,
        );
        await fence(owner, token, p.input, p.input.sessionToken);
        return project(owner, s, p.input);
      } finally {
        try {
          if (release && deps.host.inspect().state === "ready") {
            const current = await deps.host.readVisualSession(p.input);
            if (current.sessionToken === p.input.sessionToken)
              deps.visuals.resume();
          }
        } finally {
          ocrRelease?.();
          release?.();
          active.delete(receipt);
        }
      }
    },
    discard(owner: string, receipt: string) {
      const p = plans.get(receipt) ?? executionPlans.get(receipt);
      if (!p) return;
      if (p.owner !== owner) throw Error("BACKGROUND_SCOPE_EXPIRED");
      plans.delete(receipt);
      executionPlans.delete(receipt);
    },
    async change(owner: string, input: BackgroundDecision) {
      if (active.size >= 4) throw Error("BACKGROUND_BUSY");
      const token = stamp(owner),
        id = randomUUID(),
        abort = new AbortController();
      active.set(id, { owner, abort });
      try {
        workAbort?.abort();
        const s = await deps.host.changeBackgroundIntent(input, abort.signal);
        await fence(owner, token, input, input.sessionToken);
        enqueue(0);
        return project(owner, s, input);
      } finally {
        active.delete(id);
      }
    },
    cancelOwner(owner: string) {
      owners.set(owner, (owners.get(owner) ?? 0) + 1);
      for (const [id, p] of plans) if (p.owner === owner) plans.delete(id);
      for (const [id, p] of executionPlans)
        if (p.owner === owner) executionPlans.delete(id);
      for (const a of active.values()) if (a.owner === owner) a.abort.abort();
    },
    invalidate() {
      epoch++;
      suspended = true;
      clearTimeout(scheduled);
      workAbort?.abort();
      plans.clear();
      executionPlans.clear();
      for (const a of active.values()) a.abort.abort();
    },
    async suspendAndDrain() {
      suspended = true;
      clearTimeout(scheduled);
      workAbort?.abort();
      await work;
    },
    resume() {
      suspended = false;
      enqueue(0);
    },
    tick,
  };
}
export function backgroundMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "OCR_BUSY")
    return "OCR 正在准备或运行，请完成后再启用计划存储。";
  if (code === "BACKGROUND_CONFLICT")
    return "计划状态已变化，请重新读取后操作。";
  if (code === "TAG_INTENT_BACKUP_UNSUPPORTED")
    return `${process.platform === "win32" ? "当前 Windows 环境" : "当前存储环境"}尚未通过安全备份验证。计划未保存、资料库未升级；现有素材与手工编辑仍可使用。`;
  if (code === "TAG_INTENT_SETTINGS_RESTORE_FAILED")
    return "资料库需要恢复检查，已停止写入。";
  if (code === "TAG_INTENT_ACK_UNCERTAIN")
    return "配置可能已保存，请重新读取核对。";
  return basicMessage(error);
}
