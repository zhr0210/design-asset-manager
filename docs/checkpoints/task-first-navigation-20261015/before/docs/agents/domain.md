# Domain documentation

The repo uses one `CONTEXT.md` glossary and `docs/adr/` decision corpus.
These are references, not an extra startup protocol. Current product scope is
[PRODUCT-FOUNDATION.md](../product/PRODUCT-FOUNDATION.md); ADR 0483/0484 name
the core AI+, optional-plugin and deferred development-access boundaries.

## Select only what the task needs

- For every project task, identify its subject and impact, then read the ADRs relevant to that scope. Task type is never an exemption: research, planning, product/design discussions, documentation, operations and engineering are examples, not an exhaustive list. Where implementation facts matter, also inspect the relevant code, callers and tests.
- For an unclear domain term, search `CONTEXT.md` for that exact term.
- Use [task types](../adr/indexes/tasks.md) and [topics](../adr/indexes/topics.md) to select a small set of candidate metadata before reading exact ADRs/details. Task type changes reading focus, never applicability. Use [the reading protocol](../adr/README.md#read-protocol) for the selected set. Check status, assumptions and explicit supersession, then follow extracted details in docs/product/specs. Existing ADRs provide decision context for any task; reading them is not conditional on changing code or proposing a new irreversible decision.
- Context-route matches are navigation hints; deferred or unmatched ADRs may still apply. Follow subsystem/source references as needed. Do not read the entire corpus for each task.
- If a proposal conflicts with an effective decision, identify the ADR/clause and explain the reason or changed assumptions. Respect the latest explicit user decision and its precise replacement scope; do not silently override or invent a new per-interface approval requirement.
- Verify current behavior in the composition root and executable tests.
  Accepted decisions, UI labels and Runtime Probes do not prove delivery.
- Missing optional background is not a reason to scaffold more docs. If an
  unavailable source is necessary to decide safely, state that specific gap.

## Record a new decision

Creating a new ADR is a separate action from reading existing ones. Record a new decision only when all three hold: meaningful reversal cost, a choice that needs context to explain, and real alternatives/trade-offs. Keep context, decision and why; cite a superseded ADR and exact replacement scope when revisiting it. Routine implementation, terminology lookup and documentation maintenance do not each need a new ADR.

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

词库按既有领域分组，不创造多个Bounded Context。1409个原定义保留意义；其中重复Palette Folder合并为一个定义，现为1408个不同术语；精确词/所属组索引见[本轮词库索引](../checkpoints/documentation-rebuild-20261015/glossary-index.json)。工程流程术语不加入产品词库。
