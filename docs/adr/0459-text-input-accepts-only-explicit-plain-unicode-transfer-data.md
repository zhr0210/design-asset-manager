# Text Input Accepts Only Explicit Plain Unicode Transfer Data

A Text Custom Field is portable plain Unicode metadata, not a rich document or
an implicit asset-import target. Paste and text drop therefore accept only an
operating-system/data-transfer representation explicitly declared as Unicode
plain text. When the source also offers HTML, RTF or other rich forms, the
editor uses the declared plain-text representation and ignores formatting. If
no plain-text representation exists, it rejects the transfer with contextual
feedback; the application never derives Text by parsing HTML/RTF, reading DOM
markup, extracting image metadata or converting an opaque transferable object.

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

Text that looks like a URL, filesystem path, filename, markup or command remains
literal Text and receives no link, file, import, execution or relationship
authority. A dragged text selection with an explicit plain-text representation
uses the same rule. A transfer declaring files, image payloads, application
asset identities or relationship objects is rejected by the Text target even
when it carries a companion display string; the editor never inserts its path,
imports it, creates a Candidate or links an asset. Dedicated Add Assets,
Original Handoff and relationship surfaces retain their own explicit drop
targets and contracts.

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

ADR 0460 owns the inverse Copy/Cut boundary. Both directions use plain Unicode,
but accepted paste/drop input and explicit clipboard output retain separate
validation, mutation and failure semantics.

ADR 0462 separately owns Number paste/drop parsing. Number may accept an
explicit plain-Unicode numeric literal under its visible locale/canonical
grammar, but it does not inherit Text's rule that arbitrary whitespace, line
breaks, paths or URL-looking strings remain valid literal content.
