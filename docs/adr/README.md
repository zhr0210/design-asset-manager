# ADR Decision Router

This is the compact entry point for Design Asset Manager's decision corpus.
It does not replace the ADRs and is not evidence that target behavior is
implemented.

The complete `0001`–`0481` corpus was read and cross-checked against the
product position, `CONTEXT.md`, and current code on 2026-07-30. ADR `0482`
was added and classified as Core on 2026-08-30. The 2026-09-14 product alignment
adds Core ADRs 0483/0484 and marks ADR 0010 Historical; it is a focused audit,
not a claim to have re-read every ADR this turn. The same-day Work Mode request
adds Core ADR 0485 for reference-set and host-owned media boundaries. The
pre-optimization corpus is preserved by the annotated Git tag
`adr-corpus-pre-optimization-20260730`.

## Read Protocol

Use this protocol when the current task needs decision background. A local
implementation task can start at nearby code and tests under AGENTS.md; this
page is not another mandatory startup step or authorization to resume a queue.

1. Read the Product Spine below.
2. Use the Domain Routes table to select the smallest relevant ADR set.
3. Read every selected ADR completely.
4. Search `CONTEXT.md` only for the exact terms used by the task.
5. Inspect current code and focused tests before claiming implementation.
6. Surface conflicts instead of silently choosing a convenient paragraph.

Do not read all 485 ADRs for ordinary work. Do not infer current behavior from
an accepted decision. Do not infer that a decision is obsolete merely because
its implementation is missing.

## Two Independent Axes

### Decision lifecycle

- **Core**: a cross-domain product or safety invariant. Read for every change
  that can affect it.
- **Supporting**: an accepted domain decision. Read when working in that
  domain.
- **Spec-candidate**: valuable interaction, state-machine, protocol,
  performance, or test detail that should eventually move behind a shorter
  canonical ADR. Still-valid clauses apply when that capability is in scope,
  subject to explicit supersession; an unimplemented future specification is
  not an authorization or a prerequisite for unrelated core work.
- **Historical**: superseded decision evidence. Keep for reasoning and
  traceability; do not implement as current behavior.

### Delivery state

- **Implemented**: focused code and executable evidence exist.
- **Partial**: a real slice exists, but material accepted behavior is absent.
- **Target-only**: the ADR explicitly records future architecture.
- **Blocked**: delivery depends on an identified external decision,
  environment, credential, artifact, or approval.
- **Unknown**: inspect before claiming a state.

Decision lifecycle and delivery state must never be collapsed into one status.
For example, ADR 0292 is Core and largely Target-only; ADR 0323 is Historical
even though it remains useful evidence for why source replacement was rejected.

## Audit Classification

| Class | Count | Share |
| --- | ---: | ---: |
| Core | 87 | 17.9% |
| Supporting | 194 | 40.0% |
| Spec-candidate | 195 | 40.2% |
| Historical | 9 | 1.9% |
| Total | 485 | 100% |

### Core ADRs

```text
0001–0003, 0005, 0009, 0011, 0013–0016, 0018–0019, 0033, 0037,
0060, 0064, 0066–0067, 0071, 0088, 0097, 0105–0106, 0111, 0114,
0137, 0140–0145,
0161, 0165, 0168–0169, 0173–0174, 0178–0179, 0181–0187, 0193,
0275–0276, 0278–0284, 0292–0297, 0301, 0303–0305, 0309, 0314,
0319–0320,
0335, 0340, 0348, 0351, 0357–0358, 0383, 0404–0406, 0413–0414,
0482–0485
```

### Spec-candidate ADRs

