import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import Database from "better-sqlite3";
import { createActiveLibraryHost } from "../src/main/library-lifecycle";
import { createProductionActiveLibraryHostDependencies } from "../src/main/library-lifecycle/production-active-library-dependencies";
import type { BasicRequest } from "../src/shared/contracts/basic-analysis.contract";
import type { OcrObservation } from "../src/shared/contracts/asset-ocr.contract";
import { BASIC_CAPABILITIES } from "../src/shared/contracts/background-analysis.contract";
import { assertLibraryDataSchema } from "../src/main/library-lifecycle/library-materialization.internal";
import { readLibraryManifestDeclaration } from "../src/main/library-lifecycle/library-manifest.tracer";
import type { TagIntentTestHooks } from "../src/main/independent-tags/tag-intent-backup";
import { createBasicAnalysisController } from "../src/main/background-analysis/basic-analysis-controller";
import { createBackgroundAnalysisController } from "../src/main/background-analysis/background-analysis-controller";
import { createTagExecutionController } from "../src/main/independent-tags/tag-execution-controller";
import { createOcrController } from "../src/main/ocr/ocr-controller";
import type { OcrRuntime } from "../src/main/ocr/ocr-runtime";
import { createVisualAdmission } from "../src/main/visual-ai/visual-admission";
import type { VisionProvider } from "../src/main/visual-ai/openai-vision.provider";
import {ConfirmedLocalOomError} from '../src/main/visual-ai/local-oom-recovery'
import { createNewInstallAppSettingsDefaults } from "../src/main/services/settings/settings-defaults.builder";
async function fixture(upgrade = true) {
  const hooks: TagIntentTestHooks = {};
  const root = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "dam-basic-")),
    ),
    library = path.join(root, "library"),
    source = path.join(root, "generated.png");
  await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#abc" },
  })
    .png()
    .toFile(source);
  const host = createActiveLibraryHost(
      { ...createProductionActiveLibraryHostDependencies({
        selectLibraryDirectory: async () => ({
          kind: "selected",
          directory: library,
        }),
        selectLocalFiles: async () => ({
          kind: "selected",
          files: [{ filePath: source }],
        }),
      }), tagIntentTestHooks: hooks },
    ),
    create = await host.prepareCreate();
  if (create.kind !== "planned") throw Error("fixture");
  await host.confirmCreate(create.plan.receipt);
  const a = host.inspect(),
    scope = { libraryIdentity: a.identity!, generation: a.generation! },
    add = async () => {
      const p = await host.prepareAddAssets();
      if (p.kind !== "planned") throw Error("fixture");
      const added = await host.dispatchAddAssets(p.plan.receipt);
      return added.items[0].promotion!.designAssetIdentity;
    };
  const id = await add(),
    session = await host.readVisualSession(scope);
  if (upgrade) await host.enableBasicAnalysis({
    ...scope,
    sessionToken: session.sessionToken,
    expectedSchemaVersion: 1,
    allowUpgrade: true,
  });
  const asset = (await host.readAssetContext([id])).assets[0];
  const request = (requestId: string): BasicRequest => ({
    ...scope,
    assetId: id,
    sessionToken: session.sessionToken,
    requestId,
    capability: "caption",
    assetRevision: asset.revision,
    previewGeneration: asset.thumbnailRef,
    backendId: "generated-test",
    model: "test-model",
    bindingSha256: "a".repeat(64),
    recipe: "caption-v1",
    location: "local",
  });
  return {
    root,
    library,
    host,
    scope,
    id,
    request,
    add,
    session,
    hooks,
    close: async () => {
      await host.close();
      assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep));
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}

