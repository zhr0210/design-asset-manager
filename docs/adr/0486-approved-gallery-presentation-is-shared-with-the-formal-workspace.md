# Approved Gallery Presentation Is Shared With The Formal Workspace

Status: Accepted (2026-09-15). User requested prototype-led visual replication and design/ADR alignment.
This decision does not certify pixel parity or backend capability; evidence remains in the design delivery record.

## Decision

The latest user-approved Gallery & Glass prototype defines the formal Asset Workspace's visual and
interaction contract. DESIGN.md owns the specification and tokens. The former mobbin.md was merged on
2026-09-15 and now only redirects to DESIGN.md. A shared Renderer presentation module provides layout, glass controls, folders, grid transitions,
focus viewing and annotation tools. Prototype fixtures/storage and formal library adapters remain separate.

Preserving Main/Preload/library authority does not require preserving legacy visual components. Existing
editing and tool actions must be adapted into the approved surface instead of becoming a second simplified UI.
Unsupported persistence or format capabilities have explicit unavailable states at their intended locations;
prototype state must never be presented as a completed formal save. Scope/session changes revoke draft views.

Acceptance requires both visual/interaction comparison against the approved reference and formal data-chain
checks. Shared CSS alone is not pixel evidence; test viewport, media, ordering, theme and state must match.
Tests adapted to a changed implementation cannot silently redefine the user's visual acceptance baseline.

## Trade-offs and replacement scope

Sharing presentation introduces an adapter seam and demands explicit missing-data states. It avoids drift
from maintaining two visual implementations. Prototype-only execution, fake metadata and browser storage do
not cross into formal data ownership. The host remains authoritative for files, identity, writes and recovery.

This supersedes the interpretation of ADR 0483's “visual polish follows evidence” as permission to defer or
replace an already approved design. It supplements ADR 0009 and ADR 0485 with one presentation contract;
there is no new public IPC, schema, source mutation, model invocation or third-party execution authority.
Older WORKSPACE-UI-SYSTEM, WORKSPACE-MOTION, UI-UX-HANDOFF and intermediate inspector/motion records remain
historical references. Their old navigation, blur, fixed card sizes and component geometry cannot override
DESIGN.md. Copy ownership, user edits, privacy, permissions and recovery rules remain in force.
