# Work Mode Preserves Reference Context And Host-Owned Media

Status: Accepted (2026-09-14). Product and ownership boundary; target-only beyond the existing single Asset Card window.

Work Mode is a core creation-facing surface alongside library organization and focused viewing.
A saved Work Set references assets and its own presentation/notes; multiple native Work Windows
can keep different sets visible beside other design applications. This extends ADR 0009/0483's
understand/find/reuse loop without making a second library or requiring a community plugin for
basic reference use. The detailed target and proposed interactions are in
[WORK-MODE-AND-MOTION-REFERENCE.md](../product/WORK-MODE-AND-MOTION-REFERENCE.md).

## Ownership and trade-offs

- Work Set membership is separate from Collection membership and asset ownership. Removing a
  reference, closing a window or deleting a set never deletes the asset or reorganizes its library.
  Inspection, contextual AI, supported tools and handoff remain available by capability; library
  organization stays in the main library surface. Work notes do not silently overwrite global metadata.
- Persist the reference context and display settings, not copies of every Original or live permission
  tokens. Device window geometry is distinguishable from library reference data. Library close/change
  revokes every old window's access; saved records survive for an authorized reopen. Missing or trashed
  assets remain explainable references rather than silently disappearing. Initial sets are library-bound;
  cross-library federation is not implied by multi-window support.
- Native handoff preserves ADR 0013/0348 Original-versus-derived and Copy boundaries. The host validates
  identity and supplies the intended file/compatible export through bounded handoff, without exposing
  library originals to implicit move/writeback. A preview URL or browser-only drag demo is not proof of
  cross-application transfer; receiving-app and platform support must be demonstrated.
- Screen recording is an optional producer, not a new embedded browser. The host owns admitted videos,
  durable selected reference-frame records and source attribution. Other imported videos use the same
  media boundary. Plugin disable/uninstall cannot delete these assets, frame selections or prior results.
  This reuses ADR 0106/0154 intake and ADR 0155/0156 permissions/isolation; recording adds no ambient
  screen, audio or asset-library grant. Native recording adapters require their own implementation evidence.
- A Video Reference Frame identifies actual video time and source generation; it is not necessarily a
  codec keyframe or an independently imported asset. User choices/notes are durable, not disposable
  thumbnails. Saving a separate image is explicit and retains derivation; unlinking a frame does not
  delete the video, and deleting a video does not silently delete independently saved derivative assets.
- Website URLs are provenance, not browsing credentials or an instruction to fetch. A recording preserves
  observed visual behavior, not original source code. Future AI implementation suggestions identify their
  input coverage and remain suggestions; no silent cloud upload or automatic generated-code execution.

## Relationship to existing decisions

This supplements ADR 0483's core scope and ADR 0484's optional-plugin boundaries. Work Mode and
basic reference use are core; screen recording and advanced automated motion analysis are optional.
It does not retire either earlier ADR or change existing IPC/schema, saved-library data, external-provider
consent or current card behavior. The former single-window UI is an implementation starting point,
not a product constraint requiring one window forever. Detailed UI defaults and codec support remain
local specifications and validation decisions, not a frozen public SDK in this ADR.
