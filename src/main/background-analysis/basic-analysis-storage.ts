import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { validateUsageSummary } from "../ai-gateway/usage-summary";
import type {
  BasicRequest,
  BasicClaim,
  BasicScope,
  CaptionEvidence,
  CaptionOutput,
  BasicAttempts,
  BasicRecovery,
} from "../../shared/contracts/basic-analysis.contract";
import {
  readTagIntentContext,
  tagIntentFail,
  type TagIntentBinding,
} from "../independent-tags/tag-intent-storage";
export interface BasicAuthority {
  claims: Map<string, BasicClaim>;
}
export type BasicBinding = TagIntentBinding & {
  leaseIdentity: string;
  basicAuthority: BasicAuthority;
};
const fail = (code: string): never => tagIntentFail(code);
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function beginBasicRequest(
  a: BasicBinding,
  r: BasicRequest,
): BasicRequest & { requestGeneration: number } {
  const c = readTagIntentContext(a, r);
  if((a.database.prepare('SELECT file_type FROM assets WHERE id=?').get(r.assetId) as {file_type:string}|undefined)?.file_type==='mp4')return fail('视频不参与整图分析，请先明确选择参考帧。')
  if (c.schemaVersion < 14) fail("BASIC_UPGRADE_REQUIRED");
  if (
    r.sessionToken !== a.notebookSession ||
    !["caption", "ocr"].includes(r.capability) ||
    !/^[a-zA-Z0-9:._-]{1,256}$/.test(r.requestId) ||
    !/^[a-f0-9]{64}$/.test(r.bindingSha256) ||
    !["local", "external"].includes(r.location) ||
    r.assetRevision !== c.asset.revision ||
    r.previewGeneration !== c.asset.previewGeneration
  )
    fail("BASIC_SOURCE_CHANGED");
  const old = a.database
    .prepare("SELECT * FROM basic_analysis_requests WHERE request_id=?")
    .get(r.requestId) as any;
  if (old) {
    if (
      old.asset_id !== r.assetId ||
      old.capability !== r.capability ||
      old.binding_sha256 !== r.bindingSha256 ||
      old.asset_revision !== r.assetRevision ||
      old.preview_generation !== r.previewGeneration ||
      old.recipe !== r.recipe
    )
      fail("BASIC_REQUEST_CONFLICT");
    return { ...r, requestGeneration: old.request_generation };
  }
  const maximum = Number(
    a.database
      .prepare(
        "SELECT COALESCE(MAX(request_generation),0) FROM basic_analysis_requests WHERE asset_id=? AND capability=? AND asset_revision=? AND preview_generation=?",
      )
      .pluck()
      .get(r.assetId, r.capability, r.assetRevision, r.previewGeneration),
  );
  if (!Number.isSafeInteger(maximum) || maximum >= Number.MAX_SAFE_INTEGER)
    fail("BASIC_GENERATION_EXHAUSTED");
  a.database
    .prepare(
      "INSERT INTO basic_analysis_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      r.requestId,
      r.assetId,
      r.capability,
      r.assetRevision,
      r.previewGeneration,
      maximum + 1,
      r.backendId,
      r.model,
      r.bindingSha256,
      r.recipe,
      r.location,
      JSON.stringify(r.reasoning ?? null),
      new Date().toISOString(),
    );
  return { ...r, requestGeneration: maximum + 1 };
}
function latest(a: BasicBinding, r: BasicClaim) {
  return (
    Number(
      a.database
        .prepare(
          "SELECT MAX(request_generation) FROM basic_analysis_requests WHERE asset_id=? AND capability=? AND asset_revision=? AND preview_generation=?",
        )
        .pluck()
        .get(r.assetId, r.capability, r.assetRevision, r.previewGeneration),
    ) === r.requestGeneration
  );
}
export function claimBasic(
  a: BasicBinding,
  r: BasicRequest & { inputSha256: string },
): BasicClaim {
  const request = beginBasicRequest(a, r);
  if (!/^[a-f0-9]{64}$/.test(r.inputSha256)) fail("BASIC_INPUT_INVALID");
  const previous = a.database
    .prepare(
      "SELECT state,attempt_epoch FROM basic_analysis_attempts WHERE request_id=?",
    )
    .get(r.requestId) as any;
  if (
    previous &&
    ["claimed", "sent", "unknown", "succeeded", "superseded"].includes(
      previous.state,
    )
  )
    fail("BASIC_RECONCILE_REQUIRED");
  const claim: BasicClaim = {
    ...request,
    inputSha256: r.inputSha256,
    attemptId: randomUUID(),
    attemptToken: randomUUID(),
  };
  if (!latest(a, claim)) fail("BASIC_REQUEST_SUPERSEDED");
  a.database
    .prepare(
      "INSERT INTO basic_analysis_attempts VALUES(?,?,?,?,'claimed',?,NULL,?) ON CONFLICT(request_id) DO UPDATE SET attempt_id=excluded.attempt_id,attempt_epoch=excluded.attempt_epoch,owner_session=excluded.owner_session,state='claimed',input_sha256=excluded.input_sha256,error_code=NULL,updated_at=excluded.updated_at",
    )
    .run(
      r.requestId,
      claim.attemptId,
      (previous?.attempt_epoch ?? 0) + 1,
      a.notebookSession,
      r.inputSha256,
      new Date().toISOString(),
    );
  a.basicAuthority.claims.set(claim.attemptToken, claim);
  return claim;
}
function held(a: BasicBinding, c: BasicClaim) {
  readTagIntentContext(a, c);
  const h = a.basicAuthority.claims.get(c.attemptToken);
  if (
    !h ||
    h.sessionToken !== a.notebookSession ||
    c.sessionToken !== a.notebookSession ||
    h.attemptId !== c.attemptId ||
    h.requestId !== c.requestId ||
    h.assetId !== c.assetId
  )
    fail("BASIC_CLAIM_EXPIRED");
  const row = a.database
    .prepare(
      "SELECT state,attempt_id FROM basic_analysis_attempts WHERE request_id=?",
    )
    .get(c.requestId) as any;
  if (
    row?.attempt_id !== h!.attemptId ||
    !["claimed", "sent"].includes(row.state)
  )
    fail("BASIC_CLAIM_EXPIRED");
  return { claim: h!, state: row.state };
}
export function markBasicSent(a: BasicBinding, c: BasicClaim) {
  const h = held(a, c),
    context = readTagIntentContext(a, c);
  if (
    h.state !== "claimed" ||
    !latest(a, h.claim) ||
    context.asset.revision !== c.assetRevision ||
    context.asset.previewGeneration !== c.previewGeneration
  )
    fail("BASIC_REQUEST_SUPERSEDED");
  a.database
    .prepare(
      "UPDATE basic_analysis_attempts SET state='sent',updated_at=? WHERE request_id=?",
    )
    .run(new Date().toISOString(), c.requestId);
}
export function commitBasicOutput(
  a: BasicBinding,
  c: BasicClaim,
  output: unknown,
  effectId: string,
  signal?: AbortSignal,
) {
  const payload = digest(output),
    old = a.database
      .prepare("SELECT * FROM basic_analysis_evidence WHERE request_id=?")
      .get(c.requestId) as any;
  if (old) {
    if (old.payload_sha256 !== payload) fail("BASIC_EFFECT_CONFLICT");
    return { evidenceId: old.id, historicalOnly: !latest(a, c) };
  }
  const h = held(a, c),
    context = readTagIntentContext(a, c);
  if (signal?.aborted || h.state !== "sent") fail("BASIC_CANCELLED");
  if (
    context.asset.revision !== c.assetRevision ||
    context.asset.previewGeneration !== c.previewGeneration
  )
    fail("BASIC_SOURCE_CHANGED");
  const historicalOnly = !latest(a, c),
    now = new Date().toISOString();
  a.database
    .prepare("INSERT INTO basic_analysis_evidence VALUES(?,?,?,?,?)")
    .run(effectId, c.requestId, JSON.stringify(output), payload, now);
  if (!historicalOnly)
    a.database
      .prepare(
        "INSERT INTO basic_analysis_current VALUES(?,?,?,?) ON CONFLICT(asset_id,capability) DO UPDATE SET request_id=excluded.request_id,evidence_id=excluded.evidence_id",
      )
      .run(c.assetId, c.capability, c.requestId, effectId);
  a.database
    .prepare(
      "UPDATE basic_analysis_attempts SET state=?,updated_at=? WHERE request_id=?",
    )
    .run(historicalOnly ? "superseded" : "succeeded", now, c.requestId);
  a.database
    .prepare("INSERT INTO basic_analysis_outbox VALUES(?,?,0,?)")
    .run("basic:" + effectId, c.assetId, now);
  return { evidenceId: effectId, historicalOnly };
}
export function commitCaption(
  a: BasicBinding,
  c: BasicClaim,
  value: string | CaptionOutput,
  signal?: AbortSignal,
): CaptionEvidence {
  const caption = typeof value === "string" ? value : value?.caption,
    usage = typeof value === "string" ? undefined : validateUsageSummary(value?.usage),
    physicalCalls = typeof value === "string" ? undefined : value?.physicalCalls;
  if (
    c.capability !== "caption" ||
    typeof caption !== "string" ||
    !caption.trim() ||
    caption.trim().length > 240 ||
    /[\x00-\x1f]/.test(caption) ||
    (typeof value !== "string" && value?.usage !== undefined && !usage) ||
    (physicalCalls !== undefined && physicalCalls !== 1 && physicalCalls !== 2)
  )
    fail("CAPTION_OUTPUT_INVALID");
  const output: CaptionOutput = { caption: caption.trim(), ...(usage ? { usage } : {}), ...(physicalCalls ? { physicalCalls } : {}) },
    id = "caption:" + c.attemptId,
    result = commitBasicOutput(a, c, output, id, signal);
  const createdAt = (
    a.database
      .prepare("SELECT created_at FROM basic_analysis_evidence WHERE id=?")
      .get(result.evidenceId) as any
  ).created_at;
  if (!result.historicalOnly)
    a.database
      .prepare(
        "UPDATE assets SET ai_caption=?,ai_caption_updated_at=? WHERE id=? AND ai_caption_is_user_edited=0",
      )
      .run(caption.trim(), createdAt, c.assetId);
  return {
    id: result.evidenceId,
    requestId: c.requestId,
    assetId: c.assetId,
    ...output,
    model: c.model,
    backendId: c.backendId,
    recipe: c.recipe,
    location: c.location,
    ...(c.reasoning ? { reasoning: c.reasoning } : {}),
    createdAt,
    historicalOnly: result.historicalOnly,
  };
}
export function finishBasic(
  a: BasicBinding,
  c: BasicClaim,
  state: "failed" | "cancelled" | "unknown" | "paused",
) {
  const h = held(a, c);
  a.database
    .prepare(
      "UPDATE basic_analysis_attempts SET state=?,updated_at=? WHERE request_id=?",
    )
    .run(state, new Date().toISOString(), h.claim.requestId);
  a.basicAuthority.claims.delete(c.attemptToken);
}
export function captions(
  a: TagIntentBinding,
  s: BasicScope,
): CaptionEvidence[] {
  const c = readTagIntentContext(a, s);
  if (c.schemaVersion < 14) return [];
  return (
    a.database
      .prepare(
        `SELECT r.*,e.id,e.output_json,e.created_at AS completed_at,CASE WHEN current.evidence_id=e.id THEN 0 ELSE 1 END AS historical_only FROM basic_analysis_requests r JOIN basic_analysis_evidence e USING(request_id) LEFT JOIN basic_analysis_current current ON current.asset_id=r.asset_id AND current.capability=r.capability WHERE r.asset_id=? AND r.capability='caption' AND r.asset_revision=? AND r.preview_generation=? ORDER BY e.created_at DESC LIMIT 20`,
      )
      .all(s.assetId, c.asset.revision, c.asset.previewGeneration) as any[]
  ).map((r) => ({
    id: r.id,
    requestId: r.request_id,
    assetId: r.asset_id,
    caption: JSON.parse(r.output_json).caption,
    ...(validateUsageSummary(JSON.parse(r.output_json).usage) ? { usage: validateUsageSummary(JSON.parse(r.output_json).usage) } : {}),
    ...([1, 2].includes(JSON.parse(r.output_json).physicalCalls) ? { physicalCalls: JSON.parse(r.output_json).physicalCalls } : {}),
    model: r.model_name,
    backendId: r.backend_id,
    recipe: r.recipe,
    location: r.location,
    ...(JSON.parse(r.reasoning_json)
      ? { reasoning: JSON.parse(r.reasoning_json) }
      : {}),
    createdAt: r.completed_at,
    historicalOnly: !!r.historical_only,
  }));
}
/** Bounded audit projection. Persisted session identifiers never restore execution authority. */
export function readBasicAttempts(
  a: TagIntentBinding,
  s: BasicScope,
): BasicAttempts {
  const c = readTagIntentContext(a, s);
  if (c.schemaVersion < 14) return { sessionToken: c.sessionToken, items: [] };
  const rows = a.database
    .prepare(
      `SELECT r.*,x.attempt_id,x.state,x.error_code,COALESCE(x.updated_at,r.created_at) AS attempt_updated_at,e.id AS evidence_id FROM basic_analysis_requests r LEFT JOIN basic_analysis_attempts x USING(request_id) LEFT JOIN basic_analysis_evidence e USING(request_id) WHERE r.asset_id=? ORDER BY attempt_updated_at DESC,r.request_generation DESC LIMIT 30`,
    )
    .all(s.assetId) as any[];
  return {
    sessionToken: c.sessionToken,
    items: rows.map((r) => ({
      requestId: r.request_id,
      attemptId: r.attempt_id,
      capability: r.capability,
      state: r.state ?? "paused",
      model: r.model_name,
      location: r.location,
      updatedAt: r.attempt_updated_at,
      sourceMatches:
        r.asset_revision === c.asset.revision &&
        r.preview_generation === c.asset.previewGeneration,
      hasReceipt: !!r.evidence_id,
      disposition: r.error_code === "ABANDONED" ? "abandoned" : null,
    })),
  };
}
/** Verify the immutable request, prepared input and saved effect together before readback. */
export function basicReceipt(
  a: TagIntentBinding,
  requestId: string,
  assetId: string,
) {
  const r = a.database
    .prepare(
      `SELECT r.*,x.input_sha256,x.attempt_id,x.state AS attempt_state,e.id AS effect_id,e.output_json,e.payload_sha256 FROM basic_analysis_requests r JOIN basic_analysis_attempts x USING(request_id) JOIN basic_analysis_evidence e USING(request_id) WHERE r.request_id=? AND r.asset_id=?`,
    )
    .get(requestId, assetId) as any;
  if (!r) return null;
  const output = JSON.parse(r.output_json);
  if (digest(output) !== r.payload_sha256) fail("BASIC_EFFECT_CONFLICT");
  if (r.capability === "caption") {
    if (
      r.effect_id !== "caption:" + r.attempt_id ||
      typeof output.caption !== "string"
    )
      fail("BASIC_EFFECT_CONFLICT");
  } else {
    const o = a.database
      .prepare("SELECT * FROM asset_ocr_evidence WHERE id=? AND asset_id=?")
      .get(r.effect_id.replace(/^basic:/, ""), assetId) as any;
    if (!o && r.attempt_state === "superseded") return r;
    if (
      !o ||
      o.id !== "ocr:" + r.attempt_id ||
      o.input_sha256 !== r.input_sha256 ||
      o.asset_revision !== r.asset_revision ||
      o.source_ref !== r.preview_generation ||
      digest({ ocr: JSON.parse(o.observation_json) }) !== r.payload_sha256
    )
      fail("BASIC_EFFECT_CONFLICT");
  }
  return r;
}
export function recoverBasic(a: BasicBinding, r: BasicRecovery): BasicAttempts {
  const c = readTagIntentContext(a, r);
  if (
    c.schemaVersion < 14 ||
    r.sessionToken !== a.notebookSession ||
    !["reconcile", "keep", "abandon"].includes(r.action)
  )
    fail("BASIC_SCOPE_EXPIRED");
  const row = a.database
    .prepare(
      "SELECT r.request_id,x.attempt_id,x.state FROM basic_analysis_requests r LEFT JOIN basic_analysis_attempts x USING(request_id) WHERE r.request_id=? AND x.attempt_id IS ? AND r.asset_id=?",
    )
    .get(r.requestId, r.attemptId, r.assetId) as any;
  if (
    !row ||
    ["claimed", "sent"].includes(row.state) ||
    [...a.basicAuthority.claims.values()].some(
      (c) => c.requestId === r.requestId,
    )
  )
    fail("BASIC_BUSY");
  if (r.action === "reconcile") {
    const receipt = basicReceipt(a, r.requestId, r.assetId);
    if (
      receipt &&
      receipt.asset_revision === c.asset.revision &&
      receipt.preview_generation === c.asset.previewGeneration
    ) {
      const current = a.database
        .prepare(
          "SELECT evidence_id FROM basic_analysis_current WHERE asset_id=? AND capability=?",
        )
        .pluck()
        .get(r.assetId, receipt.capability);
      a.database
        .prepare(
          "UPDATE basic_analysis_attempts SET state=?,updated_at=? WHERE request_id=?",
        )
        .run(
          current === receipt.effect_id ? "succeeded" : "superseded",
          new Date().toISOString(),
          r.requestId,
        );
      a.database
        .prepare(
          "INSERT INTO basic_analysis_outbox VALUES(?,?,0,?) ON CONFLICT(event_id) DO NOTHING",
        )
        .run("basic:" + receipt.effect_id, r.assetId, new Date().toISOString());
    }
  } else if (r.action === "abandon") {
    if (!["unknown", "failed", "paused", "cancelled"].includes(row.state))
      fail("BASIC_RECOVERY_CONFLICT");
    // Preserve the original uncertainty; abandoning is a user disposition, not proof of non-execution.
    a.database
      .prepare(
        "UPDATE basic_analysis_attempts SET error_code='ABANDONED' WHERE request_id=?",
      )
      .run(r.requestId);
  }
  return readBasicAttempts(a, r);
}
/** New Host lease only; no old session is revived and no sent request is replayed. */
export function reconcileBasicAnalysis(db: Database.Database) {
  if (Number(db.pragma("user_version", { simple: true })) < 14) return;
  db.transaction(() => {
    db.prepare(
      "UPDATE basic_analysis_attempts SET state=CASE WHEN state='claimed' THEN 'paused' ELSE 'unknown' END,error_code='INTERRUPTED',updated_at=? WHERE state IN ('claimed','sent')",
    ).run(new Date().toISOString());
    db.prepare(
      "UPDATE background_analysis_executions SET state=CASE WHEN state='claimed' THEN 'deferred' ELSE 'unknown' END,updated_at=? WHERE state IN ('claimed','sent')",
    ).run(new Date().toISOString());
  })();
}
