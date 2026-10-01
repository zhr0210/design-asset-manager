# Cross-Library Rank Fusion Never Compares Raw Scores

Each library can have different indexes, models, embedding spaces, and available search lanes. Raw lexical, OCR, tag-confidence, cosine, distance, and model-specific values therefore do not share a meaningful scale across libraries, even when every library can return a ranked result list.

Each connected library first evaluates and ranks results internally under ADR 0181. **Cross-Library Rank Fusion** then combines those independent library ranks within the same searchable object type using a versioned rank-fusion policy such as reciprocal-rank fusion. It never adds, averages, normalizes by assumption, or directly compares raw lane or model scores across libraries.

Library identity remains a visible badge, filter, and optional presentation grouping. It is not a default rank weight and does not replace object type as ADR 0038's default top-level organization. An offline or capability-limited library contributes only the evidence-backed lanes available to it; the application neither invents a semantic score nor penalizes missing optional lanes as though they were zero-quality evidence.

An Ephemeral Search Session binds its participating library snapshots and rank-fusion policy version. Stable tie-breaking uses opaque object/library identities within that frozen result generation, not filenames, paths, private labels, or arrival timing. Later index changes or reconnection can expose Results Available to Refresh but cannot silently reorder the active session.

ADR 0277 governs federation, availability, and write ownership. ADR 0038 governs object-type grouping and presentation-only exact-content clusters. This separation allows ranking policy to evolve explicitly without changing library identity or search-result ownership.