// Simulated inference only; dispatch, input validation, transactions and recovery
// below are the actual production controllers and SQLite Host.
async function productionDispatch(f: Awaited<ReturnType<typeof fixture>>, provider: VisionProvider, options: { resourceReadiness?: (rule: any) => {ready:boolean;reason:string} | undefined } = {}) {
  const settings = createNewInstallAppSettingsDefaults();
  settings.aiBackends = [{ id: "generated-test", name: "Generated test service", type: "openai-compatible", enabled: true, baseUrl: "http://127.0.0.1:1/v1", defaultModel: "test-model", timeoutMs: 5000, priority: 1, capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: false, modelManagement: false } }];
  settings.aiTaskModels = { tags: { backendId: "generated-test", model: "test-model" }, analyze: { backendId: "generated-test", model: "test-model" } };
  const admission = createVisualAdmission({ memory: () => ({ free: 16 * 1024 ** 3, total: 32 * 1024 ** 3 }) });
  const legacy = { suspendAndDrain: async () => {}, resume() {} };
  const changed = () => { throw Error("controlled notification loss"); };
  let ocrCalls = 0;
  const ocrRuntime: OcrRuntime = {
    configure: async () => {},
    current: async () => ({
      label: "Generated OCR fixture", fingerprint: "a".repeat(64),
      qualification: { runtimeFingerprint: "a".repeat(64), evidenceId: "generated-module-test-only", measuredPeakRamBytes: 1024, testedAt: new Date().toISOString(), envelope: { ownership: "host-owned", verified: true, peakRamBytes: 1024, accelerator: "cpu", lightOnBattery: true } },
      run: async (preview, signal) => {
        signal.throwIfAborted(); ocrCalls++;
        const { width, height } = await sharp(preview).metadata();
        return { engine: "rapidocr-onnxruntime", version: "1.4.4", recipe: "rapidocr-preview-v1", modelSha256: { det: "a".repeat(64), cls: "b".repeat(64), rec: "c".repeat(64) }, width: width!, height: height!, elapsedMs: 1, threshold: .5, blocks: [] };
      },
    }),
  };
  const tags = createTagExecutionController({ host: f.host, settings: () => settings, admission, legacy, provider, changed });
  const ocr = createOcrController({ host: f.host, runtime: ocrRuntime, changed, reserve: (bytes, signal, priority) => admission.reserveOcr(bytes, signal, priority) });
  const basic = createBasicAnalysisController({ host: f.host, settings: () => settings, admission, provider, tags, ocr, ocrRuntime, resourceReadiness: options.resourceReadiness, changed, upgrade: async () => { throw Error("unexpected upgrade after fixture v14"); } });
  const errors: string[] = [], runBackground = basic.runBackground.bind(basic);
  basic.runBackground = async (claim, signal) => { try { await runBackground(claim, signal); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); throw error; } };
  const before = await f.host.readBackgroundAnalysis(f.scope);
  await f.host.configureBackgroundExecution({ ...f.scope, sessionToken: before.sessionToken, expectedRevision: 0, expectedPlanRevision: before.policy.revision, allowUpgrade: false, policy: { enabled: true, dailyCallLimit: 24, rules: await Promise.all(BASIC_CAPABILITIES.map(c => basic.resolveRule(c))) } });
  const background = createBackgroundAnalysisController({ host: f.host, admission, basic, visuals: legacy, holdOcr: () => ocr.holdForMaintenance(), telemetry: () => ({ memory: { kind: "unknown" }, battery: { kind: "unknown" }, lowPower: { kind: "unknown" }, thermal: { kind: "unknown" }, idle: { kind: "unknown" }, visible: { kind: "unknown" }, gpuFree: { kind: "unknown" } }) });
  return { basic, background, errors, ocrCalls: () => ocrCalls, close: async () => { await background.suspendAndDrain(); background.invalidate(); await basic.suspendAndDrain(); await tags.suspendAndDrain(); await ocr.suspendAndDrain(); admission.invalidate(); } };
}
const response = (value: unknown) => ({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }] });
await test('production caption and tag Host checks allow one definite uncommitted local OOM recovery and persist one effect each',async()=>{
 const f=await fixture(),counts=new Map<string,number>();let recoveries=0
 const c=await productionDispatch(f,{invokeOnce:async input=>{const key=input.outputContract!,count=(counts.get(key)??0)+1;counts.set(key,count)
   if(count===1)throw new ConfirmedLocalOomError({id:key,backendId:input.backendId!,model:input.model,executionId:'owned-fixture',fingerprint:'a'.repeat(64)})
   return response(key==='caption-v1'?{caption:'恢复后有效描述'}:{tags:['恢复后有效标签']})},recoverLocal:async()=>{recoveries++;return true}})
 try{const id=await f.add();for(let n=0;n<3;n++)await c.background.tick()
   const execution=await f.host.readBackgroundExecution({...f.scope,assetId:id})
   assert.ok(execution.items.every(v=>v.state==='succeeded'),JSON.stringify(execution.items.map(v=>[v.capability,v.state])))
   assert.equal(recoveries,2);assert.equal(counts.get('caption-v1'),2);assert.equal(counts.get('tags-nfkc-lower-v1'),2)
   assert.equal((await f.host.readCaptions({...f.scope,assetId:id})).length,1)
   await c.close();await f.host.close();await f.host.reopen();assert.equal((await f.host.readCaptions({...f.scope,assetId:id})).length,1);assert.equal(recoveries,2)
 }finally{await c.close();await f.close()}
})

await test("unavailable model resources do not create repeated claims, requests or attempts while OCR remains runnable", async () => {
  const f = await fixture();
  let prepares = 0, sends = 0, available = false;
  const c = await productionDispatch(f, {
    prepare: async () => { prepares++; if (!available) throw Error('AI_MEMORY_WAIT'); },
    invokeOnce: async input => { sends++; return response(input.systemPrompt.includes('{"tags"') ? {tags:['色块']} : {caption:'资源恢复后的描述'}); },
  }, { resourceReadiness: rule => rule.capability === 'ocr' || available ? undefined : {ready:false,reason:'模型加载及计算正在等待内存'} });
  try {
    const id = await f.add();
    for (let n = 0; n < 10; n++) await c.background.tick();
    const waiting = await f.host.readBackgroundExecution({...f.scope,assetId:id});
    assert.deepEqual(waiting.items.map(i=>[i.capability,i.state]), [['ocr','succeeded']]);
    assert.equal(prepares,0,'no runtime preparation while its full resource envelope is unavailable');
    assert.equal(sends,0); assert.equal(c.ocrCalls(),1);
    assert.equal((await f.host.readTagIntents({...f.scope,assetId:id})).requests.length,0);
    assert.equal((await f.host.readCaptions({...f.scope,assetId:id})).length,0);
    available = true;
    for (let n = 0; n < 3; n++) await c.background.tick();
    const resumed = await f.host.readBackgroundExecution({...f.scope,assetId:id});
    assert.ok(resumed.items.every(i=>i.state==='succeeded'&&i.attemptEpoch===1));
    assert.equal(c.ocrCalls(),1); assert.equal(sends,2);
  } finally { await c.close(); await f.close(); }
});

