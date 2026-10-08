# Text Editor Presentation Is Portable, Reversible, And Content-Neutral

A Text Custom Field Definition stores one portable **Default Text Editor
Presentation**: Compact or Expanded, defaulting to Compact. This preference is
definition-owned display metadata, not a Custom Field Type, validation rule or
value transformation. Changing it takes effect immediately without an impact
preview, migration, constraint revalidation or search-index rewrite. The
current Inspector may use **Temporary Text Editor Expansion** for one field and
owner; that session state never changes the definition's default.

Both presentations accept and preserve the complete ADR 0440 Text value,
including every allowed line break. Compact may visually summarize a
multiline value only when it clearly marks that more content exists and offers
full-value access. Editing an existing multiline value, inserting a line break
or pasting multiline content expands the editor before commit. Compact never
flattens, trims, rejects or truncates content merely to maintain its preferred
height, and it never implies a distinct single-line Text type.

Expanded provides a vertically resizable editor within ADR 0023 Inspector
guardrails. It shows a live authoritative grapheme count with the applicable
minimum, current count and maximum under ADRs 0440 and 0443, preserves the
current draft while resizing, exposes ADR 0442 invisible-format reveal, and
shows ADR 0441 whitespace-only warning without rewriting the value. Temporary
expansion and its current height are Inspector view state rather than portable
field metadata. ADR 0454 owns commit, blur, cancellation and input-method
composition behavior; crash/forced-termination draft recovery remains a
separate interaction decision.

ADR 0460 never copies a Compact summary, ellipsis, line clamp or invisible
character label. Native selection Copy/Cut requires the real editor, while Copy
Full Text resolves the complete draft or authoritative value independently of
presentation.
