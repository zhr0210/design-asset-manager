# Number Display Overflow Uses A Labeled Scientific Fallback And Full Detail

An exact Decimal128-equivalent value can produce thousands of ordinary-decimal
characters under a valid display rule, so inline layout must be bounded without
turning clipping into false numeric evidence. An inline Number first applies
ADR 0463's configured precision, rounding, grouping and approximation rules.
If the resulting numeric token—including sign, digits, separators, exponent
and `≈` marker but excluding the external unit label—exceeds 64 Unicode extended
grapheme clusters, or the complete rendered number and unit cannot fit the
available inline container, the surface uses **Scientific Number Display
Fallback**.

Scientific Number Display Fallback is a normalized, ungrouped scientific
representation of the current display result under the same pinned decimal and
display-locale rules. Automatic Exact therefore falls back from the exact
authoritative value, while Fixed Decimal Places or Significant Digits falls back
from their already rounded display result. It preserves the existing `≈`
state exactly and does not perform a second rounding step. A visible text/icon
label and accessible name identify Scientific Display Fallback; it is transient
layout state, not a changed field setting, value, unit, precision mode or
scientific-notation preference.

Every fallback opens a read-only **Number Display Detail** containing two
separately labelled values: the complete result of the field's requested
formatting and the authoritative Exact Custom Field Number. Both are generated
through the same exact decimal and pinned locale data. Long requested-format
text is produced only when this detail is opened and appears in a bounded,
scrollable reading region without arbitrary digit removal. Closing the detail
discards its generated presentation; it does not create metadata, cache,
history, search text, telemetry, diagnostics or clipboard content.

If an extremely narrow container cannot fit even the normalized scientific
fallback plus its approximation/fallback evidence, visual ellipsis is allowed
only after that fallback has been selected. The clipped state must retain a
separate visible overflow indicator, accessible explanation and direct Number
Display Detail entry; ellipsis alone can never imply that the visible prefix is
the complete exact or rounded number. A resize may restore the scientific
fallback or requested format immediately without changing any portable state.

The unit label remains outside the numeric token in every state. It is shown in
Number Display Detail even when inline layout cannot retain it, and it never
affects the 64-grapheme numeric threshold, scientific coefficient/exponent,
rounding result or exact value. Sorting, filtering, range checks, exports,
editing and AI/import/migration behavior continue to use their existing exact
contracts rather than whichever inline state happened to fit.
