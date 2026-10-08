# Domain documentation

The repo uses one `CONTEXT.md` glossary and `docs/adr/` decision corpus.
These are references, not an extra startup protocol. Current product scope is
[PRODUCT-FOUNDATION.md](../product/PRODUCT-FOUNDATION.md); ADR 0483/0484 name
the core AI+, optional-plugin and deferred development-access boundaries.

## Select only what the task needs

- For a local implementation task, start with nearby code, callers and tests.
- For an unclear domain term, search `CONTEXT.md` for that exact term.
- For product semantics or irreversible tradeoffs, use `docs/adr/README.md`
  to select the smallest relevant ADR set, then read each selected ADR fully.
- Verify current behavior in the composition root and executable tests.
  Accepted decisions, UI labels and Runtime Probes do not prove delivery.
- Missing optional background is not a reason to scaffold more docs. If an
  unavailable source is necessary to decide safely, state that specific gap.

## Meaning and ownership

Use the glossary's domain names. Do not invent a duplicate term for an existing
concept. A real terminology change belongs in the glossary; irreversible
decisions with tradeoffs belong in ADRs. Local parameters and test matrices
belong in the nearest module specification.

Keep decision lifecycle (Core / Supporting / Spec-candidate / Historical)
separate from delivery (Implemented / Partial / Target-only / Blocked / Unknown).
Apply explicit supersession only to the named clauses. Future specifications
constrain work in that capability, not every core feature or the whole release.
State unresolved conflicts explicitly; do not silently discard safety invariants.
Before retiring one, map replacement coverage, check inbound references and
preserve a recoverable snapshot/checkpoint and scoped diff; this does not require
committing unrelated work.

Module `ADR-REFERENCE.md` files preserve previously duplicated future rules
for lookup; the canonical ADR is authoritative. `docs/history/` preserves
old change logs. Neither belongs in normal startup reading.
