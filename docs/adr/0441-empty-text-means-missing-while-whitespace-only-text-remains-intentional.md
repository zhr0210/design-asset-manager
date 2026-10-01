# Empty Text Means Missing While Whitespace-Only Text Remains Intentional

Text field clearing needs one portable presence meaning without undoing ADR 0440's preservation of authored whitespace. After Unicode NFC normalization, a zero-length Text input creates no current Custom Field Value: clearing an existing field removes that value and leaves the owner in **Missing Custom Field Value State**. The application stores no zero-length Text sentinel, and presence/absence filters therefore treat it as Missing.

Non-empty text containing only preserved Unicode whitespace or line breaks is a **Whitespace-Only Custom Field Text** and remains an ordinary present value subject to current validation rules. Manual editing shows a non-blocking pre-save warning, but never trims, rejects or silently converts that value to Missing; it may produce no lexical tokens while still matching field-presence and exact-value behavior.

Import and migration previews distinguish source null/missing, zero-length text and whitespace-only text before confirmation. Missing input creates no assignment, zero-length Text resolves to Missing, and whitespace-only Text stays exact with a visible warning. AI cannot use a zero-length suggestion to clear a current value; it produces no value suggestion, while a non-empty whitespace-only suggestion remains visibly reviewable under the normal no-auto-confirm policy.

ADR 0450 makes Is Missing, Is Present and Is Whitespace-Only separate filter
conditions. Every positive or negative content, pattern, length and validation
operator excludes Missing unless the query explicitly composes Or Is Missing.

ADR 0452 shows Missing as an exclusive count outside distinct Text entries.
Whitespace-Only is a labelled subset of present entries rather than another
exclusive bucket, preserving each exact whitespace form and preventing
additive-count claims.

Under ADR 0453, Expanded editing shows the whitespace-only warning before save.
Compact presentation must not mislabel preserved whitespace-only content as
Missing and expands when full-value inspection or editing is needed.

ADR 0454 keeps the warning attached to the Text Edit Draft. A deliberate commit
may save warned whitespace-only Text because the warning is non-blocking, while
zero-length commit clears the authoritative value under this ADR's Missing
semantics.

ADR 0457 Batch Text Edit defaults transformations to present values. Treat
Missing Text As Empty must be explicit in the reviewed plan, and any resulting
zero-length sequence remains Missing rather than becoming a stored empty
sentinel.

ADR 0459 paste/drop uses ordinary draft replacement semantics. A resulting
zero-length draft becomes Missing only through the normal visible commit
boundary, while transferred whitespace-only Text remains present and warned
rather than being trimmed.
