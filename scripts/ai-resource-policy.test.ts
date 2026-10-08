import assert from "node:assert/strict";
import { test } from "node:test";
import { createVisualAdmission } from "../src/main/visual-ai/visual-admission";

const GiB = 1024 ** 3;
await test('native model admission uses a fresh individual GPU pool, preserves release accounting and refuses stale/unknown VRAM', () => {
  const timer = clock()
  let free = 6 * GiB
  const admission = createVisualAdmission({ clock: timer, memory: () => ({ free: 30 * GiB, total: 32 * GiB }),
    devices: () => [{ id: 'gpu-0', name: 'discrete device', topology: 'dedicated', totalBytes: 8 * GiB,
      freeBytes: free, sampledAt: 0, source: 'nvidia-smi', state: 'known' }] })
  const cost = { ramBytes: 2 * GiB, gpuBytes: { 'gpu-0': 4 * GiB } }
  assert.equal(admission.canAdmitModel(cost), true)
  const resident = admission.reserveModel('native', cost, new AbortController().signal)
  assert.equal(admission.canAdmitModel(cost), false, 'unallocated commitments cannot overbook a fresh pool')
  assert.equal(admission.resourceStatus().residents[0].gpuBytes['gpu-0'], 4 * GiB)
  free = 2 * GiB
  assert.equal(admission.canAdmitVision(), true, 'a local GPU reservation cannot freeze unrelated CPU paths')
  timer.advance(5000)
  assert.equal(admission.canAdmitModel(cost), false)
  assert.equal(admission.resourceStatus().devices[0].state, 'stale')
  resident.release()
  assert.equal(admission.resourceStatus().residentBytes, 0)
  assert.equal(admission.canAdmitModel({ ramBytes: GiB, gpuBytes: { 'absent-device': GiB } }), false)
  assert.equal(admission.canAdmitModel({ ramBytes: GiB, gpuBytes: {} }), true)
})
await test('whole model loading and work envelope is checked before claiming without allocating residency', async () => {
  let free=31.5*GiB;
  const admission=createVisualAdmission({memory:()=>({free,total:64*GiB})});
  assert.equal(admission.resourceStatus().reason,null,'generic idle headroom alone is insufficient');
  assert.equal(admission.canAdmitVision({residentBytes:25*GiB,computeBytes:GiB}),false);
  assert.equal(admission.resourceStatus().residentBytes,0);
  assert.equal(admission.canAdmitOcr(GiB),true,'OCR remains eligible');
  free=35*GiB;
  assert.equal(admission.canAdmitVision({residentBytes:25*GiB,computeBytes:GiB}),true);
  const resident=admission.reserveResident('owned',25*GiB,new AbortController().signal);
  resident.observe(17.5*GiB); free=14*GiB;
  assert.equal(admission.canAdmitVision({computeBytes:GiB}),false);
  assert.equal(admission.resourceStatus().residentBytes,25*GiB,'failed eligibility never releases a resident');
  resident.release();
});
await test('loading may overlap an admitted OCR slot, but inference eligibility still observes that slot', async () => {
  const admission=createVisualAdmission({memory:()=>({free:35*GiB,total:64*GiB}),policy:{mode:'quiet',reserveFraction:.1}});
  const ocr=await admission.reserveOcr(GiB,new AbortController().signal);
  assert.equal(admission.canAdmitVision({residentBytes:25*GiB,computeBytes:GiB}),false);
  assert.equal(admission.canAdmitVision({residentBytes:25*GiB,computeBytes:GiB},false),true);
  ocr.release();
  assert.equal(admission.canAdmitVision({residentBytes:25*GiB,computeBytes:GiB}),true);
});
function clock() {
  let time = 0;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
    scheduleTimeout: () => () => {},
  };
}

