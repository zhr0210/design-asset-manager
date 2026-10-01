# Custom Fields Start With Eight Portable Non-Relational Types

Core Custom Fields need enough structure for professional asset organization without turning Design Asset Manager into a general relational/no-code database. The initial **Custom Field Type** set is Text, Number, Date, DateTime, Boolean, Single Select, Multi Select and URL.

Text is one stored semantic type; ADR 0440 preserves its NFC-canonical Unicode content without trimming or truncation, bounds it by a portable grapheme-counted maximum, and keeps single-line versus multi-line as presentation only. ADR 0441 separates Missing from preserved whitespace-only Text, ADR 0442 rejects unsafe controls without deleting valid invisible formatting, and ADR 0443 adds an optional grapheme minimum plus a versioned linear-time pattern rule. Number uses ADR 0435 exact Decimal128-equivalent values while keeping display precision, grouping and unit labels separate from numeric identity; ADR 0462 gives manual entry a visible device-local locale, ambiguity blocking and exact-value preview without making localized syntax portable. Date represents a calendar date without an implied time, while ADR 0436 makes DateTime either a resolved Known-Instant value or an explicitly Unzoned local value without guessing a zone. ADR 0472 keeps Boolean's present values strictly True or False while exposing Missing as absence through an explicit Not Set/Yes/No choice. Single Select holds at most one declared option and Multi Select holds a set of declared options. URL is structured user metadata and never by itself grants network access, triggers fetching or becomes an Asset Source relationship.

Type-appropriate filters include text/URL matching, numeric and temporal comparison/ranges, Boolean state, and select-option membership. Text and URL values may participate in lexical retrieval under ADR 0181; the other types participate as structured facets unless a later explicit search policy adds another representation. Missing values remain valid and filterable as presence/absence without becoming incomplete assets. Under ADR 0441, zero-length Text is Missing, while non-empty whitespace-only Text is present even when it yields no lexical token.

ADR 0450 defines the complete Text structured-filter operator catalog,
comparison modes, present-only negative semantics, grapheme-length behavior,
portable-pattern boundary and explicit validation states. URL filtering remains
a separate type-specific decision and does not inherit Text rules merely
because both types can enter lexical retrieval.

ADR 0451 makes Text sortable through explicit versioned Natural and Exact
Unicode modes with Missing last. URL and other Custom Field sorting require
their own type semantics rather than coercing their values through Text.

ADR 0452 keeps high-cardinality Text out of eager full facets while retaining
complete on-demand distinct-value selection through bounded generation-stable
pages. Browsing values does not turn Text into Single Select or Multi Select.

ADR 0453 lets each Text definition choose a portable Compact or Expanded
editor default while keeping both presentations capable of preserving the same
complete multiline Text. Temporary expansion remains Inspector view state and
never creates another Text type or validation path.

ADR 0445 deliberately omits a Text uniqueness constraint. Repeated values stay
valid and may be surfaced through a library-scoped Duplicate Text Value Finding
with an explicit comparison mode, never through automatic rejection or merge.

The initial core excludes Formula, Rollup, Attachment, File Path, Asset/Object Relationship, User/Person, Rich Object, nested record and arbitrary JSON types. Plugins cannot smuggle those meanings into an opaque core type. Adding a type later requires a portable schema, validation, search/filter, backup/restore, conflict and migration contract rather than treating an untyped payload as forward compatibility.

ADR 0423 owns the boundary between identity-preserving empty-field type changes and new-identity migration for used fields, ADR 0424 requires lossless or explicitly rule-governed value conversion without platform guesses, and ADR 0425 provides a validated migration path for every directed type pair. ADR 0432 gives Select options stable identities plus archive, permanent-delete and explicit-merge lifecycles. ADR 0435 owns Number precision, range constraints and the non-converting display/grouping/unit boundary; ADR 0462 owns localized manual Number input, ambiguity blocking and full-exact edit display; ADR 0463 owns exact-by-default display precision, display-only rounding and approximation disclosure; ADR 0464 owns bounded inline scientific fallback and complete display detail; ADR 0436 owns DateTime zone evidence, comparison and explicit zone assignment; ADR 0437 owns DateTime precision through nanoseconds; ADR 0438 owns later validation-rule changes; ADRs 0440–0444 own Text preservation, presence, character safety, minimum/pattern validation and explicit pattern options; ADR 0445 keeps duplicate Text advisory rather than unique; ADR 0446 fixes its versioned comparison keys; ADR 0450 completes Text structured filtering; ADR 0451 defines Text ordering; ADR 0452 defines scalable distinct-value browsing; ADR 0453 owns portable Text editor presentation defaults and temporary expansion; ADR 0465 gives every manual type one shared typed draft, protected recovery, navigation-gate and session Undo parent contract without erasing type-specific validation and gestures; ADR 0466 gives multi-draft gate resolution complete preflight, explicit per-draft disposition, per-owner atomic commits and truthful cross-owner partial results; ADR 0467 preserves each same-owner atomic commit as one indivisible compound manual Undo/Redo step; ADR 0468 keeps an unavailable newest step blocking until exact revalidation or explicit whole-step removal; ADR 0469 bounds that session stack by user-adjustable whole-step count and estimated memory with pre-commit oversized-step review; ADR 0470 clears the observable manual timeline only after a reviewed no-Undo commit is proven. This ADR still does not choose each pair's built-in rule catalog, multiplicity beyond the declared Select distinction or the remaining exact per-type validation-rule catalogs. ADR 0097 remains the conflict boundary until those dependent decisions are resolved.

ADR 0471 additionally permits last-resort complete manual-stack entry
reclamation only under fresh, platform-qualified Critical memory pressure after
safer disposable releases are insufficient.

ADR 0472 defines Boolean's explicit True/False/Missing editing state, and ADR
0473 gives Boolean an opt-in portable True/False default for eligible future
new owners without retroactive fill or Promotion reapplication. ADR 0474 owns
the shared static, exact-type default contract for all eight core types and
keeps dynamic/contextual values outside defaults. ADR 0475 requires preflight
resolution or non-blocking suspension when such a default becomes ineligible.
ADR 0476 provides the reviewed cross-type batch path for assigning exact values
to existing Missing owners without overwriting present metadata. ADR 0477
binds that operation's recovery to the exact Local Library Instance and permits
explicit continuation on another compatible exclusive device without
generalizing Batch Text's device-local prior-value evidence. ADR 0478 limits
each scope form to current live value owners in one active library and keeps
source-byte availability independent from Custom Field metadata eligibility.
ADR 0479 permits only proven transient, wholly uncommitted owner groups to
retry while the complete frozen typed plan remains current. ADR 0480 makes
trusted Undo admission close that forward retry direction before any reverse
commit and never reopen it after partial reversal. ADR 0481 bounds result
detail and both executable directions by one default-30-day window from first
terminal reconciliation.
