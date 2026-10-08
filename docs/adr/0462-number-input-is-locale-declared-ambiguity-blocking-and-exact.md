# Number Input Is Locale-Declared, Ambiguity-Blocking, And Exact

Professional metadata must accept familiar localized numbers without letting a
comma, period or platform parser silently change the value. Every manual Number
editor therefore exposes one device-local **Number Input Locale** and parses
through application-pinned locale data rather than an operating-system numeric
type. The locale controls only the accepted digits, sign, decimal separator,
grouping pattern and separators; it is not portable field schema, a unit,
content-language evidence or permission to reinterpret existing values.

The editor accepts a strictly valid localized decimal form and exact scientific
notation, with optional correctly placed locale grouping. Scientific notation
is evaluated directly in the ADR 0435 Decimal128-equivalent domain and never
through binary floating point. An explicit Unicode plain-text paste or text drop
uses the same parser. Currency symbols, percent signs, unit labels, formulas,
arithmetic expressions, rich transfer data, files and opaque objects are not
numbers and are rejected rather than stripped, calculated or converted.

The editor may also recognize the portable canonical ASCII decimal/scientific
form so exact values can move between interoperable tools. If the same literal
is valid under both that form and the active Number Input Locale but produces
different exact values, it is **Ambiguous Number Input**. The application shows
the conflicting exact interpretations and requires the user to change the
literal or explicitly switch the visible input locale; it never selects the
current locale, canonical form or whichever parser succeeds first as a hidden
tie-breaker. Strictly invalid grouping remains invalid rather than being
treated as a decimal separator or ignored.

Manual entry remains a non-authoritative **Number Edit Draft**, the Number-typed
specialization of ADR 0465 Custom Field Edit Draft, containing the original
literal, Number Input Locale identity and its Invalid, Ambiguous or uniquely
Parsed status. A unique parse displays the complete exact value before commit
and then applies the field's exact minimum/maximum and Decimal128 domain checks.
Invalid, ambiguous, over-precision, exponent-range and out-of-range drafts
remain visibly editable and cannot commit; the application never partially
parses, clamps, truncates, rounds or substitutes the last valid value.
Committing stores only the exact numeric identity, so leading zeros, grouping
and equivalent lexical scale are not value history.

Outside input-method composition, explicit Save, Enter or deliberate movement
to another editable field in the same Inspector attempts commit only for one
uniquely parsed, constraint-valid and revision-current draft. An empty literal
is a pending Clear-to-Missing proposal and may clear only at an explicit commit
boundary; it is never zero. Operating-system window blur, application
deactivation and incidental focus loss preserve the draft without commit.
Navigation uses ADR 0465's shared Save, Discard or Stay gate, and a qualifying
stable Number draft may use its protected recovery journal. Recovery retains
the original literal and locale identity but always re-runs the current pinned
parser, constraints and revision checks without auto-commit or hidden ambiguity
selection.

Under ADR 0466, Save All remains unavailable while any Number draft is Invalid,
Ambiguous, stale or otherwise unresolved. The user must fix it or explicitly
discard it; the application never commits other valid drafts as if the blocked
Number were absent.

When a Number draft commits inside an ADR 0467 compound step, its exact numeric
previous/committed values and revisions remain one typed delta. Undo/Redo never
re-parses formatted display text and cannot detach that Number delta from the
same-owner atomic group.

Ordinary Number presentation may combine the field's display precision,
grouping preference and unit label with the current display locale, but it
cannot become an editing source. Focusing an existing value loads a complete
round-trip exact decimal or scientific representation in the visible Number
Input Locale, without grouping or unit text and with every significant digit
needed to recover the value. If display precision produces text that differs
numerically from the authoritative value, that rendering is a visibly marked
**Formatted Number Approximation** with direct full-exact-value access. Merely
leaving and recommitting an unchanged value cannot replace it with the
approximation.

Number Input Locale is limited to interactive manual entry. AI Value
Suggestions, plugin/provider results, native metadata imports, Field Mapping
Import and Custom Field Type Migration must supply a structured exact value or
use their own explicit reviewed parsing/conversion rule; they cannot inherit a
device's locale, grouping or editor preview. Likewise, display precision,
grouping and unit labels grant no import, conversion, search, comparison or
rounding authority.

ADR 0463 resolves the display boundary with default Automatic Exact,
Fixed Decimal Places or Significant Digits, decimal round-half-to-even,
approximation labelling and default Auto grouping. Those rules remain
presentation-only and cannot rewrite the Exact Custom Field Number or become
this editor's input source.

ADR 0464 may replace an oversized inline representation with a labelled
scientific fallback, but focusing the field still loads this ADR's complete
round-trip exact edit source rather than fallback, ellipsis or requested
formatted text.
