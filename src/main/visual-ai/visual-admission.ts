import { PiProcessUnconfirmedError } from "../ai-gateway/pi-runtime-host";
import { MAX_VISION_RESPONSE_BYTES } from "./openai-vision.provider";
import { randomUUID, createHash } from "node:crypto";
import { systemVisualAiClock, type VisualAiClock } from "./visual-ai-clock";
import { createLocalAiResourceGovernor, type AiResourcePolicy, type AiWorkPriority } from "../local-ai-resources/resource-governor";
import type { AiDeviceResourceSample, ModelResourceCost } from '../../shared/contracts/local-ai-resources.contract'
export type { AiResourcePolicy, AiWorkPriority, ResidencyPermit } from "../local-ai-resources/resource-governor";
import {
  prepareVisualJpeg,
  type VisualCodecResult,
} from "./visual-preparation";

export const VISUAL_ADMISSION_PROFILE = Object.freeze({
  version: "visual-admission-v2",
  requestSlots: 2,
  tagsSlots: 1,
  preparationSlots: 1,
  sourceBytes: 33554432,
  maxPixels: 50_000_000,
  maxJpegBytes: 4194304,
  maxReceiptBytes: 33554432,
  maxFrozenBytes: 67108864,
  maxLocalBytes: 2 * 1024 ** 3,
  maxReceipts: 4,
  maxWaiters: 4,
  codecBytes: 268435456,
  serializationMultiplier: 12,
  responseBytes: MAX_VISION_RESPONSE_BYTES * 132,
  pipeBytes: 2097152,
  responseParseExpansion: 128,
  piWorkerBytes: 268435456,
});
const VISUAL_PREPARATION_BYTES =
  2 * VISUAL_ADMISSION_PROFILE.sourceBytes +
  4 * VISUAL_ADMISSION_PROFILE.maxPixels +
  VISUAL_ADMISSION_PROFILE.codecBytes +
  3 * VISUAL_ADMISSION_PROFILE.maxJpegBytes +
  VISUAL_ADMISSION_PROFILE.pipeBytes;
type Permit = { release(): void };
export interface VisualSession {
  sessionToken: string;
  leaseIdentity: string;
}
export interface PreparedVisual {
  assetId: string;
  jpeg: Uint8Array;
}
interface PreparationBinding { modelBinding: string }
interface PreparationView { assetRevision: string; previewGeneration: string }

