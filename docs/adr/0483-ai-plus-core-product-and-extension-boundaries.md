# AI+ Core Product And Extension Boundaries

Status: Accepted (2026-09-14). Product/architecture decision; delivery remains capability-specific.

Design Asset Manager is an AI-centered local asset workbench for visual creators. Its standard
experience includes measured palette/proportions, tag suggestions, scene description, prompt
reconstruction, appropriate OCR and searchable analysis results. Reliable manual management
remains available when models are missing; this resilience does not make AI+ an optional product
add-on. Matting, editable-layer reconstruction and specialized creation tools are optional
extensions. Built-in analyzers can use replaceable providers without requiring users to install
community plugins for the baseline. The current scope is defined in
[PRODUCT-FOUNDATION.md](../product/PRODUCT-FOUNDATION.md). ADR 0485 supplements this core
with saved multi-asset Work Sets, multiple floating windows and safe cross-application reuse;
screen recording is an optional producer whose admitted media remains host-owned.

## Decisions and trade-offs

- Product identity is AI+ understanding, retrieval and reuse, while the host owns asset identity,
  originals, permissions, persistence and recovery. A model or plugin is not the source of write authority.
- Palette ratios are computed under a declared recipe, not invented by a language model. Measured
  values, AI observations, creative prompt reconstructions and user-confirmed values remain distinct.
  All core results have deliberate storage/index/correction/reuse paths and source/version provenance.
  Prompt matches are attributed as prompt matches; drafts/history are not silently indexed.
- Core availability and automatic scheduling are separate. ADR 0169's four model-capability intents
  remain a bounded automatic profile, supplemented by deterministic color work. Prompt reconstruction
  is a core user-facing capability, normally on demand or in a disclosed configured batch. Advanced
  layer/frame/segmentation work does not become baseline merely because it is technically available.
- Hybrid retrieval combines hard numeric/metadata criteria and appropriate lexical/semantic lanes,
  with visible match evidence. Suggestions retain ADR 0016/0181 confirmation and search-scope rules;
  lack of analysis is not a negative observation. Existing user edits outrank regeneration.
- Embedded browsing, site login, page extraction and external website search are retired. Local Copy,
  local Asset Discovery, independent direct-image downloads and existing recovery remain. Future
  browser connectors use the same reviewed host intake rather than restoring an embedded browser.
- First-use setup may group disclosed runtime/model installs and assignments into one explicit
  reviewed choice. Merely detecting an unmetered network or showing a setup page is not authorization
  to download/install AI dependencies. Within an already accepted plan, repeat prompts for the same
  scope are unnecessary; new sources, licenses, permissions or destructive effects remain separate.
- The current implementation phase prioritizes the AI+ analysis → index → find → reuse loop. Advanced
  preview packs, complete third-party distribution and cloud development are not prerequisites.
  UX flows and states lead implementation. Under ADR 0486, an approved visual/interaction design remains
  the formal UI acceptance contract; data integration cannot substitute a simplified design. SDK breadth
  remains progressive and evidence-based.

## Explicit replacement scope

This supersedes ADR 0010's staged retention of the embedded browser and the embedded-browser
clauses of ADR 0009/0106. It replaces ADR 0188's unmetered-network automatic-install exception,
with the corresponding exception reference in ADR 0002 removed. ADR 0190/0192 automatic
patch/remediation payloads additionally require an explicitly accepted scoped maintenance
policy; setup alone does not enable updates, and unmetered evidence is not consent.
This retains side-by-side verification, revocation containment and safe rollback. It clarifies the baseline scope
in ADR 0141/0169/0170 and the core-versus-optional distinction in ADR 0151/0153/0413.
Other clauses remain, especially Copy/ownership, user confirmation, independent evidence,
model-space isolation, no silent external fallback, and result retention (ADR 0002, 0016,
0064/0066/0067, 0137/0140/0143/0144, 0173, 0181/0183/0184 and 0413).
No asset/library migration, model download, external request, schema or runtime API change is
performed by accepting this document.
