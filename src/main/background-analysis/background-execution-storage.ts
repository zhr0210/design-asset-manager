import { randomUUID, createHash } from "node:crypto";
import type {
  BackgroundScope,
  BackgroundExecutionPolicy,
  BackgroundExecutionSnapshot,
  BackgroundExecutionConfiguration,
  BackgroundExecutionClaim,
  BackgroundRecoveryDecision,
} from "../../shared/contracts/background-analysis.contract";
import { BASIC_CAPABILITIES } from "../../shared/contracts/background-analysis.contract";
import { readBackgroundAnalysis } from "./background-analysis-storage";
import {
  readTagIntentContext,
  tagIntentFail,
  type TagIntentBinding,
} from "../independent-tags/tag-intent-storage";
import { basicReceipt } from "./basic-analysis-storage";
export interface BackgroundAuthority {
  claims: Map<string, BackgroundExecutionClaim>;
}
export type ExecutionBinding = TagIntentBinding & {
  leaseIdentity: string;
  backgroundAuthority: BackgroundAuthority;
};
const fail = (code: string): never => tagIntentFail(code);
const defaults = (): BackgroundExecutionPolicy => ({
  enabled: false,
  revision: 0,
  dailyCallLimit: 24,
  rules: [],
});
const sha = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const day = () => new Date().toISOString().slice(0, 10);
function check(
  a: TagIntentBinding,
  s: BackgroundScope & { sessionToken?: string },
) {
  const base = readBackgroundAnalysis(a, s);
  if (s.sessionToken !== undefined && s.sessionToken !== a.notebookSession)
    fail("BACKGROUND_SCOPE_EXPIRED");
  return base;
}
export function readExecution(
  a: TagIntentBinding,
  s: BackgroundScope,
): BackgroundExecutionSnapshot {
  const base = check(a, s);
  if (base.schemaVersion < 14)
    return { policy: defaults(), items: [], budgetUsed: 0 };
  const p = a.database
    .prepare(
      "SELECT * FROM background_analysis_execution_policy WHERE singleton=1",
    )
    .get() as any;
  const rules = (
    a.database
      .prepare(
        "SELECT * FROM background_analysis_execution_rules ORDER BY capability",
      )
      .all() as any[]
  ).map((r) => ({
    capability: r.capability,
    enabled: !!r.enabled,
    backendId: r.backend_id,
    model: r.model_name,
    bindingSha256: r.binding_sha256,
    location: r.location,
    recipe: r.recipe,
  }));
  const items = (
    a.database
      .prepare(
        `SELECT x.*,i.asset_id,i.capability,asset.title AS asset_title FROM background_analysis_executions x JOIN background_analysis_intents i ON i.id=x.intent_id JOIN assets asset ON asset.id=i.asset_id ${s.assetId ? "WHERE i.asset_id=?" : ""} ORDER BY x.updated_at DESC,x.intent_id LIMIT 50`,
      )
      .all(...(s.assetId ? [s.assetId] : [])) as any[]
  ).map((x) => ({
    intentId: x.intent_id,
    assetId: x.asset_id,
    assetTitle: x.asset_title,
    capability: x.capability,
    attemptId: x.attempt_id,
    attemptEpoch: x.attempt_epoch,
    state: x.state,
    requestId: x.request_id,
    effectId: x.effect_id,
    updatedAt: x.updated_at,
    interrupted:
      x.owner_session !== a.notebookSession &&
      ["unknown", "deferred"].includes(x.state),
  }));
  const history = (
    a.database
      .prepare(
        `SELECT h.*,i.asset_id,i.capability FROM background_analysis_execution_history h JOIN background_analysis_intents i ON i.id=h.intent_id ${s.assetId ? "WHERE i.asset_id=?" : ""} ORDER BY h.updated_at DESC LIMIT 30`,
      )
      .all(...(s.assetId ? [s.assetId] : [])) as any[]
  ).map((x) => ({
    intentId: x.intent_id,
    assetId: x.asset_id,
    capability: x.capability,
    attemptId: x.attempt_id,
    attemptEpoch: x.attempt_epoch,
    state: x.state,
    requestId: x.request_id,
    effectId: x.effect_id,
    updatedAt: x.updated_at,
    interrupted: false,
  }));
  return {
    policy: {
      enabled: !!p.enabled,
      revision: p.revision,
      dailyCallLimit: p.daily_call_limit,
      rules,
    },
    items,
    history,
    budgetUsed: Number(
      a.database
        .prepare(
          "SELECT units FROM background_analysis_call_budget WHERE day=?",
        )
        .pluck()
        .get(day()) ?? 0,
    ),
  };
}
export function validateExecutionConfiguration(
  a: TagIntentBinding,
  r: BackgroundExecutionConfiguration,
) {
  const base = check(a, r),
    current = readExecution(a, r);
  if (
    r.assetId !== undefined ||
    r.expectedRevision !== current.policy.revision ||
    r.expectedPlanRevision !== base.policy.revision ||
    typeof r.allowUpgrade !== "boolean" ||
    typeof r.policy.enabled !== "boolean" ||
    !Number.isSafeInteger(r.policy.dailyCallLimit) ||
    r.policy.dailyCallLimit < 1 ||
    r.policy.dailyCallLimit > 1000 ||
    r.policy.rules.length !== 3 ||
    new Set(r.policy.rules.map((r) => r.capability)).size !== 3
  )
    fail("BACKGROUND_CONFLICT");
  for (const rule of r.policy.rules)
    if (
      !BASIC_CAPABILITIES.includes(rule.capability) ||
      typeof rule.enabled !== "boolean" ||
      !["local", "external"].includes(rule.location) ||
      !/^[a-f0-9]{64}$/.test(rule.bindingSha256) ||
      (rule.enabled && (!rule.backendId || !rule.model)) ||
      !rule.recipe
    )
      fail("BACKGROUND_INPUT_INVALID");
  return base;
}
export function writeExecutionConfiguration(
  a: TagIntentBinding,
  r: BackgroundExecutionConfiguration,
) {
  validateExecutionConfiguration(a, r);
  a.database
    .prepare(
      "UPDATE background_analysis_execution_policy SET enabled=?,revision=revision+1,daily_call_limit=?,updated_at=? WHERE singleton=1 AND revision=?",
    )
    .run(
      r.policy.enabled ? 1 : 0,
      r.policy.dailyCallLimit,
      new Date().toISOString(),
      r.expectedRevision,
    );
  for (const rule of r.policy.rules)
    a.database
      .prepare(
        "UPDATE background_analysis_execution_rules SET enabled=?,backend_id=?,model_name=?,binding_sha256=?,location=?,recipe=? WHERE capability=?",
      )
      .run(
        rule.enabled ? 1 : 0,
        rule.backendId,
        rule.model,
        rule.bindingSha256,
        rule.location,
        rule.recipe,
        rule.capability,
      );
  // The explicit execution review also establishes collection for future imports only.
  a.database
    .prepare(
      "UPDATE background_analysis_policy SET enabled=?,revision=revision+1 WHERE singleton=1 AND revision=?",
    )
    .run(r.policy.enabled ? 1 : 0, r.expectedPlanRevision);
  for (const rule of r.policy.rules)
    a.database
      .prepare(
        "UPDATE background_analysis_capabilities SET enabled=? WHERE capability=?",
      )
      .run(rule.enabled ? 1 : 0, rule.capability);
}
function eligible(a: ExecutionBinding, id: string) {
  return a.database
    .prepare(
      `SELECT i.*,l.revision AS asset_revision,c.grid_thumbnail_ref AS preview_ref FROM background_analysis_intents i JOIN asset_lifecycle l ON l.design_asset_identity=i.asset_id JOIN promotion_links p ON p.design_asset_identity=i.asset_id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity JOIN background_analysis_capabilities k ON k.capability=i.capability CROSS JOIN background_analysis_policy b WHERE i.id=? AND i.decision='active' AND l.lifecycle_state='active' AND l.ownership='managed' AND i.source_generation=r.source_generation AND i.preview_generation=c.preview_generation_identity AND k.enabled=1 AND b.enabled=1`,
    )
    .get(id) as any;
}
function held(a: ExecutionBinding, c: BackgroundExecutionClaim) {
  check(a, c);
  const h = a.backgroundAuthority.claims.get(c.token);
  if (
    !h ||
    h.sessionToken !== a.notebookSession ||
    h.attemptId !== c.attemptId ||
    h.intentId !== c.intentId ||
    h.assetId !== c.assetId
  )
    fail("BACKGROUND_CLAIM_EXPIRED");
  const row = a.database
    .prepare("SELECT * FROM background_analysis_executions WHERE intent_id=?")
    .get(c.intentId) as any;
  if (
    row?.attempt_id !== h!.attemptId ||
    row.owner_session !== a.notebookSession ||
    !["claimed", "sent"].includes(row.state)
  )
    fail("BACKGROUND_CLAIM_EXPIRED");
  return { h: h!, row };
}
export function validateBackgroundClaim(
  a: ExecutionBinding,
  c: BackgroundExecutionClaim,
) {
  const value = held(a, c),
    p = readExecution(a, c).policy,
    i = eligible(a, c.intentId),
    rule = p.rules.find((r) => r.capability === c.rule.capability);
  if (
    !p.enabled ||
    p.revision !== c.policyRevision ||
    !i ||
    i.revision !== c.intentRevision ||
    i.asset_revision !== c.assetRevision ||
    i.preview_ref !== c.previewGeneration ||
    !rule?.enabled ||
    sha(rule) !== sha(c.rule)
  )
    fail("BACKGROUND_POLICY_CHANGED");
  return value;
}
function history(
  a: ExecutionBinding,
  c: Pick<BackgroundExecutionClaim, "intentId">,
) {
  a.database
    .prepare(
      `INSERT INTO background_analysis_execution_history SELECT attempt_id,intent_id,attempt_epoch,state,request_id,effect_id,updated_at FROM background_analysis_executions WHERE intent_id=? ON CONFLICT(attempt_id) DO NOTHING`,
    )
    .run(c.intentId);
}
export function claimBackground(
  a: ExecutionBinding,
  s: BackgroundScope & { sessionToken: string; capability: string },
): BackgroundExecutionClaim | null {
  check(a, s);
  const p = readExecution(a, s).policy,
    rule = p.rules.find((r) => r.capability === s.capability);
  if (!p.enabled || !rule?.enabled) return null;
  if (
    [...a.backgroundAuthority.claims.values()].some(
      (c) => c.sessionToken === a.notebookSession,
    )
  )
    return null;
  const row = a.database
    .prepare(
      `SELECT i.id FROM background_analysis_intents i LEFT JOIN background_analysis_executions x ON x.intent_id=i.id JOIN asset_lifecycle l ON l.design_asset_identity=i.asset_id JOIN promotion_links p ON p.design_asset_identity=i.asset_id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity JOIN background_analysis_capabilities k ON k.capability=i.capability CROSS JOIN background_analysis_policy b WHERE i.capability=? AND i.decision='active' AND l.lifecycle_state='active' AND l.ownership='managed' AND i.source_generation=r.source_generation AND i.preview_generation=c.preview_generation_identity AND k.enabled=1 AND b.enabled=1 AND (x.intent_id IS NULL OR x.state='deferred') ORDER BY i.created_at,i.id LIMIT 16`,
    )
    .all(s.capability) as { id: string }[];
  for (const candidate of row) {
    const i = eligible(a, candidate.id);
    if (!i) continue;
    const prior = a.database
      .prepare(
        "SELECT attempt_epoch FROM background_analysis_executions WHERE intent_id=?",
      )
      .get(i.id) as any;
    const claim: BackgroundExecutionClaim = {
      libraryIdentity: a.identity,
      generation: a.generation,
      sessionToken: a.notebookSession,
      assetId: i.asset_id,
      token: randomUUID(),
      intentId: i.id,
      attemptId: randomUUID(),
      attemptEpoch: (prior?.attempt_epoch ?? 0) + 1,
      intentRevision: i.revision,
      policyRevision: p.revision,
      assetRevision: i.asset_revision,
      previewGeneration: i.preview_ref,
      rule,
    };
    if (prior) history(a, claim);
    a.database
      .prepare(
        `INSERT INTO background_analysis_executions VALUES(?,?,?,?,?,?,'claimed',NULL,?,?,?,NULL,NULL,0,?) ON CONFLICT(intent_id) DO UPDATE SET attempt_id=excluded.attempt_id,attempt_epoch=excluded.attempt_epoch,intent_revision=excluded.intent_revision,policy_revision=excluded.policy_revision,owner_session=excluded.owner_session,state='claimed',request_id=NULL,backend_id=excluded.backend_id,model_name=excluded.model_name,binding_sha256=excluded.binding_sha256,effect_id=NULL,effect_sha256=NULL,call_units=0,updated_at=excluded.updated_at`,
      )
      .run(
        i.id,
        claim.attemptId,
        claim.attemptEpoch,
        i.revision,
        p.revision,
        a.notebookSession,
        rule.backendId,
        rule.model,
        rule.bindingSha256,
        new Date().toISOString(),
      );
    a.backgroundAuthority.claims.set(claim.token, claim);
    return claim;
  }
  return null;
}
export function attachBackgroundRequest(
  a: ExecutionBinding,
  c: BackgroundExecutionClaim,
  requestId: string,
) {
  validateBackgroundClaim(a, c);
  const row =
    c.rule.capability === "tags"
      ? (a.database
          .prepare(
            `SELECT i.asset_id,i.asset_revision,i.preview_generation,r.backend_id,r.model_name,r.backend_binding_sha256 AS binding_sha256,r.recipe_id AS recipe FROM independent_tag_request_items i JOIN independent_tag_requests r USING(request_id) WHERE i.request_id=? AND i.asset_id=? AND r.library_identity=?`,
          )
          .get(requestId, c.assetId, a.identity) as any)
      : (a.database
          .prepare(
            "SELECT * FROM basic_analysis_requests WHERE request_id=? AND asset_id=? AND capability=?",
          )
          .get(requestId, c.assetId, c.rule.capability) as any);
  if (
    !row ||
    row.asset_revision !== c.assetRevision ||
    row.preview_generation !== c.previewGeneration ||
    row.backend_id !== c.rule.backendId ||
    row.model_name !== c.rule.model ||
    row.binding_sha256 !== c.rule.bindingSha256 ||
    row.recipe !== c.rule.recipe
  )
    fail("BACKGROUND_REQUEST_MISMATCH");
  a.database
    .prepare(
      "UPDATE background_analysis_executions SET request_id=? WHERE intent_id=? AND attempt_id=?",
    )
    .run(requestId, c.intentId, c.attemptId);
}
export function markBackgroundSent(
  a: ExecutionBinding,
  c: BackgroundExecutionClaim,
) {
  const { row } = validateBackgroundClaim(a, c);
  if (row.state !== "claimed" || !row.request_id)
    fail("BACKGROUND_CLAIM_EXPIRED");
  const units = c.rule.location === "external" ? 2 : 0,
    p = readExecution(a, c);
  if (units && p.budgetUsed + units > p.policy.dailyCallLimit)
    fail("BACKGROUND_DAILY_BUDGET");
  if (units)
    a.database
      .prepare(
        "INSERT INTO background_analysis_call_budget VALUES(?,?) ON CONFLICT(day) DO UPDATE SET units=units+excluded.units",
      )
      .run(day(), units);
  a.database
    .prepare(
      "UPDATE background_analysis_executions SET state='sent',call_units=?,updated_at=? WHERE intent_id=?",
    )
    .run(units, new Date().toISOString(), c.intentId);
}
export function completeBackground(
  a: ExecutionBinding,
  c: BackgroundExecutionClaim,
  effectId: string,
  payload: unknown,
) {
  const { row } = validateBackgroundClaim(a, c);
  if (row.state !== "sent") fail("BACKGROUND_ATTEMPT_NOT_SENT");
  a.database
    .prepare(
      "UPDATE background_analysis_executions SET state='succeeded',effect_id=?,effect_sha256=?,updated_at=? WHERE intent_id=?",
    )
    .run(effectId, sha(payload), new Date().toISOString(), c.intentId);
  history(a, c);
}
export function finishBackground(
  a: ExecutionBinding,
  c: BackgroundExecutionClaim,
  state: "failed" | "cancelled" | "unknown" | "deferred",
) {
  const { row } = held(a, c);
  if (state === "deferred" && row.state !== "claimed")
    fail("BACKGROUND_ATTEMPT_SENT");
  a.database
    .prepare(
      "UPDATE background_analysis_executions SET state=?,updated_at=? WHERE intent_id=?",
    )
    .run(state, new Date().toISOString(), c.intentId);
  history(a, c);
  a.backgroundAuthority.claims.delete(c.token);
}
export function recoverBackground(
  a: ExecutionBinding,
  r: BackgroundRecoveryDecision,
) {
  check(a, r);
  const row = a.database
    .prepare(
      "SELECT * FROM background_analysis_executions WHERE intent_id=? AND attempt_id=?",
    )
    .get(r.intentId, r.attemptId) as any;
  const intent =
    row &&
    (a.database
      .prepare(
        "SELECT asset_id,capability FROM background_analysis_intents WHERE id=?",
      )
      .get(r.intentId) as any);
  if (
    !row ||
    (r.assetId !== undefined && r.assetId !== intent.asset_id) ||
    [...a.backgroundAuthority.claims.values()].some(
      (c) => c.intentId === r.intentId,
    ) ||
    !["reconcile", "keep", "abandon", "rerun"].includes(r.action)
  )
    fail("BACKGROUND_CONFLICT");
  // Receipt-first readback; never infer remotely just to reconcile an interrupted attempt.
  if (r.action === "reconcile" && row.request_id && row.state !== "succeeded") {
    const source = readTagIntentContext(a, {
      ...r,
      assetId: intent.asset_id,
    }).asset;
    let effectId: string | undefined, payload: string | undefined;
    if (intent.capability === "tags") {
      const tag = a.database
        .prepare(
          `SELECT f.*,i.asset_revision,i.preview_generation,r.backend_id,r.model_name,r.backend_binding_sha256,r.recipe_id,e.input_sha256,e.tags_json,x.input_sha256 AS attempted_input FROM independent_tag_effect_receipts f JOIN independent_tag_request_items i USING(request_id,asset_id) JOIN independent_tag_requests r USING(request_id) JOIN independent_tag_evidence e ON e.id=f.tag_evidence_id JOIN independent_tag_executions x USING(request_id,asset_id) WHERE f.request_id=? AND f.asset_id=? AND r.library_identity=?`,
        )
        .get(row.request_id, intent.asset_id, a.identity) as any;
      if (
        tag &&
        tag.asset_revision === source.revision &&
        tag.preview_generation === source.previewGeneration &&
        tag.backend_id === row.backend_id &&
        tag.model_name === row.model_name &&
        tag.backend_binding_sha256 === row.binding_sha256 &&
        tag.recipe_id === "independent-tags-v1" &&
        tag.input_sha256 === tag.attempted_input &&
        tag.payload_sha256 ===
          sha({ tags: JSON.parse(tag.tags_json), combined: null })
      ) {
        effectId = tag.effect_id;
        payload = tag.payload_sha256;
      }
    } else {
      const receipt = basicReceipt(a, row.request_id, intent.asset_id);
      if (
        receipt &&
        receipt.capability === intent.capability &&
        receipt.asset_revision === source.revision &&
        receipt.preview_generation === source.previewGeneration &&
        receipt.backend_id === row.backend_id &&
        receipt.model_name === row.model_name &&
        receipt.binding_sha256 === row.binding_sha256 &&
        receipt.recipe ===
          (intent.capability === "caption"
            ? "caption-v1"
            : "rapidocr-onnxruntime-1.4.4")
      ) {
        effectId = receipt.effect_id;
        payload = receipt.payload_sha256;
      }
    }
    if (effectId) {
      history(a, { intentId: r.intentId });
      a.database
        .prepare(
          "UPDATE background_analysis_executions SET state='succeeded',effect_id=?,effect_sha256=?,updated_at=? WHERE intent_id=?",
        )
        .run(effectId, payload, new Date().toISOString(), r.intentId);
    }
  }
  if (["rerun", "abandon"].includes(r.action)) {
    if (!["unknown", "failed", "cancelled", "deferred"].includes(row.state))
      fail("BACKGROUND_CONFLICT");
    history(a, { intentId: r.intentId });
    a.database
      .prepare(
        "UPDATE background_analysis_executions SET state=?,updated_at=? WHERE intent_id=?",
      )
      .run(
        r.action === "rerun" ? "deferred" : "abandoned",
        new Date().toISOString(),
        r.intentId,
      );
  }
  return readExecution(a, r);
}