await test("production background loop commits all three capabilities through strict executors and replays notifications without inference", async () => {
  const f = await fixture();
  let calls = 0;
  const c = await productionDispatch(f, { invokeOnce: async input => { calls++; return response(input.systemPrompt.includes('{"tags"') ? { tags: ["测试色块"] } : { caption: "模块测试色块" }); } });
  try {
    assert.equal((await f.host.readBackgroundAnalysis(f.scope)).intents.length, 0, "no historical backfill");
    const id = await f.add();
    for (let n = 0; n < 3; n++) await c.background.tick();
    const result = await f.host.readBackgroundExecution(f.scope);
    assert.deepEqual(result.items.map(i => [i.capability, i.state]).sort(), [["caption", "succeeded"], ["ocr", "succeeded"], ["tags", "succeeded"]], JSON.stringify(c.errors));
    assert.deepEqual((await f.host.readTagExecution({ ...f.scope, assetId: id })).current!.tags, ["测试色块"]);
    assert.equal((await f.host.listAssets()).find(a => a.id === id)!.aiCaption, "模块测试色块");
    assert.equal((await f.host.listAssets()).find(a => a.id === id)!.aiCaptionSource, "AI · test-model · 本机");
    assert.ok((await f.host.listAssets()).find(a => a.id === id)!.aiCaptionUpdatedAt);
    assert.deepEqual((await f.host.readOcr({ ...f.scope, assetId: id })).evidence!.observation.blocks, []);
    const session = await f.host.readVisualSession(f.scope), outbox = await f.host.readTagOutbox({ ...f.scope, sessionToken: session.sessionToken });
    assert.equal(outbox.length, 3, "lost UI notifications leave durable receipts");
    for (const event of outbox) { await f.host.ackTagOutbox({ ...f.scope, sessionToken: session.sessionToken }, event.eventId); await f.host.ackTagOutbox({ ...f.scope, sessionToken: session.sessionToken }, event.eventId); }
    await c.background.suspendAndDrain();
    await f.host.close(); await f.host.reopen();
    c.background.resume(); await c.background.tick();
    assert.equal(calls, 2); assert.equal(c.ocrCalls(), 1);
    const reopened = await f.host.readBackgroundExecution(f.scope);
    assert.ok(reopened.items.every(i => i.state === "succeeded" && i.effectId));
    assert.equal((await f.host.readTagOutbox({ ...f.scope, sessionToken: (await f.host.readVisualSession(f.scope)).sessionToken })).length, 0);
  } finally { await c.close(); await f.close(); }
});

await test("caption retry usage includes both physical calls and survives transactional background receipt and reopening", async () => {
  const f = await fixture();
  let calls = 0;
  const c = await productionDispatch(f, { invokeOnce: async input => {
    if (input.systemPrompt.includes('{"tags"')) return response({ tags: ["色块"] });
    calls++;
    return calls === 1
      ? { choices: [{ finish_reason: "length", message: { content: '{"caption":"不完整' } }], piUsage: { inputTokens: 120, outputTokens: 17, costEstimateUsd: null, source: "unpriced" } }
      : { ...response({ caption: "已完成的独立描述" }), piUsage: { inputTokens: 131, outputTokens: 23, costEstimateUsd: null, source: "unpriced" } };
  } });
  try {
    const id = await f.add();
    for (let n = 0; n < 3; n++) await c.background.tick();
    const result = (await f.host.readCaptions({ ...f.scope, assetId: id }))[0];
    assert.equal(result.caption, "已完成的独立描述");
    assert.equal(result.physicalCalls, 2);
    assert.deepEqual(result.usage, { inputTokens: 251, outputTokens: 40, costEstimateUsd: null, source: "unpriced" });
    await c.background.suspendAndDrain();
    await f.host.close(); await f.host.reopen();
    c.background.resume(); await c.background.tick();
    assert.deepEqual((await f.host.readCaptions({ ...f.scope, assetId: id }))[0], result);
    assert.equal(calls, 2, "readback must not infer again");
    assert.ok((await f.host.readBackgroundExecution(f.scope)).items.every(i => i.state === "succeeded"));
  } finally { await c.close(); await f.close(); }
});

await test("invalid caption usage cannot commit a forged successful receipt", async () => {
  const f = await fixture();
  try {
    const claim = await f.host.claimBasicAnalysis({ ...f.request("invalid-usage"), inputSha256: "b".repeat(64) });
    await f.host.markBasicAnalysisSent(claim);
    await assert.rejects(f.host.commitCaption(claim, { caption: "不可提交", usage: { inputTokens: -1, outputTokens: 2, costEstimateUsd: null, source: "unpriced" } }), /CAPTION_OUTPUT_INVALID/);
    assert.equal((await f.host.readCaptions({ ...f.scope, assetId: f.id })).length, 0);
    assert.equal((await f.host.readBasicAttempts({ ...f.scope, assetId: f.id })).items[0].state, "sent");
  } finally { await f.close(); }
});

