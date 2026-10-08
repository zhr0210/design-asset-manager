# Smart Filters Require Explicit Save

Filter changes should start as Temporary Filters. A Temporary Filter can narrow
the current Workspace Toolbar or Advanced Filter Panel state without appearing
in Workspace Navigation, changing the collection tree, or creating a reusable
workspace entry.

A Smart Filter is created only after the user explicitly saves reusable filter
criteria or the application provides a system-defined review set. Saved Smart
Filters can appear in the Smart Filters navigation section and should support a
name plus later edit or delete actions. This prevents casual filtering from
cluttering navigation while preserving durable review workflows.

ADR 0184 uses this same explicit user-owned Smart Filter lifecycle for Saved
Searches, including hybrid query text/mode and stable library-asset image-query
scope. Ordinary/recent queries remain session-only, and an external query image
cannot be saved without a separate asset import.

When saved criteria reference a Custom Field Definition, ADR 0421 binds that
criterion to the exact stable definition identity. Archive or permanent deletion
preserves the User Smart Filter as inactive repairable user content rather than
silently removing the criterion or cascading deletion into the filter.

ADR 0427 permits saving and executing a target-field criterion during active
type migration. The saved criterion and stable dependency identity do not
change when the live Partial Custom Field Migration Coverage state later clears.

ADR 0445 permits explicitly saving a Duplicate Text Value Finding with its
stable Custom Field Dependency Reference and selected comparison mode. The
saved filter recomputes current advisory groups; it stores neither duplicate
membership nor uniqueness authority.
Under ADR 0446, a comparison-policy migration rebuilds derived keys and may
change dynamic membership without replacing the saved field dependency, mode
or filter identity.
ADR 0448 evaluates a fresh generation whenever that saved filter is opened,
then keeps the opened Duplicate Text Finding Session stable until explicit
refresh; the saved object never persists rows, group counts or session state.
ADR 0449 likewise persists no resolved, ignored or collapsed duplicate groups.
Any reusable exclusion must be an explicit ordinary criterion in the user-owned
filter rather than hidden result state.

Under ADR 0450, a saved Text condition retains its exact field dependency,
operator, operand, comparison or pattern options and relevant version
identities. It never reinterprets the condition from a later device locale or
display preference.

ADR 0451 similarly stores an optional Text Custom Field sort's direction,
Natural/Exact mode, explicit Natural language/tailoring and policy versions.
It saves no ordered result snapshot and never falls back to another field.

ADR 0452 persists only the ordinary conditions explicitly created from a
Distinct Text Value Browser. Browser search, pages, counts, expanded original
forms and result generation never enter the User Smart Filter.
