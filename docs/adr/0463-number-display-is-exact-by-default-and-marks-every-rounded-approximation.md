# Number Display Is Exact By Default And Marks Every Rounded Approximation

Number presentation must be readable without disguising an exact metadata value
as a rounded replacement. Every Number definition therefore has one portable
**Custom Field Number Display Precision** mode: Automatic Exact, Fixed Decimal
Places or Significant Digits. Automatic Exact is the default and uses an
application-pinned shortest round-trip ordinary-decimal or scientific
representation that reconstructs the complete Exact Custom Field Number.

Fixed Decimal Places accepts 0 through 34 places after the decimal point.
Significant Digits accepts 1 through 34 significant digits. Both are
presentation-only and round directly in exact decimal arithmetic through
round-half-to-even: an exact midpoint selects the candidate whose retained last
digit is even. They never convert through binary floating point or change the
stored value, range, equality, ordering, filters, migrations, AI suggestions or
structured numeric exports.

A precision-limited rendering receives the `≈` marker exactly when its rounded
numeric result differs from the authoritative value. Adding or omitting
trailing zeros while preserving the same numeric value is not approximate.
When a negative nonzero value rounds to zero, it renders as an approximate
canonical zero rather than inventing negative zero. Every approximation has
direct full-exact-value access, and field focus continues to load ADR 0462's
complete round-trip edit representation rather than the rounded display.

Every Number definition also has one portable **Custom Field Number Grouping
Display** preference: Auto, On or Off, defaulting to Auto. Auto follows the
current display locale's standard grouping behavior for ordinary decimal
notation; On requests that locale's standard valid grouping wherever ordinary
notation supports it; Off suppresses grouping. Scientific notation is never
grouped. Digit shapes, separators and grouping patterns come from
application-pinned data for the current device-local display locale, so they
may localize across devices without changing field intent or numeric identity.

The Custom Field Number Unit Label is rendered outside the numeric token and
after any approximation marker. It never participates in digit counting,
rounding, grouping, parsing or conversion. Changing precision mode, precision
count, grouping preference, unit label or display locale updates presentation
without constraint revalidation, index rebuild, metadata-value revision or
loss of full-exact access.

ADR 0464 resolves inline overflow through a 64-grapheme numeric-token budget,
an explicitly labelled normalized Scientific Number Display Fallback and
read-only detail containing both complete requested formatting and the
authoritative exact value. Visual ellipsis is allowed only after even the
fallback cannot fit and remains visibly identified as clipped.