await test("production dispatch honors pause, preserves other capabilities on failure, and retries with a new audited attempt", async () => {
  const f = await fixture();
  let failCaption = true, tagCalls = 0, captionCalls = 0;
  const c = await productionDispatch(f, { invokeOnce: async input => { if (input.systemPrompt.includes('{"tags"')) { tagCalls++; return response({ tags: ["蓝色"] }); } captionCalls++; return response(failCaption ? { caption: "", tags: ["invalid extra field"] } : { caption: "重试已保存" }); } });
  try {
    const id = await f.add(), initial = await f.host.readBackgroundAnalysis({ ...f.scope, assetId: id }), tag = initial.intents.find(i => i.capability === "tags")!;
    const decision = { ...f.scope, assetId: id, sessionToken: initial.sessionToken, id: tag.id, expectedRevision: tag.revision };
    await c.background.change("main", { ...decision, action: "pause" });
    await c.background.tick(); await c.background.tick();
    const partial = await f.host.readBackgroundExecution(f.scope);
    assert.equal(partial.items.find(i => i.capability === "caption")!.state, "failed");
    assert.equal(partial.items.find(i => i.capability === "ocr")!.state, "succeeded");
    assert.equal(tagCalls, 0);
    const paused = (await f.host.readBackgroundAnalysis({ ...f.scope, assetId: id })).intents.find(i => i.id === tag.id)!;
    await c.background.change("main", { ...decision, expectedRevision: paused.revision, action: "resume" });
    await c.background.tick();
    const failed = partial.items.find(i => i.capability === "caption")!;
    failCaption = false;
    await c.background.recover("main", { ...f.scope, sessionToken: initial.sessionToken, intentId: failed.intentId, attemptId: failed.attemptId, action: "rerun" });
    await c.background.tick();
    const final = await f.host.readBackgroundExecution(f.scope);
    assert.ok(final.items.every(i => i.state === "succeeded"), JSON.stringify(await f.host.readBasicAttempts({ ...f.scope, assetId: id })));
    assert.equal(final.items.find(i => i.capability === "caption")!.attemptEpoch, 2);
    assert.equal(final.history!.find(i => i.attemptId === failed.attemptId)!.state, "failed");
    assert.equal(tagCalls, 1); assert.equal(captionCalls, 2); assert.equal(c.ocrCalls(), 1);
  } finally { await c.close(); await f.close(); }
});

