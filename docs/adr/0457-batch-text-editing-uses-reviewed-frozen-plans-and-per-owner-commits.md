# Batch Text Editing Uses Reviewed Frozen Plans And Per-Owner Commits

Multi-selection Text editing is always a Reviewed Batch Action because replacing
or transforming Mixed Value metadata across many owners is not equivalent to
one low-risk field edit. Batch Inspector shows All Missing, Same Value or Mixed
Value with present/Missing and eligible/excluded counts and defaults to No
Change. Its core action catalog is Set One Present Value, Clear Values, Add
Prefix, Add Suffix and **Exact Literal Text Replacement**. Set with zero-length
input routes visibly to Clear rather than disguising removal as a value.
Prefix, suffix and replacement default to present values only; **Treat Missing
Text As Empty** is a separate explicit option whose newly derived empty result
still remains Missing under ADR 0441.

Exact Literal Text Replacement is case-sensitive over authoritative NFC Text,
replaces every non-overlapping match from left to right and rejects an empty
find operand. It never inherits ADR 0450 comparison modes, ADR 0443 Portable
Text Pattern syntax, locale folding, regular expressions, trimming or invisible
cleanup. No batch action concatenates Mixed Values, guesses a merge, collapses
whitespace or normalizes beyond ADR 0440 NFC. Prefix, suffix and replacement
parameters are canonicalized before preview, while every resulting value
preserves all untouched whitespace, line breaks and valid invisible formatting.

Before confirmation, a **Batch Text Edit Plan** freezes the ADR 0080 selection
scope, exact owner/field identities, action and parameters, Treat Missing
choice, definition/rule revision and each owner's base value revision. The
review shows mutually exclusive Changed, Unchanged, Invalid, Conflict/Drift and
other Excluded counts plus bounded representative before/after examples without
implying complete renderer materialization. Existing Out-of-Constraint is a
labelled non-additive current-value subset across those outcomes. Every
proposed present value passes ADRs 0440–0444 NFC, grapheme, character-safety,
minimum and pattern validation; a new invalid value is excluded rather than
committed as Out of Constraint, clamped or truncated.

Execution follows ADRs 0094 and 0096: each owner revalidates current identity,
lifecycle, definition, rules and base value immediately before one atomic
commit, while the batch is not one global transaction. Already committed items
remain successful when a later owner is unchanged, invalid, conflicting,
failed, excluded or cancelled. Revision drift enters ADR 0097 field-aware
conflict review without overwrite, and cancellation stops only not-yet-started
owners at item boundaries. Selection remains visible and Batch Inspector
refreshes from persisted results under ADRs 0084 and 0085.

The Batch Text Edit Result and any Batch Undo are operation-scoped and never add
per-owner steps to ADR 0465 Custom Field Edit Undo Stack. ADR 0458 keeps the resumable
operation record library-bound without previous Text, stages exact Undo
evidence only in an operating-system-protected device-local journal, pauses
rather than auto-resuming after interruption and starts the shared result/Undo
retention window only when the operation becomes terminal.

ADR 0459 applies the same explicit plain Unicode paste/drop contract to Set,
Prefix, Suffix and replacement parameter editors. Clipboard or drag input
cannot bypass canonicalization, preview validation or frozen-plan creation and
never supplies files, images or asset relationships as implicit parameters.
