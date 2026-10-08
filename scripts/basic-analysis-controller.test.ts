import assert from "node:assert/strict";
import { test } from "node:test";
import { createBasicAnalysisController } from "../src/main/background-analysis/basic-analysis-controller";
import { createVisualAdmission } from "../src/main/visual-ai/visual-admission";

const scope = {
  libraryIdentity: "test-library",
  generation: "test-generation",
};
const backend = {
  id: "fixture",
  name: "Fixture",
  type: "openai-compatible",
  enabled: true,
  baseUrl: "http://127.0.0.1:1/v1",
  defaultModel: "fixture",
  timeoutMs: 1000,
  capabilities: { chat: true, vision: true },
};
const context = {
  schemaVersion: 14,
  assets: [
    {
      id: "asset",
      revision: "revision",
      thumbnailRef: "preview",
      title: "Generated",
    },
  ],
};
function controller(
  read = async () => context,
  settings = () => ({
    aiBackends: [backend],
    aiTaskModels: { analyze: { backendId: backend.id, model: backend.defaultModel } },
  }),
) {
  const admission = createVisualAdmission({
    memory: () => ({ free: 0, total: 32 * 1024 ** 3 }),
  });
  let sends = 0;
  const api = createBasicAnalysisController({
    host: {
      inspect: () => ({
        state: "ready",
        identity: scope.libraryIdentity,
        generation: scope.generation,
      }),
      readAssetContext: read,
      readVisualSession: async () => ({
        sessionToken: "session",
        leaseIdentity: "lease",
      }),
      beginBasicRequest: async () => {},
      readVisualPreview: async () => {
        throw Error("unexpected preview read");
      },
    } as any,
    admission,
    settings: () => settings() as any,
    provider: (async () => {
      sends++;
      throw Error("unexpected send");
    }) as any,
    tags: {} as any,
    ocr: {} as any,
    ocrRuntime: {} as any,
    upgrade: async () => {},
    changed: () => {},
  });
  return { api, admission, sends: () => sends };
}
const tick = () => new Promise<void>((r) => setImmediate(r));

await test("an unset or disabled default requires an explicit choice instead of falling back to cloud", async () => {
  const cloud = { ...backend, id: "cloud", baseUrl: "https://example.invalid/v1" };
  const missing = controller(undefined, () => ({ aiBackends: [cloud], aiTaskModels: {} }));
  await assert.rejects(missing.api.resolveRule("caption"), /MODEL_UNAVAILABLE/);
  assert.equal(missing.sends(), 0);
  const revoked = controller(undefined, () => ({
    aiBackends: [{ ...backend, enabled: false }, cloud],
    aiTaskModels: { analyze: { backendId: backend.id, model: backend.defaultModel } },
  }));
  await assert.rejects(revoked.api.resolveRule("caption"), /MODEL_UNAVAILABLE/);
  const chosen = await revoked.api.resolveRule("caption", cloud.id, cloud.defaultModel);
  assert.equal(chosen.backendId, cloud.id);
  assert.equal(chosen.location, "external");
  assert.equal(revoked.sends(), 0);
});

await test("closing an owner during asynchronous review never recreates its discarded plan", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
      release = r;
    }),
    f = controller(async () => {
      await gate;
      return context;
    });
  const prepare = f.api.prepare("card", {
    ...scope,
    assetIds: ["asset"],
    capabilities: ["caption"],
  });
  f.api.cancelOwner("card");
  release();
  await assert.rejects(prepare, /SCOPE_EXPIRED/);
  assert.equal(f.admission.inspect().receipts, 0);
});

await test("caption cancellation interrupts preparation waiting on memory without sending or leaking a receipt", async () => {
  const f = controller(),
    review = await f.api.prepare("main", {
      ...scope,
      assetIds: ["asset"],
      capabilities: ["caption"],
    }),
    job = await f.api.run("main", review.receipt);
  for (let n = 0; n < 20 && f.admission.inspect().waiting === 0; n++)
    await tick();
  assert.equal(f.admission.inspect().waiting, 1);
  f.api.cancel("main", job.id);
  await f.api.suspendAndDrain();
  assert.equal(f.sends(), 0);
  assert.equal(f.admission.inspect().waiting, 0);
  assert.equal(f.admission.inspect().receipts, 0);
  assert.equal(f.api.inspect("main", job.id).state, "cancelled");
});
