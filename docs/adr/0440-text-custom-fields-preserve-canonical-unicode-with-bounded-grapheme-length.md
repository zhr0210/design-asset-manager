# Text Custom Fields Preserve Canonical Unicode With Bounded Grapheme Length

Text metadata must round-trip across platforms without letting editor presentation or hidden cleanup rewrite user-authored content. Every Text Custom Field Value is stored in Unicode NFC while otherwise preserving casing, leading/trailing and internal whitespace, and line breaks exactly; single-line versus multi-line remains presentation only. The application never trims, collapses, case-folds or truncates the authoritative value. Search may build normalized derived tokens under its own versioned policy, but those tokens never replace the stored text.

Each Text Custom Field Definition has a **Custom Field Text Length Limit** measured in Unicode extended grapheme clusters under the same pinned, versioned Unicode-data policy as ADR 0433, never operating-system APIs, UTF-8 bytes or UTF-16 code units. The default is 10,000 user-perceived characters and the user may configure 1–65,536. A new manual, AI, import or migration value above the active limit fails validation; an existing value affected by a later tighter limit follows ADR 0438 as Out of Constraint and is never truncated.

This bounded metadata type is not a document, rich-text or blob container. ADR 0441 defines zero-length Text as Missing while preserving non-empty whitespace-only Text, ADR 0442 rejects interoperability-unsafe controls while preserving valid invisible Unicode formatting, and ADR 0443 adds an optional grapheme minimum and portable pattern rule without changing authoritative content.

ADR 0450 length filters count this same authoritative extended-grapheme
sequence before any comparison transform. Filtering never changes the stored
value or substitutes bytes, code units or formatted line count.

ADR 0451 Exact Unicode sorting compares this same authoritative NFC scalar
sequence, while Natural sorting derives only a versioned presentation key.
Neither mode trims, folds, reparses or rewrites the stored Text.

ADR 0453 Compact and Expanded editors both accept this same complete value,
including line breaks. Compact rendering may summarize it visually but can
never flatten or truncate the authoritative sequence.

ADR 0457 batch Prefix, Suffix and Exact Literal Replacement operate on this
same NFC sequence and preserve every untouched scalar, whitespace and line
break. Their explicit transformation intent never authorizes trimming,
collapsing or truncation.

ADR 0459 treats an explicit plain-text paste/drop representation as manual
draft input, preserving the operating-system-supplied sequence before this NFC
boundary. It does not authorize trimming, line-ending rewriting or rich-text
extraction as additional normalization.

ADR 0461 spelling, grammar and rewriting assistance may propose or apply only
draft-local changes. Neither a local checker, an operating-system substitution
nor an external provider may normalize, recase, punctuate or otherwise rewrite
an authoritative Text value in the background.