```text
0021, 0023–0025, 0027, 0029–0030, 0035–0036, 0038, 0044, 0046,
0049–0050, 0053, 0056–0057, 0062, 0070, 0076, 0081, 0084–0085,
0087, 0089, 0092, 0095, 0098, 0104, 0109, 0113, 0132, 0134,
0146, 0148–0149, 0154,
0204–0205, 0207–0215, 0217–0220, 0223–0274, 0286–0291,
0329–0334, 0336–0338, 0343, 0345–0347, 0349, 0354–0356,
0359–0361, 0363–0370, 0379, 0381, 0384–0392, 0394–0399,
0407–0412, 0425–0431, 0434, 0446–0454, 0456–0457, 0459–0460,
0462–0464, 0466–0471, 0478–0481
```

Every ADR not listed as Core, Spec-candidate, or Historical is Supporting.
This classification is a reading route, not permission to rewrite or delete.

### Historical ADRs

| ADR | Current replacement |
| --- | --- |
| 0010 | ADR 0483 retires embedded web collection; the old staged-retention text remains historical. |
| 0012 | ADR 0026 replaces the right-side Capture Inbox placement. |
| 0121 | ADR 0123 requires automatic System Preview before Promotion. |
| 0323–0328 | ADR 0348 rejects cross-format current-source replacement and keeps outputs source-separated. |

## Product Spine

The [product foundation](../product/PRODUCT-FOUNDATION.md) owns current scope.
ADR 0483 makes AI+ the built-in core; ADR 0484 scopes optional extensions and
explicitly defers cloud development access/MCP/community infrastructure. These
new ADRs identify the exact clauses they replace; unrelated safety invariants
remain. The complete ecosystem is not a mandatory first-release checklist. ADR 0485 adds
core Work Mode (saved multi-asset sets/multiple floating windows) and optional
recording producers with host-owned durable video/frame/source records.

These decisions define the product before domain detail:

1. **Asset Workspace is primary** — ADR 0009/0483. Embedded web collection is
   retired. AI+ understanding, retrieval and reuse define the main workflow;
   advanced tools are optional plugins under ADR 0484.
2. **Search-first organization** — ADR 0033 and ADR 0413. Unsorted is a valid
   indefinite state; classification completeness is never an admission or
   retrieval gate.
3. **One intake path** — ADR 0105–0106. Capture Producers create Candidate
   work through Capture Gateway before Promotion.
4. **Originals are never silently harmed** — ADR 0013, 0066, 0111, 0280–0284,
   0292–0297, 0340, 0348, 0351, 0405–0406, and 0482.
5. **Copy is the ordinary default** — ADR 0292. Copy Into Library is visible,
   recommended, and preselected; Reference in Place is explicit and advanced.
   Neither mode changes the selected external source.
6. **AI is local-first** — ADR 0002 and 0141. External analysis is available
   only for the currently disclosed action or batch after explicit grant;
   saved provider configuration is not upload consent.
7. **AI is progressive and non-blocking** — ADR 0016, 0140–0145, and
   0168–0169. Missing or unconfirmed enrichment does not block Promotion.
8. **Discovery must remain useful without vectors** — ADR 0181. Lexical and
   structured retrieval remain complete; semantic and visual channels add
   compatible evidence.
9. **Search results explain why they matched** — ADR 0181–0184. Model spaces
   are isolated, image queries are explicit, and ordinary query history is
   ephemeral by default.
10. **AI belongs in the work context** — Asset Workspace search, Inspector,
    and contextual AI actions are the primary product interaction. AI Console
    is diagnostics and model/runtime management, not a chatbot-first home.
11. **User-authored state outranks generated evidence** — ADR 0140, 0193,
    0406, and 0418–0419. Model or trust changes do not silently rewrite,
    remove, or de-rank prior committed user-owned values.
12. **Public contracts change deliberately** — shared IPC, database schema,
    worker HTTP contracts, library ownership, and source mutation require
    focused approval, synchronized callers, docs, and tests.

## Domain Routes