await test("production suspension of a sent request preserves uncertainty across reopening and never automatically resends it", async () => {
  const f = await fixture();
  let calls = 0, entered!: () => void;
  const sent = new Promise<void>(resolve => { entered = resolve; });
  const c = await productionDispatch(f, { invokeOnce: async input => { calls++; entered(); return new Promise((_, reject) => { const abort = () => reject(input.signal.reason ?? Error("cancelled")); input.signal.addEventListener("abort", abort, { once: true }); if (input.signal.aborted) abort(); }); } });
  try {
    await f.add();
    const running = c.background.tick(); await sent;
    await c.background.suspendAndDrain(); await running;
    const interrupted = (await f.host.readBackgroundExecution(f.scope)).items[0];
    assert.equal(interrupted.state, "unknown");
    await f.host.close(); await f.host.reopen();
    const session = await f.host.readVisualSession(f.scope);
    await c.background.recover("main", { ...f.scope, sessionToken: session.sessionToken, intentId: interrupted.intentId, attemptId: interrupted.attemptId, action: "keep" });
    // Other work is paused so this tests only the interrupted logical task.
    const intents = (await f.host.readBackgroundAnalysis({ ...f.scope, assetId: interrupted.assetId })).intents;
    for (const i of intents.filter(i => i.id !== interrupted.intentId)) await c.background.change("main", { ...f.scope, assetId: interrupted.assetId, sessionToken: session.sessionToken, id: i.id, expectedRevision: i.revision, action: "pause" });
    c.background.resume(); await c.background.tick();
    assert.equal(calls, 1);
    const kept = (await f.host.readBackgroundExecution(f.scope)).items.find(i => i.intentId === interrupted.intentId)!;
    assert.equal(kept.state, "unknown"); assert.equal(kept.attemptId, interrupted.attemptId);
  } finally { await c.close(); await f.close(); }
});
for (const cut of ['afterDdl', 'beforeCommit', 'afterCommit'] as const) await test(`v14 ${cut} interruption never reports a partial upgrade`, async () => {
  const f = await fixture(false);
  try {
    await f.host.updateAssetCaption(f.id, '人工字段保持');
    f.hooks[cut] = () => { throw Error('controlled v14 interruption'); };
    await assert.rejects(f.host.enableBasicAnalysis({ ...f.scope, sessionToken: f.session.sessionToken, expectedSchemaVersion: 1, allowUpgrade: true }));
    assert.equal((await f.host.readAssetContext([])).schemaVersion, cut === 'afterCommit' ? 14 : 1);
    assert.equal((await f.host.listAssets())[0].aiCaption, '人工字段保持');
    delete f.hooks[cut];
    await f.host.close();
    await f.host.reopen();
    assert.equal((await f.host.listAssets())[0].aiCaption, '人工字段保持');
  } finally { delete f.hooks[cut]; await f.close(); }
});
await test("v14 backup migration, late caption fencing, failed newer request and manual priority survive reopening", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.host.readAssetContext([])).schemaVersion, 14);
    const db = new Database(path.join(f.library, ".dam/library.sqlite"), {
      readonly: true,
    });
    try {
      assertLibraryDataSchema(db);
      assert.equal(db.pragma("foreign_key_check").length, 0);
    } finally {
      db.close();
    }
    const old = f.request("old"),
      newer = f.request("new");
    await f.host.beginBasicRequest(old);
    const claim = await f.host.claimBasicAnalysis({
      ...old,
      inputSha256: "b".repeat(64),
    });
    await f.host.markBasicAnalysisSent(claim);
    await f.host.beginBasicRequest(newer);
    const failed = await f.host.claimBasicAnalysis({
      ...newer,
      inputSha256: "c".repeat(64),
    });
    await f.host.finishBasicAnalysis(failed, "failed");
    const result = await f.host.commitCaption(claim, "旧响应");
    assert.equal(result.historicalOnly, true);
    assert.equal((await f.host.listAssets())[0].aiCaption, "");
    await f.host.updateAssetCaption(f.id, "人工描述");
    const latest = f.request("latest");
    await f.host.beginBasicRequest(latest);
    const c = await f.host.claimBasicAnalysis({
      ...latest,
      inputSha256: "d".repeat(64),
    });
    await f.host.markBasicAnalysisSent(c);
    await f.host.commitCaption(c, "当前AI描述");
    assert.equal((await f.host.listAssets())[0].aiCaption, "人工描述");
    assert.equal(
      (await f.host.readCaptions({ ...f.scope, assetId: f.id }))[0].caption,
      "当前AI描述",
    );
    const events = await f.host.readTagOutbox({
      ...f.scope,
      sessionToken: f.session.sessionToken,
    });
    assert.equal(events.length, 2);
    await f.host.ackTagOutbox(
      { ...f.scope, sessionToken: f.session.sessionToken },
      events[0].eventId,
    );
    await f.host.close();
    await f.host.reopen();
    assert.equal((await f.host.listAssets())[0].aiCaption, "人工描述");
    assert.equal(
      (await f.host.readCaptions({ ...f.scope, assetId: f.id })).length,
      2,
    );
    const nextSession = await f.host.readVisualSession(f.scope);
    assert.notEqual(nextSession.sessionToken, f.session.sessionToken);
    assert.equal(
      (
        await f.host.readTagOutbox({
          ...f.scope,
          sessionToken: nextSession.sessionToken,
        })
      ).length,
      1,
    );
    await assert.rejects(
      f.host.claimBasicAnalysis({
        ...f.request("stale"),
        inputSha256: "e".repeat(64),
      }),
    );
  } finally {
    await f.close();
  }
});
await test("background request, sent, effect receipt, daily reservations and explicit unknown recovery share the Host transaction", async () => {
  const f = await fixture();
  try {
    const initial = await f.host.readBackgroundAnalysis(f.scope),
      rules = BASIC_CAPABILITIES.map((capability) => ({
        capability,
        enabled: capability === "caption",
        backendId: "generated-test",
        model: "test-model",
        bindingSha256: "a".repeat(64),
        recipe: "caption-v1",
        location: "external" as const,
      }));
    await f.host.configureBackgroundExecution({
      ...f.scope,
      sessionToken: f.session.sessionToken,
      expectedRevision: 0,
      expectedPlanRevision: initial.policy.revision,
      allowUpgrade: false,
      policy: { enabled: true, rules, dailyCallLimit: 2 },
    });
    assert.equal(
      (await f.host.readBackgroundAnalysis({ ...f.scope, assetId: f.id }))
        .intents.length,
      0,
      "no historical backfill",
    );
    const added = await f.add(),
      c = await f.host.claimBackgroundExecution({
        ...f.scope,
        sessionToken: f.session.sessionToken,
        capability: "caption",
      });
    assert.ok(c);
    const asset = (await f.host.readAssetContext([added])).assets[0],
      r = {
        ...f.request("background"),
        assetId: added,
        assetRevision: asset.revision,
        previewGeneration: asset.thumbnailRef,
        location: "external" as const,
      };
    await f.host.beginBasicRequest(r);
    await f.host.attachBackgroundRequest(c!, r.requestId);
    const claim = await f.host.claimBasicAnalysis({
      ...r,
      inputSha256: "b".repeat(64),
    });
    await f.host.markBasicAnalysisSent(claim, c!);
    await f.host.commitCaption(claim, "已提交", undefined, c!);
    const complete = await f.host.readBackgroundExecution(f.scope);
    assert.equal(complete.items[0].state, "succeeded");
    assert.equal(complete.budgetUsed, 2);
    assert.equal(
      (await f.host.readBackgroundAnalysis(f.scope)).counts.find(
        (r) => r.capability === "caption" && r.state === "succeeded",
      )?.count,
      1,
    );
    await f.add();
    const next = await f.host.claimBackgroundExecution({
      ...f.scope,
      sessionToken: f.session.sessionToken,
      capability: "caption",
    });
    assert.ok(next);
    await assert.rejects(f.host.attachBackgroundRequest(next!, "unsubmitted"));
    const second = (await f.host.readAssetContext([next!.assetId])).assets[0],
      secondRequest = {
        ...f.request("budget-exhausted"),
        assetId: next!.assetId,
        assetRevision: second.revision,
        previewGeneration: second.thumbnailRef,
        location: "external" as const,
      };
    await f.host.beginBasicRequest(secondRequest);
    await f.host.attachBackgroundRequest(next!, secondRequest.requestId);
    await assert.rejects(f.host.markBackgroundExecutionSent(next!));
    await f.host.finishBackgroundExecution(next!, "deferred");
    await f.host.close();
    await f.host.reopen();
    const session = await f.host.readVisualSession(f.scope);
    const interrupted = (
      await f.host.readBackgroundExecution(f.scope)
    ).items.find((i) => i.intentId === next!.intentId)!;
    assert.equal(interrupted.state, "deferred");
    await f.host.recoverBackgroundExecution({
      ...f.scope,
      sessionToken: session.sessionToken,
      intentId: interrupted.intentId,
      attemptId: interrupted.attemptId,
      action: "keep",
    });
    assert.equal(
      (await f.host.readBackgroundExecution(f.scope)).items.find(
        (i) => i.intentId === next!.intentId,
      )?.state,
      "deferred",
    );
  } finally {
    await f.close();
  }
});
await test("sent caption across a fresh Host session remains unknown and no old claim authority revives", async () => {
  const f = await fixture();
  try {
    const r = f.request("sent");
    await f.host.beginBasicRequest(r);
    const c = await f.host.claimBasicAnalysis({
      ...r,
      inputSha256: "b".repeat(64),
    });
    await f.host.markBasicAnalysisSent(c);
    await f.host.close();
    await f.host.reopen();
    await assert.rejects(f.host.commitCaption(c, "迟到"));
    const db = new Database(path.join(f.library, ".dam/library.sqlite"), {
      readonly: true,
    });
    try {
      assert.equal(
        db
          .prepare(
            "SELECT state FROM basic_analysis_attempts WHERE request_id=?",
          )
          .pluck()
          .get("sent"),
        "unknown",
      );
      assert.equal(
        db
          .prepare("SELECT COUNT(*) FROM basic_analysis_evidence")
          .pluck()
          .get(),
        0,
      );
    } finally {
      db.close();
    }
  } finally {
    await f.close();
  }
});
await test("manual interrupted attempts remain actionable without inference and abandoning preserves uncertainty", async () => {
  const f = await fixture();
  try {
    const r = f.request("manual-interrupted"),
      c = await f.host.claimBasicAnalysis({
        ...r,
        inputSha256: "b".repeat(64),
      });
    await f.host.markBasicAnalysisSent(c);
    await f.host.close();
    await f.host.reopen();
    const read = await f.host.readBasicAttempts({ ...f.scope, assetId: f.id }),
      item = read.items[0];
    assert.equal(item.state, "unknown");
    const input = {
      ...f.scope,
      assetId: f.id,
      sessionToken: read.sessionToken,
      requestId: item.requestId,
      attemptId: item.attemptId,
    };
    assert.equal(
      (await f.host.recoverBasicAnalysis({ ...input, action: "reconcile" }))
        .items[0].state,
      "unknown",
    );
    const abandoned = (
      await f.host.recoverBasicAnalysis({ ...input, action: "abandon" })
    ).items[0];
    assert.equal(abandoned.state, "unknown");
    assert.equal(abandoned.disposition, "abandoned");
    await assert.rejects(
      f.host.recoverBasicAnalysis({
        ...input,
        sessionToken: f.session.sessionToken,
        action: "keep",
      }),
    );
    const newer = {
        ...f.request("new-manual"),
        sessionToken: read.sessionToken,
      },
      next = await f.host.claimBasicAnalysis({
        ...newer,
        inputSha256: "c".repeat(64),
      });
    await f.host.markBasicAnalysisSent(next);
    await f.host.commitCaption(next, "新的描述");
    const after = await f.host.readBasicAttempts({ ...f.scope, assetId: f.id });
    assert.equal(
      after.items.find((i) => i.requestId === r.requestId)?.state,
      "unknown",
    );
    assert.equal((await f.host.listAssets())[0].aiCaption, "新的描述");
  } finally {
    await f.close();
  }
});
await test("registered requests interrupted before input preparation are visible without fabricated attempts or hashes", async () => {
  const f = await fixture();
  try {
    await f.host.beginBasicRequest(f.request("before-input"));
    await f.host.close();
    await f.host.reopen();
    const value = await f.host.readBasicAttempts({ ...f.scope, assetId: f.id }),
      item = value.items[0],
      input = {
        ...f.scope,
        assetId: f.id,
        sessionToken: value.sessionToken,
        requestId: item.requestId,
        attemptId: item.attemptId,
      };
    assert.equal(item.attemptId, null);
    assert.equal(item.state, "paused");
    assert.equal(item.hasReceipt, false);
    assert.equal(
      (await f.host.recoverBasicAnalysis({ ...input, action: "keep" })).items[0]
        .attemptId,
      null,
    );
    await assert.rejects(
      f.host.recoverBasicAnalysis({ ...input, action: "abandon" }),
    );
  } finally {
    await f.close();
  }
});
await test("explicit background rerun retains the original unknown audit after the new attempt is claimed", async () => {
  const f = await fixture();
  try {
    const initial = await f.host.readBackgroundAnalysis(f.scope),
      rules = BASIC_CAPABILITIES.map((capability) => ({
        capability,
        enabled: capability === "caption",
        backendId: "generated-test",
        model: "test-model",
        bindingSha256: "a".repeat(64),
        recipe: "caption-v1",
        location: "local" as const,
      }));
    await f.host.configureBackgroundExecution({
      ...f.scope,
      sessionToken: f.session.sessionToken,
      expectedRevision: 0,
      expectedPlanRevision: initial.policy.revision,
      allowUpgrade: false,
      policy: { enabled: true, rules, dailyCallLimit: 24 },
    });
    const id = await f.add(),
      c = (await f.host.claimBackgroundExecution({
        ...f.scope,
        sessionToken: f.session.sessionToken,
        capability: "caption",
      }))!,
      a = (await f.host.readAssetContext([id])).assets[0],
      r = {
        ...f.request("interrupted-background"),
        assetId: id,
        assetRevision: a.revision,
        previewGeneration: a.thumbnailRef,
      };
    await f.host.beginBasicRequest(r);
    await f.host.attachBackgroundRequest(c, r.requestId);
    const basic = await f.host.claimBasicAnalysis({
      ...r,
      inputSha256: "b".repeat(64),
    });
    await f.host.markBasicAnalysisSent(basic, c);
    await f.host.finishBasicAnalysis(basic, "unknown");
    await f.host.finishBackgroundExecution(c, "unknown");
    await f.host.recoverBackgroundExecution({
      ...f.scope,
      sessionToken: f.session.sessionToken,
      intentId: c.intentId,
      attemptId: c.attemptId,
      action: "rerun",
    });
    const next = (await f.host.claimBackgroundExecution({
      ...f.scope,
      sessionToken: f.session.sessionToken,
      capability: "caption",
    }))!;
    assert.notEqual(next.attemptId, c.attemptId);
    assert.equal(next.attemptEpoch, 2);
    const history = (await f.host.readBackgroundExecution(f.scope)).history!;
    assert.equal(
      history.find((i) => i.attemptId === c.attemptId)?.state,
      "unknown",
    );
    assert.equal(
      history.find((i) => i.attemptId === c.attemptId)?.requestId,
      r.requestId,
    );
    await f.host.finishBackgroundExecution(next, "deferred");
  } finally {
    await f.close();
  }
});

