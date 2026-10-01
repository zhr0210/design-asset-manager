# Number Custom Fields Use Exact Decimal128 Values And Separate Display Rules

Number metadata must sort, filter, migrate and round-trip identically across supported devices, so every **Exact Custom Field Number** belongs to the finite Decimal128-equivalent value domain: at most 34 significant decimal digits within the standardized Decimal128 exponent range. The portable value contract preserves the exact base-10 number without requiring one storage encoding; binary floating-point, localized display text and database approximation are never authoritative. NaN and positive/negative infinity are invalid, negative zero canonicalizes to zero, and lexical forms such as `1`, `1.0` and `01.00` represent the same numeric value.

A Number definition may declare inclusive exact minimum and maximum constraints,
a **Custom Field Number Display Precision**, a **Custom Field Number Grouping
Display** preference and a **Custom Field Number Unit Label**. Display precision
and grouping control rendering only and never round, truncate or rewrite the
stored value. The unit label is presentation metadata only: it grants no
conversion formula, measurement-system identity or automatic reinterpretation
when importing, filtering, editing or migrating values. Numeric equality,
ordering, ranges and uniqueness always use the exact value rather than the
formatted string.

Manual input, AI Value Suggestions, plugin/import proposals, accepted imports and migration targets must all validate against the same exact domain and current field constraints. A value outside the Decimal128-equivalent domain, beyond 34 significant digits or outside the declared range is rejected or retained as unconvertible; the application never clamps, truncates, silently rounds, parses through binary float or uses operating-system locale as an undeclared conversion rule. Any intentional precision reduction or rounding remains an explicit ADR 0424 rule-governed conversion with reviewed before/after evidence. ADR 0438 preserves existing values and progressively revalidates them when minimum/maximum or another validation rule becomes restrictive.

ADR 0462 permits localized manual syntax only through one visible device-local
Number Input Locale and an ambiguity-blocking exact preview. It never makes
locale or formatted presentation authoritative, and editing an existing value
always starts from a complete round-trip representation rather than its
precision-limited display text.

ADR 0463 defaults Number presentation to Automatic Exact and permits only
presentation-level Fixed Decimal Places or Significant Digits with exact
round-half-to-even behavior. Any numerically changed display is marked
approximate and retains full-exact access; grouping and unit labels remain
outside numeric identity.

ADR 0464 bounds inline rendering without bounding the exact domain. Oversized
or non-fitting requested formatting becomes a labelled scientific fallback
with complete requested-format and authoritative-value detail, never a
truncated apparently exact Number.
