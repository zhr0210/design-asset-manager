# Rendering Policy Overrides Are Explicit And Scoped

The product-wide ordinary Preview Rendering Policy remains Media-Relative Preview and is not replaced by a mutable user default that can silently invalidate or alter the appearance of an entire library. A Rendering Policy Override belongs to one Candidate or Design Asset and persists the explicitly selected rendering intent and Black Point Compensation state. Restoring product default is also explicit and creates a new Color Derivation Generation from the preserved source profile state.

Users may apply the same override through an explicit reviewed batch action. Compatibility and transform availability are checked per item, the preflight shows eligible, excluded, and risk-bearing counts, and execution follows item-atomic mixed-result behavior. No collection, folder, category, import source, capture batch, or inferred visual class automatically inherits or propagates an override.

A future Rendering Policy Preset may save a reusable named recipe, but saving, editing, or selecting a preset does not mutate assets by itself. The user must explicitly apply it to a visible selection; background library-wide regeneration and retroactive default changes are prohibited. Every affected item retains its own override provenance, preceding policy, transform result, and reversible generation boundary.
