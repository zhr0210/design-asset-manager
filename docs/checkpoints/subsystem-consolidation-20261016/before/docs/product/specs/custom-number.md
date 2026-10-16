# 数字字段、显示与精度：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[organization](../../subsystems/organization.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0459 · Text Input Accepts Only Explicit Plain Unicode Transfer Data](#adr-0459)
- [0460 · Text Copy And Cut Are Explicit Plain-Text Clipboard Actions](#adr-0460)
- [0462 · Number Input Is Locale-Declared, Ambiguity-Blocking, And Exact](#adr-0462)
- [0463 · Number Display Is Exact By Default And Marks Every Rounded Approximation](#adr-0463)
- [0464 · Number Display Overflow Uses A Labeled Scientific Fallback And Full Detail](#adr-0464)

<a id="adr-0459"></a>

## 0459 · Text Input Accepts Only Explicit Plain Unicode Transfer Data

决定来源：[0459-text-input-accepts-only-explicit-plain-unicode-transfer-data.md](../../adr/0459-text-input-accepts-only-explicit-plain-unicode-transfer-data.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0459-p001"></a>

A Text Custom Field is portable plain Unicode metadata, not a rich document or
an implicit asset-import target. Paste and text drop therefore accept only an
operating-system/data-transfer representation explicitly declared as Unicode
plain text. When the source also offers HTML, RTF or other rich forms, the
editor uses the declared plain-text representation and ignores formatting. If
no plain-text representation exists, it rejects the transfer with contextual
feedback; the application never derives Text by parsing HTML/RTF, reading DOM
markup, extracting image metadata or converting an opaque transferable object.

<a id="0459-p002"></a>

Accepted **Plain Text Transfer Input** replaces the current selection or inserts
at the caret through ordinary editor behavior and changes only the ADR 0454
Text Edit Draft. It never commits the field, triggers navigation or bypasses
input-method ownership. The application preserves the complete
operating-system-supplied Unicode sequence—including whitespace, tabs, line
breaks and valid invisible formatting—and performs no trim, collapse,
truncation, newline rewrite, link expansion or hidden cleanup. It then applies
ADR 0440 NFC canonicalization and the field's ADRs 0441–0444 safety, grapheme,
minimum and pattern rules. Unsafe controls or another invalid result remain a
visible invalid draft rather than being stripped. If ordinary insertion or
selection replacement produces a zero-length draft, ADR 0441 visibly applies
Missing/Clear semantics only at commit; transfer handling never creates a
stored empty sentinel.

<a id="0459-p003"></a>

Text that looks like a URL, filesystem path, filename, markup or command remains
literal Text and receives no link, file, import, execution or relationship
authority. A dragged text selection with an explicit plain-text representation
uses the same rule. A transfer declaring files, image payloads, application
asset identities or relationship objects is rejected by the Text target even
when it carries a companion display string; the editor never inserts its path,
imports it, creates a Candidate or links an asset. Dedicated Add Assets,
Original Handoff and relationship surfaces retain their own explicit drop
targets and contracts.

<a id="0459-p004"></a>

Set, Prefix, Suffix and Exact Literal Replacement parameter editors in ADR 0457
use the identical transfer contract. Accepted input remains editable parameter
state until trusted preview canonicalizes and validates the complete proposed
results; an unsupported or invalid parameter cannot create an executable Batch
Text Edit Plan. No Text surface polls the clipboard, reads it in the background,
retains rejected transfer flavors, reads back a paste, clears clipboard history
or sends raw transfer content/flavors to logs, telemetry, diagnostics,
notifications or plugins merely because a paste/drop occurred. Once accepted
into a Text Edit Draft, ordinary ADR 0455 protected draft-recovery rules apply
to that draft rather than to the clipboard source. A later committed value
follows ordinary metadata-access contracts without retaining clipboard
provenance.

<a id="0459-p005"></a>

ADR 0460 owns the inverse Copy/Cut boundary. Both directions use plain Unicode,
but accepted paste/drop input and explicit clipboard output retain separate
validation, mutation and failure semantics.

<a id="0459-p006"></a>

ADR 0462 separately owns Number paste/drop parsing. Number may accept an
explicit plain-Unicode numeric literal under its visible locale/canonical
grammar, but it does not inherit Text's rule that arbitrary whitespace, line
breaks, paths or URL-looking strings remain valid literal content.

<a id="adr-0460"></a>

## 0460 · Text Copy And Cut Are Explicit Plain-Text Clipboard Actions

决定来源：[0460-text-copy-and-cut-are-explicit-plain-text-clipboard-actions.md](../../adr/0460-text-copy-and-cut-are-explicit-plain-text-clipboard-actions.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0460-p001"></a>

Native Copy and Cut inside an active Text editor operate only on an explicit
selection in the current Text Edit Draft. They write exactly that editor
sequence as one operating-system Unicode plain-text representation, without
HTML, RTF, styles, field labels, owner identity, surrounding prose or implicit
path/link/asset meaning. With no selection they are unavailable/no-op and never
replace the clipboard with the complete field or an empty value. Input-method
composition retains platform keyboard ownership and cannot be forced to commit
or terminate by these commands.

<a id="0460-p002"></a>

Cut is a copy-before-delete draft operation. Only after the complete selected
plain Text is successfully written may the editor delete that selection; a
clipboard denial/failure leaves the draft and selection unchanged. Successful
deletion is one ordinary draft-local edit under ADR 0456 and may be undone or
redone there without committing a Custom Field Value. If it creates a
zero-length or whitespace-only draft, ADR 0441 remains authoritative at the
later visible commit boundary.

<a id="0460-p003"></a>

Every copy path preserves valid invisible formatting. A selection or complete
source containing malformed Unicode or ADR 0442 Interoperability-Unsafe Text
Code Points cannot be represented through a silently altered clipboard value:
Copy/Cut fails contextually, writes nothing and Cut removes nothing. The
application never strips, replaces, escapes, NFC-rewrites or truncates content
merely to make copying succeed. Other draft validation failures such as length,
minimum or pattern mismatch do not by themselves prevent copying safe Unicode
so the user can preserve or correct their work.

<a id="0460-p004"></a>

Outside native selection Copy, one explicit **Copy Full Text** field action
resolves the complete source rather than rendered Inspector text. With a
current draft it is labelled as unsaved and copies that complete draft; with no
draft it copies the complete authoritative value. A stale or otherwise invalid
safe-Unicode draft stays visibly labelled as such and is not substituted with
the authoritative value. Missing or zero-length source makes the action
unavailable and leaves the existing clipboard untouched. Whitespace-only and
valid invisible-only content remains copyable with its existing warning.
ADR 0453 Compact summaries, ellipses, line clamps and reveal labels are never
clipboard sources; selection requires the actual editor and full-copy resolves
the complete content.

<a id="0460-p005"></a>

Successful Copy/Cut produces only content-free in-app acknowledgement; failure
does not echo the attempted Text. The clipboard becomes user/operating-system
owned external state. Design Asset Manager does not read it back, poll it,
record copy history or automatically clear/overwrite it on field exit, owner or
library change, application deactivation, quit or retention cleanup. A calm
clipboard-privacy disclosure explains that macOS, Windows or third-party
clipboard managers may retain copied content; automatic clearing would risk
destroying newer clipboard data while providing no reliable history erasure.
Copy source/content never enters library history, backup, sync, logs, telemetry,
diagnostics, crash reports, notifications or plugins merely because it was
copied.

<a id="adr-0462"></a>

## 0462 · Number Input Is Locale-Declared, Ambiguity-Blocking, And Exact

决定来源：[0462-number-input-is-locale-declared-ambiguity-blocking-and-exact.md](../../adr/0462-number-input-is-locale-declared-ambiguity-blocking-and-exact.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0462-p001"></a>

Professional metadata must accept familiar localized numbers without letting a
comma, period or platform parser silently change the value. Every manual Number
editor therefore exposes one device-local **Number Input Locale** and parses
through application-pinned locale data rather than an operating-system numeric
type. The locale controls only the accepted digits, sign, decimal separator,
grouping pattern and separators; it is not portable field schema, a unit,
content-language evidence or permission to reinterpret existing values.

<a id="0462-p002"></a>

The editor accepts a strictly valid localized decimal form and exact scientific
notation, with optional correctly placed locale grouping. Scientific notation
is evaluated directly in the ADR 0435 Decimal128-equivalent domain and never
through binary floating point. An explicit Unicode plain-text paste or text drop
uses the same parser. Currency symbols, percent signs, unit labels, formulas,
arithmetic expressions, rich transfer data, files and opaque objects are not
numbers and are rejected rather than stripped, calculated or converted.

<a id="0462-p003"></a>

The editor may also recognize the portable canonical ASCII decimal/scientific
form so exact values can move between interoperable tools. If the same literal
is valid under both that form and the active Number Input Locale but produces
different exact values, it is **Ambiguous Number Input**. The application shows
the conflicting exact interpretations and requires the user to change the
literal or explicitly switch the visible input locale; it never selects the
current locale, canonical form or whichever parser succeeds first as a hidden
tie-breaker. Strictly invalid grouping remains invalid rather than being
treated as a decimal separator or ignored.

<a id="0462-p004"></a>

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

<a id="0462-p005"></a>

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

<a id="0462-p006"></a>

Under ADR 0466, Save All remains unavailable while any Number draft is Invalid,
Ambiguous, stale or otherwise unresolved. The user must fix it or explicitly
discard it; the application never commits other valid drafts as if the blocked
Number were absent.

<a id="0462-p007"></a>

When a Number draft commits inside an ADR 0467 compound step, its exact numeric
previous/committed values and revisions remain one typed delta. Undo/Redo never
re-parses formatted display text and cannot detach that Number delta from the
same-owner atomic group.

<a id="0462-p008"></a>

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

<a id="0462-p009"></a>

Number Input Locale is limited to interactive manual entry. AI Value
Suggestions, plugin/provider results, native metadata imports, Field Mapping
Import and Custom Field Type Migration must supply a structured exact value or
use their own explicit reviewed parsing/conversion rule; they cannot inherit a
device's locale, grouping or editor preview. Likewise, display precision,
grouping and unit labels grant no import, conversion, search, comparison or
rounding authority.

<a id="0462-p010"></a>

ADR 0463 resolves the display boundary with default Automatic Exact,
Fixed Decimal Places or Significant Digits, decimal round-half-to-even,
approximation labelling and default Auto grouping. Those rules remain
presentation-only and cannot rewrite the Exact Custom Field Number or become
this editor's input source.

<a id="0462-p011"></a>

ADR 0464 may replace an oversized inline representation with a labelled
scientific fallback, but focusing the field still loads this ADR's complete
round-trip exact edit source rather than fallback, ellipsis or requested
formatted text.

<a id="adr-0463"></a>

## 0463 · Number Display Is Exact By Default And Marks Every Rounded Approximation

决定来源：[0463-number-display-is-exact-by-default-and-marks-every-rounded-approximation.md](../../adr/0463-number-display-is-exact-by-default-and-marks-every-rounded-approximation.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0463-p001"></a>

Number presentation must be readable without disguising an exact metadata value
as a rounded replacement. Every Number definition therefore has one portable
**Custom Field Number Display Precision** mode: Automatic Exact, Fixed Decimal
Places or Significant Digits. Automatic Exact is the default and uses an
application-pinned shortest round-trip ordinary-decimal or scientific
representation that reconstructs the complete Exact Custom Field Number.

<a id="0463-p002"></a>

Fixed Decimal Places accepts 0 through 34 places after the decimal point.
Significant Digits accepts 1 through 34 significant digits. Both are
presentation-only and round directly in exact decimal arithmetic through
round-half-to-even: an exact midpoint selects the candidate whose retained last
digit is even. They never convert through binary floating point or change the
stored value, range, equality, ordering, filters, migrations, AI suggestions or
structured numeric exports.

<a id="0463-p003"></a>

A precision-limited rendering receives the `≈` marker exactly when its rounded
numeric result differs from the authoritative value. Adding or omitting
trailing zeros while preserving the same numeric value is not approximate.
When a negative nonzero value rounds to zero, it renders as an approximate
canonical zero rather than inventing negative zero. Every approximation has
direct full-exact-value access, and field focus continues to load ADR 0462's
complete round-trip edit representation rather than the rounded display.

<a id="0463-p004"></a>

Every Number definition also has one portable **Custom Field Number Grouping
Display** preference: Auto, On or Off, defaulting to Auto. Auto follows the
current display locale's standard grouping behavior for ordinary decimal
notation; On requests that locale's standard valid grouping wherever ordinary
notation supports it; Off suppresses grouping. Scientific notation is never
grouped. Digit shapes, separators and grouping patterns come from
application-pinned data for the current device-local display locale, so they
may localize across devices without changing field intent or numeric identity.

<a id="0463-p005"></a>

The Custom Field Number Unit Label is rendered outside the numeric token and
after any approximation marker. It never participates in digit counting,
rounding, grouping, parsing or conversion. Changing precision mode, precision
count, grouping preference, unit label or display locale updates presentation
without constraint revalidation, index rebuild, metadata-value revision or
loss of full-exact access.

<a id="0463-p006"></a>

ADR 0464 resolves inline overflow through a 64-grapheme numeric-token budget,
an explicitly labelled normalized Scientific Number Display Fallback and
read-only detail containing both complete requested formatting and the
authoritative exact value. Visual ellipsis is allowed only after even the
fallback cannot fit and remains visibly identified as clipped.

<a id="adr-0464"></a>

## 0464 · Number Display Overflow Uses A Labeled Scientific Fallback And Full Detail

决定来源：[0464-number-display-overflow-uses-a-labeled-scientific-fallback-and-full-detail.md](../../adr/0464-number-display-overflow-uses-a-labeled-scientific-fallback-and-full-detail.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0464-p001"></a>

An exact Decimal128-equivalent value can produce thousands of ordinary-decimal
characters under a valid display rule, so inline layout must be bounded without
turning clipping into false numeric evidence. An inline Number first applies
ADR 0463's configured precision, rounding, grouping and approximation rules.
If the resulting numeric token—including sign, digits, separators, exponent
and `≈` marker but excluding the external unit label—exceeds 64 Unicode extended
grapheme clusters, or the complete rendered number and unit cannot fit the
available inline container, the surface uses **Scientific Number Display
Fallback**.

<a id="0464-p002"></a>

Scientific Number Display Fallback is a normalized, ungrouped scientific
representation of the current display result under the same pinned decimal and
display-locale rules. Automatic Exact therefore falls back from the exact
authoritative value, while Fixed Decimal Places or Significant Digits falls back
from their already rounded display result. It preserves the existing `≈`
state exactly and does not perform a second rounding step. A visible text/icon
label and accessible name identify Scientific Display Fallback; it is transient
layout state, not a changed field setting, value, unit, precision mode or
scientific-notation preference.

<a id="0464-p003"></a>

Every fallback opens a read-only **Number Display Detail** containing two
separately labelled values: the complete result of the field's requested
formatting and the authoritative Exact Custom Field Number. Both are generated
through the same exact decimal and pinned locale data. Long requested-format
text is produced only when this detail is opened and appears in a bounded,
scrollable reading region without arbitrary digit removal. Closing the detail
discards its generated presentation; it does not create metadata, cache,
history, search text, telemetry, diagnostics or clipboard content.

<a id="0464-p004"></a>

If an extremely narrow container cannot fit even the normalized scientific
fallback plus its approximation/fallback evidence, visual ellipsis is allowed
only after that fallback has been selected. The clipped state must retain a
separate visible overflow indicator, accessible explanation and direct Number
Display Detail entry; ellipsis alone can never imply that the visible prefix is
the complete exact or rounded number. A resize may restore the scientific
fallback or requested format immediately without changing any portable state.

<a id="0464-p005"></a>

The unit label remains outside the numeric token in every state. It is shown in
Number Display Detail even when inline layout cannot retain it, and it never
affects the 64-grapheme numeric threshold, scientific coefficient/exponent,
rounding result or exact value. Sorting, filtering, range checks, exports,
editing and AI/import/migration behavior continue to use their existing exact
contracts rather than whichever inline state happened to fit.
