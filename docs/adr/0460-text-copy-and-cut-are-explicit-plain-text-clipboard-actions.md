# Text Copy And Cut Are Explicit Plain-Text Clipboard Actions

Native Copy and Cut inside an active Text editor operate only on an explicit
selection in the current Text Edit Draft. They write exactly that editor
sequence as one operating-system Unicode plain-text representation, without
HTML, RTF, styles, field labels, owner identity, surrounding prose or implicit
path/link/asset meaning. With no selection they are unavailable/no-op and never
replace the clipboard with the complete field or an empty value. Input-method
composition retains platform keyboard ownership and cannot be forced to commit
or terminate by these commands.

Cut is a copy-before-delete draft operation. Only after the complete selected
plain Text is successfully written may the editor delete that selection; a
clipboard denial/failure leaves the draft and selection unchanged. Successful
deletion is one ordinary draft-local edit under ADR 0456 and may be undone or
redone there without committing a Custom Field Value. If it creates a
zero-length or whitespace-only draft, ADR 0441 remains authoritative at the
later visible commit boundary.

Every copy path preserves valid invisible formatting. A selection or complete
source containing malformed Unicode or ADR 0442 Interoperability-Unsafe Text
Code Points cannot be represented through a silently altered clipboard value:
Copy/Cut fails contextually, writes nothing and Cut removes nothing. The
application never strips, replaces, escapes, NFC-rewrites or truncates content
merely to make copying succeed. Other draft validation failures such as length,
minimum or pattern mismatch do not by themselves prevent copying safe Unicode
so the user can preserve or correct their work.

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
