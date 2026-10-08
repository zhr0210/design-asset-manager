# Text Edit Drafts Are Revision-Bound And Commit Only At Defined Boundaries

Editing a Text Custom Field creates a non-authoritative **Text Edit Draft**, the
Text specialization of ADR 0465 Custom Field Edit Draft. It is bound to the
exact library, Candidate or Design Asset owner, Custom Field Definition and
base Custom Field Value revision. Typing, validation feedback and input-method
composition do not change the authoritative value or its search, filter, sort,
export or duplicate projections before commit. While an IME composition is
active, Enter and Escape belong to the input method and cannot commit or cancel
the field; normal validation and field shortcuts resume only after composition
ends.

Explicit Save always attempts commit. Outside IME composition, Compact Enter
commits, while Shift+Enter inserts a line break and invokes ADR 0453 Temporary
Text Editor Expansion. Expanded Enter inserts a line break, while
Command/Ctrl+Enter commits. Deliberately moving by pointer or keyboard to
another editable field in the same Inspector also attempts to commit a
currently valid, revision-current draft for efficient metadata entry.
Operating-system window blur, application deactivation and incidental focus
loss never commit; they preserve the visible draft.

A validation failure remains an inline pending draft and leaves the
authoritative value unchanged. If the bound value or definition revision has
changed, the draft becomes a **Stale Text Edit Draft** and follows ADR 0097
field-aware conflict review rather than Last Writer Wins. Changing the selected
owner or result scope, switching library or route, closing the Inspector, and
cleanly quitting with any pending draft invokes ADR 0465's contextual
**Unsaved Custom Field Changes Gate** offering Save, Discard and Stay. Its Text
projection is the **Unsaved Text Changes Gate**; the transition cannot complete
while a requested Save remains invalid or unresolved. Discard removes only the
draft, Stay preserves the editing context, and Escape outside IME composition
cancels the active uncommitted draft and reveals the current authoritative
value. No navigation or focus change silently discards or overwrites text.
ADR 0455 owns the Text record class inside protected device-local draft
recovery without changing these normal commit and navigation boundaries.
ADR 0466 governs a Text draft when it joins other typed drafts behind the same
gate: no valid subset is silently saved, and all selected fields for one owner
commit atomically after complete preflight.

ADR 0456 gives an active editor's draft-local Undo/Redo priority over ADR
0465's shared Custom Field Edit Undo Stack and makes each successful manual
Text commit one typed session-level Undo step.

ADR 0459 paste and text drop modify only this draft through explicit plain
Unicode transfer input. Neither gesture commits, resolves a stale revision,
bypasses validation or turns a file/image/asset drop into metadata.

ADR 0460 Copy reads only the selected or explicitly requested complete draft
without committing it. Cut removes the selected range only after clipboard
write succeeds, remains a draft edit and cannot resolve staleness or bypass the
Unsaved Custom Field Changes Gate.

ADR 0461 writing diagnostics never mutate this draft by themselves. A
user-applied proposal or explicitly enabled automatic input substitution is an
ordinary draft-local range edit after IME ownership ends; neither local nor
external assistance commits, resolves staleness or authorizes navigation.
