# AI May Propose Custom Field Values Only For Opted-In Definitions

AI and analysis plugins can help populate structured organization, but a field name is not permission to reinterpret or overwrite user-owned metadata. A Custom Field Definition is ineligible for generated values by default and may receive them only after the user explicitly enables **AI Value Suggestions** for that exact definition.

An admitted local model or ADR 0154 Analysis Result Provider may then emit a type-valid **Custom Field Value Suggestion** bound to the exact Candidate/Design Asset, definition identity, source generation and declared provider/model/recipe. It records proposed value, time, confidence when meaningful, coverage and provenance. It remains separate from the current Custom Field Value and grants no schema, confirmation or write authority.

Suggestions are excluded from ordinary Custom Field filters, facets, lexical search and exports until accepted. The user may accept, edit-and-accept, reject or delete them. Acceptance repeats current definition/type validation and creates user-confirmed library metadata; an existing or concurrently changed value enters field-aware conflict review rather than being overwritten. Editing before acceptance records the committed value as user-authored while retaining bounded suggestion provenance.

AI and plugins never overwrite, clear or downgrade a current user-authored/confirmed Custom Field Value. Rejection or deletion changes only the suggestion and its exact suppression/provenance state, not the definition, current value, original asset or unrelated analysis. Provider removal leaves already committed values intact and keeps unresolved suggestions truthful about unavailable provenance.

Candidate Promotion carries unresolved suggestions through the existing Promotion Analysis Handoff without confirming them and transfers accepted values through ADR 0416. Enabling AI Value Suggestions grants eligibility for that definition only; it does not authorize automatic library backfill, external-provider use, model/runtime download, schema creation or auto-confirmation. Those require their own existing or future explicit policies.

ADR 0420 stops new suggestions when a definition is archived while retaining unresolved suggestions for restoration, and removes them only through the separately reviewed Permanent Delete Custom Field action.

Under ADR 0423, any unresolved suggestion makes the definition used and prevents an in-place type change. Type migration leaves those suggestions with the source definition and grants no automatic conversion or acceptance authority.

ADR 0432 binds Select suggestions to stable option identities. Archiving an option retains but blocks acceptance of a suggestion containing it; permanent option deletion removes that member, while an explicit reviewed option merge may retarget it without discarding suggestion provenance.

ADR 0435 requires every Number suggestion and edited acceptance to remain an exact finite Decimal128-equivalent value within current field constraints. Provider precision loss, binary-float approximation, clamping and silent rounding never become type-valid merely because they came from AI.

ADR 0462 requires that Number suggestion payload to be a structured exact value
rather than localized editor text. Provider output cannot inherit the device's
Number Input Locale, grouping, display precision or unit label as parsing or
conversion authority.

ADR 0436 requires a DateTime suggestion to declare whether it represents a Known-Instant value with explicit offset evidence or an Unzoned local value. AI confidence, the device zone or a guessed location never upgrades missing zone evidence into a resolved instant; assigning a zone remains an explicit user edit or reviewed rule.

ADR 0437 requires whole seconds and at most nine source-significant fractional digits. AI output cannot omit seconds for the host to invent, exceed nanosecond precision, or gain validity through silent rounding/truncation.

ADR 0438 retains a suggestion that no longer satisfies a restrictive current rule but marks it Out of Constraint and blocks acceptance. AI cannot use a schema change to overwrite, normalize or discard either that suggestion or an existing current value.

ADR 0440 requires a Text suggestion to fit the active grapheme-counted length limit. Host validation may convert canonically equivalent Unicode to NFC, but neither generation nor acceptance may trim whitespace, collapse line breaks, change casing or silently truncate content; an over-limit suggestion remains invalid rather than being shortened into a different value.

Under ADR 0441, zero-length Text after NFC does not create a suggestion and cannot act as an AI request to clear a current value. A non-empty whitespace-only suggestion remains distinct and visibly reviewable, but receives no special confirmation authority and may be accepted only through the ordinary explicit suggestion workflow.

ADR 0442 rejects a Text suggestion containing ill-formed Unicode or an Interoperability-Unsafe Text Code Point rather than silently cleaning it. A type-valid suggestion may retain legitimate bidirectional or zero-width formatting, but its Invisible Text Format Warning remains visible through review and acceptance.

ADR 0443 requires every Text suggestion and edited acceptance to satisfy the field's current grapheme minimum and Portable Text Pattern Rule. AI output cannot gain validity through trimming, substring extraction or an engine-specific interpretation; failure leaves the proposal invalid or, after a restrictive rule change, preserved but blocked under ADR 0438.

ADR 0444 evaluates that pattern only with the definition's stored case, multiline and dot-all options plus pinned Unicode data. Provider locale, regex flags or language-specific casing cannot alter suggestion validity.

ADR 0445 never rejects an otherwise type-valid suggestion or acceptance merely because another owner has equal Text. Duplicate discovery remains a separate advisory filter and grants AI no overwrite, merge, clearing or uniqueness authority.

ADR 0461 writing diagnostics and replacement proposals belong only to the
active Text Edit Draft. They are not Custom Field Value Suggestions, do not
acquire authority from AI Value Suggestions being enabled and cannot enter
ordinary analysis provenance or acceptance merely because the same provider or
model is capable of both workflows.
