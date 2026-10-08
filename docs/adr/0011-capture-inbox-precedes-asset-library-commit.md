# Capture Inbox Precedes Asset Library Commit

Captured asset candidates should enter a Capture Inbox before they are
confirmed into the Asset Library. Direct capture-to-library remains useful for
fast paths, but it still enters through ADR 0106 Capture Gateway, receives a
Candidate Identity, and completes Candidate Activation. One explicit reviewed
action may accept valid defaults and immediately promote that activated
Candidate; a fast path never bypasses source safety, identity, validation, or
idempotency. The primary workflow should let users review metadata, tags,
target organization, duplicate signals, and AI suggestions before committing
new assets.

This follows the workspace-first direction and the Eagle reference model:
capture is an acquisition step, while organization and quality control belong
to the Asset Workspace. The Capture Inbox gives browser capture, future
browser-extension capture, local API capture, drag-and-drop, batch download,
download-flight animation, AI tagging, and duplicate review one shared handoff
surface.
