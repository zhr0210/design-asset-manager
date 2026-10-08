import { randomUUID,createHash } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type Database from "better-sqlite3";
import sharp from "sharp";
import type { SettingsServicePort } from "../../ipc/settings.ipc";
import type { VisionInvocation } from "../../visual-ai/openai-vision.provider";
import type {
  VisualAdmission,
  ResidencyPermit,
} from "../../visual-ai/visual-admission";
import { PiProcessUnconfirmedError } from "../../ai-gateway/pi-runtime-host";
import type { AiBackendConfig } from "../../../shared/types/ai-backend.types";
import { inspectAndBindVisionModel, nativeVisionFingerprint, nativeVisionBackendFingerprint, type ManagedVisionConfiguration } from "../../model-library/vision-model-binding";
import { VISION_MODEL_PROFILES } from "../../model-library/vision-model-artifact";
import type { ManagedModelLibrary } from "../../model-library-workspace/managed-model-library";
import { inspectGgufModel } from '../../model-library/gguf-model-artifact';
import { createGgufLoadPlan } from '../../local-ai-resources/gguf-load-plan';
import type { GgufLoadMode } from '../../../shared/contracts/local-ai-resources.contract';
import type { ManagedGgufPackages } from './managed-gguf-packages';
import { launchManagedGguf } from './managed-gguf-transport';
import { readOwnedWindowsProcessMemory } from '../../platform/windows-process-memory.internal';
import {ConfirmedLocalOomError,type LocalRecoveryOutcome} from '../../visual-ai/local-oom-recovery'
import {measureAiStage,type AiStageSink} from '../../local-ai-resources/ai-diagnostics'

export const MANAGED_VISION_ID = "dam-local-qwen-cpu";
export const MANAGED_VISION_MODEL = "Qwen3-VL-4B-Instruct";
export const MANAGED_COMPUTE_BYTES = 1024 ** 3;
type Configuration = ManagedVisionConfiguration;
const modelName = (c: Configuration | null) => c?.model ?? MANAGED_VISION_MODEL;
const loadBytes = (c: Configuration) => c.gguf ? c.native?.plan.cost.ramBytes ?? c.gguf.bytes + 3 * 1024 ** 3 : VISION_MODEL_PROFILES[c.modelId ?? 'qwen3-vl-4b-instruct'].loadRamBytes;
interface Measurement {
  rssBytes: number;
  peakRamBytes: number;
  device: "cpu" | "gpu" | "hybrid";
  dtype: string;
  threads: number;
}
interface Request {
  id: string;
  resolve(value: unknown): void;
  reject(error: Error): void;
}

