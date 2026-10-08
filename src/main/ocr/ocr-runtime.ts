import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import type Database from "better-sqlite3";
import { runLocalOcr, OcrProcessUnconfirmedError } from "./local-ocr-process";
import type { OcrObservation } from "../../shared/contracts/asset-ocr.contract";
import { ocrText } from "../../shared/contracts/asset-ocr.contract";
import {
  OCR_HOST_RESERVE_BYTES,
  OCR_WORKER_RESERVE_BYTES,
} from "./ocr-controller";
import { bindPythonDependencies } from "../services/ai-runtime/python-environment-binding";
export interface OcrRuntimeQualification {
  runtimeFingerprint: string;
  evidenceId: string;
  measuredPeakRamBytes: number;
  testedAt: string;
  inputEnvelope?: { maxSide: number; threads: number };
  envelope: {
    ownership: "host-owned";
    verified: true;
    peakRamBytes: number;
    accelerator: "cpu";
    lightOnBattery: boolean;
  };
}
export interface OcrRuntimeHandle {
  label: string;
  fingerprint: string;
  qualification?: OcrRuntimeQualification;
  run(preview: Uint8Array, signal: AbortSignal): Promise<OcrObservation>;
}
export interface OcrRuntime {
  current(): Promise<OcrRuntimeHandle | null>;
  configure(signal?: AbortSignal): Promise<void>;
  deactivate?(): Promise<void>;
  unavailabilityReason?(): string;
  suspendAndDrain?(): Promise<void>;
  resume?(): void;
}
/** A selected environment is app-owned configuration; every new Main verifies real execution again. */
export function createOcrRuntime(deps: {
  database: Database.Database;
  runner: string;
  selectRoot(): Promise<string | null>;
  reserve?: (
    bytes: number,
    signal: AbortSignal,
  ) => Promise<{ release(): void }>;
}): OcrRuntime {
  deps.database.exec(
    "CREATE TABLE IF NOT EXISTS local_ocr_runtime(singleton INTEGER PRIMARY KEY CHECK(singleton=1),root TEXT NOT NULL); CREATE TABLE IF NOT EXISTS local_ocr_qualification(fingerprint TEXT PRIMARY KEY,qualification TEXT NOT NULL); CREATE TABLE IF NOT EXISTS local_ocr_enabled(singleton INTEGER PRIMARY KEY CHECK(singleton=1),enabled INTEGER NOT NULL)",
  );
  const checked = new Map<string, OcrRuntimeQualification>(),
    validating = new Map<string, Promise<OcrRuntimeQualification>>();
  const automaticChecks = new Map<string, AbortController>();
  const pendingReleases = new Set<Promise<void>>();
  let automaticSuspended = false;
  let reading: { root: string; task: Promise<Awaited<ReturnType<typeof read>>> } | undefined;
  let lastFailure = "";
  const read = async (root: string) => {
    const real = await fs.realpath(root),
      manifest = await fs.readFile(path.join(real, "ocr-runtime.json"), "utf8");
    if (manifest.length > 16000) throw Error("OCR_RUNTIME_INVALID");
    const config = JSON.parse(manifest),
      relative =
        process.platform === "win32"
          ? "runtime/Scripts/python.exe"
          : "runtime/bin/python3";
    if (
      config.schema !== 1 ||
      config.engine !== "rapidocr-onnxruntime" ||
      config.version !== "1.4.4" ||
      config.platform !== process.platform ||
      config.arch !== process.arch ||
      config.pythonRelative !== relative ||
      !config.modelSha256 ||
      !["det", "cls", "rec"].every((k) =>
        /^[a-f0-9]{64}$/.test(config.modelSha256[k]),
      )
    )
      throw Error("OCR_RUNTIME_INVALID");
    const python = path.join(real, relative),
      digest = createHash("sha256")
        .update(real + "\n" + manifest)
        .update(await fs.readFile(python))
        .update(await fs.readFile(deps.runner));
    const packages =
      process.platform === "win32"
        ? path.join(real, "runtime/Lib/site-packages")
        : path.join(real, "runtime/lib/python3.11/site-packages");
    const names = {
      det: "ch_PP-OCRv4_det_infer.onnx",
      cls: "ch_ppocr_mobile_v2.0_cls_infer.onnx",
      rec: "ch_PP-OCRv4_rec_infer.onnx",
    };
    for (const [role, name] of Object.entries(names)) {
      const bytes = await fs.readFile(
        path.join(packages, "rapidocr_onnxruntime/models", name),
      );
      if (
        createHash("sha256").update(bytes).digest("hex") !==
        config.modelSha256[role]
      )
        throw Error("OCR_MODEL_CHANGED");
      digest.update(bytes);
    }
    await bindPythonDependencies(python, digest, [
      "rapidocr_onnxruntime-",
      "onnxruntime-",
      "numpy-",
      "pillow-",
      "opencv_",
      "psutil-",
    ]);
    const fingerprint = digest.digest("hex");
    const run = async (preview: Uint8Array, signal: AbortSignal) =>
      runLocalOcr({
        python,
        runner: deps.runner,
        preview,
        signal,
        modelSha256: config.modelSha256,
        measured: (peak) => {
          if (peak > OCR_WORKER_RESERVE_BYTES)
            throw Error("OCR_RESOURCE_ESTIMATE_EXCEEDED");
        },
      });
    return {
      real,
      python,
      config,
      handle: {
        label: "RapidOCR · 本地 CPU · 中文/英文",
        fingerprint,
        run,
      } as OcrRuntimeHandle,
    };
  };
  async function verify(
    value: Awaited<ReturnType<typeof read>>,
    signal: AbortSignal,
  ) {
    const fingerprint = value.handle.fingerprint,
      prior = checked.get(fingerprint);
    if (prior) return prior;
    const pending = validating.get(fingerprint);
    if (pending) return pending;
    const task = (async () => {
      if (!deps.reserve) throw Error("OCR_RESOURCE_ADMISSION_REQUIRED");
      const permit = await deps.reserve(OCR_HOST_RESERVE_BYTES, signal);
      let measuredPeak = 0,
        unknown = false;
      try {
        const challenge = await sharp(
            Buffer.from(
              '<svg width="640" height="160" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="160" fill="white"/><text x="30" y="105" font-family="Arial" font-size="60" fill="black">DAM OCR 2026</text></svg>',
            ),
          )
            .png()
            .toBuffer(),
          blank = await sharp({
            create: {
              width: 640,
              height: 160,
              channels: 3,
              background: "#ffffff",
            },
          })
            .png()
            .toBuffer();
        const large = await sharp({
          create: {
            width: 1600,
            height: 1600,
            channels: 3,
            background: "#ffffff",
          },
        })
          .composite(
            Array.from({ length: 9 }, (_, i) => ({
              input: challenge,
              left: 120,
              top: 20 + i * 170,
            })),
          )
          .png()
          .toBuffer();
        const results: OcrObservation[] = [],
          run = (preview: Uint8Array) =>
            runLocalOcr({
              python: value.python,
              runner: deps.runner,
              preview,
              signal,
              modelSha256: value.config.modelSha256,
              measured: (peak) => {
                measuredPeak = Math.max(peak, measuredPeak);
              },
            });
        const text = await run(challenge);
        results.push(text);
        if (!ocrText(text).replace(/\W/g, "").includes("DAMOCR2026"))
          throw Error("OCR_CAPABILITY_FAILED");
        const empty = await run(blank);
        results.push(empty);
        if (empty.blocks.length) throw Error("OCR_CAPABILITY_FAILED");
        const maximum = await run(large);
        results.push(maximum);
        if (!ocrText(maximum).replace(/\W/g, "").includes("DAMOCR2026"))
          throw Error("OCR_CAPABILITY_FAILED");
        if (measuredPeak * 1.25 > OCR_WORKER_RESERVE_BYTES)
          throw Error("OCR_RESOURCE_ESTIMATE_EXCEEDED");
        const q: OcrRuntimeQualification = {
          runtimeFingerprint: fingerprint,
          evidenceId: createHash("sha256")
            .update(challenge)
            .update(large)
            .update(JSON.stringify([results, measuredPeak]))
            .digest("hex"),
          measuredPeakRamBytes: measuredPeak,
          testedAt: new Date().toISOString(),
          inputEnvelope: { maxSide: 1600, threads: 2 },
          envelope: {
            ownership: "host-owned",
            verified: true,
            peakRamBytes: OCR_HOST_RESERVE_BYTES,
            accelerator: "cpu",
            lightOnBattery: false,
          },
        };
        checked.set(fingerprint, q);
        deps.database
          .prepare("INSERT OR REPLACE INTO local_ocr_qualification VALUES(?,?)")
          .run(fingerprint, JSON.stringify(q));
        return q;
      } catch (e) {
        if (e instanceof OcrProcessUnconfirmedError) {
          unknown = true;
          const released = e.released.then(() => permit.release());
          pendingReleases.add(released);
          void released.then(() => pendingReleases.delete(released));
        }
        throw e;
      } finally {
        if (!unknown) permit.release();
      }
    })();
    validating.set(fingerprint, task);
    try {
      return await task;
    } finally {
      validating.delete(fingerprint);
    }
  }
  return {
    current: async () => {
      const c = deps.database
          .prepare("SELECT root FROM local_ocr_runtime WHERE singleton=1")
          .get() as { root: string } | undefined,
        enabled = deps.database
          .prepare("SELECT enabled FROM local_ocr_enabled WHERE singleton=1")
          .pluck()
          .get();
      if (!c || enabled === 0) return null;
      if (automaticSuspended) return null;
      try {
        // Share file verification, but never hold a read-only browser request
        // while qualification waits for a resource permit or real inference.
        if (!reading || reading.root !== c.root) {
          const task = read(c.root);
          reading = { root: c.root, task };
          void task.finally(() => { if (reading?.task === task) reading = undefined; }).catch(() => {});
        }
        const value = await reading.task, fingerprint = value.handle.fingerprint;
        if (automaticSuspended) return null;
        const qualification = checked.get(fingerprint);
        if (qualification) return { ...value.handle, qualification };
        if (!validating.has(fingerprint)) {
          const abort = new AbortController();
          automaticChecks.set(fingerprint, abort);
          const timer = setTimeout(() => abort.abort(), 120000);
          lastFailure = "";
          void verify(value, abort.signal).catch(error => {
            lastFailure = error instanceof Error ? error.message : "OCR_RUNTIME_UNAVAILABLE";
          }).finally(() => { clearTimeout(timer); automaticChecks.delete(fingerprint); });
        }
        return null;
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : "OCR_RUNTIME_UNAVAILABLE";
        return null;
      }
    },
    configure: async (signal = AbortSignal.timeout(120000)) => {
      if (automaticSuspended) throw Error("OCR_BUSY");
      const root = await deps.selectRoot();
      if (!root) return;
      signal.throwIfAborted();
      const value = await read(root);
      checked.delete(value.handle.fingerprint);
      await verify(value, signal);
      signal.throwIfAborted();
      deps.database.transaction(() => {
        deps.database
          .prepare(
            "INSERT INTO local_ocr_runtime VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET root=excluded.root",
          )
          .run(value.real);
        deps.database
          .prepare(
            "INSERT INTO local_ocr_enabled VALUES(1,1) ON CONFLICT(singleton) DO UPDATE SET enabled=1",
          )
          .run();
      })();
    },
    deactivate: async () => {
      deps.database
        .prepare(
          "INSERT INTO local_ocr_enabled VALUES(1,0) ON CONFLICT(singleton) DO UPDATE SET enabled=0",
        )
        .run();
      checked.clear();
      for (const abort of automaticChecks.values()) abort.abort();
    },
    async suspendAndDrain() {
      automaticSuspended = true;
      for (const abort of automaticChecks.values()) abort.abort();
      await Promise.allSettled([...validating.values()]);
      await Promise.all([...pendingReleases]);
    },
    resume: () => { if (!validating.size && !pendingReleases.size) automaticSuspended = false; },
    unavailabilityReason: () => validating.size
      ? "正在真实复核本地 OCR，等待共享资源或识别挑战完成。"
      : lastFailure === "OCR_MODEL_CHANGED"
        ? "OCR 模型文件已变化，请重新选择并验证。"
        : lastFailure
          ? "本地 OCR 复核尚未完成，请检查环境与资源预算后重试。"
          : "尚未选择或已停用本地 OCR 环境",
  };
}
