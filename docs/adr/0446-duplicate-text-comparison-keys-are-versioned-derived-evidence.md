# Duplicate Text Comparison Keys Are Versioned Derived Evidence

ADR 0445 duplicate discovery needs deterministic grouping without treating a comparison transform as stored metadata. **Exact Duplicate Text Comparison** uses the authoritative NFC scalar sequence unchanged. **Case-Insensitive Duplicate Text Comparison** applies locale-independent Unicode full case folding and then NFC, but does not trim, collapse whitespace, remove diacritics or discard valid formatting; it is deliberately distinct from ADR 0444 pattern matching's simple fold and from ADR 0433 name comparison's additional edge trimming.

**Normalized Duplicate Text Comparison** applies the pinned Unicode version's `NFKC_Casefold`, including its standard compatibility and default-ignorable handling, then maps each maximal Unicode White_Space run to one U+0020 and removes leading/trailing U+0020. It adds no diacritic or punctuation stripping beyond that standard transform. Thus compatibility forms, casing and spacing may group while distinct accents or ordinary punctuation remain distinct. A whitespace-only or default-ignorable-only present value may produce an empty **Duplicate Text Comparison Key** and group with another present empty-key value, but Missing remains excluded.

Every key carries its comparison-policy and Unicode-data versions, is rebuildable, and never replaces, repairs or hides the original value. Duplicate groups show their selected mode and original distinct forms, including invisible-character evidence when relevant; ADR 0447 binds grouping to the explicit owner/lifecycle scope and one current-owner projection generation. A version upgrade requires reviewed library-schema migration with groups-added, groups-split and membership-changed impact before rebuilding keys; it changes no value, validation status, saved-filter identity, asset identity or Promotion outcome and never enters ADR 0438 constraint revalidation.

ADR 0450 reuses these three whole-value transform semantics and version
boundaries for ordinary Text Filter Comparison Modes, but not this derived-key
identity or duplicate-group projection. Equality and substring filtering remain
ordinary hard constraints and create no Duplicate Text Value Finding.

ADR 0452 may group Distinct Text Value Browser entries by those same transforms
and versions while showing original forms and counts. The grouping remains
read-only query projection and never promotes a comparison key into schema,
stored Text or a Select option.
