# Text Custom Field Filters Use Complete Explicit Operator Semantics

Text Custom Fields need structured retrieval beyond lexical search without inheriting database null behavior, operating-system collation or hidden cleanup. Their Advanced Filter catalog therefore provides Is Present, Is Missing and Is Whitespace-Only; Equals/Does Not Equal, Contains/Does Not Contain, Starts With/Does Not Start With and Ends With/Does Not End With; extended-grapheme Length equality, inequality, ordering and inclusive range; Matches/Does Not Match Portable Pattern; validation state Conforming, Out-of-Constraint or Unknown; and ADR 0445 Duplicate Text Value Finding. These conditions compose through ADR 0040 and bind the exact Custom Field Definition identity under ADR 0421.

Every ordinary comparison condition explicitly stores a **Text Filter Comparison Mode** of Exact, Case-Insensitive or Normalized plus its policy/Unicode version. It applies the corresponding ADR 0446 whole-value transform independently to the authoritative value and user operand before equality, containment, prefix or suffix evaluation, but creates no Duplicate Text Comparison Key or stored-value rewrite. A zero-length operand is invalid and routes the user to Is Missing; a non-empty whitespace-only operand remains intentional, and Normalized mode may derive an empty comparison form that still matches only present values. Pattern conditions instead store ADR 0443 Entire Value/Contains mode and ADR 0444 portable options and never inherit the ordinary comparison mode.

Every content, pattern, length and validation-state operator evaluates present values only. Negative operators do not make Missing match by absence; the user must explicitly compose Or Is Missing. Whitespace-only Text remains present, length uses ADR 0440's authoritative extended-grapheme count before comparison transforms, and Missing has neither length nor validation outcome. During ADR 0438 partial revalidation, Conforming and Out-of-Constraint use only completed current-rule outcomes, Unknown is independently selectable, and every validity-specific result discloses Partial Custom Field Constraint Validation Coverage rather than guessing. Saved filters preserve operators, operands, modes, options and version identities, never ambient locale or current display formatting.

ADR 0451 Text Custom Field Sort Modes are a separate ordering contract.
Exact/Case-Insensitive/Normalized filter comparison does not define row order,
and a Natural sort's language-aware collation never changes filter equality.

ADR 0452 can create these ordinary Equals and presence conditions from an
on-demand distinct-value projection. It does not add an implicit In operator,
persist a value facet or give a selected comparison group schema authority.