await test("v14 OCR receipts reconcile without inference, preserve corrections, and fence late or invalid output", async () => {
  const f = await fixture();
  try {
    const scope = { ...f.scope, assetId: f.id };
    const observation: OcrObservation = {
      engine: "rapidocr-onnxruntime", version: "1.4.4", recipe: "rapidocr-preview-v1",
      modelSha256: { det: "a".repeat(64), cls: "b".repeat(64), rec: "c".repeat(64) },
      width: 32, height: 24, elapsedMs: 10, threshold: .5,
      blocks: [{ text: "Recognized", confidence: .9, polygon: [[0, 0], [1, 0], [1, 1], [0, 1]] }],
    };
    const claim = async (requestId: string) => {
      const c = await f.host.claimBasicAnalysis({ ...f.request(requestId), capability: "ocr", recipe: "rapidocr-preview-v1", inputSha256: "d".repeat(64) });
      await f.host.markBasicAnalysisSent(c);
      return c;
    };
    const input = async (c: Awaited<ReturnType<typeof claim>>, value = observation) => ({
      ...scope, sessionToken: c.sessionToken, expectedRevision: (await f.host.readOcr(scope)).revision, allowUpgrade: false, basicClaim: c,
      evidence: { id: "ocr:" + c.attemptId, assetId: f.id, assetRevision: c.assetRevision, sourceRef: c.previewGeneration, inputSha256: c.inputSha256, createdAt: new Date().toISOString(), observation: value },
    });
    const first = await claim("ocr-first");
    const saved = await f.host.commitOcr(await input(first));
    await f.host.correctOcr({ ...scope, sessionToken: saved.sessionToken, expectedRevision: saved.revision, evidenceId: saved.evidence!.id, text: "人工修订" });
    const old = await claim("ocr-old");
    const latest = await claim("ocr-new");
    await f.host.commitOcr(await input(latest, { ...observation, blocks: [] }));
    await f.host.commitOcr(await input(old));
    const current = await f.host.readOcr(scope);
    assert.equal(current.editedText, "人工修订");
    assert.equal(current.evidence!.id, "ocr:" + latest.attemptId);
    assert.deepEqual(current.evidence!.observation.blocks, []);
    const invalid = await claim("ocr-invalid");
    await assert.rejects(f.host.commitOcr(await input(invalid, { ...observation, threshold: .1 } as OcrObservation)));
    assert.equal((await f.host.readOcr(scope)).evidence!.id, current.evidence!.id);
    await f.host.finishBasicAnalysis(invalid, "failed");
    await f.host.close(); await f.host.reopen();
    const audit = await f.host.readBasicAttempts(scope);
    for (const c of [first, old, latest]) {
      const reconciled = await f.host.recoverBasicAnalysis({ ...scope, sessionToken: audit.sessionToken, requestId: c.requestId, attemptId: c.attemptId, action: "reconcile" });
      assert.equal(reconciled.items.find(i => i.requestId === c.requestId)!.state, c === latest ? "succeeded" : "superseded");
    }
    assert.equal((await f.host.readOcr(scope)).editedText, "人工修订");
    const db = new Database(path.join(f.library, ".dam/library.sqlite"), { readonly: true });
    try {
      assert.equal(db.prepare("SELECT count(*) FROM basic_analysis_evidence").pluck().get(), 3);
      assert.equal(db.prepare("SELECT count(*) FROM asset_ocr_evidence").pluck().get(), 2);
      assert.equal(db.pragma("foreign_key_check").length, 0);
    } finally { db.close(); }
  } finally { await f.close(); }
});

