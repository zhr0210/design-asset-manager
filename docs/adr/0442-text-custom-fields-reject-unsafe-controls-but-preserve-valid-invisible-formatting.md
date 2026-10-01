# Text Custom Fields Reject Unsafe Controls But Preserve Valid Invisible Formatting

Portable Text must not carry hidden terminal/protocol controls that can break storage, display or interchange, but valid Unicode formatting cannot be deleted merely because it is not visibly rendered. A new Text value must be well-formed Unicode and, after ADR 0440 NFC canonicalization, rejects U+0000, unpaired surrogate code units, U+0001–U+0008, U+000B–U+000C, U+000E–U+001F and U+007F–U+009F as **Interoperability-Unsafe Text Code Points**. Horizontal tab U+0009, line feed U+000A and carriage return U+000D remain allowed and are preserved exactly with other valid Unicode line separators.

Valid Unicode formatting and zero-width code points—including bidirectional controls, joiners and non-joiners—remain authoritative content. When present, the editor shows a non-blocking **Invisible Text Format Warning** and offers a reveal mode that identifies each invisible character by a readable label and `U+XXXX` code point without changing the value. The warning grants no permission to strip, replace, reorder or normalize those characters beyond NFC.

ADR 0446 Normalized Duplicate Text Comparison may ignore a valid default-
ignorable character only in its derived advisory key. The original Text and
Invisible Text Format Warning remain complete, and the duplicate group exposes
the distinct original forms rather than presenting the key as user content.
ADR 0452 applies the same disclosure when comparison-mode value groups contain
multiple visible or invisible original forms; selecting a group never replaces
those originals with its derived comparison form.

Manual, AI, import and migration writes containing an unsafe code point fail validation; import and migration review identifies its position and code point and requires an explicit corrected target rather than silent removal. A later validation-policy change applies ADR 0438, preserving a previously accepted value as Out of Constraint. Portable export preserves valid invisible formatting and retained out-of-constraint content, using the selected representation's safe escaping rather than executing or discarding control semantics.

ADR 0453 Expanded Text editing exposes this reveal mode directly. Compact
presentation keeps the warning visible and opens Expanded inspection rather
than hiding, deleting or substituting the preserved characters.

Under ADR 0454, unsafe controls block Text Edit Draft commit with inline
position/code-point evidence. Valid invisible formatting remains a non-blocking
warning and cannot be removed by field exit, blur or navigation.

ADR 0457 applies the same code-point validation to every batch parameter and
derived value. Exact Literal Replacement may change only explicitly matched
content and cannot silently remove other valid invisible formatting.

ADR 0459 applies the same rejection to pasted and dropped plain Text. Transfer
handling never sanitizes unsafe controls out of an otherwise accepted sequence
or removes valid invisible formatting merely because it came from a clipboard
or drag source.

ADR 0460 likewise blocks Copy/Cut of a selection or complete source containing
these unsafe code points rather than silently stripping or escaping them.
Clipboard failure leaves the draft unchanged, while valid invisible formatting
copies exactly with its existing warning.

ADR 0461 blocks applying a local or external writing-assistance replacement
that contains malformed Unicode or an Interoperability-Unsafe Text Code Point.
It also blocks an external request whose disclosed Text scope contains such
content rather than silently cleaning what is transmitted. Valid invisible
formatting remains part of the exact checked/requested range and retains its
warning.