| Domain | ADR range | Start with | Current delivery note |
| --- | --- | --- | --- |
| Platform, runtime, release | 0001–0008 | 0001–0003, 0005 | Substantial governance exists; Real Model Path evidence remains capability-specific. |
| Workspace and navigation | 0009–0039 | 0009, 0011, 0033, 0037 | Asset Workspace is primary; embedded browsing, site login, page extraction and external website search are retired. Future connectors are not delivered. |
| Work Mode and motion references | 0485 | 0485, 0483–0484 | Current single native card is a starting point; saved multi-set/multi-window, video-frame and native handoff targets need implementation evidence. |
| Filters and review | 0040–0076 | 0060, 0064, 0067, 0071 | Active Library tags and recoverable Trash are wired with synthetic evidence; broader review targets remain capability-specific. |
| Batch and conflict | 0077–0104 | 0088, 0097 | Principles are accepted; most operation state machines are Target-only. |
| Capture Gateway and intake | 0105–0118 | 0105–0106, 0111, 0114 | Local Copy, independent download intake and image variants use the held Active Library and shared Capture boundary; real-library validation remains paused. |
| Preview, color, evidence | 0119–0150 | 0137, 0140–0145 | Normalization exists; Preview Broker, generation evidence, and coverage are missing. |
| Extension and model library | 0151–0167, 0483–0484 | 0483–0484, 0155–0156; models: 0161, 0165 | Read ADR 0483/0484 first for core/optional/deferred scope. Public SDK and external development access remain target-only. |
| Progressive local AI | 0168–0180 | 0168–0169, 0173–0174, 0178–0179 | Probes and tasks exist; the four-capability automatic baseline is not complete. |
| Asset discovery | 0181–0184, 0404 | 0181–0184, 0404 | A real in-memory lexical-only baseline and bounded Match Explanation exist; durable indexes/embeddings, visual query, and rank fusion remain absent. |
| Backup and AI trust | 0185–0222 | 0185–0187, 0193 | Extensive target governance; not an Alpha dependency except privacy and result integrity. |
| Managed model package lifecycle | 0223–0274 | Read the exact task only | Mostly Spec-candidate state-machine and UI detail; keep out of normal startup context. |
| Libraries and storage ownership | 0275–0291, 0482 | 0275–0284, 0482 | Active Library authority and app/download storage are separate; ownership and recovery are wired with synthetic evidence. Real-data migration is separately scoped. |
| Add Assets ownership | 0292–0300 | 0292–0297 | Managed Copy and Trash are composed with inspected, held library authority; synthetic integration evidence is not real-data migration evidence. |
| Referenced source operations | 0301–0334 | 0301, 0303–0305, 0319–0322 | Advanced post-Alpha capability; cross-format replacement is Historical. |
| Copy intake and compound originals | 0335–0350 | 0335, 0340, 0348 | Needed for safe intake formats, but no current compound identity model exists. |
| Ownership conversion and writeback | 0351–0370 | 0351, 0357–0358 | Preserve safety boundaries; do not make this an Alpha dependency. |
| Metadata portability | 0371–0382 | 0371–0374 | Later capability; most protocol details are Spec-candidate. |
| Export and long operations | 0383–0412 | 0383, 0400–0406 | Original/Compatible truth boundaries are durable; scheduling detail is later. |
| Search-first organization | 0413–0414 | Both | Core and accepted; Asset Workspace is now the default, while broader Search Palette and organization targets remain partial. |
| Custom fields | 0415–0481 | 0415, 0418–0424, then exact type | Accepted future domain, but 67 ADRs are not part of the Private Alpha critical path. |

## Conflict and Drift Queue