await test("v14 late combined caption cannot supersede a failed newer independent caption", async () => {
  const f = await fixture();
  try {
    const r = f.request("combined-caption"), scope = { ...f.scope, assetId: f.id },
      tagScope = { ...scope, sessionToken: r.sessionToken };
    await f.host.saveTagIntent({ ...tagScope, expectedSchemaVersion: 14, allowUpgrade: false, requestId: "combined-tags", assetRevision: r.assetRevision, previewGeneration: r.previewGeneration, backendId: r.backendId, model: r.model, backendBindingSha256: r.bindingSha256, recipeId: "visual-ai-v1", recipeVersion: "1" });
    const caption = await f.host.claimBasicAnalysis({ ...r, inputSha256: "b".repeat(64) });
    await f.host.markBasicAnalysisSent(caption);
    const tag = await f.host.claimTagExecution({ ...tagScope, requestId: "combined-tags", origin: "combined", inputSha256: "b".repeat(64) });
    await f.host.markTagExecutionSent({ ...tagScope, requestId: "combined-tags", attemptToken: tag.attemptToken });
    const newer = await f.host.claimBasicAnalysis({ ...f.request("independent-new"), inputSha256: "c".repeat(64) });
    await f.host.finishBasicAnalysis(newer, "failed");
    const evidence = { id: "combined-v14", assetId: f.id, assetRevision: r.assetRevision, previewGeneration: r.previewGeneration, inputSha256: "b".repeat(64), backendId: r.backendId, providerOrigin: "http://127.0.0.1:1", model: r.model, purpose: "analyze" as const, inputScope: "controlled-preview-rgb" as const, recipe: "visual-ai-v1" as const, createdAt: new Date().toISOString(), output: { caption: "迟到描述", prompt: "明确综合操作的反推", ocrText: "", tags: ["颜色"] } };
    await f.host.commitTagExecution({ ...tagScope, requestId: "combined-tags", attemptToken: tag.attemptToken, tags: evidence.output.tags, combinedEvidence: evidence, captionClaim: caption });
    assert.equal((await f.host.listAssets())[0].aiCaption, "");
    assert.equal((await f.host.readCaptions(scope))[0].historicalOnly, true);
    assert.deepEqual((await f.host.readTagExecution(scope)).current!.tags, ["颜色"]);
    await f.host.close(); await f.host.reopen();
    assert.equal((await f.host.listAssets())[0].aiCaption, "");
  } finally { await f.close(); }
});