/** Private owned process, not an HTTP service or an executable selected by a Browser request. */
export function createManagedVisionRuntime(d: {
  database: Database.Database;
  runner: string;
  settings: SettingsServicePort;
  admission: VisualAdmission;
  selectModel(): Promise<string | null>;
  selectPython(): Promise<string | null>;
  changed(): void;
  models?: ManagedModelLibrary;
  ggufPackages?: ManagedGgufPackages;
  refreshDevices?():Promise<void>;
  diagnostics?:AiStageSink;
  /** Isolated fault tests only. Main always uses the real owned launcher. */
  launchGguf?:typeof launchManagedGguf;
}) {
  d.database.exec(
    "CREATE TABLE IF NOT EXISTS managed_vision_runtime(singleton INTEGER PRIMARY KEY CHECK(singleton=1),configuration TEXT NOT NULL)",
  );
  d.database.exec('CREATE TABLE IF NOT EXISTS local_oom_recovery(id TEXT PRIMARY KEY,record TEXT NOT NULL)')
  const requestFingerprint=(input:VisionInvocation)=>createHash('sha256').update(JSON.stringify({backendId:input.backendId,model:input.model,
    image:input.imageDataUrl,system:input.systemPrompt,user:input.userPrompt,temperature:input.temperature,maxTokens:input.maxTokens,
    contract:input.outputContract,reasoning:input.reasoning})).digest('hex')
  const oomFailures=new Map<string,{error:ConfirmedLocalOomError;consumed:boolean;inputSha256:string;requestFingerprint:string;operationId:string|null}>()
  const recoveryAudit=(id:string,update:Record<string,unknown>)=>{const prior=d.database.prepare('SELECT record FROM local_oom_recovery WHERE id=?').pluck().get(id)
    d.database.prepare('INSERT INTO local_oom_recovery VALUES(?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record').run(id,JSON.stringify({...(typeof prior==='string'?JSON.parse(prior):{}),...update,updatedAt:new Date().toISOString()}))
    d.database.prepare('DELETE FROM local_oom_recovery WHERE rowid NOT IN (SELECT rowid FROM local_oom_recovery ORDER BY rowid DESC LIMIT 100)').run()}
  let state:
    | "unconfigured"
    | "inactive"
    | "checking"
    | "loading"
    | "verifying"
    | "ready"
    | "stopping"
    | "unknown"
    | "failed" = "unconfigured";
  let error: string | null = null,
    measurement: Measurement | null = null,
    executionId: string | null = null,
    child: ChildProcessWithoutNullStreams | undefined,
    resident: ResidencyPermit | undefined;
  let measurementModel: string | null = null, measurementFingerprint: string | null = null,
    loadMs: number | null = null, unloadMs: number | null = null, unloadStartedAt: number | null = null;
  let pending: Request | undefined,
    closed = Promise.resolve(),
    closeResolve: (() => void) | undefined,
    activation: Promise<void> | undefined,
    abort: AbortController | undefined,
    idleTimer: ReturnType<typeof setTimeout> | undefined,
    lastStop = 0,
    rebalancePending = false,
    configuring = false,
    switching = false,
    transitionAbort: AbortController | undefined;
  let nativeTransport: Awaited<ReturnType<typeof launchManagedGguf>> | undefined,
    nativeMeasurementTimer: ReturnType<typeof setInterval> | undefined;
  const config = (): Configuration | null => {
    const row = d.database
      .prepare(
        "SELECT configuration FROM managed_vision_runtime WHERE singleton=1",
      )
      .get() as { configuration: string } | undefined;
    return row ? JSON.parse(row.configuration) : null;
  };
  const save = (c: Configuration) =>
    d.database
      .prepare(
        "INSERT INTO managed_vision_runtime VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET configuration=excluded.configuration",
      )
      .run(JSON.stringify(c));
  const settingsBackend = (c: Configuration, ready: boolean) => {
    const b: AiBackendConfig = {
      id: MANAGED_VISION_ID,
      name: modelName(c) + (c.gguf ? " · DAM 托管 GGUF" : " · DAM 托管 CPU"),
      type: c.gguf ? "llama-openai" : "native-python",
      transport: "legacy",
      authMode: "none",
      enabled: ready,
      baseUrl: "http://127.0.0.1/dam-owned-vision",
      defaultModel: modelName(c),
      processingLocation: "local-service",
      timeoutMs: 120000,
      priority: 20,
      runtimeFingerprint: c.native ? nativeVisionBackendFingerprint(c) : c.fingerprint,
      capabilities: {
        chat: true,
        vision: ready,
        embeddings: false,
        jsonOutput: ready,
        modelList: false,
        modelManagement: true,
      },
      notes: `${c.source === 'huggingface-upstream' ? '登记的固定版本，境内下载与来源核对见模型库存' : '用户导入'}；${c.gguf ? 'GGUF，固定受管原生运行包；实际设备方案见本地模型状态' : '本地 CPU float32'}；不执行模型目录代码。`,
    };
    const list = d.settings.getSettings().aiBackends ?? [];
    if (
      JSON.stringify(list.find((item) => item.id === MANAGED_VISION_ID)) ===
      JSON.stringify(b)
    )
      return;
    const prior = list.find(item => item.id === MANAGED_VISION_ID);
    const choices = d.settings.getSettings().aiTaskModels;
    const taskModels = choices && ready && prior?.defaultModel !== b.defaultModel ? Object.fromEntries(Object.entries(choices).map(([key, value]) =>
      [key, value?.backendId === MANAGED_VISION_ID && value.model === prior?.defaultModel ? { ...value, model: b.defaultModel! } : value])) : undefined;
    d.settings.saveSettings({ aiBackends: [...list.filter((b) => b.id !== MANAGED_VISION_ID), b],
      ...(taskModels ? { aiTaskModels: taskModels } : {}) });
    d.changed();
  };
  const touch = () => {
    clearTimeout(idleTimer);
    if (state === "ready" && !pending && !prepared.size) {
      const mode = d.admission.resourceStatus().policy.mode;
      if (rebalancePending) {
        rebalancePending = false;
        void stop(false).catch(() => {});
        return;
      }
      idleTimer = setTimeout(
        () => {
          void stop(false).catch(() => {});
        },
        mode === "quiet" ? 30000 : mode === "accelerated" ? 300000 : 120000,
      );
      idleTimer.unref?.();
    }
  };
  const prepared = new Map<AbortSignal, () => void>();
  const protectPrepared = (signal: AbortSignal) => {
    if (prepared.has(signal)) return;
    const release = () => { clearTimeout(timer); signal.removeEventListener('abort', release); prepared.delete(signal); touch() };
    const timer = setTimeout(release, 120000); timer.unref?.();
    prepared.set(signal, release); signal.addEventListener('abort', release, { once: true });
    clearTimeout(idleTimer);
  };
  const planFits = (c: Configuration) => Boolean(c.native &&
    d.admission.canAdmitModel(c.native.plan.cost) && d.admission.canAdmitVision({
      residentBytes: c.native.plan.cost.ramBytes, computeBytes: MANAGED_COMPUTE_BYTES }, false));
  const selectVerifiedPlan = (c: Configuration) => {
    if (!c.gguf || !c.entryId || !d.models) return c;
    const resource = d.admission.resourceStatus(), devices = resource.devices;
    const candidates = d.models.verifiedConfigurations(c.entryId).filter(value => value.native &&
      (!value.native.plan.deviceId || devices.some(device => device.id === value.native!.plan.deviceId && device.state === 'known'&&device.driver===value.native!.plan.driverVersion&&device.computeCapability===value.native!.plan.computeCapability)) &&
      (!c.native || nativeVisionBackendFingerprint(value) === nativeVisionBackendFingerprint(c)) && planFits(value));
    if (!candidates.length) return c; // Ordinary admission returns a wait, never an unverified fallback.
    const mode = resource.policy.mode;
    const threadPenalty=(value:Configuration)=>Number(value.native!.threads>resource.computeThreads)
    candidates.sort((left, right) => threadPenalty(left)-threadPenalty(right)||(mode === 'quiet'
      ? left.native!.plan.cost.ramBytes + Object.values(left.native!.plan.cost.gpuBytes).reduce((a,b)=>a+b,0) -
        right.native!.plan.cost.ramBytes - Object.values(right.native!.plan.cost.gpuBytes).reduce((a,b)=>a+b,0)
      : ['gpu','hybrid','cpu'].indexOf(left.native!.plan.mode) - ['gpu','hybrid','cpu'].indexOf(right.native!.plan.mode))||
      Math.abs(left.native!.threads-resource.computeThreads)-Math.abs(right.native!.threads-resource.computeThreads));
    return { ...candidates[0], enabled: c.enabled };
  };
  const observe = (m: unknown) => {
    const value = m as Measurement;
    if (
      !value ||
      value.device !== "cpu" ||
      value.dtype !== "float32" ||
      !Number.isSafeInteger(value.rssBytes) ||
      value.rssBytes <= 0 ||
      !Number.isSafeInteger(value.peakRamBytes) ||
      value.peakRamBytes < value.rssBytes
    )
      throw Error("LOCAL_RESOURCE_OBSERVATION_INVALID");
    resident!.observe(value.rssBytes, value.peakRamBytes);
    measurement = value;
    if (state === "ready" && d.admission.resourceStatus().pressure) {
      rebalancePending = true;
      if (!pending) touch();
    }
  };
  async function fingerprint(
    root: string,
    python: string,
    signal?: AbortSignal,
  ) {
    return (await inspectAndBindVisionModel(root, python, d.runner, signal)).configuration;
  }
  const failRequest = (code: string | Error) => {
    const request = pending;
    pending = undefined;
    request?.reject(typeof code === "string" ? Error(code) : code);
  };
  async function stop(disable: boolean, preserveTransition = false) {
    clearTimeout(idleTimer);
    clearInterval(nativeMeasurementTimer);
    abort?.abort();
    if (!preserveTransition) transitionAbort?.abort();
    const c = config();
    if (disable && c) {
      save({ ...c, enabled: false });
      settingsBackend(c, false);
    }
    if (!child) {
      if (state !== "unconfigured") state = "inactive";
      return;
    }
    state = "stopping";
    unloadStartedAt ??= Date.now();
    const owned = child;
    const stoppedExecution=executionId??'local-release',stoppedFingerprint=measurementFingerprint,stopStarted=Date.now();
    try {
      owned.kill("SIGTERM");
    } catch {
      /* Actual close is the release condition. */
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        closed,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            state = "unknown";
            const unknown = new PiProcessUnconfirmedError(closed);
            failRequest(unknown);
            reject(unknown);
          }, 5000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      try{d.diagnostics?.({operationId:stoppedExecution,stage:'cancel-and-release',startedAt:new Date(stopStarted).toISOString(),durationMs:Date.now()-stopStarted,outcome:child===owned?'failed':'returned',errorCode:child===owned?'LOCAL_RUNTIME_EXIT_UNCONFIRMED':null,fingerprint:stoppedFingerprint,mode:c?.native?.plan.mode??'cpu',language:null})}catch{}
    }
  }
  async function send(
    input: Pick<
      VisionInvocation,
      "systemPrompt" | "userPrompt" | "imageDataUrl" | "maxTokens" | "signal" | "outputContract"
    >,
  ): Promise<unknown> {
    input.signal.throwIfAborted();
    if (!child || pending) throw Error("LOCAL_RUNTIME_BUSY");
    clearTimeout(idleTimer);
    const owned = child,
      id = randomUUID(),
      cancel = () => {
        void stop(false).catch(() => {});
      };
    input.signal.addEventListener("abort", cancel, { once: true });
    try {
      if (nativeTransport) {
        return await new Promise((resolve, reject) => {
          pending = { id, resolve, reject };
          nativeTransport!.invoke(input).then(value => { if (pending?.id === id) pending = undefined; resolve(value) },
            error => { if (pending?.id === id) pending = undefined; reject(error) });
        });
      }
      return await new Promise((resolve, reject) => {
        pending = { id, resolve, reject };
        owned.stdin.write(
          JSON.stringify({
            kind: "infer",
            id,
            systemPrompt: input.systemPrompt,
            userPrompt: input.userPrompt,
            imageDataUrl: input.imageDataUrl,
            maxTokens: input.maxTokens,
            threads: d.admission.resourceStatus().computeThreads,
          }) + "\n",
          (err) => {
            if (err) cancel();
          },
        );
      });
    } finally {
      input.signal.removeEventListener("abort", cancel);
      prepared.get(input.signal)?.();
      touch();
    }
  }
  async function activate(candidate?: Configuration, requested?: { mode: GgufLoadMode; deviceId?: string },existingProofFingerprint?:string) {
    if (configuring) throw Error("LOCAL_RUNTIME_BUSY");
    if (activation) return activation;
    if (state === "ready" && !candidate) return;
    if (child) throw Error("LOCAL_RUNTIME_EXIT_PENDING");
    const task = (async () => {
      let c = candidate ?? config();
      if (!c) throw Error("LOCAL_RUNTIME_UNCONFIGURED");
      if (!candidate && !requested) c = selectVerifiedPlan(c);
      d.models?.assertTrusted(c);
      abort = new AbortController();
      error = null;
      measurement = null; measurementModel = modelName(c); measurementFingerprint = c.fingerprint;
      loadMs = null; unloadMs = null; unloadStartedAt = null;
      state = "checking";
      if (c.gguf) {
        if (!d.ggufPackages) throw Error('LOCAL_RUNTIME_UNAVAILABLE');
        const artifact = await inspectGgufModel(c.root, c.gguf, abort.signal);
        if (artifact.artifactFingerprint !== c.artifactFingerprint) throw Error('LOCAL_MODEL_CHANGED');
        const mode = requested?.mode ?? c.native?.plan.mode ?? 'cpu';
        const devices = d.admission.resourceStatus().devices;
        const deviceId = requested?.deviceId ?? c.native?.plan.deviceId;
        const device = devices.find(value => value.id === deviceId) ?? devices.find(value => value.state === 'known' && value.topology === 'dedicated');
        if (mode !== 'cpu' && (!device || device.state !== 'known' || Number(device.driver?.split('.')[0] ?? 0) < 615)) throw Error('AI_DEVICE_UNKNOWN');
        const plan = createGgufLoadPlan(c.gguf, mode, device);
        if (!d.admission.canAdmitModel(plan.cost) || !d.admission.canAdmitVision({ residentBytes: plan.cost.ramBytes, computeBytes: MANAGED_COMPUTE_BYTES }, false)) throw Error('AI_MEMORY_WAIT');
        const preparing = d.admission.reserveResident('native-runtime-preparation:' + randomUUID(), 128 * 1024 ** 2, abort.signal);
        let binding;
        try { binding = await d.ggufPackages.prepare(mode === 'cpu' ? 'cpu' : 'cuda-13.4', abort.signal) }
        finally { preparing.release() }
        // A cold reload belongs to the already frozen backend binding. Activity
        // cannot change that binding while its consumer is preparing execution.
        // Deliberate plan selection happens before a new request is frozen.
        c = { ...c, native: { binding, plan, threads: requested || !c.native ? d.admission.resourceStatus().computeThreads : c.native.threads } };
        c.fingerprint = nativeVisionFingerprint(c);
        d.models?.assertTrusted(c);
        measurementFingerprint = c.fingerprint;
      }
      const reusableProof=existingProofFingerprint&&c.entryId&&d.models?.verifiedConfigurations(c.entryId).find(value=>
        value.fingerprint===existingProofFingerprint&&value.fingerprint===c!.fingerprint&&nativeVisionBackendFingerprint(value)===nativeVisionBackendFingerprint(c!))
      if(existingProofFingerprint&&!reusableProof)throw Error('LOCAL_RECOVERY_PROOF_CHANGED')
      // Loading needs the full memory envelope; verification acquires its execution slot below.
      if (!d.admission.canAdmitVision({ residentBytes: loadBytes(c), computeBytes: MANAGED_COMPUTE_BYTES }, false))
        throw Error("AI_MEMORY_WAIT");
      if (!c.gguf) {
        if (!c.python) throw Error('LOCAL_RUNTIME_UNAVAILABLE');
        const checked = await fingerprint(c.root, c.python, abort.signal);
        abort.signal.throwIfAborted();
        if (checked.fingerprint !== c.fingerprint) throw Error("LOCAL_MODEL_CHANGED");
      }
      if (lastStop && Date.now() - lastStop < 10000 && !reusableProof)
        throw Error("LOCAL_RUNTIME_COOLDOWN");
      if (!d.admission.canAdmitVision({ residentBytes: loadBytes(c), computeBytes: MANAGED_COMPUTE_BYTES }, false))
        throw Error("AI_MEMORY_WAIT");
      state = "loading";
      resident = c.native ? d.admission.reserveModel('managed-vision:' + c.fingerprint, c.native.plan.cost, abort.signal) : d.admission.reserveResident(
        "managed-vision:" + c.fingerprint,
        loadBytes(c),
        abort.signal,
      );
      executionId = randomUUID();
      let loadedResolve!: () => void, loadedReject!: (e: Error) => void;
      const loaded = new Promise<void>((resolve, reject) => {
        loadedResolve = resolve;
        loadedReject = reject;
      });
      closed = new Promise<void>((resolve) => {
        closeResolve = resolve;
      });
      const threads = d.admission.resourceStatus().computeThreads;
      const loadStartedAt = Date.now();
      let launched: Awaited<ReturnType<typeof launchManagedGguf>> | undefined;
      try { launched = c.native ? await (d.launchGguf??launchManagedGguf)(c, abort.signal) : undefined }
      catch (error) { resident?.release(); resident = undefined; throw error }
      nativeTransport = launched;
      const owned = launched?.child ?? spawn(
        c.python!,
        ["-I", "-B", d.runner, c.root, String(threads)],
        {
          shell: false,
          windowsHide: true,
          stdio: ["pipe", "pipe", "pipe"],
          env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT },
        },
      );
      child = owned;
      let observingNative = false;
      const observeNative = async () => {
        if (!launched || !c.native || !owned.pid || child !== owned || observingNative) return;
        observingNative = true;
        try {
        const value = await readOwnedWindowsProcessMemory({ pid: owned.pid, ...launched.launch });
        if (child !== owned || !resident) return;
        measurement = { rssBytes: value.rssBytes, peakRamBytes: value.peakRamBytes, device: c.native.plan.mode,
          dtype: 'GGUF ' + c.gguf!.languageQuantization, threads };
        resident.observe(value.rssBytes, value.peakRamBytes);
        const gpu = launched.gpuAllocation();
        if (c.native.plan.deviceId && gpu > 0) resident.observeGpu(c.native.plan.deviceId, gpu);
        } finally { observingNative = false }
      };
      if (launched) launched.ready.then(async () => {
        loadMs = Date.now() - loadStartedAt;
        try { await observeNative(); loadedResolve() } catch (error) { loadedReject(error as Error) }
        nativeMeasurementTimer = setInterval(() => { void observeNative().catch(() => { void stop(false).catch(() => {}) }) }, 2000);
        nativeMeasurementTimer.unref?.();
      }, loadedReject);
      let buffer = "",
        stderrBytes = 0;
      const decoder = new StringDecoder("utf8");
      const protocolFailure = () => {
        loadedReject(Error("LOCAL_RUNTIME_PROTOCOL_FAILED"));
        void stop(false).catch(() => {});
      };
      if (!launched) owned.stdout.on("data", (data: Buffer) => {
        buffer += decoder.write(data);
        if (Buffer.byteLength(buffer) > 1024 * 1024) {
          protocolFailure();
          return;
        }
        for (
          let end = buffer.indexOf("\n");
          end >= 0;
          end = buffer.indexOf("\n")
        ) {
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 1);
          try {
            const message = JSON.parse(line);
            if (message.kind === "loaded") {
              loadMs = Date.now() - loadStartedAt;
              observe(message.metrics);
              loadedResolve();
            } else if (message.kind === "metrics") observe(message.metrics);
            else if (message.kind === "fatal") {
              loadedReject(Error(message.code));
              void stop(false).catch(() => {});
            } else if (pending && message.id === pending.id) {
              observe(message.metrics);
              const request = pending;
              pending = undefined;
              message.kind === "result"
                ? request.resolve(message.value)
                : request.reject(
                    Error(message.code ?? "LOCAL_INFERENCE_FAILED"),
                  );
            } else protocolFailure();
          } catch {
            protocolFailure();
          }
        }
      });
      if (!launched) owned.stderr.on("data", (data: Buffer) => {
        stderrBytes += data.length;
        if (stderrBytes > 2 * 1024 * 1024) protocolFailure();
      });
      owned.stdin.on("error", protocolFailure);
      owned.stdout.on("error", protocolFailure);
      owned.stderr.on("error", protocolFailure);
      owned.once("error", () => {
        loadedReject(Error("LOCAL_RUNTIME_START_FAILED"));
        if (!owned.pid) {
          child = undefined;
          executionId = null;
          resident?.release();
          resident = undefined;
          closeResolve?.();
        }
      });
      owned.once("close", () => {
        clearInterval(nativeMeasurementTimer);
        if (child === owned) {
          if (unloadStartedAt !== null) unloadMs = Date.now() - unloadStartedAt;
          child = undefined;
          nativeTransport = undefined;
          resident?.release();
          resident = undefined;
          executionId = null;
          lastStop = Date.now();
          state = "inactive";
        }
        loadedReject(Error("LOCAL_RUNTIME_EXITED"));
        failRequest("LOCAL_RUNTIME_EXITED");
        if (launched) void launched.dispose().catch(() => {}).finally(() => closeResolve?.());
        else closeResolve?.();
      });
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          loaded,
          new Promise<never>((_, reject) => {
            deadline = setTimeout(
              () => reject(Error("LOCAL_RUNTIME_LOAD_TIMEOUT")),
              180000,
            );
          }),
        ]);
        abort.signal.throwIfAborted();
        try{d.diagnostics?.({operationId:executionId??'local-load',stage:'model-load',startedAt:new Date(loadStartedAt).toISOString(),durationMs:loadMs??Date.now()-loadStartedAt,outcome:'returned',errorCode:null,fingerprint:c.fingerprint,mode:c.native?.plan.mode??'cpu',language:null})}catch{}
        if(!reusableProof){
          state = "verifying";
          const permit = await d.admission.reserveManagedProbe(abort.signal);
          try {
          const jpeg = await sharp({
            create: {
              width: 256,
              height: 128,
              channels: 3,
              background: "#e51b24",
            },
          })
            .composite([
              {
                input: await sharp({
                  create: {
                    width: 128,
                    height: 128,
                    channels: 3,
                    background: "#195af0",
                  },
                })
                  .png()
                  .toBuffer(),
                left: 128,
                top: 0,
              },
            ])
            .jpeg()
            .toBuffer();
          const result = (await send({
            systemPrompt:
              "Only return a complete JSON object with left and right. Name the visible color of each half in English. No Markdown.",
            userPrompt: "What are the left and right colors?",
            imageDataUrl: "data:image/jpeg;base64," + jpeg.toString("base64"),
            maxTokens: 128,
            signal: abort.signal,
          })) as any;
          const choice = result?.choices?.[0];
          if (choice?.finish_reason !== "stop")
            throw Error("LOCAL_CAPABILITY_FAILED");
          const value = JSON.parse(choice.message.content);
          if (!/red/i.test(value.left) || !/blue/i.test(value.right))
            throw Error("LOCAL_CAPABILITY_FAILED");
          } finally {
            permit.release();
          }
          d.models?.assertTrusted(c);
          d.models?.qualified(c);
        }
        d.models?.assertTrusted(c);
        save({ ...c, enabled: true });
        state = "ready";
        settingsBackend(c, true);
        touch();
      } finally {
        clearTimeout(deadline);
      }
    })();
    activation = task;
    try {
      await task;
    } catch (e) {
      // Capture the cause before stop() aborts its owned controller. A user or
      // Library drain can cancel a cold check without revoking the existing
      // trusted configuration; the next work unit must run the full check.
      const cancelled = !!abort?.signal.aborted && e instanceof Error &&
        (e.name === 'AbortError' || e.message === 'LOCAL_RUNTIME_CANCELLED');
      error = cancelled ? 'LOCAL_RUNTIME_CANCELLED' : e instanceof Error ? e.message : "LOCAL_RUNTIME_FAILED";
      if (child) await stop(false).catch(() => {});
      const temporary = cancelled || ["AI_MEMORY_WAIT", "LOCAL_RUNTIME_COOLDOWN"].includes(
        error,
      );
      if (state !== "unknown") state = temporary || candidate ? "inactive" : "failed";
      const c = config();
      if (c) {
        let trusted = true; try { d.models?.assertTrusted(c); } catch { trusted = false; }
        settingsBackend(c, trusted && (temporary || !!candidate) && c.enabled);
      }
      throw e;
    } finally {
      activation = undefined;
    }
  }
  const api = {
    backgroundReadiness() {
      const c = config();
      if (!c?.enabled || state === "failed" || configuring)
        return { ready: false, reason: "请验证并启用本地图像模型。" };
      if (switching) return { ready: false, reason: '正在复核与切换模型版本。' };
      try { d.models?.assertTrusted(c); } catch { return { ready: false, reason: '模型信任已撤销或本地来源绑定无效，请从模型库核对。' }; }
      if (["checking", "loading", "verifying"].includes(state))
        return { ready: false, reason: "本地图像模型正在加载或验证。" };
      if (["stopping", "unknown"].includes(state))
        return { ready: false, reason: "正在核对模型实际退出，资源仍计入占用。" };
      if (pending) return { ready: false, reason: "本地图像模型正在计算，等待当前工作单元。" };
      if (lastStop && Date.now() - lastStop < 10000)
        return { ready: false, reason: "模型切换冷却中，稍后继续。" };
      const next = resident ? c : selectVerifiedPlan(c);
      const ready = d.admission.canAdmitVision({ residentBytes: resident ? 0 : loadBytes(next), computeBytes: MANAGED_COMPUTE_BYTES }) &&
        (!next.native || resident ? true : d.admission.canAdmitModel(next.native.plan.cost));
      return {
        ready,
        reason: ready
          ? state === "ready" ? "模型已验证，按共享预算执行。" : "资源可准入，执行前仍会校验并验证模型。"
          : "等待其他应用释放内存；需满足模型加载、准备与计算的完整预算。",
      };
    },
    status() {
      const c = config();
      return {
        state,
        configured: !!c,
        model: modelName(c),
        source: c?.source ?? "user-import",
        modelEntryId: c?.entryId ?? null,
        computing: !!pending,
        switching,
        library: d.models?.summary(c?.entryId),
        device: c?.native?.plan.mode ?? "cpu",
        dtype: c?.gguf ? 'GGUF ' + c.gguf.languageQuantization : "float32",
        nativePackage: d.ggufPackages?.status(),
        loadPlan: c?.native?.plan ?? null,
        error,
        executionId,
        measurement,
        measurementModel,
        measurementFingerprint,
        loadMs,
        unloadMs,
        resource: d.admission.resourceStatus(),
        notice:
          c?.gguf ? 'Qwen3-VL GGUF · 固定受管 llama.cpp；完整语言/视觉组合与实际加载方案经真实图像验证后可用。' : "Qwen3-VL 2B/4B · 已安装可信 Transformers · CPU float32；验证会真实加载与识别双色图。",
      };
    },
    async configure() {
      if (configuring || activation || child || switching) throw Error("LOCAL_RUNTIME_BUSY");
      configuring = true;
      abort = new AbortController();
      try {
        const root = await d.selectModel();
        if (!root) return;
        const python = await d.selectPython();
        if (!python) return;
        state = "checking";
        const c = await fingerprint(root, python, abort.signal);
        abort.signal.throwIfAborted();
        save({ ...c, enabled: false });
        settingsBackend({ ...c, enabled: false }, false);
        state = "inactive";
        error = null;
      } finally {
        configuring = false;
      }
    },
    activate: () => { if (switching) throw Error('LOCAL_RUNTIME_BUSY'); return activate(); },
    async activateModel(id: string, requested?: { mode: GgufLoadMode; deviceId?: string }) {
      if (!d.models || configuring || activation || pending || switching) throw Error('LOCAL_RUNTIME_BUSY');
      switching = true; transitionAbort = new AbortController();
      try {
        const candidate = await d.models.configuration(id, transitionAbort.signal);
        transitionAbort.signal.throwIfAborted();
        if (config()?.entryId === id && state === 'ready' && (!requested || config()?.native?.plan.mode === requested.mode &&
          (!requested.deviceId || config()?.native?.plan.deviceId === requested.deviceId))) return;
        // Disable new admissions before releasing the old owned process. Its configuration stays durable until success.
        const previous = config();
        if (previous) settingsBackend(previous, false);
        await stop(false, true);
        transitionAbort.signal.throwIfAborted();
        lastStop = 0; // A confirmed deliberate switch does not inherit the idle reload cooldown.
        await activate(candidate, requested);
      } catch (failure) {
        const code = failure instanceof Error ? failure.message : '';
        error = /^(LOCAL|MODEL|NATIVE|AI|VISUAL)_[A-Z_0-9]+$/.test(code) ? code : 'LOCAL_RUNTIME_SWITCH_FAILED';
        throw failure;
      } finally { switching = false; transitionAbort = undefined; }
    },
    async revokeModel(id: string, retire = false) {
      if (!d.models) throw Error('LOCAL_RUNTIME_UNAVAILABLE');
      d.models.setTrust(id, false);
      if (retire) d.models.retire(id);
      if (config()?.entryId === id) await stop(true);
    },
    async sourceTrustChanged(id: string) {
      const c = config();
      if (c?.entryId !== id) return;
      try { d.models?.assertTrusted(c) } catch { await stop(true) }
    },
    async autoSelect(preference: 'efficient' | 'quality'): Promise<void> {
      if (!d.models || switching || activation || configuring || pending) throw Error('LOCAL_RUNTIME_BUSY');
      const current = config(), inventory = d.models.summary(current?.entryId);
      const candidates = inventory.models.filter(model => model.trust === 'accepted' && !model.sourceBlock && !model.retired && model.qualifiedAt);
      if (!candidates.length) throw Error('MODEL_NO_QUALIFIED_COMBINATION');
      // Reuse a compatible loaded model to avoid another cold load; an explicit quality preference may choose the larger profile.
      if (current && state === 'ready' && !d.admission.resourceStatus().pressure &&
        (preference === 'efficient' || current.modelId === 'qwen3-vl-4b-instruct')) {
        d.models.assertTrusted(current); return;
      }
      const selectionCost = (model: typeof candidates[number]) => model.format === 'gguf'
        ? Math.min(...d.models!.verifiedConfigurations(model.id).filter(planFits).map(c=>c.native!.plan.cost.ramBytes))
        : VISION_MODEL_PROFILES[model.modelId].loadRamBytes;
      const available = candidates.filter(model => model.format === 'gguf' ? d.models!.verifiedConfigurations(model.id).some(planFits) : d.admission.canAdmitVision({
        residentBytes: model.active && resident ? 0 : VISION_MODEL_PROFILES[model.modelId].loadRamBytes,
        computeBytes: MANAGED_COMPUTE_BYTES,
      }, false, !model.active && resident && child && state === 'ready' && current
        ? 'managed-vision:' + current.fingerprint : undefined)).sort((left, right) => preference === 'efficient'
        ? selectionCost(left) - selectionCost(right)
        : Number(/(\d+)B/i.exec(right.model)?.[1]??0)-Number(/(\d+)B/i.exec(left.model)?.[1]??0) || selectionCost(left)-selectionCost(right));
      if (!available.length) throw Error('AI_MEMORY_WAIT');
      const chosen = available[0], verified = chosen.format === 'gguf' ? d.models.verifiedConfigurations(chosen.id).filter(planFits) : [];
      verified.sort((a,b)=>a.native!.plan.cost.ramBytes-b.native!.plan.cost.ramBytes);
      await this.activateModel(chosen.id, verified[0]?.native ? { mode: verified[0].native.plan.mode,
        ...(verified[0].native.plan.deviceId ? { deviceId: verified[0].native.plan.deviceId } : {}) } : undefined);
    },
    deactivate: () => stop(true),
    async releaseIdle() {
      if(pending||activation||switching||prepared.size)return false;
      await stop(false);return true;
    },
    async rebalance() {
      const resource = d.admission.resourceStatus();
      if (child && state === 'ready' && (resource.reason || resource.pressure || resource.gpuPressure.length)) {
        rebalancePending = true;
        if (!pending && !prepared.size) {
          rebalancePending = false;
          await stop(false);
        }
      }
    },
    async prepare(signal: AbortSignal) {
      const cancel = () => {
        void stop(false).catch(() => {});
      };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        signal.throwIfAborted();
        if (switching) throw Error('LOCAL_RUNTIME_BUSY');
        const c = config();
        if (!c?.enabled) throw Error("LOCAL_RUNTIME_BINDING_CHANGED");
        d.models?.assertTrusted(c);
        protectPrepared(signal);
        if (state !== "ready") await activate();
        signal.throwIfAborted();
      } catch (error) {
        prepared.get(signal)?.(); throw error;
      } finally {
        signal.removeEventListener("abort", cancel);
      }
    },
    async invokeOnce(input: VisionInvocation) {
      if (switching) throw Error('LOCAL_RUNTIME_BUSY');
      const c = config();
      if (
        !c?.enabled ||
        input.backendId !== MANAGED_VISION_ID ||
        input.model !== modelName(c) ||
        input.reasoning !== undefined
      )
        throw Error("LOCAL_RUNTIME_BINDING_CHANGED");
      d.models?.assertTrusted(c);
      if (state !== "ready") await activate();
      input.signal.throwIfAborted();
      try{return await measureAiStage(d.diagnostics,input.operationId??executionId??'local-inference','inference',()=>send(input),{fingerprint:measurementFingerprint??c.fingerprint,mode:config()?.native?.plan.mode??'cpu'})}catch(e){
        if(e instanceof Error&&e.message==='LOCAL_OOM'&&!input.signal.aborted&&executionId){
          const executionFingerprint=measurementFingerprint??c.fingerprint
          const known=new ConfirmedLocalOomError({id:randomUUID(),backendId:MANAGED_VISION_ID,model:input.model,executionId,fingerprint:executionFingerprint})
          const inputSha256=createHash('sha256').update(input.imageDataUrl).digest('hex')
          oomFailures.set(known.failure.id,{error:known,consumed:false,inputSha256,requestFingerprint:requestFingerprint(input),operationId:input.operationId??null})
          while(oomFailures.size>32)oomFailures.delete(oomFailures.keys().next().value!)
          recoveryAudit(known.failure.id,{state:'definite-local-oom',model:input.model,modelEntryId:c.entryId??null,executionId,fromFingerprint:executionFingerprint,
            fromMode:config()?.native?.plan.mode??'cpu',operationId:input.operationId??null,inputSha256,errorCode:'LOCAL_OOM',physicalCalls:1})
          throw known
        }
        throw e
      }
    },
    async recoverLocal(cause:ConfirmedLocalOomError,input:VisionInvocation){
      const failure=oomFailures.get(cause.failure.id),before=config()
      if(!failure||failure.error!==cause||failure.consumed||!before?.gguf||!before.native||!before.entryId||!d.models||pending||activation||switching||
        cause.failure.backendId!==input.backendId||input.model!==before.model||failure.operationId!==(input.operationId??null)||
        failure.inputSha256!==createHash('sha256').update(input.imageDataUrl).digest('hex')||before.fingerprint!==cause.failure.fingerprint)return false
      if(failure.requestFingerprint!==requestFingerprint(input))return false
      failure.consumed=true;input.signal.throwIfAborted();d.models.assertTrusted(before)
      const gpuCost=(c:Configuration)=>Object.values(c.native?.plan.cost.gpuBytes??{}).reduce((a,b)=>a+b,0)
      const candidates=d.models.verifiedConfigurations(before.entryId).filter(c=>c.native&&c.fingerprint!==before.fingerprint&&
        nativeVisionBackendFingerprint(c)===nativeVisionBackendFingerprint(before)&&gpuCost(c)<gpuCost(before)).sort((a,b)=>gpuCost(a)-gpuCost(b)||loadBytes(a)-loadBytes(b))
      if(!candidates.length){recoveryAudit(cause.failure.id,{state:'not-retried',errorCode:'LOCAL_NO_VALIDATED_LOWER_PLAN'});return false}
      switching=true;transitionAbort=new AbortController()
      const cancel=()=>{transitionAbort?.abort();abort?.abort()};input.signal.addEventListener('abort',cancel,{once:true})
      try{
        recoveryAudit(cause.failure.id,{state:'confirming-release'})
        await stop(false,true);input.signal.throwIfAborted();if(child)throw Error('LOCAL_RUNTIME_EXIT_PENDING')
        await d.refreshDevices?.();input.signal.throwIfAborted();d.models.assertTrusted(before)
        if(config()?.fingerprint!==before.fingerprint)throw Error('LOCAL_RUNTIME_BINDING_CHANGED')
        const target=candidates.find(planFits);if(!target)throw Error('AI_MEMORY_WAIT')
        recoveryAudit(cause.failure.id,{state:'loading-validated-lower-plan',toFingerprint:target.fingerprint,toMode:target.native!.plan.mode})
        await activate({...target,enabled:true},undefined,target.fingerprint);input.signal.throwIfAborted()
        recoveryAudit(cause.failure.id,{state:'ready-for-one-retry',loadedExecutionId:executionId})
        return true
      }catch(e){recoveryAudit(cause.failure.id,{state:'recovery-incomplete',errorCode:e instanceof Error&&/^[A-Z][A-Z_0-9]+$/.test(e.message)?e.message:'LOCAL_RECOVERY_FAILED'});throw e}
      finally{input.signal.removeEventListener('abort',cancel);transitionAbort=undefined;switching=false;touch()}
    },
    finishLocalRecovery(cause:ConfirmedLocalOomError,outcome:LocalRecoveryOutcome){
      const failure=oomFailures.get(cause.failure.id)
      if(!failure||failure.error!==cause||!Number.isInteger(outcome.physicalCalls)||outcome.physicalCalls<1||outcome.physicalCalls>2)return
      recoveryAudit(cause.failure.id,{...outcome,terminalAt:new Date().toISOString()});oomFailures.delete(cause.failure.id);touch()
    },
    async drain() {
      clearInterval(pressureTimer);
      for (const release of [...prepared.values()]) release();
      await stop(false);
      await activation?.catch(() => {});
      await d.ggufPackages?.drain();
    },
    async recheck() {
      let c = config();
      if (c) {
        state = "inactive";
        settingsBackend(c, false);
        try {
          if (d.models && !c.entryId) { c = await d.models.migrateLegacy(c); save(c); }
          d.models?.assertTrusted(c);
          if (c.enabled) await activate();
        } catch (e) { error = e instanceof Error ? e.message : 'LOCAL_RUNTIME_FAILED'; }
      }
    },
  };
  const pressureTimer = setInterval(() => { void api.rebalance().catch(() => {}) }, 2000);
  pressureTimer.unref?.();
  return api;
}