| Topic | Decision |
| --- | --- |
| Local vs external AI | Local capability is the default. External use requires a visible task- or batch-scoped grant; no silent fallback. |
| Unsorted vs Promotion blocking | Missing a more specific Collection target is not blocking. Only an explicit target conflict may block. |
| AI suggestion review | Pending, low-confidence, unavailable, or rejected AI enrichment is non-blocking by itself. |
| Capture Inbox placement | ADR 0026 replaces ADR 0012 and the right-side placement clause in ADR 0020. The right side remains Inspector space. |
| Recent Captures | Recency is an informational dynamic view with Match Count, not an unresolved Review Signal queue. |
| Direct-to-library fast path | A fast path still uses Capture Gateway and Candidate Identity; one reviewed action may immediately promote after activation. |
| Duplicate signals | Duplicate evidence is advisory by default. Only a proven active identity/core conflict may affect default batch eligibility. |
| Cross-format source change | ADR 0348 is authoritative. Compatible Export never becomes the current Original through an application source-replacement flow. |
| Runtime bootstrap consent | ADR 0483 resolves ADR 0170/0188: one explicit reviewed setup may cover its disclosed dependencies. Display or unmetered network alone never authorizes installation. |
| Copy vs Reference latency | The ordinary Copy path must become progressively visible/searchable and must not be slower because it is safer. This is an implementation requirement, not permission to bypass Candidate identity. |
| AI Console role | Keep as diagnostics/model management. Do not expand it as the primary AI product surface. |
| Adopted library terminology | ADR 0275's In-Place Reference Library and ADR 0292's Reference in Place are different flows; UI naming needs a later terminology decision before either ships. |

## Current Code Reality

Current wiring, validation limits and source entry points belong in
[implementation status](../agents/implementation-status.md) and nearby module
READMEs. This router does not maintain another full capability snapshot.
For work that depends on delivery, inspect Main/Preload/Renderer callers and
focused evidence; accepted architecture, a runtime Probe and synthetic external
responses are not real model-quality or user-library validation.

The product priority under ADR 0483 is:

```text
Safe local intake and reliable manual operations
  → progressive measured colors / AI tags / description / prompt results
  → explicit result storage and retrieval
  → explained matches, saved Work Sets and persistent visual reference while creating
  → correction and safe cross-application reuse
```

The current lexical baseline is not proof that every result kind, durable semantic
search or small-model execution is complete. Confirm each lane separately.
Advanced layer tools, a full third-party marketplace, cloud development/MCP,
cross-library federation, Custom Field long tails and export scheduling are
future scope, not prerequisites for this core loop. Their applicable security and
ownership requirements still apply before executing those capabilities.

## Retirement Rule

No ADR is deleted merely for length, age, title similarity, or missing
implementation. Before marking one Historical:

1. Name the canonical replacement.
2. Map every still-valid invariant and exception to replacement text or a
   focused specification.
3. Validate all inbound ADR references.
4. Update the nearest code/module docs and focused tests where behavior exists.
5. Preserve a recoverable checkpoint, such as a source snapshot plus staged/working patches; do not force a commit of unrelated work.
6. Keep a scoped replacement map and reviewable diff. Commit only when requested or otherwise authorized for that task.

Fixed durations, retry counts, memory limits, pagination, focus behavior,
format matrices, and button-level interaction usually belong in versioned
capability, interaction, performance, or test specifications. Moving them does
not authorize weakening their safety or privacy guarantees.

- [0486 — Shared approved Gallery presentation](0486-approved-gallery-presentation-is-shared-with-the-formal-workspace.md): one visual contract, separate data adapters and dual acceptance.

- [0487 — Library-owned asset notebooks](0487-asset-notebooks-use-versioned-library-owned-storage.md): independent annotations, explicit v5 upgrade and conflict-safe saves.

- [0488 — Library folders and palettes](0488-library-folders-and-palettes-store-references.md): reference-only membership, explicit v6 upgrade and normalized palette storage.

- [0489 — Work sets and native window authority](0489-work-sets-separate-saved-references-from-native-window-authority.md): per-set saves, device layouts and independent sandboxed windows.

- [0490 — Dedicated OCR results and corrections](0490-dedicated-ocr-preserves-empty-results-and-user-corrections.md): explicit v8 storage, valid-empty precedence and user correction protection.
