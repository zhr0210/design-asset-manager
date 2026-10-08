# Selection Persists Only Within the Same Result Set

Candidate selection should persist through presentation-only changes such as
sort order, view mode, and thumbnail size when the same result set remains in
view. Scope changes such as Capture Batch, Smart Filter, status filter, search,
page, or route changes are Selection Clearing Events because keeping hidden
selection would make Candidate Batch Action scope ambiguous. When a large
Visible Selection is cleared, the app may offer short-lived Selection Recovery,
but that recovery is separate from Batch Undo and disappears before any batch
operation runs.

ADR 0448 explicit refresh replaces a Duplicate Text Finding Session's complete
result generation and is therefore a result-set change rather than a
presentation-only update. Frozen pre-refresh selection cannot silently become
selection over newly grouped or newly eligible owners.

ADR 0451 switching Text Custom Field sort direction, mode or explicit Natural
language reorders the same result identities and therefore preserves selection
and focus. A separate filter, scope or explicit newer-generation refresh still
follows the existing result-set boundary.

Under ADR 0465, a requested selection or result-set change first resolves any
pending Custom Field Edit Draft through its Unsaved Custom Field Changes Gate.
Selection clearing executes only after the user saves or discards; Stay
preserves the current selection and editing context. Under ADR 0466, a
cross-owner partial result does not clear or advance selection while any draft
remains unresolved.

ADR 0478 requires a fresh Missing initialization preview when an owner
lifecycle or result-generation change alters the reviewed scope before
confirmation. After confirmation the frozen operation ignores later selection
changes and never admits new, restored or newly matching owners.