await test("v14 user tag confirmation and rejection remain valid across rerun and reopening", async () => {
  const f = await fixture();
  try {
    const r = f.request("tag-context"), scope = { ...f.scope, assetId: f.id }, s = { ...scope, sessionToken: r.sessionToken };
    const publish = async (requestId: string) => {
      await f.host.saveTagIntent({ ...s, expectedSchemaVersion: 14, allowUpgrade: false, requestId, assetRevision: r.assetRevision, previewGeneration: r.previewGeneration, backendId: r.backendId, model: r.model, backendBindingSha256: r.bindingSha256, recipeId: "independent-tags-v1", recipeVersion: "1" });
      const c = await f.host.claimTagExecution({ ...s, requestId, origin: "tags-only", inputSha256: "b".repeat(64) });
      await f.host.markTagExecutionSent({ ...s, requestId, attemptToken: c.attemptToken });
      await f.host.commitTagExecution({ ...s, requestId, attemptToken: c.attemptToken, tags: ["已确认", "已拒绝"] });
      return (await f.host.readTagExecution(scope)).current!;
    };
    const first = await publish("tag-first");
    const decision = { ...s, evidenceId: first.evidenceId, expectedSchemaVersion: 14, allowUpgrade: false };
    await f.host.decideTag({ ...decision, tag: "已确认", decision: "confirm" });
    await f.host.decideTag({ ...decision, tag: "已拒绝", decision: "reject" });
    assert.deepEqual((await f.host.listAssets())[0].tags, ["已确认"]);
    const next = await publish("tag-rerun");
    assert.deepEqual(next.tags, ["已确认"]);
    assert.deepEqual(next.pendingTags, []);
    await assert.rejects(f.host.decideTag({ ...decision, tag: "已确认", decision: "confirm" }));
    await f.host.close(); await f.host.reopen();
    assert.deepEqual((await f.host.listAssets())[0].tags, ["已确认"]);
    assert.deepEqual((await f.host.readTagExecution(scope)).current!.pendingTags, []);
  } finally { await f.close(); }
});