export function createVisualAdmission(
  deps: {
    clock?: VisualAiClock;
    codec?: typeof prepareVisualJpeg;
    memory?: () => { free: number; total: number };
    activity?: () => "active" | "idle" | "unknown";
    policy?: AiResourcePolicy;
    devices?: () => AiDeviceResourceSample[];
  } = {},
) {
  const p = VISUAL_ADMISSION_PROFILE,
    clock = deps.clock ?? systemVisualAiClock,
    codec = deps.codec ?? prepareVisualJpeg;

  const governor = createLocalAiResourceGovernor({ capacity: p, clock, memory: deps.memory, activity: deps.activity, policy: deps.policy, devices: deps.devices });
  const { canAccept, acquire } = governor;
  let frozen = 0;
  type Cached = { jpeg: Uint8Array; refs: number; retained: boolean; permit: Permit; cancel: () => void };
  const preparedCache = new Map<string,Cached>();
  let cacheHits=0,cacheMisses=0;
  const evict = (key:string,entry:Cached) => {
    if(preparedCache.get(key)===entry)preparedCache.delete(key);
    entry.retained=false;entry.cancel();if(!entry.refs)entry.permit.release();
  };
  const clearPreparedCache = () => {for(const [key,entry] of [...preparedCache])evict(key,entry)};
  const cacheBytes = () => [...preparedCache.values()].reduce((sum,entry)=>sum+entry.jpeg.byteLength,0);
  const leases = new Set<ReturnType<typeof makeLease>>();
  function makeLease(
    owner: string,
    session: VisualSession,
    priority: AiWorkPriority,
    binding?:PreparationBinding,
  ) {
    const controller = new AbortController(),
      views = new Map<string, Uint8Array>(),
      id = randomUUID(),
      materialPermits: Permit[] = [];
    let disposed = false,
      consumed = false,
      bytesHeld = 0,
      operations = 0,
      disposeRequested = false;
    const expiresAt = clock.now() + 300000;
    const releaseHeld = () => {
      if (!disposeRequested || operations) return;
      disposed = true;
      views.clear();
      frozen -= bytesHeld;
      for (const permit of materialPermits.splice(0)) permit.release();
      bytesHeld = 0;
      leases.delete(api);
    };
    const cancelTimer = clock.scheduleTimeout(() => {
      if (!consumed) api.dispose();
    }, 300000);
    const valid = () => {
      if (
        disposed ||
        disposeRequested ||
        controller.signal.aborted ||
        (!consumed && clock.now() > expiresAt)
      )
        throw Error("VISUAL_RECEIPT_EXPIRED");
    };
    const api = {
      id,
      owner,
      session,
      expiresAt,
      consume() {
        valid();
        consumed = true;
        cancelTimer();
      },
      async prepare(
        assetId: string,
        read: () => Promise<Uint8Array>,
        view?:PreparationView,
      ): Promise<void> {
        valid();
        if (views.has(assetId)) throw Error("VISUAL_ASSET_DUPLICATE");
        operations++;
        let permit: Permit | undefined,
          source: Uint8Array | undefined,
          result: VisualCodecResult | undefined;
        try {
          const reservation = VISUAL_PREPARATION_BYTES;
          permit = await acquire(
            "prepare",
            reservation,
            controller.signal,
            0,
            priority,
          );
          valid();
          source = await read();
          if (source.length > p.sourceBytes)
            throw Error("VISUAL_SOURCE_TOO_LARGE");
          const key=binding&&view?createHash('sha256').update(JSON.stringify({recipe:'controlled-preview-jpeg-v2',
            session,assetId,view,binding,source:createHash('sha256').update(source).digest('hex')})).digest('hex'):null;
          let cached=key?preparedCache.get(key):undefined;
          if(cached){cacheHits++;preparedCache.delete(key!);preparedCache.set(key!,cached);result={jpeg:cached.jpeg,pixels:0,additionalRss:0}}
          else{if(key)cacheMisses++;result=await codec(source, controller.signal)}
          source = undefined;
          valid();
          const length = result.jpeg.length;
          if (
            length > p.maxJpegBytes ||
            length < 1 ||
            bytesHeld + length > p.maxReceiptBytes ||
            frozen + length > p.maxFrozenBytes ||
            governor.inspect().materialBytes + (cached ? 0 : length) > p.maxLocalBytes
          )
            throw Error("VISUAL_FROZEN_BUDGET");
          // Transfer ownership out of the larger preparation reservation before freeing that permit.
          views.set(assetId, result.jpeg);
          bytesHeld += length;
          frozen += length;
          if(key&&!cached){
            while(cacheBytes()+length>16*1024**2&&preparedCache.size){const [oldKey,entry]=preparedCache.entries().next().value!;evict(oldKey,entry)}
            const entry:Cached={jpeg:result.jpeg,refs:0,retained:length<=16*1024**2,permit:governor.retainPreparedMaterial(length),cancel:()=>{}};
            if(entry.retained){preparedCache.set(key,entry);entry.cancel=clock.scheduleTimeout(()=>evict(key,entry),120000)}
            cached=entry;
          }
          if(cached){
            cached.refs++;const entry=cached;let released=false;
            materialPermits.push({release(){if(released)return;released=true;entry.refs--;if(!entry.refs&&!entry.retained)entry.permit.release()}});
          }else materialPermits.push(governor.retainPreparedMaterial(length));
          result = undefined;
        } catch (error) {
          // A platform/dependency qualification refusal is local to the codec. Its
          // settled attempt releases normally; only unsafe resource evidence trips
          // the shared ledger used by OCR and generated Pi probes.
          if (
            error instanceof Error &&
            error.message === "VISUAL_CODEC_ESTIMATE_EXCEEDED"
          ) {
            governor.invalidateEstimate();
          }
          throw error;
        } finally {
          source = undefined;
          result = undefined;
          permit?.release();
          operations--;
          releaseHeld();
        }
      },
      async withRequest<T>(
        assetId: string,
        kind: "combined" | "tags-only",
        signal: AbortSignal,
        action: (jpeg: Uint8Array, signal: AbortSignal) => Promise<T>,
        workerBytes = 0,
        computeBytes = 0,
      ): Promise<T> {
        if (
          !Number.isSafeInteger(computeBytes) ||
          computeBytes < 0 ||
          computeBytes > 4 * 1024 ** 3
        )
          throw Error("VISUAL_COMPUTE_BUDGET");
        if (
          !Number.isSafeInteger(workerBytes) ||
          workerBytes < 0 ||
          workerBytes > p.piWorkerBytes
        )
          throw Error("VISUAL_WORKER_BUDGET");
        valid();
        if (!consumed) throw Error("VISUAL_REVIEW_REQUIRED");
        const jpeg = views.get(assetId);
        if (!jpeg) throw Error("VISUAL_ASSET_UNAVAILABLE");
        const abort = new AbortController(),
          cancel = () => abort.abort();
        signal.addEventListener("abort", cancel, { once: true });
        controller.signal.addEventListener("abort", cancel, { once: true });
        if (signal.aborted || controller.signal.aborted) abort.abort();
        let permit: Permit | undefined,
          unknownRelease: Promise<void> | undefined;
        operations++;
        try {
          permit = await acquire(
            kind,
            p.serializationMultiplier * jpeg.length +
              p.responseBytes +
              workerBytes,
            abort.signal,
            computeBytes,
            priority,
          );
          valid();
          abort.signal.throwIfAborted();
          const value = await action(jpeg, abort.signal);
          abort.signal.throwIfAborted();
          return value;
        } catch (error) {
          if (error instanceof PiProcessUnconfirmedError)
            unknownRelease = error.released;
          throw error;
        } finally {
          const releaseOperation = () => {
            permit?.release();
            operations--;
            releaseHeld();
          };
          if (unknownRelease) void unknownRelease.then(releaseOperation);
          else releaseOperation();
          signal.removeEventListener("abort", cancel);
          controller.signal.removeEventListener("abort", cancel);
        }
      },
      describe(assetId: string) {
        valid();
        const jpeg = views.get(assetId);
        if (!jpeg) throw Error("VISUAL_ASSET_UNAVAILABLE");
        return {
          sha256: createHash("sha256").update(jpeg).digest("hex"),
          byteLength: jpeg.length,
        };
      },
      dispose() {
        if (disposeRequested) return;
        disposeRequested = true;
        cancelTimer();
        controller.abort();
        releaseHeld();
      },
    };
    return api;
  }

  return {
    configureResources: governor.configureResources,
    reserveLocalWork(kind: 'index' | 'retrieval' | 'media', bytes: number, signal: AbortSignal, priority: AiWorkPriority = 'foreground') {
      if (!['index','retrieval','media'].includes(kind) || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > p.maxLocalBytes)
        return Promise.reject(Error('AI_LOCAL_WORK_BUDGET'))
      return acquire('combined',bytes,signal,0,priority)
    },
    resourceStatus() {const value=governor.resourceStatus();if(value.pressure)clearPreparedCache();return {...value,preparedCache:{bytes:cacheBytes(),entries:preparedCache.size,hits:cacheHits,misses:cacheMisses}}},
    releaseIdleMaterials: clearPreparedCache,
    /** Main-owned single-file query buffers. These are permission-bound input,
     * not reusable cache entries and never leave Host through this interface. */
    retainQueryMaterial(bytes:number) {
      if(!canAccept()||!Number.isSafeInteger(bytes)||bytes<1||bytes>p.maxJpegBytes||governor.inspect().materialBytes+bytes>p.maxLocalBytes)
        throw Error('RETRIEVAL_QUERY_MATERIAL_BUDGET')
      return governor.retainPreparedMaterial(bytes)
    },
    /** Eligibility only. Executors still acquire atomic permits and recheck authority. */
    canAdmitVision(
      { residentBytes = 0, computeBytes = 0, workerBytes = 0 }: {
        residentBytes?: number;
        computeBytes?: number;
        workerBytes?: number;
      } = {},
      includeExecutionSlots = true,
      afterReleasingOwner?: string,
    ) {
      if ([residentBytes, computeBytes, workerBytes].some(n => !Number.isSafeInteger(n) || n < 0)) return false;
      if (workerBytes > p.piWorkerBytes || computeBytes > 4 * 1024 ** 3) return false;
      const workBytes = Math.max(
        VISUAL_PREPARATION_BYTES,
        (p.serializationMultiplier + 1) * p.maxJpegBytes + p.responseBytes + workerBytes + computeBytes,
      );
      return canAccept() && governor.poolFits(residentBytes + workBytes, afterReleasingOwner) &&
        (!includeExecutionSlots || governor.canExecuteVision());
    },
    canAdmitOcr(bytes: number) {
      return Number.isSafeInteger(bytes) && bytes > 0 && bytes <= p.maxLocalBytes && canAccept() && governor.fits("ocr", bytes);
    },
    reserveManagedProbe(signal: AbortSignal) {
      return acquire(
        "combined",
        4 * 1048576 + p.responseBytes,
        signal,
        1024 ** 3,
      );
    },

    reserveResident: governor.reserveResident,
    canAdmitModel(cost: ModelResourceCost) {
      return Number.isSafeInteger(cost.ramBytes) && cost.ramBytes > 0 && canAccept() &&
        governor.poolFits(cost.ramBytes) && governor.gpuPoolFits(cost.gpuBytes)
    },
    reserveModel(owner: string, cost: ModelResourceCost, signal: AbortSignal) {
      return governor.reserveResident(owner, cost.ramBytes, signal, cost.gpuBytes)
    },
    reservePiProbe(signal: AbortSignal) {
      return acquire(
        "combined",
        p.piWorkerBytes + p.responseBytes + 4 * 1048576,
        signal,
      );
    },
    reserveOcr(
      bytes: number,
      signal: AbortSignal,
      priority: AiWorkPriority = "foreground",
    ) {
      if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > p.maxLocalBytes)
        return Promise.reject(Error("OCR_RESOURCE_BUDGET"));
      return acquire("ocr", bytes, signal, 0, priority);
    },
    open(
      owner: string,
      session: VisualSession,
      priority: AiWorkPriority = "foreground",
      binding?:PreparationBinding,
    ) {
      if (!canAccept()) throw Error("VISUAL_ADMISSION_SUSPENDED");
      if (leases.size >= p.maxReceipts) throw Error("VISUAL_ADMISSION_BUSY");
      if(binding&&!/^[a-f0-9]{64}$/.test(binding.modelBinding))throw Error('VISUAL_PREPARATION_BINDING_INVALID');
      const lease = makeLease(owner, session, priority,binding);
      leases.add(lease);
      return lease;
    },
    cancelOwner(owner: string) {
      for (const lease of leases) if (lease.owner === owner) lease.dispose();
    },

    hold(){clearPreparedCache();return governor.hold()},
    backupHold(){clearPreparedCache();return governor.backupHold()},
    suspend(){clearPreparedCache();governor.suspend()},
    resume: governor.resume,
    invalidate() { clearPreparedCache();governor.invalidate(); for (const lease of leases) lease.dispose(); },
    inspect() { const state = governor.inspect(); return {
      materialBytes: state.materialBytes, frozenBytes: frozen, preparing: state.preparing,
      requests: state.requests, tags: state.tags, receipts: leases.size,
      waiting: state.waiting, accepting: state.accepting,
    }; },
  };
}
export type VisualAdmission = ReturnType<typeof createVisualAdmission>;
export type VisualMaterialLease = ReturnType<VisualAdmission["open"]>;
