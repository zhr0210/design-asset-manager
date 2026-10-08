# Ineligible Static Defaults Are Preflight-Resolved Or Suspended Without Blocking Owner Creation

A Static Custom Field Default is authority for future writes, so a user-authored
schema or Select-option operation cannot knowingly leave it executable when the
result would violate the target definition. Before any write, trusted
preflight validates the exact retained default against the proposed type,
constraints and option identities. If it would become ineligible, the same
review requires one explicit disposition: replace it with a currently valid
typed default, disable it, or cancel the originating operation. There is no
Keep And Apply Invalid choice.

This zero-write gate applies to restrictive validation changes, in-place empty
field type changes, target-definition creation during type migration, Select
option archive/permanent delete and every other user action that can invalidate
the default. An explicit Custom Field Option Merge may retarget a referenced
Single Select option or Multi Select member to the reviewed active target
identity, deduplicating the Multi Select set, only when that default consequence
is included in the merge impact review. Evidence drift invalidates the complete
schema/option/default plan rather than committing a different result. Existing
owner values still follow their own ADR 0432/0438 preservation and migration
contracts.

Library migration, version upgrade or recovery may instead discover an
unexpected **Ineligible Static Custom Field Default** that no current user
transaction could preflight. The application preserves its exact portable
definition evidence, marks the default Suspended and exposes one definition-
level **Default Needs Attention** state with a typed reason. It never coerces,
replaces, deletes or applies the default, and never converts it into an
Out-of-Constraint current value. Ordinary definition archive remains a normal
suspension and does not by itself create this attention state.

Search-First Organization means this schema attention cannot block Candidate or
Design Asset creation. A direct creation/import review shows that the default
is unavailable and that the affected field will remain Missing. Automatic
capture and other already-authorized creation continue with Missing, one
aggregate definition-level attention state and no per-owner failure, retry,
notification or Review Signal. Other valid defaults and explicit values remain
independent.

Repair offers a currently valid typed replacement or Disable Default; restoring
an exact missing Select-option identity or changing the rule may make a valid
replacement selectable but grants no silent name-based remapping. Trusted
confirmation clears Default Needs Attention only after current validation.
Repair never backfills owners created while suspended or any earlier Missing
owner and applies only to later eligible owners. ADR 0476 remains the separate
reviewed path when the user intentionally initializes existing Missing owners.
No plugin, importer or AI provider may acknowledge, hide or repair the state
outside ADR 0418 proposal and trusted user-review boundaries.
