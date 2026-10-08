# Portable Text Pattern Options Are Explicit And Locale-Independent

A Portable Text Pattern Rule must not change meaning when a library moves between devices, languages or regex implementations. Its default matching is case-sensitive; dot excludes the rule syntax's versioned line-boundary set; and anchors address the whole NFC value rather than individual lines. The definition may independently enable **Case-Insensitive Pattern Matching**, **Multiline Pattern Anchors** and **Dot-Matches-Line-Breaks** as stored rule options, never as inherited operating-system, locale, plugin or engine defaults.

Case-insensitive matching uses locale-independent Unicode simple case folding from the same pinned Unicode-data version as the rule, deliberately not ADR 0433's full case folding for name collisions. Multiline mode makes anchors recognize the versioned portable line-boundary set, while dot-all mode changes only whether dot consumes those boundaries; neither option rewrites line endings or authoritative Text. Unicode property classes are resolved from that same pinned data version.

ADR 0446 duplicate-value Case-Insensitive comparison instead uses full case
folding, and its Normalized mode uses `NFKC_Casefold`; neither may be substituted
for this pattern option's simple-fold matching semantics.

Every option and data-version identity travels with the Custom Field Definition, appears in rule tests and impact preview, and is frozen into import/migration validation evidence. Adding, removing or changing an option follows ADR 0438 whenever it may narrow accepted values; an engine or Unicode-data update still requires ADR 0443 reviewed schema migration rather than ambient reinterpretation.

ADR 0450 query-owned pattern filters store these same explicit portable options
and their version identity. They never inherit a Text Filter Comparison Mode,
device regex flag, field-validation option change or ambient locale.