await test('model replacement forecast credits only fresh owned observations and never releases residency', () => {
  const timer = clock();
  let free = 40 * GiB;
  const admission = createVisualAdmission({clock: timer, memory: () => ({free, total: 64 * GiB})});
  const resident = admission.reserveResident('current-model', 16 * GiB, new AbortController().signal);
  resident.observe(12 * GiB); free = 28 * GiB;
  const candidate = {residentBytes: 25 * GiB, computeBytes: GiB};
  assert.equal(admission.canAdmitVision(candidate, false), false);
  assert.equal(admission.canAdmitVision(candidate, false, 'current-model'), true);
  assert.equal(admission.resourceStatus().residentBytes, 16 * GiB);
  assert.throws(() => admission.reserveResident('replacement', 25 * GiB, new AbortController().signal), /MEMORY_WAIT/);
  assert.equal(admission.canAdmitVision(candidate, false, 'unknown-owner'), false);
  timer.advance(5000);
  assert.equal(admission.canAdmitVision(candidate, false, 'current-model'), false);
  assert.equal(admission.resourceStatus().residentBytes, 16 * GiB);
  resident.release(); free = 40 * GiB;
  assert.equal(admission.canAdmitVision(candidate, false), true);
});

await test("eligible background work runs after three foreground units while foreground keeps priority", async () => {
  const admission = createVisualAdmission({
      policy: { mode: "quiet", reserveFraction: 0.1 },
    }),
    signal = new AbortController().signal,
    initial = await admission.reserveOcr(1, signal),
    order: string[] = [];
  const waiting = (name: string, priority: "foreground" | "background") =>
    admission.reserveOcr(1, signal, priority).then((p) => {
      order.push(name);
      p.release();
    });
  const done = [
    waiting("background", "background"),
    waiting("foreground-1", "foreground"),
    waiting("foreground-2", "foreground"),
    waiting("foreground-3", "foreground"),
  ];
  initial.release();
  await Promise.all(done);
  assert.deepEqual(order, [
    "foreground-1",
    "foreground-2",
    "background",
    "foreground-3",
  ]);
  assert.equal(admission.inspect().waiting, 0);
});

await test("interaction and memory pressure lower load immediately and require ten seconds before recovery", () => {
  const timer = clock();
  let free = 30 * GiB,
    activity: "active" | "idle" = "idle";
  const admission = createVisualAdmission({
    clock: timer,
    memory: () => ({ free, total: 32 * GiB }),
    activity: () => activity,
  });
  assert.equal(admission.resourceStatus().concurrency, 2);
  activity = "active";
  assert.equal(admission.resourceStatus().computeThreads, 2);
  assert.equal(admission.resourceStatus().concurrency, 1);
  activity = "idle";
  admission.resourceStatus();
  timer.advance(9999);
  assert.equal(admission.resourceStatus().concurrency, 1);
  timer.advance(1);
  assert.equal(admission.resourceStatus().computeThreads, 4);
  free = 3.5 * GiB;
  assert.equal(admission.resourceStatus().pressure, true);
  free = 30 * GiB;
  admission.resourceStatus();
  timer.advance(9999);
  assert.equal(admission.resourceStatus().pressure, true);
  timer.advance(1);
  assert.equal(admission.resourceStatus().pressure, false);
});

await test("stale residency observations stop admission without clearing ownership; unknown memory is bounded", async () => {
  const timer = clock();
  let free = 30 * GiB;
  const admission = createVisualAdmission({
      clock: timer,
      memory: () => ({ free, total: 32 * GiB }),
    }),
    abort = new AbortController(),
    resident = admission.reserveResident(
      "owned-worker",
      16 * GiB,
      abort.signal,
    );
  resident.observe(16 * GiB);
  free = 12 * GiB;
  const first = await admission.reserveOcr(1, abort.signal);
  first.release();
  timer.advance(5000);
  const waiting = admission.reserveOcr(1, abort.signal);
  assert.equal(admission.inspect().waiting, 1);
  assert.equal(admission.resourceStatus().residentBytes, 16 * GiB);
  abort.abort();
  await assert.rejects(waiting, /CANCELLED/);
  assert.equal(admission.resourceStatus().residentBytes, 16 * GiB);
  resident.release();
  assert.equal(admission.resourceStatus().residentBytes, 0);
  free = NaN;
  assert.equal(admission.resourceStatus().sample.kind, "unknown");
  assert.throws(
    () => admission.reserveResident("new", 1, new AbortController().signal),
    /MEMORY_WAIT/,
  );
});
