# B01 background analysis foundation

Current wiring: AI Console policy review and shared Main/card per-asset panel → trusted narrow IPC → owner/session/revision-fenced Main controller → held Active Library connection. This module persists **plans**, not execution jobs or model results. Production always returns `dispatchAvailable: false` and uses a null automatic-runtime envelope; no worker, HTTP, model start, proxy materialization or automatic dispatch path exists here. Manual tags/combined/OCR remain separate. This is not the complete global resource governor or automatic baseline inference delivery.

The user-confirmed baseline capability choices are tags, short description and OCR. Embedding requires its own explicit opt-in; prompt reverse remains manual. Older four-default-capability target wording is not treated as a directive to enable embedding in this implementation.

New libraries stay profile1. Explicit first policy confirmation discloses backup and v12 incompatibility with older apps; migration uses the qualified local APFS/SQLite/native protocol and4MiB growth cap. Original profiles below10 receive existing combined tag-current seeding exactly once; already10/11 currents remain untouched. Historical DDL, seed, v12 schema/default policy(capabilities true, master false) and the chosen policy commit atomically. No historical asset backfill occurs.

A fixed SQL trigger at the last Promotion lifecycle registration writes at most three model-agnostic intent rows inside the same transaction. Keys use Capture source_generation and candidate preview_generation_identity, never a path or the lifecycle revision that changes on Trash/restore. Replay, opening, policy changes and restoration do not create new intents. The current Managed Copy path has no content-replacement event; changed source tuples project as superseded (cancelled decisions stay terminal) rather than inventing a new operation. Future content change integration is outside B01. Durable rows scale with registered assets; live UI queries return only3 capability aggregates/state groups or at most3 rows for one asset, never materialized images or an unbounded in-memory job queue.

Policy/capability off is a projection and preserves user pause/cancel. Resume applies only to a user-paused row; cancelled is terminal. Individual decisions and policy changes require current session/revision. Card IPC is restricted to its trusted current asset; aggregate and policy modification are Main-only. Async returns recheck owner epoch/session, and GUI request epochs prevent stale polling/authority changes from reviving old state.

Resource readiness reads coarse host memory, power, thermal, idle and window visibility. Unsupported/unknown/stale signals remain unknown. Missing low-power and GPU evidence is not synthesized. The pure policy tests use asserted qualified envelopes; a positive fixture result is only a decision-function result, not inference or runtime qualification. Its conservative RAM reserve is max512MiB/10%total; it is not a measured model peak or a process RSS guarantee.

The first upgrade holds the shared visual barrier and stops/drains existing tags/combined/batch work. OCR's synchronous idle maintenance lock also fences configure-await, prepare and run, invalidates old reviews and refuses active work. It is **not** proof that an earlier cancelled Python process physically exited. OCR actual-exit drain, independent caption commits, runtime ownership/calibration and complete cross-capability resource scheduling remain prerequisites for a later execution round.

Tests: background-analysis.integration.test.ts (real generated Host/SQLite and explicit controller fixtures), background-resource-policy.test.ts (pure policy), background-analysis-ui.test.mjs (production React component with delayed bridge), background-analysis-electron.e2e.test.mjs (compiled formal Main/Preload/Renderer, owned generated library). No real model, user library, runtime cache, Windows or installed-package qualification. Run evidence: .ai-run/background-foundation-20260928.

The v12 enabled flag authorizes collection of plans only. It is not an automatic-inference or external-upload grant; a later execution integration must introduce its own clearly reviewed authorization and qualification rather than silently reinterpret this preference.

## Separate OCR execution seam

B01 `enabled` still collects only future plans and `dispatchAvailable:false` remains the general
executor projection. The separately reviewed `../background-ocr/` module adds session-specific
OCR consent, v13 execution effects and a qualified single-capability path. Production resource
qualification is absent, so the new control displays waiting rather than silently executing.
It neither backfills B01 intents nor reinterprets the existing plan switch as model permission.
