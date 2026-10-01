# Material Original Changes Preserve Asset Identity And Advance Source Generation

Applications and external editors may rewrite an original in place without changing its conceptual library identity. Treating every save as another Design Asset would multiply storage and fracture organization; treating changed bytes as the same evidence generation would make previews and analysis falsely current.

A stable, real-format-valid material byte or declared-member change preserves the same Design Asset and commits one new **Source Content Generation**. A timestamp, permissions, or other filesystem-metadata change with byte-identical governed content creates no generation. Managed and referenced originals use the same content-generation semantics.

Collection Memberships, confirmed tags, ratings, and other user-authored metadata remain attached to the Design Asset. Preview, color, OCR, description, embedding, and other generated evidence bound to the prior generation becomes stale and follows its existing regeneration or supersession policy. Generated refresh never overwrites user-authored values.

Ordinary external editing neither creates another Design Asset nor retains a complete byte-for-byte revision history by default. Explicit future preserve-current-version or create-variant actions may retain content intentionally, but ordinary saves do not silently duplicate originals. Missing, corrupt, unsafe, unstable, relationship-invalid, or newly unsupported content enters the owning relink/repair/recovery flow and cannot become a valid generation merely because a path exists.

ADR 0283 applies this boundary to external changes inside the Managed Originals
Directory; ADR 0319 applies it to explicit Rewrite Referenced Source; ADR 0342
validates and advances a Compound Original once for the complete member
relationship; ADR 0344 and ADR 0358 govern generation-bound derivation and
evidence freshness. Under ADR 0348, cross-format output is a source-separated
Compatible Export and never advances the current Original's generation through
an application source-replacement flow.
