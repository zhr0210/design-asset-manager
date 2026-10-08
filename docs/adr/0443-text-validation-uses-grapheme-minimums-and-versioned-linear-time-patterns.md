# Text Validation Uses Grapheme Minimums And Versioned Linear-Time Patterns

Text fields need useful structure without making a portable library depend on a device's regular-expression engine or permitting pathological matching to stall the application. In addition to ADR 0440's maximum, a Text Custom Field Definition may declare an optional **Custom Field Text Minimum Length** from 1 through its current maximum, measured by the same pinned extended-grapheme policy. ADR 0441 Missing remains valid; the minimum applies only to a present value, including whitespace-only Text.

A definition may also declare one optional **Portable Text Pattern Rule** evaluated against the authoritative NFC value after ADR 0442 character validation. Its library-schema-versioned Unicode syntax guarantees linear-time evaluation and excludes backreferences, lookaround, recursion, conditional execution and embedded code. The user explicitly selects a **Text Pattern Match Mode** of Entire Value or Contains; ADR 0444 fixes its portable case, anchor, dot and Unicode-property options. The operating system, locale, plugin and whichever native regex parser happens to accept a pattern never define its meaning. A syntactically invalid or resource-unbounded pattern cannot be saved.

Before activation, the trusted editor provides user-entered example tests and the ADR 0438 affected-value/suggestion/mapping impact preview. New manual, AI, import and migration values must satisfy the active minimum and pattern without trimming, rewriting or partial fallback; retained failures become Out of Constraint. Changing the pattern syntax or Unicode interpretation version requires a reviewed library-schema migration with compatibility and impact evidence rather than silently recompiling existing rules under a new engine.

ADR 0450 may store the same portable syntax as a query-owned Matches or Does
Not Match condition with its own explicit match mode and options. That query
condition neither changes the field's validation rule nor treats a native
regular-expression engine as a compatible fallback.

ADR 0453 Expanded Text editing shows the active minimum, live current
grapheme count and maximum under the same pinned counting policy. This display
is evidence for the ADR 0454 Text Edit Draft, not a second validation engine.

ADR 0457 Exact Literal Text Replacement is not a Portable Text Pattern Rule and
cannot inherit regex syntax or options. Every derived present value still must
satisfy this field's current grapheme minimum and pattern before commit.

ADR 0461 spelling/grammar findings and provider confidence are editor advice,
not pattern evidence. An applied safe writing proposal may remain visibly
invalid under this rule, but it cannot commit until the same trusted portable
evaluation succeeds.
